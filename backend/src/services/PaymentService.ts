import { Transaction, Lease, Property } from '../models';
import { ITransaction } from '../types';
import { AppError } from '../middleware';

interface RecordPaymentData {
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'mobile_money' | 'other';
  paymentDate?: Date;
  reference?: string;
  description?: string;
  notes?: string;
  type?: 'rent' | 'deposit' | 'maintenance' | 'other';
}

interface LeaseBalance {
  totalDue: number;
  totalPaid: number;
  outstanding: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  percentagePaid: number;
  lastPaymentDate: Date | null;
  lastPaymentAmount: number | null;
}

export class PaymentService {
  /**
   * Record a payment for a lease
   */
  async recordPayment(
    leaseId: string,
    landlordId: string,
    data: RecordPaymentData
  ): Promise<ITransaction> {
    // Find the lease and verify ownership
    const lease = await Lease.findById(leaseId)
      .populate('property')
      .populate('tenant', 'firstName lastName email phone');

    if (!lease) {
      throw new AppError('Lease not found', 404);
    }

    // Verify the landlord owns this lease
    if (lease.landlord.toString() !== landlordId) {
      throw new AppError('You do not have permission to record payments for this lease', 403);
    }

    // Create the transaction
    const transaction = await Transaction.create({
      lease: leaseId,
      tenant: lease.tenant._id,
      landlord: landlordId,
      amount: data.amount,
      type: data.type || 'rent',
      status: 'completed',
      paymentMethod: data.paymentMethod,
      paymentDate: data.paymentDate || new Date(),
      reference: data.reference,
      description: data.description,
      notes: data.notes,
      recordedBy: landlordId,
    });

    return transaction;
  }

  /**
   * Get payment history for a lease
   */
  async getPaymentHistory(leaseId: string, landlordId: string): Promise<ITransaction[]> {
    // Verify the lease exists and belongs to this landlord
    const lease = await Lease.findById(leaseId);

    if (!lease) {
      throw new AppError('Lease not found', 404);
    }

    if (lease.landlord.toString() !== landlordId) {
      throw new AppError('You do not have permission to view payments for this lease', 403);
    }

    // Get all transactions for this lease, sorted by payment date
    const payments = await Transaction.find({
      lease: leaseId,
      status: { $in: ['completed', 'pending'] }, // Exclude voided payments
    })
      .populate('recordedBy', 'firstName lastName')
      .sort({ paymentDate: -1 });

    return payments;
  }

  /**
   * Calculate outstanding balance for a lease
   */
  async getLeaseBalance(leaseId: string, landlordId: string): Promise<LeaseBalance> {
    // Verify the lease exists and belongs to this landlord
    const lease = await Lease.findById(leaseId);

    if (!lease) {
      throw new AppError('Lease not found', 404);
    }

    if (lease.landlord.toString() !== landlordId) {
      throw new AppError('You do not have permission to view this lease balance', 403);
    }

    // Calculate total due based on lease duration and payment frequency
    const totalDue = this.calculateTotalDue(lease);

    // Get total paid (only completed payments, excluding voided)
    const payments = await Transaction.find({
      lease: leaseId,
      type: 'rent', // Only rent payments count toward rent balance
      status: 'completed',
    }).sort({ paymentDate: -1 });

    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const outstanding = Math.max(0, totalDue - totalPaid);
    const percentagePaid = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

    // Determine payment status
    let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (totalPaid >= totalDue) {
      paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'partial';
    }

    // Get last payment info
    const lastPayment = payments[0];

    return {
      totalDue,
      totalPaid,
      outstanding,
      paymentStatus,
      percentagePaid,
      lastPaymentDate: lastPayment ? lastPayment.paymentDate : null,
      lastPaymentAmount: lastPayment ? lastPayment.amount : null,
    };
  }

  /**
   * Calculate total rent due based on lease duration and payment frequency
   */
  private calculateTotalDue(lease: any): number {
    const today = new Date();
    const startDate = new Date(lease.startDate);
    const endDate = new Date(lease.endDate);

    // If lease hasn't started yet, nothing is due
    if (today < startDate) {
      return 0;
    }

    // Calculate months elapsed since lease start (capped at lease end)
    const effectiveEndDate = today > endDate ? endDate : today;
    const monthsElapsed = this.getMonthsBetween(startDate, effectiveEndDate);

    // Calculate total due based on payment frequency
    switch (lease.paymentFrequency) {
      case 'monthly':
        // Each month, rentAmount is due
        return lease.rentAmount * monthsElapsed;

      case 'quarterly':
        // Each quarter (3 months), rentAmount is due
        const quartersElapsed = Math.ceil(monthsElapsed / 3);
        return lease.rentAmount * quartersElapsed;

      case 'annually':
        // For annual, the full rent is due at lease start
        // Additional rent is due each year anniversary
        const yearsElapsed = Math.ceil(monthsElapsed / 12);
        return lease.rentAmount * yearsElapsed;

      default:
        return lease.rentAmount;
    }
  }

  /**
   * Get number of months between two dates (rounded up)
   */
  private getMonthsBetween(startDate: Date, endDate: Date): number {
    const months =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());

    // Add 1 to include the starting month (rent is due from day 1)
    return Math.max(1, months + 1);
  }

  /**
   * Void a payment (soft delete)
   */
  async voidPayment(
    leaseId: string,
    paymentId: string,
    landlordId: string,
    reason: string
  ): Promise<ITransaction> {
    // Verify the lease exists and belongs to this landlord
    const lease = await Lease.findById(leaseId);

    if (!lease) {
      throw new AppError('Lease not found', 404);
    }

    if (lease.landlord.toString() !== landlordId) {
      throw new AppError('You do not have permission to void payments for this lease', 403);
    }

    // Find and void the payment
    const payment = await Transaction.findOneAndUpdate(
      {
        _id: paymentId,
        lease: leaseId,
        status: { $ne: 'voided' }, // Can't void already voided payments
      },
      {
        status: 'voided',
        voidedAt: new Date(),
        voidedBy: landlordId,
        voidReason: reason,
      },
      { new: true }
    );

    if (!payment) {
      throw new AppError('Payment not found or already voided', 404);
    }

    return payment;
  }
}

export default new PaymentService();
