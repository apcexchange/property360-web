import { Unit, Property, User } from '../models';
import { AppError } from '../middleware';
import NotificationService from './NotificationService';

interface ListingFilters {
  state?: string;
  city?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  search?: string;
  page?: number;
  limit?: number;
}

interface ListUnitData {
  listingTitle?: string;
  listingDescription?: string;
  inspectionFeeEnabled?: boolean;
  inspectionFee?: number;
  virtualTourUrl?: string;
  preferredTenantType?: 'single' | 'family' | 'students' | 'professionals' | 'any';
  availableFrom?: string;
  isNegotiable?: boolean;
  reservationDays?: number;
}

class ListingService {
  /**
   * List a vacant unit on the marketplace
   */
  async listUnit(unitId: string, ownerId: string, data: ListUnitData) {
    const unit = await Unit.findById(unitId).populate('property');
    if (!unit) throw new AppError('Unit not found', 404);

    const property = await Property.findById(unit.property);
    if (!property || property.owner.toString() !== ownerId) {
      throw new AppError('You do not have permission to list this unit', 403);
    }

    if (unit.isOccupied) {
      throw new AppError('Cannot list an occupied unit', 400);
    }

    unit.isListed = true;
    unit.listingStatus = 'active';
    unit.listedAt = new Date();
    if (data.listingTitle) unit.listingTitle = data.listingTitle;
    if (data.listingDescription) unit.listingDescription = data.listingDescription;
    if (data.inspectionFeeEnabled !== undefined) unit.inspectionFeeEnabled = data.inspectionFeeEnabled;
    if (data.inspectionFee !== undefined) unit.inspectionFee = data.inspectionFee;
    if (data.virtualTourUrl !== undefined) unit.virtualTourUrl = data.virtualTourUrl;
    if (data.preferredTenantType) unit.preferredTenantType = data.preferredTenantType;
    if (data.availableFrom) unit.availableFrom = new Date(data.availableFrom);
    if (data.isNegotiable !== undefined) unit.isNegotiable = data.isNegotiable;
    if (data.reservationDays !== undefined) unit.reservationDays = data.reservationDays;
    await unit.save();

    return {
      unitId: unit._id.toString(),
      listingStatus: unit.listingStatus,
      listedAt: unit.listedAt,
    };
  }

  /**
   * Remove a unit from the marketplace
   */
  async unlistUnit(unitId: string, ownerId: string) {
    const unit = await Unit.findById(unitId);
    if (!unit) throw new AppError('Unit not found', 404);

    const property = await Property.findById(unit.property);
    if (!property || property.owner.toString() !== ownerId) {
      throw new AppError('You do not have permission to manage this unit', 403);
    }

    unit.isListed = false;
    unit.listingStatus = 'inactive';
    unit.reservedBy = undefined;
    unit.reservedAt = undefined;
    unit.reservationExpiresAt = undefined;
    unit.reservationPaymentRef = undefined;
    await unit.save();

    return { message: 'Unit unlisted successfully' };
  }

  /**
   * Update listing details
   */
  async updateListing(unitId: string, ownerId: string, data: ListUnitData) {
    const unit = await Unit.findById(unitId);
    if (!unit) throw new AppError('Unit not found', 404);

    const property = await Property.findById(unit.property);
    if (!property || property.owner.toString() !== ownerId) {
      throw new AppError('You do not have permission to manage this unit', 403);
    }

    if (data.listingTitle !== undefined) unit.listingTitle = data.listingTitle;
    if (data.listingDescription !== undefined) unit.listingDescription = data.listingDescription;
    if (data.inspectionFeeEnabled !== undefined) unit.inspectionFeeEnabled = data.inspectionFeeEnabled;
    if (data.inspectionFee !== undefined) unit.inspectionFee = data.inspectionFee;
    if (data.virtualTourUrl !== undefined) unit.virtualTourUrl = data.virtualTourUrl;
    if (data.preferredTenantType) unit.preferredTenantType = data.preferredTenantType;
    if (data.availableFrom) unit.availableFrom = new Date(data.availableFrom);
    if (data.isNegotiable !== undefined) unit.isNegotiable = data.isNegotiable;
    await unit.save();

    return { message: 'Listing updated successfully' };
  }

