import { Receipt, Transaction, Invoice, Lease, Property, Unit } from '../models';
import { IReceipt, ITransaction } from '../types';
import { AppError } from '../middleware';

interface CreateReceiptData {
  transactionId: string;
  invoiceId?: string;
  description?: string;
}

class ReceiptService {
  /**
   * Generate a unique receipt number
   */
  private async generateReceiptNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Find the latest receipt for this month
    const latestReceipt = await Receipt.findOne({
      receiptNumber: new RegExp(`^RCPT-${year}${month}`),
    })
      .sort({ receiptNumber: -1 })
      .lean();

    let sequence = 1;
    if (latestReceipt) {
      const parts = latestReceipt.receiptNumber.split('-');
      const lastSequence = parseInt(parts[2], 10);
      sequence = lastSequence + 1;
    }

    return `RCPT-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Create a receipt for a completed transaction
   */
  async createReceipt(
    transactionId: string,
    issuedById: string,
    data?: CreateReceiptData
  ): Promise<IReceipt> {
    // Get the transaction
    const transaction = await Transaction.findById(transactionId)
      .populate('lease')
      .populate('tenant', 'firstName lastName email')
      .populate('landlord', 'firstName lastName');

    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    if (transaction.status !== 'completed') {
      throw new AppError('Receipt can only be created for completed transactions', 400);
    }

    // Check if receipt already exists for this transaction
    const existingReceipt = await Receipt.findOne({ transaction: transactionId });
    if (existingReceipt) {
      throw new AppError('Receipt already exists for this transaction', 400);
    }

    // Get lease details for property/unit
    const lease = await Lease.findById(transaction.lease)
      .populate('property', 'name')
      .populate('unit', 'unitNumber');

    if (!lease) {
      throw new AppError('Lease not found', 404);
    }

    const receiptNumber = await this.generateReceiptNumber();

    // Generate description
    let description = data?.description;
    if (!description) {
      const typeLabels: Record<string, string> = {
        rent: 'Rent Payment',
        deposit: 'Security Deposit',
        maintenance: 'Maintenance Fee',
        other: 'Payment',
      };
      description = typeLabels[transaction.type] || 'Payment';
    }

    const receipt = await Receipt.create({
      receiptNumber,
      transaction: transaction._id,
      invoice: data?.invoiceId,
      tenant: transaction.tenant,
      landlord: transaction.landlord,
      property: lease.property,
      unit: lease.unit,
      amount: transaction.amount,
      paymentMethod: transaction.paymentMethod,
      paymentDate: transaction.paymentDate,
      description,
      issuedBy: issuedById,
    });

    return receipt.populate([
      { path: 'tenant', select: 'firstName lastName email phone' },
      { path: 'landlord', select: 'firstName lastName' },
      { path: 'property', select: 'name address' },
      { path: 'unit', select: 'unitNumber' },
      { path: 'transaction' },
    ]);
  }

  /**
   * Auto-create receipt when transaction is completed
   */
  async autoCreateReceipt(transaction: ITransaction, issuedById: string): Promise<IReceipt> {
    return this.createReceipt(transaction._id.toString(), issuedById);
  }

  /**
   * Get receipt by ID
   */
  async getReceiptById(receiptId: string, userId: string): Promise<IReceipt> {
    const receipt = await Receipt.findById(receiptId)
      .populate('tenant', 'firstName lastName email phone')
      .populate('landlord', 'firstName lastName')
      .populate('property', 'name address')
      .populate('unit', 'unitNumber')
      .populate('transaction')
      .populate('invoice', 'invoiceNumber');

    if (!receipt) {
      throw new AppError('Receipt not found', 404);
    }

    // Check access (landlord, tenant, or agent)
    const isOwner =
      receipt.landlord._id.toString() === userId ||
      receipt.tenant._id.toString() === userId;

    if (!isOwner) {
      throw new AppError('Access denied', 403);
    }

    return receipt;
  }

  /**
   * Get receipt by transaction ID
   */
  async getReceiptByTransaction(transactionId: string): Promise<IReceipt | null> {
    return Receipt.findOne({ transaction: transactionId })
      .populate('tenant', 'firstName lastName email phone')
      .populate('landlord', 'firstName lastName')
      .populate('property', 'name address')
      .populate('unit', 'unitNumber')
      .populate('transaction');
  }

  /**
   * Get receipts for a tenant
   */
  async getTenantReceipts(
    tenantId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ receipts: IReceipt[]; total: number; pages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [receipts, total] = await Promise.all([
      Receipt.find({ tenant: tenantId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('property', 'name')
        .populate('unit', 'unitNumber')
        .populate('transaction'),
      Receipt.countDocuments({ tenant: tenantId }),
    ]);

    return {
      receipts,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get receipts for a landlord
   */
  async getLandlordReceipts(
    landlordId: string,
    options: { page?: number; limit?: number; tenantId?: string; propertyId?: string } = {}
  ): Promise<{ receipts: IReceipt[]; total: number; pages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { landlord: landlordId };
    if (options.tenantId) query.tenant = options.tenantId;
    if (options.propertyId) query.property = options.propertyId;

    const [receipts, total] = await Promise.all([
      Receipt.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('tenant', 'firstName lastName email')
        .populate('property', 'name')
        .populate('unit', 'unitNumber')
        .populate('transaction'),
      Receipt.countDocuments(query),
    ]);

    return {
      receipts,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Mark receipt as emailed
   */
  async markAsEmailed(receiptId: string, email: string): Promise<IReceipt> {
    const receipt = await Receipt.findByIdAndUpdate(
      receiptId,
      {
        emailedAt: new Date(),
        emailedTo: email,
      },
      { new: true }
    );

    if (!receipt) {
      throw new AppError('Receipt not found', 404);
    }

    return receipt;
  }
}

export default new ReceiptService();
