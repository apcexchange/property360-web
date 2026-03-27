import axios from 'axios';
import { config } from '../config';
import { AppError } from '../middleware';

interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string;
  country: string;
  currency: string;
  type: string;
  active: boolean;
}

interface ResolveAccountResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
    bank_id: number;
  };
}

interface CreateRecipientResponse {
  status: boolean;
  message: string;
  data: {
    active: boolean;
    createdAt: string;
    currency: string;
    domain: string;
    id: number;
    integration: number;
    name: string;
    recipient_code: string;
    type: string;
    details: {
      authorization_code: string | null;
      account_number: string;
      account_name: string;
      bank_code: string;
      bank_name: string;
    };
  };
}

interface InitiateTransferResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    integration: number;
    domain: string;
    amount: number;
    currency: string;
    source: string;
    reason: string;
    recipient: number;
    status: string;
    transfer_code: string;
    id: number;
    createdAt: string;
    updatedAt: string;
  };
}

interface VerifyTransferResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    status: 'pending' | 'success' | 'failed' | 'reversed';
    amount: number;
    recipient: {
      name: string;
      account_number: string;
      bank_name: string;
    };
    transfer_code: string;
    reason: string;
    updatedAt: string;
    failures: string | null;
  };
}

class PaystackTransferService {
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    this.secretKey = config.paystack?.secretKey || '';
    this.baseUrl = 'https://api.paystack.co';
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * List all Nigerian banks
   */
  async listBanks(country = 'nigeria'): Promise<PaystackBank[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/bank`, {
        headers: this.headers,
        params: { country, perPage: 100 },
      });

      if (!response.data.status) {
        throw new AppError('Failed to fetch banks', 500);
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Paystack list banks error:', error.response?.data || error.message);
      throw new AppError('Failed to fetch banks from Paystack', 500);
    }
  }

  /**
   * Resolve/verify a bank account number
   */
  async resolveAccountNumber(
    accountNumber: string,
    bankCode: string
  ): Promise<{ accountName: string; accountNumber: string }> {
    try {
      const response = await axios.get<ResolveAccountResponse>(
        `${this.baseUrl}/bank/resolve`,
        {
          headers: this.headers,
          params: {
            account_number: accountNumber,
            bank_code: bankCode,
          },
        }
      );

      if (!response.data.status) {
        throw new AppError('Could not verify account number', 400);
      }

      return {
        accountName: response.data.data.account_name,
        accountNumber: response.data.data.account_number,
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;

      const errorMessage = error.response?.data?.message || 'Failed to verify account';
      console.error('Paystack resolve account error:', error.response?.data || error.message);
      throw new AppError(errorMessage, 400);
    }
  }

  /**
   * Create a transfer recipient (required before making transfers)
   */
  async createTransferRecipient(data: {
    name: string;
    accountNumber: string;
    bankCode: string;
  }): Promise<{ recipientCode: string }> {
    try {
      const response = await axios.post<CreateRecipientResponse>(
        `${this.baseUrl}/transferrecipient`,
        {
          type: 'nuban',
          name: data.name,
          account_number: data.accountNumber,
          bank_code: data.bankCode,
          currency: 'NGN',
        },
        { headers: this.headers }
      );

      if (!response.data.status) {
        throw new AppError('Failed to create transfer recipient', 500);
      }

      return {
        recipientCode: response.data.data.recipient_code,
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;

      console.error('Paystack create recipient error:', error.response?.data || error.message);
      throw new AppError('Failed to create transfer recipient', 500);
    }
  }

  /**
   * Delete a transfer recipient
   */
  async deleteTransferRecipient(recipientCode: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/transferrecipient/${recipientCode}`, {
        headers: this.headers,
      });
    } catch (error: any) {
      console.error('Paystack delete recipient error:', error.response?.data || error.message);
      // Don't throw - deletion failure is not critical
    }
  }

  /**
   * Initiate a transfer to a recipient
   */
  async initiateTransfer(data: {
    amount: number; // In Naira (will be converted to kobo)
    recipientCode: string;
    reason: string;
    reference: string;
  }): Promise<{ transferCode: string; reference: string; status: string }> {
    try {
      const response = await axios.post<InitiateTransferResponse>(
        `${this.baseUrl}/transfer`,
        {
          source: 'balance',
          amount: Math.round(data.amount * 100), // Convert to kobo
          recipient: data.recipientCode,
          reason: data.reason,
          reference: data.reference,
        },
        { headers: this.headers }
      );

      if (!response.data.status) {
        throw new AppError('Failed to initiate transfer', 500);
      }

      return {
        transferCode: response.data.data.transfer_code,
        reference: response.data.data.reference,
        status: response.data.data.status,
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;

      const errorMessage = error.response?.data?.message || 'Failed to initiate transfer';
      console.error('Paystack initiate transfer error:', error.response?.data || error.message);
      throw new AppError(errorMessage, 500);
    }
  }

  /**
   * Verify a transfer status
   */
  async verifyTransfer(reference: string): Promise<{
    status: 'pending' | 'success' | 'failed' | 'reversed';
    transferCode: string;
    amount: number;
    reason: string;
    failure?: string;
  }> {
    try {
      const response = await axios.get<VerifyTransferResponse>(
        `${this.baseUrl}/transfer/verify/${reference}`,
        { headers: this.headers }
      );

      if (!response.data.status) {
        throw new AppError('Failed to verify transfer', 500);
      }

      const data = response.data.data;
      return {
        status: data.status,
        transferCode: data.transfer_code,
        amount: data.amount / 100, // Convert from kobo to Naira
        reason: data.reason,
        failure: data.failures || undefined,
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;

      console.error('Paystack verify transfer error:', error.response?.data || error.message);
      throw new AppError('Failed to verify transfer', 500);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(signature: string, payload: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(payload)
      .digest('hex');
    return hash === signature;
  }
}

export default new PaystackTransferService();
