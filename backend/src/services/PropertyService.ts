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

    return {
      properties,
      meta: getPaginationMeta(total, page, limit),
    };
  }

  async getPropertyById(propertyId: string, ownerId: string): Promise<IProperty> {
    const property = await Property.findOne({ _id: propertyId, owner: ownerId })
      .populate('agent', 'firstName lastName email phone')
      .populate('owner', 'firstName lastName email phone');

    if (!property) {
      throw new AppError('Property not found', 404);
    }

    return property;
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

  async addUnit(propertyId: string, data: Partial<IUnit>): Promise<IUnit> {
    const property = await Property.findById(propertyId);
    if (!property) {
      throw new AppError('Property not found', 404);
    }

    const unit = await Unit.create({ ...data, property: propertyId });
    return unit;
  }

  async getUnits(propertyId: string) {
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
