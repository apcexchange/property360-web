import crypto from 'crypto';
import { Wallet, WalletTransaction } from '../models';
import { IWallet, IWalletTransaction, WalletTransactionType } from '../types';
import { AppError } from '../middleware';

interface WalletStats {
  balance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  pendingBalance: number;
  transactionsCount: number;
  recentTransactions: IWalletTransaction[];
}

interface CreditWalletData {
  amount: number;
  description: string;
  sourceTransactionId?: string;
  sourceInvoiceId?: string;
  metadata?: Record<string, unknown>;
}

interface DebitWalletData {
  amount: number;
  description: string;
  payoutId?: string;
  metadata?: Record<string, unknown>;
}

class WalletService {
  /**
   * Generate unique transaction reference
   */
  private generateReference(type: WalletTransactionType): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    const prefix = type.toUpperCase().substring(0, 3);
    return `WT-${prefix}-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Get or create wallet for a landlord
   */
  async getOrCreateWallet(landlordId: string): Promise<IWallet> {
    let wallet = await Wallet.findOne({ landlord: landlordId });

    if (!wallet) {
      wallet = await Wallet.create({
        landlord: landlordId,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        pendingBalance: 0,
        currency: 'NGN',
        isActive: true,
        autoSettlement: true,
        autoPayoutEnabled: false,
        autoPayoutThreshold: 50000,
      });
    }

    return wallet;
  }

  /**
   * Get wallet by landlord ID
   */
  async getWalletByLandlord(landlordId: string): Promise<IWallet | null> {
    return Wallet.findOne({ landlord: landlordId }).populate('defaultBankAccount');
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(landlordId: string): Promise<WalletStats> {
    const wallet = await this.getOrCreateWallet(landlordId);

    const [transactionsCount, recentTransactions] = await Promise.all([
      WalletTransaction.countDocuments({ wallet: wallet._id }),
      WalletTransaction.find({ wallet: wallet._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('sourceTransaction')
        .populate('sourceInvoice', 'invoiceNumber'),
    ]);

    return {
      balance: wallet.balance,
      totalEarnings: wallet.totalEarnings,
      totalWithdrawn: wallet.totalWithdrawn,
      pendingBalance: wallet.pendingBalance,
      transactionsCount,
      recentTransactions,
    };
  }

  /**
   * Credit wallet (add funds)
   */
  async creditWallet(
    landlordId: string,
    data: CreditWalletData
  ): Promise<IWalletTransaction> {
    const wallet = await this.getOrCreateWallet(landlordId);

    if (!wallet.isActive) {
      throw new AppError('Wallet is not active', 400);
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + data.amount;

    // Create wallet transaction
    const walletTransaction = await WalletTransaction.create({
      wallet: wallet._id,
      landlord: landlordId,
      type: 'credit',
      amount: data.amount,
      balanceBefore,
      balanceAfter,
      status: 'completed',
      description: data.description,
      reference: this.generateReference('credit'),
      sourceTransaction: data.sourceTransactionId,
      sourceInvoice: data.sourceInvoiceId,
      metadata: data.metadata,
    });

    // Update wallet balance
    wallet.balance = balanceAfter;
    wallet.totalEarnings += data.amount;
    await wallet.save();

    return walletTransaction;
  }

  /**
   * Debit wallet (remove funds for withdrawal)
   */
  async debitWallet(
    landlordId: string,
    data: DebitWalletData
  ): Promise<IWalletTransaction> {
    const wallet = await this.getOrCreateWallet(landlordId);

    if (!wallet.isActive) {
      throw new AppError('Wallet is not active', 400);
    }

    if (wallet.balance < data.amount) {
      throw new AppError('Insufficient wallet balance', 400);
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - data.amount;

    // Create wallet transaction
    const walletTransaction = await WalletTransaction.create({
      wallet: wallet._id,
      landlord: landlordId,
      type: 'withdrawal',
      amount: data.amount,
      balanceBefore,
      balanceAfter,
      status: 'pending', // Will be completed when payout succeeds
      description: data.description,
      reference: this.generateReference('withdrawal'),
      payout: data.payoutId,
      metadata: data.metadata,
    });

    // Update wallet balance
    wallet.balance = balanceAfter;
    await wallet.save();

    return walletTransaction;
  }

  /**
   * Reverse a wallet transaction (for failed payouts)
   */
  async reverseTransaction(
    walletTransactionId: string,
    reason: string
  ): Promise<IWalletTransaction> {
    const transaction = await WalletTransaction.findById(walletTransactionId);

    if (!transaction) {
      throw new AppError('Wallet transaction not found', 404);
    }

    if (transaction.status === 'reversed') {
      throw new AppError('Transaction already reversed', 400);
    }

    const wallet = await Wallet.findById(transaction.wallet);
    if (!wallet) {
      throw new AppError('Wallet not found', 404);
    }

    // Create reversal transaction
    const reversalTransaction = await WalletTransaction.create({
      wallet: wallet._id,
      landlord: transaction.landlord,
      type: 'refund',
      amount: transaction.amount,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance + transaction.amount,
      status: 'completed',
      description: `Reversal: ${reason}`,
      reference: this.generateReference('refund'),
      metadata: {
        originalTransaction: transaction._id,
        reason,
      },
    });

    // Update wallet balance
    wallet.balance += transaction.amount;
    if (transaction.type === 'withdrawal') {
      wallet.totalWithdrawn -= transaction.amount;
    }
    await wallet.save();

    // Mark original transaction as reversed
    transaction.status = 'reversed';
    await transaction.save();

    return reversalTransaction;
  }

  /**
   * Complete a pending withdrawal transaction
   */
  async completeWithdrawal(walletTransactionId: string): Promise<void> {
    const transaction = await WalletTransaction.findById(walletTransactionId);

    if (!transaction) {
      throw new AppError('Wallet transaction not found', 404);
    }

    if (transaction.status !== 'pending') {
      return; // Already processed
    }

    const wallet = await Wallet.findById(transaction.wallet);
    if (!wallet) {
      throw new AppError('Wallet not found', 404);
    }

    // Update transaction status
    transaction.status = 'completed';
    await transaction.save();

    // Update wallet total withdrawn
    wallet.totalWithdrawn += transaction.amount;
    await wallet.save();
  }

  /**
   * Get wallet transaction history
   */
  async getWalletTransactions(
    landlordId: string,
    options: { page?: number; limit?: number; type?: WalletTransactionType }
  ): Promise<{ transactions: IWalletTransaction[]; total: number; pages: number }> {
    const wallet = await this.getWalletByLandlord(landlordId);
    if (!wallet) {
      return { transactions: [], total: 0, pages: 0 };
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { wallet: wallet._id };
    if (options.type) {
      query.type = options.type;
    }

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sourceTransaction')
        .populate('sourceInvoice', 'invoiceNumber total'),
      WalletTransaction.countDocuments(query),
    ]);

    return {
      transactions,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Update wallet settings
   */
  async updateWalletSettings(
    landlordId: string,
    settings: Partial<{
      autoSettlement: boolean;
      autoPayoutEnabled: boolean;
      autoPayoutThreshold: number;
      defaultBankAccount: string;
    }>
  ): Promise<IWallet> {
    const wallet = await this.getOrCreateWallet(landlordId);

    if (settings.autoSettlement !== undefined) {
      wallet.autoSettlement = settings.autoSettlement;
    }
    if (settings.autoPayoutEnabled !== undefined) {
      wallet.autoPayoutEnabled = settings.autoPayoutEnabled;
    }
    if (settings.autoPayoutThreshold !== undefined) {
      if (settings.autoPayoutThreshold < 1000) {
        throw new AppError('Auto-payout threshold must be at least 1,000 Naira', 400);
      }
      wallet.autoPayoutThreshold = settings.autoPayoutThreshold;
    }
    if (settings.defaultBankAccount !== undefined) {
      wallet.defaultBankAccount = settings.defaultBankAccount as any;
    }

    await wallet.save();
    return wallet.populate('defaultBankAccount');
  }

  /**
   * Get wallets eligible for auto-payout
   */
  async getWalletsForAutoPayout(): Promise<IWallet[]> {
    return Wallet.find({
      isActive: true,
      autoPayoutEnabled: true,
      $expr: { $gte: ['$balance', '$autoPayoutThreshold'] },
    }).populate('defaultBankAccount');
  }
}

export default new WalletService();
