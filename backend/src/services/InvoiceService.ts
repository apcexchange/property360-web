import { Invoice, Property, User, Unit, Lease } from '../models';
import { IInvoice, InvoiceStatus } from '../types';
import { AppError } from '../middleware';

interface CreateInvoiceData {
  tenantId: string;
  propertyId: string;
  unitId?: string;
  leaseId?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    rate: number;
  }>;
  dueDate: Date;
  periodStart?: Date;
  periodEnd?: Date;
  taxRate?: number;
  notes?: string;
  internalNotes?: string;
  saveAsDraft?: boolean;
}

interface UpdateInvoiceData {
  lineItems?: Array<{
    description: string;
    quantity: number;
    rate: number;
  }>;
  dueDate?: Date;
  taxRate?: number;
  notes?: string;
  internalNotes?: string;
}

interface GetInvoicesFilters {
  status?: InvoiceStatus;
  tenantId?: string;
  propertyId?: string;
  page?: number;
  limit?: number;
}

interface InvoiceStats {
  totalDraft: number;
  totalSent: number;
  totalOverdue: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueAmount: number;
}

export class InvoiceService {
  /**
   * Generate unique invoice number: INV-YYYYMMDD-XXXX
   */
  private async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Get count of invoices created today
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await Invoice.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `INV-${dateStr}-${sequence}`;
  }

  /**
   * Calculate invoice totals from line items
   */
  private calculateTotals(
    lineItems: Array<{ quantity: number; rate: number }>,
    taxRate: number
  ): { subtotal: number; taxAmount: number; total: number } {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.rate,
      0
    );
    const taxAmount = Math.round(subtotal * taxRate);
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  }

  /**
   * Create a new invoice
   */
  async createInvoice(
    landlordId: string,
    data: CreateInvoiceData
  ): Promise<IInvoice> {
    // Verify tenant exists
    const tenant = await User.findById(data.tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    // Verify property belongs to landlord
    const property = await Property.findOne({
      _id: data.propertyId,
      owner: landlordId,
    });
    if (!property) {
      throw new AppError('Property not found or access denied', 404);
    }

    // Verify unit if provided
    if (data.unitId) {
      const unit = await Unit.findOne({
        _id: data.unitId,
        property: data.propertyId,
      });
      if (!unit) {
        throw new AppError('Unit not found', 404);
      }
    }

    // Verify lease if provided
    if (data.leaseId) {
      const lease = await Lease.findOne({
        _id: data.leaseId,
        landlord: landlordId,
      });
      if (!lease) {
        throw new AppError('Lease not found', 404);
      }
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Prepare line items with calculated amounts
    const lineItems = data.lineItems.map((item) => ({
      ...item,
      amount: item.quantity * item.rate,
    }));

    // Calculate totals
    const taxRate = data.taxRate ?? 0.075;
    const { subtotal, taxAmount, total } = this.calculateTotals(lineItems, taxRate);

    // Determine status
    const status: InvoiceStatus = data.saveAsDraft ? 'draft' : 'sent';

    // Create invoice
    const invoice = await Invoice.create({
      invoiceNumber,
      landlord: landlordId,
      tenant: data.tenantId,
      property: data.propertyId,
      unit: data.unitId,
      lease: data.leaseId,
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      total,
      issueDate: new Date(),
      dueDate: data.dueDate,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      status,
      sentAt: data.saveAsDraft ? undefined : new Date(),
      notes: data.notes,
      internalNotes: data.internalNotes,
    });

    return invoice;
  }

  /**
   * Get all invoices for a landlord with optional filters
   */
  async getInvoices(
    landlordId: string,
    filters?: GetInvoicesFilters
  ): Promise<{ invoices: IInvoice[]; total: number; pages: number }> {
    const query: Record<string, unknown> = { landlord: landlordId };

    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.tenantId) {
      query.tenant = filters.tenantId;
    }
    if (filters?.propertyId) {
      query.property = filters.propertyId;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('tenant', 'firstName lastName email phone')
        .populate('property', 'name address')
        .populate('unit', 'unitNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments(query),
    ]);

    return {
      invoices,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single invoice by ID
   */
  async getInvoiceById(invoiceId: string, landlordId: string): Promise<IInvoice> {
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      landlord: landlordId,
    })
      .populate('tenant', 'firstName lastName email phone')
      .populate('property', 'name address')
      .populate('unit', 'unitNumber')
      .populate('lease', 'startDate endDate rentAmount')
      .populate('paymentTransaction');

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    return invoice;
  }

  /**
   * Update a draft invoice
   */
  async updateInvoice(
    invoiceId: string,
    landlordId: string,
    data: UpdateInvoiceData
  ): Promise<IInvoice> {
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      landlord: landlordId,
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status !== 'draft') {
      throw new AppError('Only draft invoices can be updated', 400);
    }

    // Update line items and recalculate if provided
    if (data.lineItems) {
      invoice.lineItems = data.lineItems.map((item) => ({
        ...item,
        amount: item.quantity * item.rate,
      }));

      const taxRate = data.taxRate ?? invoice.taxRate;
      const { subtotal, taxAmount, total } = this.calculateTotals(data.lineItems, taxRate);

      invoice.subtotal = subtotal;
      invoice.taxAmount = taxAmount;
      invoice.total = total;
    }

    if (data.dueDate) invoice.dueDate = data.dueDate;
    if (data.taxRate !== undefined) invoice.taxRate = data.taxRate;
    if (data.notes !== undefined) invoice.notes = data.notes;
    if (data.internalNotes !== undefined) invoice.internalNotes = data.internalNotes;

    await invoice.save();
    return invoice;
  }

  /**
   * Send a draft invoice (change status from draft to sent)
   */
  async sendInvoice(invoiceId: string, landlordId: string): Promise<IInvoice> {
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      landlord: landlordId,
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status !== 'draft') {
      throw new AppError('Only draft invoices can be sent', 400);
    }

    invoice.status = 'sent';
    invoice.sentAt = new Date();
    await invoice.save();

    // TODO: Send email notification to tenant

    return invoice;
  }

  /**
   * Mark invoice as paid (optionally link to transaction)
   */
  async markAsPaid(
    invoiceId: string,
    landlordId: string,
    transactionId?: string
  ): Promise<IInvoice> {
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      landlord: landlordId,
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status === 'paid') {
      throw new AppError('Invoice is already marked as paid', 400);
    }

    if (invoice.status === 'cancelled') {
      throw new AppError('Cannot mark a cancelled invoice as paid', 400);
    }

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    if (transactionId) {
      invoice.paymentTransaction = transactionId as unknown as IInvoice['paymentTransaction'];
    }

    await invoice.save();
    return invoice;
  }

  /**
   * Cancel an invoice
   */
  async cancelInvoice(invoiceId: string, landlordId: string): Promise<IInvoice> {
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      landlord: landlordId,
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status === 'paid') {
      throw new AppError('Cannot cancel a paid invoice', 400);
    }

    invoice.status = 'cancelled';
    await invoice.save();

    return invoice;
  }

  /**
   * Delete a draft invoice
   */
  async deleteInvoice(invoiceId: string, landlordId: string): Promise<void> {
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      landlord: landlordId,
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status !== 'draft') {
      throw new AppError('Only draft invoices can be deleted', 400);
    }

    await Invoice.deleteOne({ _id: invoiceId });
  }

  /**
   * Check and update overdue invoices (to be called by scheduler)
   */
  async updateOverdueInvoices(): Promise<number> {
    const now = new Date();

    const result = await Invoice.updateMany(
      {
        status: 'sent',
        dueDate: { $lt: now },
      },
      {
        status: 'overdue',
      }
    );

    return result.modifiedCount;
  }

  /**
   * Get invoice statistics for dashboard
   */
  async getInvoiceStats(landlordId: string): Promise<InvoiceStats> {
    const stats = await Invoice.aggregate([
      { $match: { landlord: landlordId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' },
        },
      },
    ]);

    // Process aggregation results
    const statusMap = new Map(
      stats.map((s: { _id: string; count: number; totalAmount: number }) => [
        s._id,
        { count: s.count, amount: s.totalAmount },
      ])
    );

    const draft = statusMap.get('draft') || { count: 0, amount: 0 };
    const sent = statusMap.get('sent') || { count: 0, amount: 0 };
    const overdue = statusMap.get('overdue') || { count: 0, amount: 0 };
    const paid = statusMap.get('paid') || { count: 0, amount: 0 };

    return {
      totalDraft: draft.count,
      totalSent: sent.count,
      totalOverdue: overdue.count,
      totalPaid: paid.count,
      totalOutstanding: sent.amount + overdue.amount,
      overdueAmount: overdue.amount,
    };
  }
}

export default new InvoiceService();
