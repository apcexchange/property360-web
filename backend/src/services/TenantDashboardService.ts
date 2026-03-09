import { User, Lease, Property, Unit, Transaction, MaintenanceRequest, Invoice, Receipt } from '../models';
import { IUser, ILease, ITransaction, IMaintenanceRequest, IInvoice, IReceipt } from '../types';
import { AppError } from '../middleware';

interface TenantLeaseInfo {
  lease: {
    id: string;
    startDate: Date;
    endDate: Date;
    rentAmount: number;
    paymentFrequency: string;
    status: string;
  };
  property: {
    id: string;
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
    };
  };
  unit: {
    id: string;
    unitNumber: string;
    bedrooms: number;
    bathrooms: number;
  };
  landlord: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

interface PaymentSummary {
  monthlyRent: number;
  nextDueDate: Date | null;
  daysUntilDue: number;
  totalPaid: number;
  outstandingBalance: number;
}

export class TenantDashboardService {
  /**
   * Get tenant's active lease info with property, unit, and landlord details
   */
  async getTenantLeaseInfo(tenantId: string): Promise<TenantLeaseInfo | null> {
    const lease = await Lease.findOne({
      tenant: tenantId,
      status: 'active',
    })
      .populate('property', 'name address')
      .populate('unit', 'unitNumber bedrooms bathrooms')
      .populate('landlord', 'firstName lastName email phone');

    if (!lease) {
      return null;
    }

    const property = lease.property as any;
    const unit = lease.unit as any;
    const landlord = lease.landlord as any;

    return {
      lease: {
        id: lease._id.toString(),
        startDate: lease.startDate,
        endDate: lease.endDate,
        rentAmount: lease.rentAmount,
        paymentFrequency: lease.paymentFrequency,
        status: lease.status,
      },
      property: {
        id: property._id.toString(),
        name: property.name,
        address: property.address,
      },
      unit: {
        id: unit._id.toString(),
        unitNumber: unit.unitNumber,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
      },
      landlord: {
        id: landlord._id.toString(),
        firstName: landlord.firstName,
        lastName: landlord.lastName,
        email: landlord.email,
        phone: landlord.phone,
      },
    };
  }

