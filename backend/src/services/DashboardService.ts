import Property from '../models/Property';
import Unit from '../models/Unit';
import Lease from '../models/Lease';
import TenancyAgreement from '../models/TenancyAgreement';
import { Types } from 'mongoose';

export interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  activeTenants: number;
  monthlyRevenue: number;
  pendingPayments: number;
  pendingPaymentsCount: number;
  revenueChange: number;
  newPropertiesThisMonth: number;
  newTenantsThisMonth: number;
}

export interface ActivityMetadata {
  propertyId?: string;
  propertyName?: string;
  unitId?: string;
  unitNumber?: string;
  tenantId?: string;
  tenantFirstName?: string;
  tenantLastName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  leaseId?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  leaseRentAmount?: number;
  leasePaymentFrequency?: string;
  leaseStatus?: string;
  agreementId?: string;
  tenantName?: string;
  propertyCity?: string;
  propertyState?: string;
}

export interface RecentActivity {
  id: string;
  type: 'payment' | 'maintenance' | 'lease' | 'property' | 'document';
  text: string;
  time: string;
  createdAt: Date;
  metadata?: ActivityMetadata;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

class DashboardService {
  async getStats(userId: string): Promise<DashboardStats> {
    const ownerObjectId = new Types.ObjectId(userId);

    // Get all properties owned by this user
    const properties = await Property.find({ owner: ownerObjectId, isActive: true });
    const propertyIds = properties.map((p) => p._id);

    // Get all units for these properties
    const units = await Unit.find({ property: { $in: propertyIds } });

    // Calculate stats
    const totalProperties = properties.length;
    const totalUnits = units.length;
    const occupiedUnits = units.filter((u) => u.isOccupied).length;
    const vacantUnits = totalUnits - occupiedUnits;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    // Count active tenants (unique tenants in occupied units)
    const tenantIds = units
      .filter((u) => u.isOccupied && u.tenant)
      .map((u) => u.tenant?.toString());
    const activeTenants = new Set(tenantIds).size;

    // Get active leases to calculate monthly revenue correctly based on payment frequency
    const activeLeases = await Lease.find({
      landlord: ownerObjectId,
      status: 'active',
    });

    // Calculate monthly revenue by converting all payment frequencies to monthly
    const monthlyRevenue = activeLeases.reduce((sum, lease) => {
      const rentAmount = lease.rentAmount || 0;
      const frequency = lease.paymentFrequency || 'annually';

      // Convert to monthly equivalent
      switch (frequency) {
        case 'monthly':
          return sum + rentAmount;
        case 'quarterly':
          return sum + rentAmount / 3;
        case 'annually':
          return sum + rentAmount / 12;
        default:
          return sum + rentAmount / 12; // Default to annual
      }
    }, 0);

    // For now, pending payments is placeholder - would need a Payment model
    // TODO: Implement when Payment model is available
    const pendingPayments = 0;
    const pendingPaymentsCount = 0;

    // Calculate new properties this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newPropertiesThisMonth = properties.filter(
      (p) => p.createdAt >= startOfMonth
    ).length;

    // New tenants this month - would need tenant creation date tracking
    // TODO: Implement when tenant tracking is improved
    const newTenantsThisMonth = 0;

    // Revenue change - would need historical data
    // TODO: Implement when historical revenue tracking is available
    const revenueChange = 0;

    return {
      totalProperties,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate,
      activeTenants,
      monthlyRevenue,
      pendingPayments,
      pendingPaymentsCount,
      revenueChange,
      newPropertiesThisMonth,
      newTenantsThisMonth,
    };
  }

  async getRecentActivities(userId: string, limit: number = 5): Promise<RecentActivity[]> {
    const ownerObjectId = new Types.ObjectId(userId);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activities: RecentActivity[] = [];

    // 1. Recent leases (new tenants)
    const recentLeases = await Lease.find({
      landlord: ownerObjectId,
      createdAt: { $gte: thirtyDaysAgo },
    })
      .populate('tenant', 'firstName lastName email phone')
      .populate('property', 'name address')
      .populate('unit', 'unitNumber')
      .sort({ createdAt: -1 })
      .limit(10);

    for (const lease of recentLeases) {
      const tenant = lease.tenant as any;
      const property = lease.property as any;
      const unit = lease.unit as any;

      if (tenant && property && unit) {
        activities.push({
          id: lease._id.toString(),
          type: 'lease',
          text: `${tenant.firstName} ${tenant.lastName} moved into Unit ${unit.unitNumber} at ${property.name}`,
          time: formatTimeAgo(lease.createdAt),
          createdAt: lease.createdAt,
          metadata: {
            propertyId: property._id.toString(),
            propertyName: property.name,
            propertyCity: property.address?.city || '',
            propertyState: property.address?.state || '',
            unitId: unit._id.toString(),
            unitNumber: unit.unitNumber,
            tenantId: tenant._id.toString(),
            tenantFirstName: tenant.firstName,
            tenantLastName: tenant.lastName,
            tenantEmail: tenant.email || '',
            tenantPhone: tenant.phone || '',
            leaseId: lease._id.toString(),
            leaseStartDate: lease.startDate.toISOString(),
            leaseEndDate: lease.endDate.toISOString(),
            leaseRentAmount: lease.rentAmount,
            leasePaymentFrequency: lease.paymentFrequency || 'annually',
            leaseStatus: lease.status,
          },
        });
      }
    }

    // 2. Recent properties
    const recentProperties = await Property.find({
      owner: ownerObjectId,
      createdAt: { $gte: thirtyDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(5);

    for (const property of recentProperties) {
      activities.push({
        id: property._id.toString(),
        type: 'property',
        text: `New property "${property.name}" was added`,
        time: formatTimeAgo(property.createdAt),
        createdAt: property.createdAt,
        metadata: {
          propertyId: property._id.toString(),
          propertyName: property.name,
        },
      });
    }

    // 3. Recent tenancy agreements (signed)
    const recentAgreements = await TenancyAgreement.find({
      uploadedBy: ownerObjectId,
      signingCompletedAt: { $gte: thirtyDaysAgo },
    })
      .populate('property', 'name')
      .populate('unit', 'unitNumber')
      .sort({ signingCompletedAt: -1 })
      .limit(5);

    for (const agreement of recentAgreements) {
      const property = agreement.property as any;
      const unit = agreement.unit as any;

      if (property && unit && agreement.signingCompletedAt) {
        activities.push({
          id: agreement._id.toString(),
          type: 'document',
          text: `Agreement signed for ${property.name} - Unit ${unit.unitNumber}`,
          time: formatTimeAgo(agreement.signingCompletedAt),
          createdAt: agreement.signingCompletedAt,
          metadata: {
            agreementId: agreement._id.toString(),
            propertyName: property.name,
            unitNumber: unit.unitNumber,
            tenantName: agreement.tenantName || '',
          },
        });
      }
    }

    // Sort all activities by date and return limited results
    return activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
}

export default new DashboardService();
