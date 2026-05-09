import { Types } from 'mongoose';
import { Transaction, Property, Invoice, Wallet, Payout, Lease } from '../models';
import { ITransaction } from '../types';

/**
 * Reports for landlords/agents — aggregates Transaction records into income,
 * expenses, and net profit summaries.
 *
 * NOTE on the income/expense split: the existing `Transaction` schema records
 * tenant→landlord payments only (there's no expense model yet). For reporting
 * purposes we treat:
 *   - type 'rent' and 'deposit' as INCOME
 *   - type 'maintenance' and 'other' as EXPENSE
 * This matches the product copy ("see how much goes into maintenance") even
 * though the underlying records all flow tenant→landlord. When a proper
 * Expense model is added, swap the expense source here and the rest of the
 * pipeline (CSV/PDF/mobile) stays unchanged.
 */

export type ReportPeriod = 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'last_12m';

interface SummaryFilters {
  landlordId: string;
  period?: ReportPeriod;
  from?: Date;
  to?: Date;
  propertyId?: string;
}

interface MonthlyBucket {
  monthKey: string; // YYYY-MM
  monthLabel: string; // "Jan 2026"
  income: number;
  expense: number;
  net: number;
}

interface CategoryTotal {
  key: string;
  label: string;
  amount: number;
}

export interface ReportSummary {
  period: { from: string; to: string; label: string };
  income: { total: number; byCategory: CategoryTotal[] };
  expense: { total: number; byCategory: CategoryTotal[] };
  netProfit: number;
  monthly: MonthlyBucket[];
  transactionCount: number;
}

export interface BalanceSheet {
  asOf: string;
  assets: {
    walletBalance: number;
    rentReceivable: number;
    propertyValueTotal: number;
    total: number;
  };
  liabilities: {
    depositsHeld: number;
    pendingPayouts: number;
    total: number;
  };
  equity: number;
  meta: {
    propertyCount: number;
    propertiesWithValue: number;
    openInvoiceCount: number;
  };
}

export interface CashFlowMonth {
  monthKey: string;
  monthLabel: string;
  inflow: number;
  outflow: number;
  net: number;
  runningBalance: number;
}

export interface CashFlow {
  period: { from: string; to: string; label: string };
  totals: { inflow: number; outflow: number; net: number };
  monthly: CashFlowMonth[];
}

export interface PopulatedTransaction extends Omit<ITransaction, 'tenant' | 'lease' | 'recordedBy'> {
  tenant?: { firstName?: string; lastName?: string };
  lease?: { _id: { toString(): string } };
}

const INCOME_TYPES: ReadonlyArray<ITransaction['type']> = ['rent', 'deposit'];
const EXPENSE_TYPES: ReadonlyArray<ITransaction['type']> = ['maintenance', 'other'];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TYPE_LABEL: Record<ITransaction['type'], string> = {
  rent: 'Rent',
  deposit: 'Deposit',
  maintenance: 'Maintenance',
  other: 'Other',
};

