import axios from 'axios';
import crypto from 'crypto';
import { PaymentGateway, Invoice, Transaction, Receipt } from '../models';
import { IPaymentGateway, IInvoice } from '../types';
import { AppError } from '../middleware';
import { config } from '../config';
import ReceiptService from './ReceiptService';

interface InitiatePaymentData {
  invoiceId: string;
  amount?: number; // Optional for partial payments
  email: string;
  callbackUrl?: string;
}

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    paid_at: string;
    channel: string;
    currency: string;
    gateway_response: string;
    customer: {
      email: string;
    };
  };
}

class PaymentGatewayService {
  private paystackSecretKey: string;
  private paystackBaseUrl: string;

  constructor() {
    this.paystackSecretKey = config.paystack?.secretKey || '';
    this.paystackBaseUrl = 'https://api.paystack.co';
  }

  /**
   * Generate a unique payment reference
   */
  private generateReference(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `P360-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Initiate a Paystack payment
   */
  async initiatePayment(
    tenantId: string,
    data: InitiatePaymentData
  ): Promise<{ authorizationUrl: string; reference: string }> {
    // Get the invoice
    const invoice = await Invoice.findById(data.invoiceId)
      .populate('tenant', 'email firstName lastName')
      .populate('landlord');

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    // Verify the tenant owns this invoice
    if (invoice.tenant._id.toString() !== tenantId) {
      throw new AppError('Access denied', 403);
    }

    // Check invoice status
    if (invoice.status === 'paid') {
      throw new AppError('Invoice is already paid', 400);
    }

    if (invoice.status === 'cancelled') {
      throw new AppError('Invoice is cancelled', 400);
    }

    if (invoice.status === 'draft') {
      throw new AppError('Invoice has not been sent yet', 400);
    }

    // Calculate amount (use provided amount for partial payment, or full amount due)
    const amountDue = invoice.amountDue || invoice.total;
    const paymentAmount = data.amount || amountDue;

    if (paymentAmount <= 0) {
      throw new AppError('Invalid payment amount', 400);
    }

    if (paymentAmount > amountDue) {
      throw new AppError('Payment amount exceeds amount due', 400);
    }

    const reference = this.generateReference();

    // Create payment gateway record
    const paymentGateway = await PaymentGateway.create({
      reference,
      invoice: invoice._id,
      tenant: tenantId,
      landlord: invoice.landlord,
      amount: paymentAmount,
      gateway: 'paystack',
      status: 'pending',
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        isPartialPayment: paymentAmount < amountDue,
      },
    });

    try {
      // Initialize Paystack transaction
      const response = await axios.post<PaystackInitResponse>(
        `${this.paystackBaseUrl}/transaction/initialize`,
        {
          email: data.email,
          amount: Math.round(paymentAmount * 100), // Paystack uses kobo
          reference,
          callback_url: data.callbackUrl || config.paystack?.callbackUrl,
          metadata: {
            invoiceId: invoice._id.toString(),
            invoiceNumber: invoice.invoiceNumber,
            tenantId,
            paymentGatewayId: paymentGateway._id.toString(),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.status) {
        throw new AppError('Failed to initialize payment', 500);
      }

      return {
        authorizationUrl: response.data.data.authorization_url,
        reference: response.data.data.reference,
      };
    } catch (error: any) {
      // Update payment gateway status to failed
      await PaymentGateway.findByIdAndUpdate(paymentGateway._id, {
        status: 'failed',
        gatewayResponse: error.response?.data || error.message,
      });

      if (error instanceof AppError) throw error;
      console.error('Paystack initialization error:', error.response?.data || error.message);
      throw new AppError('Failed to initialize payment', 500);
    }
  }

  /**
   * Verify a Paystack payment
   */
  async verifyPayment(reference: string): Promise<IPaymentGateway> {
    const paymentGateway = await PaymentGateway.findOne({ reference })
      .populate('invoice')
      .populate('tenant')
      .populate('landlord');

    if (!paymentGateway) {
      throw new AppError('Payment not found', 404);
    }

    // If already verified, return the record
    if (paymentGateway.status === 'success') {
      return paymentGateway;
    }

    try {
      // Verify with Paystack
      const response = await axios.get<PaystackVerifyResponse>(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        }
      );

      const { data } = response.data;

      // Update payment gateway record
      paymentGateway.gatewayReference = data.id.toString();
      paymentGateway.gatewayResponse = data;

      if (data.status === 'success') {
        paymentGateway.status = 'success';
        paymentGateway.paidAt = new Date(data.paid_at);

        await paymentGateway.save();

        // Process successful payment
        await this.processSuccessfulPayment(paymentGateway);
      } else if (data.status === 'failed') {
        paymentGateway.status = 'failed';
        await paymentGateway.save();
      } else {
        paymentGateway.status = 'abandoned';
        await paymentGateway.save();
      }

      return paymentGateway;
    } catch (error: any) {
      console.error('Paystack verification error:', error.response?.data || error.message);
      throw new AppError('Failed to verify payment', 500);
    }
  }

  /**
   * Process a successful payment - create transaction, update invoice, create receipt
   */
  private async processSuccessfulPayment(paymentGateway: IPaymentGateway): Promise<void> {
    const invoice = await Invoice.findById(paymentGateway.invoice)
      .populate('lease')
      .populate('tenant')
      .populate('landlord');

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    // Create transaction record
    const transaction = await Transaction.create({
      lease: invoice.lease,
      tenant: paymentGateway.tenant,
      landlord: paymentGateway.landlord,
      amount: paymentGateway.amount,
      type: 'rent',
      status: 'completed',
      paymentMethod: 'card', // Online payment
      reference: paymentGateway.reference,
      description: `Payment for invoice ${invoice.invoiceNumber}`,
      paymentDate: paymentGateway.paidAt,
      recordedBy: paymentGateway.tenant, // Auto-recorded by tenant payment
      notes: 'Online payment via Paystack',
    });

    // Update invoice
    const newAmountPaid = (invoice.amountPaid || 0) + paymentGateway.amount;
    const newAmountDue = invoice.total + (invoice.lateFee || 0) - newAmountPaid;

    // Add transaction to payments array
    invoice.payments = invoice.payments || [];
    invoice.payments.push(transaction._id);
    invoice.amountPaid = newAmountPaid;
    invoice.amountDue = newAmountDue;

    // Update status based on payment
    if (newAmountDue <= 0) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
      invoice.paymentTransaction = transaction._id;
    } else {
      invoice.status = 'partially_paid';
    }

    await invoice.save();

    // Create receipt
    await ReceiptService.createReceipt(
      transaction._id.toString(),
      paymentGateway.tenant.toString(),
      {
        transactionId: transaction._id.toString(),
        invoiceId: invoice._id.toString(),
        description: `Payment for Invoice ${invoice.invoiceNumber}`,
      }
    );
  }

  /**
   * Handle Paystack webhook
   */
  async handleWebhook(signature: string, payload: any): Promise<void> {
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', this.paystackSecretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      throw new AppError('Invalid webhook signature', 400);
    }

    const { event, data } = payload;

    if (event === 'charge.success') {
      await this.verifyPayment(data.reference);
    }
  }

  /**
   * Get payment history for a tenant
   */
  async getTenantPayments(
    tenantId: string,
    options: { page?: number; limit?: number; status?: string } = {}
  ): Promise<{ payments: IPaymentGateway[]; total: number; pages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { tenant: tenantId };
    if (options.status) query.status = options.status;

    const [payments, total] = await Promise.all([
      PaymentGateway.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('invoice', 'invoiceNumber total'),
      PaymentGateway.countDocuments(query),
    ]);

    return {
      payments,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get payment by reference
   */
  async getPaymentByReference(reference: string): Promise<IPaymentGateway | null> {
    return PaymentGateway.findOne({ reference })
      .populate('invoice')
      .populate('tenant', 'firstName lastName email')
      .populate('landlord', 'firstName lastName');
  }
}

export default new PaymentGatewayService();
