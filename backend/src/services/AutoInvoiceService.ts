import { Lease, Invoice, User, Property, Unit } from '../models';
import { ILease, IInvoice } from '../types';
import { InvoiceService } from './InvoiceService';
import EmailOtpService from './EmailOtpService';

interface GeneratedInvoice {
  invoice: IInvoice;
  lease: ILease;
}

class AutoInvoiceService {
  /**
   * Calculate the next invoice date based on payment frequency
   */
  private calculateNextInvoiceDate(currentDate: Date, frequency: string): Date {
    const next = new Date(currentDate);

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
      default:
        next.setMonth(next.getMonth() + 1);
    }

    return next;
  }

  /**
   * Calculate billing period based on payment frequency
   */
  private calculateBillingPeriod(
    startDate: Date,
    frequency: string
  ): { periodStart: Date; periodEnd: Date } {
    const periodStart = new Date(startDate);
    const periodEnd = new Date(startDate);

    switch (frequency) {
      case 'monthly':
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(periodEnd.getDate() - 1);
        break;
      case 'quarterly':
        periodEnd.setMonth(periodEnd.getMonth() + 3);
        periodEnd.setDate(periodEnd.getDate() - 1);
        break;
      case 'annually':
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        periodEnd.setDate(periodEnd.getDate() - 1);
        break;
      default:
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(periodEnd.getDate() - 1);
    }

    return { periodStart, periodEnd };
  }

  /**
   * Calculate due date based on grace period
   */
  private calculateDueDate(periodStart: Date, graceDays: number): Date {
    const dueDate = new Date(periodStart);
    dueDate.setDate(dueDate.getDate() + graceDays);
    return dueDate;
  }

  /**
   * Generate invoice for a single lease
   */
  async generateInvoiceForLease(lease: ILease): Promise<IInvoice | null> {
    // Skip if auto-generate is disabled
    if (!lease.autoGenerateInvoice) {
      return null;
    }

    // Skip if lease is not active
    if (lease.status !== 'active') {
      return null;
    }

    // Skip if lease has ended
    if (new Date(lease.endDate) < new Date()) {
      return null;
    }

    const now = new Date();
    const nextInvoiceDate = lease.nextInvoiceDate ? new Date(lease.nextInvoiceDate) : new Date(lease.startDate);

    // Skip if not yet time for next invoice
    if (nextInvoiceDate > now) {
      return null;
    }

    const { periodStart, periodEnd } = this.calculateBillingPeriod(
      nextInvoiceDate,
      lease.paymentFrequency
    );

    const dueDate = this.calculateDueDate(periodStart, lease.gracePeriodDays || 3);

    // Get frequency label for description
    const frequencyLabels: Record<string, string> = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annually: 'Annual',
    };
    const frequencyLabel = frequencyLabels[lease.paymentFrequency] || 'Monthly';

    // Format period for description
    const formatDate = (date: Date) => date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    // Create invoice
    const invoiceData = {
      tenantId: lease.tenant.toString(),
      propertyId: lease.property.toString(),
      unitId: lease.unit.toString(),
      leaseId: lease._id.toString(),
      lineItems: [
        {
          description: `${frequencyLabel} Rent (${formatDate(periodStart)} - ${formatDate(periodEnd)})`,
          quantity: 1,
          rate: lease.rentAmount,
        },
      ],
      dueDate: dueDate.toISOString(),
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      saveAsDraft: false, // Auto-generated invoices are sent immediately
    };

    const invoice = await InvoiceService.createInvoice(lease.landlord.toString(), invoiceData);

    // Update lease with next invoice date
    const nextDate = this.calculateNextInvoiceDate(nextInvoiceDate, lease.paymentFrequency);
    await Lease.findByIdAndUpdate(lease._id, {
      nextInvoiceDate: nextDate,
    });

    return invoice;
  }

  /**
   * Generate invoices for all eligible leases
   * This should be run by a scheduled job (e.g., daily at midnight)
   */
  async generateAllPendingInvoices(): Promise<GeneratedInvoice[]> {
    const now = new Date();

    // Find all active leases with auto-generate enabled
    // where nextInvoiceDate is today or earlier
    const leases = await Lease.find({
      status: 'active',
      autoGenerateInvoice: true,
      endDate: { $gt: now },
      $or: [
        { nextInvoiceDate: { $lte: now } },
        { nextInvoiceDate: { $exists: false } },
      ],
    })
      .populate('tenant', 'firstName lastName email')
      .populate('landlord', 'firstName lastName')
      .populate('property', 'name')
      .populate('unit', 'unitNumber');

    const generatedInvoices: GeneratedInvoice[] = [];

    for (const lease of leases) {
      try {
        const invoice = await this.generateInvoiceForLease(lease);
        if (invoice) {
          generatedInvoices.push({ invoice, lease });

          // Send notification email to tenant
          const tenant = await User.findById(lease.tenant);
          const property = await Property.findById(lease.property);
          const unit = await Unit.findById(lease.unit);

          if (tenant && property) {
            // Send invoice email notification
            await EmailOtpService.sendPaymentReminder(
              tenant.email,
              tenant.firstName,
              lease.rentAmount,
              '', // landlord name
              property.name,
              unit?.unitNumber || ''
            );
          }
        }
      } catch (error) {
        console.error(`Failed to generate invoice for lease ${lease._id}:`, error);
        // Continue with other leases
      }
    }

    console.log(`[AutoInvoice] Generated ${generatedInvoices.length} invoices`);
    return generatedInvoices;
  }

  /**
   * Apply late fees to overdue invoices
   * This should be run by a scheduled job (e.g., daily)
   */
  async applyLateFees(): Promise<number> {
    const now = new Date();
    let updatedCount = 0;

    // Find overdue invoices that haven't had late fees applied yet
    const overdueInvoices = await Invoice.find({
      status: { $in: ['sent', 'partially_paid', 'overdue'] },
      dueDate: { $lt: now },
      lateFeeAppliedAt: { $exists: false },
    }).populate('lease');

    for (const invoice of overdueInvoices) {
      try {
        if (!invoice.lease) continue;

        const lease = await Lease.findById(invoice.lease);
        if (!lease || lease.lateFeeType === 'none') continue;

        // Check if grace period has passed
        const gracePeriodEnd = new Date(invoice.dueDate);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (lease.gracePeriodDays || 0));

        if (now <= gracePeriodEnd) continue;

        // Calculate late fee
        let lateFee = 0;
        if (lease.lateFeeType === 'fixed') {
          lateFee = lease.lateFeeValue;
        } else if (lease.lateFeeType === 'percentage') {
          lateFee = (invoice.total * lease.lateFeeValue) / 100;
        }

        if (lateFee > 0) {
          // Update invoice with late fee
          invoice.lateFee = lateFee;
          invoice.lateFeeAppliedAt = now;
          invoice.amountDue = (invoice.amountDue || invoice.total) + lateFee;
          invoice.status = 'overdue';
          await invoice.save();

          updatedCount++;
        }
      } catch (error) {
        console.error(`Failed to apply late fee to invoice ${invoice._id}:`, error);
      }
    }

    console.log(`[AutoInvoice] Applied late fees to ${updatedCount} invoices`);
    return updatedCount;
  }

  /**
   * Enable auto-invoice for a lease
   */
  async enableAutoInvoice(
    leaseId: string,
    landlordId: string,
    options: {
      gracePeriodDays?: number;
      lateFeeType?: 'none' | 'fixed' | 'percentage';
      lateFeeValue?: number;
    } = {}
  ): Promise<ILease> {
    const lease = await Lease.findOne({
      _id: leaseId,
      landlord: landlordId,
    });

    if (!lease) {
      throw new Error('Lease not found');
    }

    // Set next invoice date if not set
    let nextInvoiceDate = lease.nextInvoiceDate;
    if (!nextInvoiceDate) {
      // Find the next billing cycle start
      const now = new Date();
      let next = new Date(lease.startDate);

      while (next < now) {
        next = this.calculateNextInvoiceDate(next, lease.paymentFrequency);
      }

      nextInvoiceDate = next;
    }

    lease.autoGenerateInvoice = true;
    lease.nextInvoiceDate = nextInvoiceDate;
    lease.gracePeriodDays = options.gracePeriodDays ?? lease.gracePeriodDays ?? 3;
    lease.lateFeeType = options.lateFeeType ?? lease.lateFeeType ?? 'none';
    lease.lateFeeValue = options.lateFeeValue ?? lease.lateFeeValue ?? 0;

    await lease.save();
    return lease;
  }

  /**
   * Disable auto-invoice for a lease
   */
  async disableAutoInvoice(leaseId: string, landlordId: string): Promise<ILease> {
    const lease = await Lease.findOneAndUpdate(
      { _id: leaseId, landlord: landlordId },
      { autoGenerateInvoice: false },
      { new: true }
    );

    if (!lease) {
      throw new Error('Lease not found');
    }

    return lease;
  }
}

export default new AutoInvoiceService();
