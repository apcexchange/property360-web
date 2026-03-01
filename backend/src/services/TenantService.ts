import { User, Unit, Property, Lease } from '../models';
import { IUser, ILease, UserRole } from '../types';
import { AppError } from '../middleware';
import bcrypt from 'bcryptjs';

interface AssignTenantData {
  unitId: string;
  landlordId: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantFirstName: string;
  tenantLastName: string;
  leaseStartDate: Date;
  leaseEndDate: Date;
  rentAmount: number;
  paymentFrequency?: 'monthly' | 'quarterly' | 'annually';
  // One-time fees (first year only)
  securityDeposit?: number;
  cautionFee?: number;
  agentFee?: number;
  agreementFee?: number;
  legalFee?: number;
  serviceCharge?: number;
  otherFee?: number;
  otherFeeDescription?: string;
}

interface TenantWithLease {
  tenant: IUser;
  lease: ILease;
  unit: {
    id: string;
    unitNumber: string;
  };
}

export class TenantService {
  /**
   * Assign a tenant to a unit - creates tenant account if doesn't exist
   */
  async assignTenantToUnit(data: AssignTenantData): Promise<TenantWithLease> {
    const {
      unitId,
      landlordId,
      tenantEmail,
      tenantPhone,
      tenantFirstName,
      tenantLastName,
      leaseStartDate,
      leaseEndDate,
      rentAmount,
      paymentFrequency = 'monthly',
      // One-time fees
      securityDeposit = 0,
      cautionFee = 0,
      agentFee = 0,
      agreementFee = 0,
      legalFee = 0,
      serviceCharge = 0,
      otherFee = 0,
      otherFeeDescription = '',
    } = data;

    // 1. Verify the unit exists and belongs to landlord's property
    const unit = await Unit.findById(unitId).populate('property');
    if (!unit) {
      throw new AppError('Unit not found', 404);
    }

    const property = await Property.findById(unit.property);
    if (!property) {
      throw new AppError('Property not found', 404);
    }

    if (property.owner.toString() !== landlordId) {
      throw new AppError('You do not have permission to assign tenants to this property', 403);
    }

    // 2. Check if unit is already occupied
    if (unit.isOccupied) {
      throw new AppError('This unit is already occupied', 400);
    }

    // 3. Find or create tenant user
    let tenant = await User.findOne({ email: tenantEmail.toLowerCase() });

    if (tenant) {
      // Check if tenant already has an active lease
      const existingLease = await Lease.findOne({
        tenant: tenant._id,
        status: 'active',
      });
      if (existingLease) {
        throw new AppError('This tenant already has an active lease', 400);
      }
    } else {
      // Create new tenant account with temporary password
      const tempPassword = this.generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      tenant = await User.create({
        email: tenantEmail.toLowerCase(),
        phone: tenantPhone,
        firstName: tenantFirstName,
        lastName: tenantLastName,
        password: hashedPassword,
        role: UserRole.TENANT,
        isVerified: false,
        isActive: true,
      });

      // TODO: Send invitation email/SMS with temp password
    }

    // 4. Create the lease
    const lease = await Lease.create({
      property: property._id,
      unit: unit._id,
      tenant: tenant._id,
      landlord: landlordId,
      startDate: leaseStartDate,
      endDate: leaseEndDate,
      rentAmount,
      paymentFrequency,
      // One-time fees
      securityDeposit,
      cautionFee,
      agentFee,
      agreementFee,
      legalFee,
      serviceCharge,
      otherFee,
      otherFeeDescription,
      status: 'active',
    });

    // 5. Update unit to mark as occupied
    unit.isOccupied = true;
    unit.tenant = tenant._id;
    await unit.save();

    return {
      tenant: tenant as IUser,
      lease: lease as ILease,
      unit: {
        id: unit._id.toString(),
        unitNumber: unit.unitNumber,
      },
    };
  }