function resolvePeriod(period: ReportPeriod, now = new Date()): { from: Date; to: Date; label: string } {
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case 'this_month':
      return {
        from: new Date(year, month, 1),
        to: new Date(year, month + 1, 0, 23, 59, 59, 999),
        label: now.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }),
      };
    case 'last_month':
      return {
        from: new Date(year, month - 1, 1),
        to: new Date(year, month, 0, 23, 59, 59, 999),
        label: new Date(year, month - 1, 1).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }),
      };
    case 'this_year':
      return {
        from: new Date(year, 0, 1),
        to: new Date(year, 11, 31, 23, 59, 59, 999),
        label: `${year}`,
      };
    case 'last_year':
      return {
        from: new Date(year - 1, 0, 1),
        to: new Date(year - 1, 11, 31, 23, 59, 59, 999),
        label: `${year - 1}`,
      };
    case 'last_12m':
    default: {
      const from = new Date(year, month - 11, 1);
      return {
        from,
        to: new Date(year, month + 1, 0, 23, 59, 59, 999),
        label: 'Last 12 months',
      };
    }
  }
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(d: Date): string {
  return `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
}

class ReportsService {
  async getSummary(filters: SummaryFilters): Promise<ReportSummary> {
    const period = filters.period ?? 'this_year';
    const { from, to, label } = filters.from && filters.to
      ? { from: filters.from, to: filters.to, label: 'Custom range' }
      : resolvePeriod(period);

    const query: Record<string, unknown> = {
      landlord: new Types.ObjectId(filters.landlordId),
      status: 'completed',
      paymentDate: { $gte: from, $lte: to },
    };

    if (filters.propertyId) {
      // Property scope: filter via lease's property. Cheaper to do a join via
      // lease lookup than to denormalize property onto Transaction.
      const { Lease } = await import('../models');
      const leaseIds = (
        await Lease.find({
          property: new Types.ObjectId(filters.propertyId),
          landlord: new Types.ObjectId(filters.landlordId),
        }).select('_id')
      ).map((l) => l._id);
      query.lease = { $in: leaseIds };
    }

    const transactions = await Transaction.find(query).sort({ paymentDate: 1 });

    // Build monthly buckets from `from` to `to` so empty months still appear.
    const buckets = new Map<string, MonthlyBucket>();
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const last = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= last) {
      buckets.set(monthKey(cursor), {
        monthKey: monthKey(cursor),
        monthLabel: monthLabel(cursor),
        income: 0,
        expense: 0,
        net: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    let incomeTotal = 0;
    let expenseTotal = 0;
    const incomeByCategory = new Map<string, number>();
    const expenseByCategory = new Map<string, number>();

    for (const t of transactions) {
      const isIncome = INCOME_TYPES.includes(t.type);
      const isExpense = EXPENSE_TYPES.includes(t.type);
      if (!isIncome && !isExpense) continue;

      const dayBucketKey = monthKey(t.paymentDate ?? t.createdAt);
      const bucket = buckets.get(dayBucketKey);

      if (isIncome) {
        incomeTotal += t.amount;
        incomeByCategory.set(t.type, (incomeByCategory.get(t.type) ?? 0) + t.amount);
        if (bucket) bucket.income += t.amount;
      } else {
        expenseTotal += t.amount;
        expenseByCategory.set(t.type, (expenseByCategory.get(t.type) ?? 0) + t.amount);
        if (bucket) bucket.expense += t.amount;
      }
    }

    for (const bucket of buckets.values()) {
      bucket.net = bucket.income - bucket.expense;
    }

    return {
      period: { from: from.toISOString(), to: to.toISOString(), label },
      income: {
        total: incomeTotal,
        byCategory: Array.from(incomeByCategory.entries())
          .map(([key, amount]) => ({ key, label: TYPE_LABEL[key as ITransaction['type']] ?? key, amount }))
          .sort((a, b) => b.amount - a.amount),
      },
      expense: {
        total: expenseTotal,
        byCategory: Array.from(expenseByCategory.entries())
          .map(([key, amount]) => ({ key, label: TYPE_LABEL[key as ITransaction['type']] ?? key, amount }))
          .sort((a, b) => b.amount - a.amount),
      },
      netProfit: incomeTotal - expenseTotal,
      monthly: Array.from(buckets.values()),
      transactionCount: transactions.length,
    };
  }

  /**
   * Balance sheet snapshot as-of `asOf` (default: now).
   *
   * Assets: wallet cash + open invoice receivables + property valuations.
   * Liabilities: deposits held against active leases + pending payouts.
   * Equity = Assets − Liabilities.
   */
  async getBalanceSheet(landlordId: string, asOf: Date = new Date()): Promise<BalanceSheet> {
    const ownerId = new Types.ObjectId(landlordId);

    // Properties — sum currentValue for owner's active properties.
    const properties = await Property.find({
      owner: ownerId,
      isActive: true,
    }).select('name currentValue');

    const propertyValueTotal = properties.reduce(
      (sum, p) => sum + (p.currentValue ?? 0),
      0
    );

    // Wallet balance.
    const wallet = await Wallet.findOne({ landlord: ownerId }).select('balance');
    const walletBalance = wallet?.balance ?? 0;

    // Rent receivable: outstanding balance on issued invoices, capped at asOf.
    const openInvoices = await Invoice.find({
      landlord: ownerId,
      status: { $in: ['sent', 'overdue', 'partially_paid'] },
      issueDate: { $lte: asOf },
    }).select('amountDue');

    const rentReceivable = openInvoices.reduce((sum, inv) => sum + (inv.amountDue || 0), 0);

    // Deposits held: sum of completed deposit transactions on still-active
    // leases. Once a lease is terminated/expired, deposits are presumed
    // settled (returned or forfeited) — they leave the liability column.
    const activeLeases = await Lease.find({
      landlord: ownerId,
      status: 'active',
    }).select('_id');
    const activeLeaseIds = activeLeases.map((l) => l._id);

    const depositTxns = await Transaction.find({
      landlord: ownerId,
      lease: { $in: activeLeaseIds },
      type: 'deposit',
      status: 'completed',
      paymentDate: { $lte: asOf },
    }).select('amount');

    const depositsHeld = depositTxns.reduce((sum, t) => sum + t.amount, 0);

    // Pending payouts — money the landlord has requested to withdraw but
    // hasn't yet been transferred. Counts as a short-term liability against
    // wallet balance.
    const pendingPayouts = await Payout.find({
      landlord: ownerId,
      status: 'pending',
    }).select('amount');

    const pendingPayoutTotal = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

    const totalAssets = walletBalance + rentReceivable + propertyValueTotal;
    const totalLiabilities = depositsHeld + pendingPayoutTotal;
    const equity = totalAssets - totalLiabilities;

    const propertyCount = properties.length;
    const propertiesWithValue = properties.filter((p) => (p.currentValue ?? 0) > 0).length;

    return {
      asOf: asOf.toISOString(),
      assets: {
        walletBalance,
        rentReceivable,
        propertyValueTotal,
        total: totalAssets,
      },
      liabilities: {
        depositsHeld,
        pendingPayouts: pendingPayoutTotal,
        total: totalLiabilities,
      },
      equity,
      meta: {
        propertyCount,
        propertiesWithValue,
        openInvoiceCount: openInvoices.length,
      },
    };
  }

  /**
   * Cash flow statement for a period: monthly inflows, outflows, net, and
   * running balance starting from the wallet balance at the start of the
   * range. Used to plot a running-balance line chart.
   */
  async getCashFlow(filters: SummaryFilters): Promise<CashFlow> {
    const period = filters.period ?? 'this_year';
    const { from, to, label } = filters.from && filters.to
      ? { from: filters.from, to: filters.to, label: 'Custom range' }
      : resolvePeriod(period);

    const ownerId = new Types.ObjectId(filters.landlordId);

    // Inflows from completed rent/deposit transactions.
    const inflowTxns = await Transaction.find({
      landlord: ownerId,
      status: 'completed',
      type: { $in: INCOME_TYPES as unknown as string[] },
      paymentDate: { $gte: from, $lte: to },
    }).select('amount paymentDate');

    // Outflows = expense-type transactions + completed payouts.
    const outflowTxns = await Transaction.find({
      landlord: ownerId,
      status: 'completed',
      type: { $in: EXPENSE_TYPES as unknown as string[] },
      paymentDate: { $gte: from, $lte: to },
    }).select('amount paymentDate');

    const completedPayouts = await Payout.find({
      landlord: ownerId,
      status: 'completed',
      createdAt: { $gte: from, $lte: to },
    }).select('amount createdAt');

    // Build monthly buckets between from..to (inclusive of endpoints).
    const buckets = new Map<
      string,
      { monthKey: string; monthLabel: string; inflow: number; outflow: number; net: number; runningBalance: number }
    >();
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const last = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= last) {
      buckets.set(monthKey(cursor), {
        monthKey: monthKey(cursor),
        monthLabel: monthLabel(cursor),
        inflow: 0,
        outflow: 0,
        net: 0,
        runningBalance: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    for (const t of inflowTxns) {
      const k = monthKey(t.paymentDate ?? t.createdAt);
      const b = buckets.get(k);
      if (b) b.inflow += t.amount;
    }
    for (const t of outflowTxns) {
      const k = monthKey(t.paymentDate ?? t.createdAt);
      const b = buckets.get(k);
      if (b) b.outflow += t.amount;
    }
    for (const p of completedPayouts) {
      const k = monthKey(p.createdAt as unknown as Date);
      const b = buckets.get(k);
      if (b) b.outflow += p.amount;
    }

    // Running balance: simple cumulative net from period start.
    // (Starting from 0 keeps the chart period-relative — landlords care about
    //  the trend, not absolute cash position over all history.)
    let running = 0;
    for (const bucket of buckets.values()) {
      bucket.net = bucket.inflow - bucket.outflow;
      running += bucket.net;
      bucket.runningBalance = running;
    }

    const monthly = Array.from(buckets.values());
    const totalInflow = monthly.reduce((s, b) => s + b.inflow, 0);
    const totalOutflow = monthly.reduce((s, b) => s + b.outflow, 0);

    return {
      period: { from: from.toISOString(), to: to.toISOString(), label },
      totals: {
        inflow: totalInflow,
        outflow: totalOutflow,
        net: totalInflow - totalOutflow,
      },
      monthly,
    };
  }

  /**
   * Stream transactions in CSV form for the same query as getSummary.
   * Header columns are stable so they import cleanly into Excel/Sheets.
   */
  async getTransactionsCsv(filters: SummaryFilters): Promise<string> {
    const period = filters.period ?? 'this_year';
    const { from, to } = filters.from && filters.to
      ? { from: filters.from, to: filters.to }
      : resolvePeriod(period);

    const query: Record<string, unknown> = {
      landlord: new Types.ObjectId(filters.landlordId),
      status: 'completed',
      paymentDate: { $gte: from, $lte: to },
    };

    if (filters.propertyId) {
      const { Lease } = await import('../models');
      const leaseIds = (
        await Lease.find({
          property: new Types.ObjectId(filters.propertyId),
          landlord: new Types.ObjectId(filters.landlordId),
        }).select('_id')
      ).map((l) => l._id);
      query.lease = { $in: leaseIds };
    }

    const transactions = await Transaction.find(query)
      .populate('tenant', 'firstName lastName')
      .populate({ path: 'lease', populate: { path: 'property', select: 'name' } })
      .sort({ paymentDate: 1 });

    const escape = (v: unknown): string => {
      const s = v === undefined || v === null ? '' : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const header = [
      'Date',
      'Tenant',
      'Property',
      'Type',
      'Direction',
      'Amount (NGN)',
      'Payment method',
      'Reference',
      'Description',
    ];

    const rows = transactions.map((t) => {
      const tenant = (t.tenant as unknown as { firstName?: string; lastName?: string }) ?? {};
      const lease = (t.lease as unknown as { property?: { name?: string } }) ?? {};
      const propertyName = lease.property?.name ?? '';
      const direction = INCOME_TYPES.includes(t.type) ? 'Income' : EXPENSE_TYPES.includes(t.type) ? 'Expense' : '-';
      const date = (t.paymentDate ?? t.createdAt).toISOString().slice(0, 10);
      return [
        date,
        `${tenant.firstName ?? ''} ${tenant.lastName ?? ''}`.trim(),
        propertyName,
        TYPE_LABEL[t.type] ?? t.type,
        direction,
        t.amount,
        t.paymentMethod,
        t.reference ?? '',
        t.description ?? '',
      ].map(escape).join(',');
    });

    return [header.map(escape).join(','), ...rows].join('\n');
  }
}

export default new ReportsService();
