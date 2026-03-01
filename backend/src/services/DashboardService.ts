import Property from '../models/Property';
import Unit from '../models/Unit';
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

export interface RecentActivity {
  id: string;
  type: 'payment' | 'maintenance' | 'lease';
  text: string;
  time: string;
  createdAt: Date;
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

    // Calculate monthly revenue from occupied units
    const monthlyRevenue = units
      .filter((u) => u.isOccupied)
      .reduce((sum, u) => sum + (u.rentAmount || 0), 0);

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

  async getRecentActivities(userId: string): Promise<RecentActivity[]> {
    // TODO: Implement when Activity/Notification tracking is set up
    // For now, return empty array - no fake data
    return [];
  }
}

export default new DashboardService();
