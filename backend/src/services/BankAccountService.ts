import { BankAccount, Wallet } from '../models';
import { IBankAccount } from '../types';
import { AppError } from '../middleware';
import PaystackTransferService from './PaystackTransferService';

interface AddBankAccountData {
  bankCode: string;
  accountNumber: string;
}

interface Bank {
  code: string;
  name: string;
}

class BankAccountService {
  /**
   * List all Nigerian banks
   */
  async listBanks(): Promise<Bank[]> {
    const banks = await PaystackTransferService.listBanks();
    return banks
      .filter((bank) => bank.active)
      .map((bank) => ({
        code: bank.code,
        name: bank.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Verify a bank account number
   */
  async verifyAccountNumber(
    accountNumber: string,
    bankCode: string
  ): Promise<{ accountName: string; accountNumber: string }> {
    // Validate inputs
    if (!accountNumber || accountNumber.length !== 10) {
      throw new AppError('Account number must be 10 digits', 400);
    }

    if (!bankCode) {
      throw new AppError('Bank code is required', 400);
    }

    return PaystackTransferService.resolveAccountNumber(accountNumber, bankCode);
  }

  /**
   * Add a bank account for a landlord
   */
  async addBankAccount(
    landlordId: string,
    data: AddBankAccountData
  ): Promise<IBankAccount> {
    // Check if account already exists
    const existing = await BankAccount.findOne({
      landlord: landlordId,
      accountNumber: data.accountNumber,
      isActive: true,
    });

    if (existing) {
      throw new AppError('This bank account is already added', 400);
    }

    // Verify account with Paystack
    const verification = await PaystackTransferService.resolveAccountNumber(
      data.accountNumber,
      data.bankCode
    );

    // Get bank name from banks list
    const banks = await PaystackTransferService.listBanks();
    const bank = banks.find((b) => b.code === data.bankCode);
    if (!bank) {
      throw new AppError('Invalid bank code', 400);
    }

    // Create transfer recipient in Paystack
    const { recipientCode } = await PaystackTransferService.createTransferRecipient({
      name: verification.accountName,
      accountNumber: data.accountNumber,
      bankCode: data.bankCode,
    });

    // Check if this is the first bank account (make it primary)
    const existingCount = await BankAccount.countDocuments({
      landlord: landlordId,
      isActive: true,
    });

    // Create bank account
    const bankAccount = await BankAccount.create({
      landlord: landlordId,
      bankCode: data.bankCode,
      bankName: bank.name,
      accountNumber: data.accountNumber,
      accountName: verification.accountName,
      recipientCode,
      isVerified: true,
      verifiedAt: new Date(),
      isPrimary: existingCount === 0, // First account is primary
      isActive: true,
    });

    // If this is the first account, set as default in wallet
    if (existingCount === 0) {
      await Wallet.findOneAndUpdate(
        { landlord: landlordId },
        { defaultBankAccount: bankAccount._id }
      );
    }

    return bankAccount;
  }

  /**
   * Get all bank accounts for a landlord
   */
  async getBankAccounts(landlordId: string): Promise<IBankAccount[]> {
    return BankAccount.find({
      landlord: landlordId,
      isActive: true,
    }).sort({ isPrimary: -1, createdAt: -1 });
  }

  /**
   * Get a specific bank account
   */
  async getBankAccountById(
    bankAccountId: string,
    landlordId: string
  ): Promise<IBankAccount | null> {
    return BankAccount.findOne({
      _id: bankAccountId,
      landlord: landlordId,
      isActive: true,
    });
  }

  /**
   * Set a bank account as primary
   */
  async setPrimaryAccount(
    landlordId: string,
    bankAccountId: string
  ): Promise<IBankAccount> {
    const bankAccount = await BankAccount.findOne({
      _id: bankAccountId,
      landlord: landlordId,
      isActive: true,
    });

    if (!bankAccount) {
      throw new AppError('Bank account not found', 404);
    }

    // Unset current primary
    await BankAccount.updateMany(
      { landlord: landlordId, isPrimary: true },
      { isPrimary: false }
    );

    // Set new primary
    bankAccount.isPrimary = true;
    await bankAccount.save();

    // Update wallet default
    await Wallet.findOneAndUpdate(
      { landlord: landlordId },
      { defaultBankAccount: bankAccount._id }
    );

    return bankAccount;
  }

  /**
   * Delete (deactivate) a bank account
   */
  async deleteBankAccount(landlordId: string, bankAccountId: string): Promise<void> {
    const bankAccount = await BankAccount.findOne({
      _id: bankAccountId,
      landlord: landlordId,
      isActive: true,
    });

    if (!bankAccount) {
      throw new AppError('Bank account not found', 404);
    }

    // Delete from Paystack
    await PaystackTransferService.deleteTransferRecipient(bankAccount.recipientCode);

    // Soft delete
    bankAccount.isActive = false;
    bankAccount.isPrimary = false;
    await bankAccount.save();

    // If this was the default, clear it from wallet
    await Wallet.findOneAndUpdate(
      { landlord: landlordId, defaultBankAccount: bankAccountId },
      { $unset: { defaultBankAccount: 1 } }
    );

    // If there are other accounts, make the most recent one primary
    const remaining = await BankAccount.findOne({
      landlord: landlordId,
      isActive: true,
    }).sort({ createdAt: -1 });

    if (remaining) {
      remaining.isPrimary = true;
      await remaining.save();

      await Wallet.findOneAndUpdate(
        { landlord: landlordId },
        { defaultBankAccount: remaining._id }
      );
    }
  }

  /**
   * Get primary bank account for a landlord
   */
  async getPrimaryBankAccount(landlordId: string): Promise<IBankAccount | null> {
    return BankAccount.findOne({
      landlord: landlordId,
      isPrimary: true,
      isActive: true,
    });
  }
}

export default new BankAccountService();