  /**
   * Get all tenants for a property
   */
  async getTenantsByProperty(propertyId: string, landlordId: string) {
    // Verify ownership
    const property = await Property.findOne({ _id: propertyId, owner: landlordId });
    if (!property) {
      throw new AppError('Property not found or you do not have access', 404);
    }

    // Get all units with tenants
    const units = await Unit.find({ property: propertyId, isOccupied: true })
      .populate('tenant', 'firstName lastName email phone avatar');

    // Get active leases for these units
    const leases = await Lease.find({
      property: propertyId,
      status: 'active',
    });

    // Map tenants with their unit and lease info
    const tenants = units
      .filter(unit => unit.tenant)
      .map(unit => {
        const lease = leases.find(l => l.unit.toString() === unit._id.toString());
        return {
          tenant: unit.tenant,
          unit: {
            id: unit._id,
            unitNumber: unit.unitNumber,
          },
          lease: lease ? {
            id: lease._id,
            startDate: lease.startDate,
            endDate: lease.endDate,
            rentAmount: lease.rentAmount,
            status: lease.status,
          } : null,
        };
      });

    return tenants;
  }

  /**
   * Get all tenants for a landlord (across all properties)
   */
  async getTenantsByLandlord(landlordId: string) {
    const leases = await Lease.find({ landlord: landlordId, status: 'active' })
      .populate('tenant', 'firstName lastName email phone avatar')
      .populate('property', 'name address')
      .populate('unit', 'unitNumber');

    return leases.map(lease => ({
      tenant: lease.tenant,
      property: lease.property,
      unit: lease.unit,
      lease: {
        id: lease._id,
        startDate: lease.startDate,
        endDate: lease.endDate,
        rentAmount: lease.rentAmount,
        status: lease.status,
      },
    }));
  }

  /**
   * Remove tenant from unit (terminate lease)
   */
  async removeTenantFromUnit(unitId: string, landlordId: string): Promise<void> {
    const unit = await Unit.findById(unitId);
    if (!unit) {
      throw new AppError('Unit not found', 404);
    }

    const property = await Property.findById(unit.property);
    if (!property || property.owner.toString() !== landlordId) {
      throw new AppError('You do not have permission to manage this unit', 403);
    }

    if (!unit.isOccupied || !unit.tenant) {
      throw new AppError('This unit has no tenant assigned', 400);
    }

    // Terminate active lease
    await Lease.updateOne(
      { unit: unitId, status: 'active' },
      { status: 'terminated' }
    );

    // Update unit
    unit.isOccupied = false;
    unit.tenant = undefined;
    await unit.save();
  }

  /**
   * Search for existing users that can be assigned as tenants
   */
  async searchTenants(query: string, landlordId: string) {
    if (!query || query.length < 2) {
      return [];
    }

    const users = await User.find({
      $or: [
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
      ],
      _id: { $ne: landlordId }, // Exclude the landlord
    })
      .select('firstName lastName email phone avatar role')
      .limit(10);

    // Check which users already have active leases
    const userIds = users.map(u => u._id);
    const activeLeases = await Lease.find({
      tenant: { $in: userIds },
      status: 'active',
    }).select('tenant');

    const tenantsWithActiveLeases = new Set(activeLeases.map(l => l.tenant.toString()));

    return users.map(user => ({
      ...user.toJSON(),
      hasActiveLease: tenantsWithActiveLeases.has(user._id.toString()),
    }));
  }

  /**
   * Get vacant units for a property
   */
  async getVacantUnits(propertyId: string, landlordId: string) {
    const property = await Property.findOne({ _id: propertyId, owner: landlordId });
    if (!property) {
      throw new AppError('Property not found or you do not have access', 404);
    }

    const units = await Unit.find({ property: propertyId, isOccupied: false });
    return units;
  }

  /**
   * Generate a temporary password for new tenant accounts
   */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

export default new TenantService();
