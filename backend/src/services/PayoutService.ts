import crypto from 'crypto';
import { Payout, Wallet, BankAccount, WalletTransaction } from '../models';
import { IPayout, IBankAccount } from '../types';
import { AppError } from '../middleware';
import WalletService from './WalletService';
import BankAccountService from './BankAccountService';
import PaystackTransferService from './PaystackTransferService';

interface RequestPayoutData {
  amount: number;
  bankAccountId?: string;
}

const MINIMUM_PAYOUT = 1000; // 1,000 Naira minimum

class PayoutService {
  /**
   * Generate unique payout reference
   */
  private generateReference(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `PO-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Request a payout (withdrawal)
   */
  async requestPayout(
    landlordId: string,
    data: RequestPayoutData
  ): Promise<IPayout> {
    // Validate amount
    if (data.amount < MINIMUM_PAYOUT) {
      throw new AppError(`Minimum withdrawal amount is ${MINIMUM_PAYOUT} Naira`, 400);
    }

    // Get wallet
    const wallet = await WalletService.getOrCreateWallet(landlordId);

    if (!wallet.isActive) {
      throw new AppError('Wallet is not active', 400);
    }

    if (wallet.balance < data.amount) {
      throw new AppError('Insufficient wallet balance', 400);
    }

    // Get bank account
    let bankAccount: IBankAccount | null;

    if (data.bankAccountId) {
      bankAccount = await BankAccountService.getBankAccountById(
        data.bankAccountId,
        landlordId
      );
    } else {
      bankAccount = await BankAccountService.getPrimaryBankAccount(landlordId);
    }

    if (!bankAccount) {
      throw new AppError('No bank account found. Please add a bank account first.', 400);
    }

    if (!bankAccount.isVerified) {
      throw new AppError('Bank account is not verified', 400);
    }

    const reference = this.generateReference();
    const fee = 0; // No fees for now
    const netAmount = data.amount - fee;

    // Debit wallet first
    const walletTransaction = await WalletService.debitWallet(landlordId, {
      amount: data.amount,
      description: `Withdrawal to ${bankAccount.bankName} - ${bankAccount.accountNumber}`,
    });

    // Create payout record
    const payout = await Payout.create({
      landlord: landlordId,
      wallet: wallet._id,
      bankAccount: bankAccount._id,
      amount: data.amount,
      fee,
      netAmount,
      status: 'pending',
      reference,
      requestedAt: new Date(),
      requestedBy: landlordId,
      isAutoPayout: false,
      walletTransaction: walletTransaction._id,
    });

    // Process payout asynchronously
    this.processPayout(payout._id.toString()).catch((error) => {
      console.error('Error processing payout:', error);
    });

    return payout;
  }

  /**
   * Process a pending payout via Paystack
   */
  async processPayout(payoutId: string): Promise<IPayout> {
    const payout = await Payout.findById(payoutId);

    if (!payout) {
      throw new AppError('Payout not found', 404);
    }

    if (payout.status !== 'pending') {
      return payout;
    }

    // Get bank account separately to avoid type issues
    const bankAccount = await BankAccount.findById(payout.bankAccount);
    if (!bankAccount) {
      throw new AppError('Bank account not found', 404);
    }

    try {
      // Update status to processing
      payout.status = 'processing';
      payout.processedAt = new Date();
      await payout.save();

      // Initiate transfer via Paystack
      const transfer = await PaystackTransferService.initiateTransfer({
        amount: payout.netAmount,
        recipientCode: bankAccount.recipientCode,
        reason: `Property360 Payout - ${payout.reference}`,
        reference: payout.reference,
      });

      // Update payout with Paystack details
      payout.paystackTransferCode = transfer.transferCode;
      payout.paystackReference = transfer.reference;

      // If Paystack returns success immediately (rare), complete it
      if (transfer.status === 'success') {
        payout.status = 'success';
        payout.completedAt = new Date();

        // Complete wallet transaction
        if (payout.walletTransaction) {
          await WalletService.completeWithdrawal(payout.walletTransaction.toString());
        }
      }

      await payout.save();
      return payout;
    } catch (error: any) {
      // Mark as failed and reverse wallet debit
      payout.status = 'failed';
      payout.failedAt = new Date();
      payout.failureReason = error.message || 'Transfer initiation failed';
      await payout.save();

      // Reverse wallet transaction
      if (payout.walletTransaction) {
        await WalletService.reverseTransaction(
          payout.walletTransaction.toString(),
          `Payout failed: ${payout.failureReason}`
        );
      }

      throw error;
    }
  }

  /**
   * Handle Paystack transfer webhook
   */
  async handleTransferWebhook(event: string, data: any): Promise<void> {
    const reference = data.reference;

    const payout = await Payout.findOne({ reference });
    if (!payout) {
      console.log('Payout not found for reference:', reference);
      return;
    }

    if (event === 'transfer.success') {
      payout.status = 'success';
      payout.completedAt = new Date();
      payout.paystackResponse = data;
      await payout.save();

      // Complete wallet transaction
      if (payout.walletTransaction) {
        await WalletService.completeWithdrawal(payout.walletTransaction.toString());
      }

      console.log('Payout completed:', payout.reference);
    } else if (event === 'transfer.failed') {
      payout.status = 'failed';
      payout.failedAt = new Date();
      payout.failureReason = data.reason || 'Transfer failed';
      payout.paystackResponse = data;
      await payout.save();

      // Reverse wallet transaction
      if (payout.walletTransaction) {
        await WalletService.reverseTransaction(
          payout.walletTransaction.toString(),
          `Payout failed: ${payout.failureReason}`
        );
      }

      console.log('Payout failed:', payout.reference);
    } else if (event === 'transfer.reversed') {
      payout.status = 'reversed';
      payout.paystackResponse = data;
      await payout.save();

      // Reverse wallet transaction if not already
      if (payout.walletTransaction) {
        const walletTx = await WalletTransaction.findById(payout.walletTransaction);
        if (walletTx && walletTx.status !== 'reversed') {
          await WalletService.reverseTransaction(
            payout.walletTransaction.toString(),
            'Transfer reversed by bank'
          );
        }
      }

      console.log('Payout reversed:', payout.reference);
    }
  }

  /**
   * Get payout history for a landlord
   */
  async getPayoutHistory(
    landlordId: string,
    options: { page?: number; limit?: number; status?: string }
  ): Promise<{ payouts: IPayout[]; total: number; pages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { landlord: landlordId };
    if (options.status) {
      query.status = options.status;
    }

    const [payouts, total] = await Promise.all([
      Payout.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('bankAccount', 'bankName accountNumber accountName'),
      Payout.countDocuments(query),
    ]);

    return {
      payouts,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get payout by ID
   */
  async getPayoutById(payoutId: string, landlordId: string): Promise<IPayout | null> {
    return Payout.findOne({
      _id: payoutId,
      landlord: landlordId,
    }).populate('bankAccount', 'bankName accountNumber accountName');
  }

  /**
   * Retry a failed payout
   */
  async retryPayout(payoutId: string, landlordId: string): Promise<IPayout> {
    const payout = await Payout.findOne({
      _id: payoutId,
      landlord: landlordId,
    });

    if (!payout) {
      throw new AppError('Payout not found', 404);
    }

    if (payout.status !== 'failed') {
      throw new AppError('Only failed payouts can be retried', 400);
    }

    // Check wallet balance
    const wallet = await WalletService.getWalletByLandlord(landlordId);
    if (!wallet || wallet.balance < payout.amount) {
      throw new AppError('Insufficient wallet balance to retry payout', 400);
    }

    // Create new wallet debit
    const walletTransaction = await WalletService.debitWallet(landlordId, {
      amount: payout.amount,
      description: `Retry withdrawal - ${payout.reference}`,
      payoutId: payout._id.toString(),
    });

    // Reset payout for retry
    payout.status = 'pending';
    payout.failedAt = undefined;
    payout.failureReason = undefined;
    payout.walletTransaction = walletTransaction._id as any;
    payout.paystackTransferCode = undefined;
    payout.paystackReference = undefined;
    payout.paystackResponse = undefined;
    await payout.save();

    // Process payout
    return this.processPayout(payout._id.toString());
  }

  /**
   * Process automatic payouts for eligible wallets
   */
  async processAutomaticPayouts(): Promise<number> {
    const wallets = await WalletService.getWalletsForAutoPayout();
    let processed = 0;

    for (const wallet of wallets) {
      try {
        // Get primary bank account
        const bankAccount = await BankAccountService.getPrimaryBankAccount(
          wallet.landlord.toString()
        );

        if (!bankAccount) {
          console.log(`No bank account for auto-payout: ${wallet.landlord}`);
          continue;
        }

        // Calculate payout amount (full balance above threshold or exact threshold)
        const payoutAmount = wallet.balance;

        if (payoutAmount < MINIMUM_PAYOUT) {
          continue;
        }

        const reference = this.generateReference();
        const fee = 0;
        const netAmount = payoutAmount - fee;

        // Debit wallet
        const walletTransaction = await WalletService.debitWallet(
          wallet.landlord.toString(),
          {
            amount: payoutAmount,
            description: `Auto-payout to ${bankAccount.bankName} - ${bankAccount.accountNumber}`,
          }
        );

        // Create payout
        const payout = await Payout.create({
          landlord: wallet.landlord,
          wallet: wallet._id,
          bankAccount: bankAccount._id,
          amount: payoutAmount,
          fee,
          netAmount,
          status: 'pending',
          reference,
          requestedAt: new Date(),
          requestedBy: wallet.landlord,
          isAutoPayout: true,
          walletTransaction: walletTransaction._id,
        });

        // Process payout
        await this.processPayout(payout._id.toString());
        processed++;
      } catch (error) {
        console.error(`Auto-payout failed for wallet ${wallet._id}:`, error);
      }
    }

    return processed;
  }
}

export default new PayoutService();