  /**
   * Get all active listings (PUBLIC - no auth required)
   */
  async getListings(filters: ListingFilters) {
    const { page = 1, limit = 20, state, city, propertyType, minPrice, maxPrice, bedrooms, search } = filters;
    const skip = (page - 1) * limit;

    // Build unit match
    const unitMatch: Record<string, unknown> = {
      isListed: true,
      listingStatus: 'active',
      isOccupied: false,
    };
    if (minPrice || maxPrice) {
      unitMatch.rentAmount = {};
      if (minPrice) (unitMatch.rentAmount as Record<string, number>).$gte = minPrice;
      if (maxPrice) (unitMatch.rentAmount as Record<string, number>).$lte = maxPrice;
    }
    if (bedrooms) unitMatch.bedrooms = bedrooms;

    // Aggregate pipeline
    const pipeline: any[] = [
      { $match: unitMatch },
      // Join property
      {
        $lookup: {
          from: 'properties',
          localField: 'property',
          foreignField: '_id',
          as: 'propertyData',
        },
      },
      { $unwind: '$propertyData' },
      // Only active properties
      { $match: { 'propertyData.isActive': true } },
    ];

    // Location filters
    if (state) pipeline.push({ $match: { 'propertyData.address.state': { $regex: state, $options: 'i' } } });
    if (city) pipeline.push({ $match: { 'propertyData.address.city': { $regex: city, $options: 'i' } } });
    if (propertyType) pipeline.push({ $match: { 'propertyData.propertyType': propertyType } });

    // Keyword search
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { listingTitle: { $regex: search, $options: 'i' } },
            { listingDescription: { $regex: search, $options: 'i' } },
            { 'propertyData.name': { $regex: search, $options: 'i' } },
            { 'propertyData.description': { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // Count total before pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Unit.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Project and paginate
    pipeline.push(
      { $sort: { listedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          unitNumber: 1,
          bedrooms: 1,
          bathrooms: 1,
          size: 1,
          rentAmount: 1,
          listingTitle: 1,
          listingDescription: 1,
          listingStatus: 1,
          listedAt: 1,
          defaultFees: 1,
          inspectionFee: 1,
          inspectionFeeEnabled: 1,
          virtualTourUrl: 1,
          preferredTenantType: 1,
          availableFrom: 1,
          isNegotiable: 1,
          property: {
            _id: '$propertyData._id',
            name: '$propertyData.name',
            address: '$propertyData.address',
            propertyType: '$propertyData.propertyType',
            images: '$propertyData.images',
            amenities: '$propertyData.amenities',
          },
        },
      }
    );

    const listings = await Unit.aggregate(pipeline);

    return {
      listings: listings.map(l => ({ ...l, id: l._id.toString() })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single listing detail (PUBLIC)
   */
  async getListingById(unitId: string) {
    const unit = await Unit.findById(unitId)
      .populate({
        path: 'property',
        select: 'name description address propertyType images amenities owner',
        populate: {
          path: 'owner',
          select: 'firstName lastName avatar',
        },
      });

    if (!unit || !unit.isListed) {
      throw new AppError('Listing not found', 404);
    }

    return unit;
  }

  /**
   * Get landlord's own listings
   */
  async getLandlordListings(ownerId: string, statusFilter?: string) {
    const properties = await Property.find({ owner: ownerId, isActive: true }).select('_id');
    const propertyIds = properties.map(p => p._id);

    const filter: Record<string, unknown> = {
      property: { $in: propertyIds },
      isListed: true,
    };
    if (statusFilter) filter.listingStatus = statusFilter;

    const units = await Unit.find(filter)
      .populate('property', 'name address images')
      .populate('reservedBy', 'firstName lastName email phone')
      .sort({ listedAt: -1 });

    return units;
  }

  /**
   * Reserve a unit after payment
   */
  async reserveUnit(unitId: string, tenantId: string, paymentRef: string) {
    const unit = await Unit.findById(unitId)
      .populate('property', 'name');

    if (!unit) throw new AppError('Unit not found', 404);
    if (!unit.isListed || unit.listingStatus !== 'active') {
      throw new AppError('This unit is no longer available', 400);
    }

    unit.listingStatus = 'reserved';
    unit.reservedBy = tenantId as any;
    unit.reservedAt = new Date();
    unit.reservationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    unit.reservationPaymentRef = paymentRef;
    await unit.save();

    // Notify landlord
    const property = await Property.findById(unit.property);
    const tenant = await User.findById(tenantId).select('firstName lastName');
    const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'A tenant';

    if (property) {
      NotificationService.createNotification(
        property.owner.toString(),
        'Unit Reserved',
        `${tenantName} has reserved Unit ${unit.unitNumber} at ${property.name}. Review and assign the tenant.`,
        'marketplace',
        { unitId: unit._id.toString(), tenantId, paymentRef }
      ).catch(err => console.error('[ListingService] Failed to notify landlord:', err));
    }

    return {
      unitId: unit._id.toString(),
      listingStatus: 'reserved',
      reservedAt: unit.reservedAt,
      reservationExpiresAt: unit.reservationExpiresAt,
    };
  }
}

export default new ListingService();