  /**
   * Get payment summary for tenant
   */
  async getPaymentSummary(tenantId: string): Promise<PaymentSummary> {
    const lease = await Lease.findOne({
      tenant: tenantId,
      status: 'active',
    });

    if (!lease) {
      return {
        monthlyRent: 0,
        nextDueDate: null,
        daysUntilDue: 0,
        totalPaid: 0,
        outstandingBalance: 0,
      };
    }

    // Calculate total paid for this lease
    const payments = await Transaction.find({
      lease: lease._id,
      tenant: tenantId,
      status: 'completed',
    });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    // Calculate expected payments based on lease duration and payment frequency
    const now = new Date();
    const leaseStart = new Date(lease.startDate);
    const monthsElapsed = this.getMonthsDifference(leaseStart, now);

    let expectedPayments = 0;
    switch (lease.paymentFrequency) {
      case 'monthly':
        expectedPayments = Math.ceil(monthsElapsed) * lease.rentAmount;
        break;
      case 'quarterly':
        expectedPayments = Math.ceil(monthsElapsed / 3) * (lease.rentAmount * 3);
        break;
      case 'annually':
        expectedPayments = Math.ceil(monthsElapsed / 12) * (lease.rentAmount * 12);
        break;
    }

    // Calculate next due date based on payment frequency
    const nextDueDate = this.calculateNextDueDate(lease.startDate, lease.paymentFrequency);
    const daysUntilDue = nextDueDate ? Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      monthlyRent: lease.rentAmount,
      nextDueDate,
      daysUntilDue: Math.max(0, daysUntilDue),
      totalPaid,
      outstandingBalance: Math.max(0, expectedPayments - totalPaid),
    };
  }

  /**
   * Get payment history for tenant
   */
  async getPaymentHistory(
    tenantId: string,
    filters?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ payments: ITransaction[]; total: number }> {
    const lease = await Lease.findOne({
      tenant: tenantId,
      status: { $in: ['active', 'expired', 'terminated'] },
    });

    if (!lease) {
      return { payments: [], total: 0 };
    }

    const query: any = {
      lease: lease._id,
      tenant: tenantId,
    };

    if (filters?.status) {
      query.status = filters.status;
    }

    const total = await Transaction.countDocuments(query);
    const payments = await Transaction.find(query)
      .sort({ paymentDate: -1 })
      .skip(filters?.offset || 0)
      .limit(filters?.limit || 20);

    return { payments, total };
  }

  /**
   * Get upcoming payments for tenant
   * Returns invoices that are due or upcoming for online payment
   */
  async getUpcomingPayments(tenantId: string): Promise<any[]> {
    const lease = await Lease.findOne({
      tenant: tenantId,
      status: 'active',
    });

    if (!lease) {
      return [];
    }

    // Get invoices for this tenant that are not fully paid
    const invoices = await Invoice.find({
      tenant: tenantId,
      status: { $in: ['sent', 'partially_paid', 'overdue'] },
    }).sort({ dueDate: 1 });

    // Convert invoices to upcoming payment format
    const upcomingPayments = invoices.map((invoice) => ({
      dueDate: invoice.dueDate,
      amount: invoice.amountDue || invoice.total,
      status: invoice.status === 'overdue' ? 'overdue' : 'pending',
      paymentId: invoice._id.toString(), // Invoice ID for payment
      invoiceNumber: invoice.invoiceNumber,
    }));

    // If no invoices found, fall back to payment schedule
    if (upcomingPayments.length === 0) {
      const scheduledPayments = [];
      let dueDate = this.calculateNextDueDate(lease.startDate, lease.paymentFrequency);

      for (let i = 0; i < 3 && dueDate && dueDate <= lease.endDate; i++) {
        // Check if this payment has been made
        const existingPayment = await Transaction.findOne({
          lease: lease._id,
          paymentDate: {
            $gte: this.getPaymentPeriodStart(dueDate, lease.paymentFrequency),
            $lte: dueDate,
          },
          status: 'completed',
        });

        if (!existingPayment) {
          scheduledPayments.push({
            dueDate,
            amount: lease.rentAmount,
            status: dueDate < new Date() ? 'overdue' : 'pending',
            paymentId: null, // No invoice yet
          });
        }

        dueDate = this.getNextPaymentDate(dueDate, lease.paymentFrequency);
      }

      return scheduledPayments;
    }

    return upcomingPayments;
  }

  /**
   * Get tenant's receipts
   */
  async getTenantReceipts(
    tenantId: string,
    filters?: {
      limit?: number;
      page?: number;
    }
  ): Promise<{ receipts: IReceipt[]; total: number; pages: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const query = { tenant: tenantId };

    const [receipts, total] = await Promise.all([
      Receipt.find(query)
        .populate('property', 'name')
        .populate('unit', 'unitNumber')
        .sort({ issuedAt: -1 })
        .skip(skip)
        .limit(limit),
      Receipt.countDocuments(query),
    ]);

    return {
      receipts,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single receipt
   */
  async getTenantReceipt(receiptId: string, tenantId: string): Promise<IReceipt | null> {
    return Receipt.findOne({
      _id: receiptId,
      tenant: tenantId,
    })
      .populate('property', 'name address')
      .populate('unit', 'unitNumber')
      .populate('transaction');
  }

  /**
   * Get maintenance requests for tenant
   */
  async getMaintenanceRequests(
    tenantId: string,
    filters?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ requests: IMaintenanceRequest[]; total: number }> {
    const query: any = { tenant: tenantId };

    if (filters?.status) {
      query.status = filters.status;
    }

    const total = await MaintenanceRequest.countDocuments(query);
    const requests = await MaintenanceRequest.find(query)
      .populate('property', 'name')
      .populate('unit', 'unitNumber')
      .sort({ createdAt: -1 })
      .skip(filters?.offset || 0)
      .limit(filters?.limit || 20);

    return { requests, total };
  }

  /**
   * Create a maintenance request
   */
  async createMaintenanceRequest(
    tenantId: string,
    data: {
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      images?: string[];
    }
  ): Promise<IMaintenanceRequest> {
    // Get tenant's active lease to determine property and unit
    const lease = await Lease.findOne({
      tenant: tenantId,
      status: 'active',
    });

    if (!lease) {
      throw new AppError('No active lease found', 400);
    }

    const request = await MaintenanceRequest.create({
      property: lease.property,
      unit: lease.unit,
      tenant: tenantId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      images: data.images || [],
      status: 'pending',
    });

    return request;
  }

  /**
   * Cancel a maintenance request
   */
  async cancelMaintenanceRequest(
    requestId: string,
    tenantId: string
  ): Promise<IMaintenanceRequest> {
    const request = await MaintenanceRequest.findOne({
      _id: requestId,
      tenant: tenantId,
    });

    if (!request) {
      throw new AppError('Maintenance request not found', 404);
    }

    if (request.status !== 'pending') {
      throw new AppError('Only pending requests can be cancelled', 400);
    }

    request.status = 'cancelled';
    await request.save();

    return request;
  }

  /**
   * Get a single maintenance request
   */
  async getMaintenanceRequestById(
    requestId: string,
    tenantId: string
  ): Promise<IMaintenanceRequest | null> {
    const request = await MaintenanceRequest.findOne({
      _id: requestId,
      tenant: tenantId,
    })
      .populate('property', 'name address')
      .populate('unit', 'unitNumber');

    return request;
  }

  // Helper methods
  private getMonthsDifference(start: Date, end: Date): number {
    const months = (end.getFullYear() - start.getFullYear()) * 12;
    return months + end.getMonth() - start.getMonth() + 1;
  }

  private calculateNextDueDate(leaseStart: Date, frequency: string): Date | null {
    const now = new Date();
    const start = new Date(leaseStart);
    let nextDue = new Date(start);

    while (nextDue <= now) {
      switch (frequency) {
        case 'monthly':
          nextDue.setMonth(nextDue.getMonth() + 1);
          break;
        case 'quarterly':
          nextDue.setMonth(nextDue.getMonth() + 3);
          break;
        case 'annually':
          nextDue.setFullYear(nextDue.getFullYear() + 1);
          break;
      }
    }

    return nextDue;
  }

  private getNextPaymentDate(current: Date, frequency: string): Date {
    const next = new Date(current);
    switch (frequency) {
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'annually':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }

  private getPaymentPeriodStart(dueDate: Date, frequency: string): Date {
    const start = new Date(dueDate);
    switch (frequency) {
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarterly':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'annually':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    return start;
  }
}

export default new TenantDashboardService();
