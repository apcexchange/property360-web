import { Property, Unit } from '../models';
import { IProperty, IUnit } from '../types';
import { AppError } from '../middleware';
import { paginate, getPaginationMeta } from '../utils';

interface CreatePropertyData {
  name: string;
  description?: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode?: string;
  };
  propertyType: 'apartment' | 'house' | 'commercial' | 'land';
  units?: number;
  owner: string;
  agent?: string;
  images?: string[];
  amenities?: string[];
}

interface PropertyQuery {
  page?: number;
  limit?: number;
  state?: string;
  city?: string;
  propertyType?: string;
}

export class PropertyService {
  async createProperty(data: CreatePropertyData): Promise<IProperty> {
    const property = await Property.create(data);
    return property;
  }

  async getProperties(ownerId: string, query: PropertyQuery) {
    const { page = 1, limit = 10, state, city, propertyType } = query;
    const { skip } = paginate(page, limit);

    const filter: Record<string, unknown> = { owner: ownerId, isActive: true };
    if (state) filter['address.state'] = state;
    if (city) filter['address.city'] = city;
    if (propertyType) filter.propertyType = propertyType;

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .skip(skip)
        .limit(limit)
        .populate('agent', 'firstName lastName email phone')
        .sort({ createdAt: -1 }),
      Property.countDocuments(filter),
    ]);

    // Get unit counts and occupancy for each property
    const propertyIds = properties.map(p => p._id);
    const unitStats = await Unit.aggregate([
      { $match: { property: { $in: propertyIds } } },
      {
        $group: {
          _id: '$property',
          totalUnits: { $sum: 1 },
          occupiedUnits: {
            $sum: { $cond: [{ $eq: ['$isOccupied', true] }, 1, 0] },
          },
          monthlyRevenue: {
            $sum: {
              $cond: [{ $eq: ['$isOccupied', true] }, '$rentAmount', 0],
            },
          },
        },
      },
    ]);
    const unitStatsMap = new Map(
      unitStats.map(u => [
        u._id.toString(),
        {
          totalUnits: u.totalUnits,
          occupiedUnits: u.occupiedUnits,
          monthlyRevenue: u.monthlyRevenue,
        },
      ])
    );

    // Add unit stats to each property
    const propertiesWithUnits = properties.map(p => {
      const stats = unitStatsMap.get(p._id.toString()) || {
        totalUnits: 0,
        occupiedUnits: 0,
        monthlyRevenue: 0,
      };
      const occupancyRate =
        stats.totalUnits > 0
          ? Math.round((stats.occupiedUnits / stats.totalUnits) * 100)
          : 0;
      return {
        ...p.toJSON(),
        totalUnits: stats.totalUnits,
        occupiedUnits: stats.occupiedUnits,
        occupancyRate,
        monthlyRevenue: stats.monthlyRevenue,
      };
    });

    return {
      properties: propertiesWithUnits,
      meta: getPaginationMeta(total, page, limit),
    };
  }

  async getPropertyById(propertyId: string, ownerId: string) {
    const property = await Property.findOne({ _id: propertyId, owner: ownerId })
      .populate('agent', 'firstName lastName email phone')
      .populate('owner', 'firstName lastName email phone');

    if (!property) {
      throw new AppError('Property not found', 404);
    }

    // Fetch units for this property
    const units = await Unit.find({ property: propertyId })
      .populate('tenant', 'firstName lastName email phone');

    // Calculate occupancy stats
    const totalUnits = units.length;
    const occupiedUnits = units.filter(u => u.isOccupied).length;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const monthlyRevenue = units
      .filter(u => u.isOccupied)
      .reduce((sum, u) => sum + (u.rentAmount || 0), 0);

    // Return property with units attached and stats
    const propertyObj = property.toJSON();
    return {
      ...propertyObj,
      totalUnits,
      occupiedUnits,
      occupancyRate,
      monthlyRevenue,
      units,
    };
  }

  async updateProperty(
    propertyId: string,
    ownerId: string,
    data: Partial<CreatePropertyData>
  ): Promise<IProperty> {
    const property = await Property.findOneAndUpdate(
      { _id: propertyId, owner: ownerId },
      data,
      { new: true }
    );

    if (!property) {
      throw new AppError('Property not found', 404);
    }

    return property;
  }

  async deleteProperty(propertyId: string, ownerId: string): Promise<void> {
    const property = await Property.findOneAndUpdate(
      { _id: propertyId, owner: ownerId },
      { isActive: false },
      { new: true }
    );

    if (!property) {
      throw new AppError('Property not found', 404);
    }
  }

  async addUnit(propertyId: string, ownerId: string, data: Partial<IUnit>): Promise<IUnit> {
    // Verify the property exists AND belongs to this owner
    const property = await Property.findOne({ _id: propertyId, owner: ownerId });
    if (!property) {
      throw new AppError('Property not found', 404);
    }

    const unit = await Unit.create({ ...data, property: propertyId });
    return unit;
  }

  async getUnits(propertyId: string, ownerId: string) {
    // Verify the property belongs to this owner before returning units
    const property = await Property.findOne({ _id: propertyId, owner: ownerId });
    if (!property) {
      throw new AppError('Property not found', 404);
    }

    return Unit.find({ property: propertyId }).populate('tenant', 'firstName lastName email phone');
  }

  async assignAgent(propertyId: string, ownerId: string, agentId: string): Promise<IProperty> {
    const property = await Property.findOneAndUpdate(
      { _id: propertyId, owner: ownerId },
      { agent: agentId },
      { new: true }
    );

    if (!property) {
      throw new AppError('Property not found', 404);
    }

    return property;
  }
}

export default new PropertyService();
