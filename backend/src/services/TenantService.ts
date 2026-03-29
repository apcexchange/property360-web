import { User, Unit, Property, Lease, Transaction } from '../models';
import { IUser, ILease, UserRole, IGuarantor, IEmergencyContact } from '../types';
import { AppError } from '../middleware';
import emailOtpService from './EmailOtpService';
import otpService from './OtpService';
import NotificationService from './NotificationService';

interface AssignTenantData {
  unitId: string;
  landlordId: string;
  assignedById?: string; // The user (landlord or agent) who assigned the tenant - defaults to landlordId
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
      assignedById = landlordId, // Default to landlord if not specified (agent case will pass this)
      tenantEmail,
      tenantPhone,
      tenantFirstName,
      tenantLastName,
      leaseStartDate,
      leaseEndDate,
      rentAmount,
      paymentFrequency = 'annually',
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

    // 2. Check if unit is already occupied or has a pending invitation
    if (unit.isOccupied) {
      throw new AppError('This unit is already occupied', 400);
    }

    const pendingLeaseForUnit = await Lease.findOne({
      unit: unitId,
      status: 'pending',
    });
    if (pendingLeaseForUnit) {
      throw new AppError('This unit already has a pending lease invitation', 400);
    }

    // 3. Find or create tenant user
    let tenant = await User.findOne({ email: tenantEmail.toLowerCase() });

    if (tenant) {
      // Check if tenant already has an active or pending lease
      const existingLease = await Lease.findOne({
        tenant: tenant._id,
        status: { $in: ['active', 'pending'] },
      });
      if (existingLease) {
        const msg = existingLease.status === 'active'
          ? 'This tenant already has an active lease'
          : 'This tenant already has a pending lease invitation';
        throw new AppError(msg, 400);
      }
    } else {
      // Create new tenant account with temporary password
      // Note: Don't hash here - the User model's pre-save hook handles hashing
      const tempPassword = this.generateTempPassword();

      tenant = await User.create({
        email: tenantEmail.toLowerCase(),
        phone: tenantPhone,
        firstName: tenantFirstName,
        lastName: tenantLastName,
        password: tempPassword,
        role: UserRole.TENANT,
        isVerified: false,
        isActive: true,
      });

      // Get landlord name for notifications
      const landlord = await User.findById(landlordId).select('firstName lastName');
      const landlordName = landlord
        ? `${landlord.firstName} ${landlord.lastName}`
        : 'Your landlord';

      // Send invitation email and SMS (don't await to avoid blocking)
      this.sendTenantNotifications({
        email: tenantEmail.toLowerCase(),
        phone: tenantPhone,
        firstName: tenantFirstName,
        tempPassword,
        landlordName,
        propertyName: property.name,
        unitNumber: unit.unitNumber,
      }).catch(err => {
        console.error('[TenantService] Failed to send tenant notifications:', err);
      });
    }

    // 4. Create the lease as pending (invitation)
    const lease = await Lease.create({
      property: property._id,
      unit: unit._id,
      tenant: tenant._id,
      landlord: landlordId,
      assignedBy: assignedById,
      startDate: leaseStartDate,
      endDate: leaseEndDate,
      rentAmount,
      paymentFrequency,
      securityDeposit,
      cautionFee,
      agentFee,
      agreementFee,
      legalFee,
      serviceCharge,
      otherFee,
      otherFeeDescription,
      status: 'pending',
    });

    // 5. Unit stays unoccupied until tenant accepts the invitation

    // 6. Get landlord name for notifications
    const landlordUser = await User.findById(landlordId).select('firstName lastName');
    const landlordName = landlordUser
      ? `${landlordUser.firstName} ${landlordUser.lastName}`
      : 'Your landlord';

    // 7. Create in-app notification for tenant
    NotificationService.createNotification(
      tenant._id.toString(),
      'New Lease Invitation',
      `${landlordName} has invited you to lease Unit ${unit.unitNumber} at ${property.name}. Review the details and accept or decline.`,
      'invitation',
      {
        leaseId: lease._id.toString(),
        propertyName: property.name,
        unitNumber: unit.unitNumber,
        landlordName,
      }
    ).catch(err => console.error('[TenantService] Failed to create tenant notification:', err));

    // 8. Create in-app notification for landlord
    NotificationService.createNotification(
      landlordId,
      'Lease Invitation Sent',
      `Lease invitation sent to ${tenantFirstName} ${tenantLastName} for Unit ${unit.unitNumber} at ${property.name}.`,
      'invitation',
      {
        leaseId: lease._id.toString(),
        tenantName: `${tenantFirstName} ${tenantLastName}`,
        propertyName: property.name,
        unitNumber: unit.unitNumber,
      }
    ).catch(err => console.error('[TenantService] Failed to create landlord notification:', err));

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

    // Get all units with tenants (include isDeleted to filter out deleted tenants)
    const units = await Unit.find({ property: propertyId, isOccupied: true })
      .populate('tenant', 'firstName lastName email phone avatar isDeleted');

    // Get active leases for these units
    const leases = await Lease.find({
      property: propertyId,
      status: 'active',
    });

    // Map tenants with their unit and lease info, filtering out deleted tenants
    const tenants = units
      .filter(unit => {
        const tenant = unit.tenant as any;
        // Filter out units with no tenant or deleted tenants
        return tenant && !tenant.isDeleted;
      })
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
            paymentFrequency: lease.paymentFrequency,
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
      .populate('tenant', 'firstName lastName email phone avatar isDeleted')
      .populate('property', 'name address')
      .populate('unit', 'unitNumber');

    // Filter out leases where tenant has been deleted
    return leases
      .filter(lease => {
        const tenant = lease.tenant as any;
        return tenant && !tenant.isDeleted;
      })
      .map(lease => ({
        tenant: lease.tenant,
        property: lease.property,
        unit: lease.unit,
        lease: {
          id: lease._id,
          startDate: lease.startDate,
          endDate: lease.endDate,
          rentAmount: lease.rentAmount,
          paymentFrequency: lease.paymentFrequency,
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
      isDeleted: { $ne: true }, // Exclude deleted users
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
   * Renew an existing lease with new dates and optional rent adjustment
   */
  async renewLease(
    leaseId: string,
    landlordId: string,
    data: {
      newStartDate: Date;
      newEndDate: Date;
      rentAmount: number;
      paymentFrequency?: 'monthly' | 'quarterly' | 'annually';
    }
  ) {
    // Find the existing lease
    const existingLease = await Lease.findById(leaseId)
      .populate('tenant', 'firstName lastName email')
      .populate('property', 'name')
      .populate('unit', 'unitNumber');

    if (!existingLease) {
      throw new AppError('Lease not found', 404);
    }

    // Verify landlord owns this lease
    if (existingLease.landlord.toString() !== landlordId) {
      throw new AppError('You do not have permission to renew this lease', 403);
    }

    // Check lease is currently active
    if (existingLease.status !== 'active') {
      throw new AppError('Only active leases can be renewed', 400);
    }

    // Update the lease with new dates and rent
    existingLease.startDate = data.newStartDate;
    existingLease.endDate = data.newEndDate;
    existingLease.rentAmount = data.rentAmount;
    if (data.paymentFrequency) {
      existingLease.paymentFrequency = data.paymentFrequency;
    }

    await existingLease.save();

    return {
      lease: {
        id: existingLease._id,
        startDate: existingLease.startDate,
        endDate: existingLease.endDate,
        rentAmount: existingLease.rentAmount,
        paymentFrequency: existingLease.paymentFrequency,
        status: existingLease.status,
      },
      tenant: existingLease.tenant,
      property: existingLease.property,
      unit: existingLease.unit,
    };
  }

  /**
   * Get all occupied units for a landlord
   */
  async getOccupiedUnits(landlordId: string) {
    const leases = await Lease.find({ landlord: landlordId, status: 'active' })
      .populate('tenant', 'firstName lastName email phone avatar isDeleted')
      .populate('property', 'name address')
      .populate('unit', 'unitNumber bedrooms bathrooms rentAmount');

    return leases
      .filter(lease => {
        const tenant = lease.tenant as any;
        return tenant && !tenant.isDeleted;
      })
      .map(lease => ({
        unit: {
          id: (lease.unit as any)._id,
          unitNumber: (lease.unit as any).unitNumber,
          bedrooms: (lease.unit as any).bedrooms,
          bathrooms: (lease.unit as any).bathrooms,
          rentAmount: (lease.unit as any).rentAmount || lease.rentAmount,
        },
        property: {
          id: (lease.property as any)._id,
          name: (lease.property as any).name,
          address: (lease.property as any).address,
        },
        tenant: {
          id: (lease.tenant as any)._id,
          firstName: (lease.tenant as any).firstName,
          lastName: (lease.tenant as any).lastName,
          email: (lease.tenant as any).email,
          phone: (lease.tenant as any).phone,
          avatar: (lease.tenant as any).avatar,
        },
        lease: {
          id: lease._id,
          startDate: lease.startDate,
          endDate: lease.endDate,
          rentAmount: lease.rentAmount,
          paymentFrequency: lease.paymentFrequency,
          status: lease.status,
        },
      }));
  }

  /**
   * Get guarantor details for a lease
   */
  async getGuarantor(leaseId: string, landlordId: string): Promise<IGuarantor | null> {
    const lease = await Lease.findById(leaseId);
    if (!lease) {
      throw new AppError('Lease not found', 404);
    }

    if (lease.landlord.toString() !== landlordId) {
      throw new AppError('You do not have permission to view this lease', 403);
    }

    return lease.guarantor || null;
  }

  /**
   * Update or add guarantor details for a lease
   */
  async updateGuarantor(
    leaseId: string,
    landlordId: string,
    guarantorData: IGuarantor
  ): Promise<IGuarantor> {
    const lease = await Lease.findById(leaseId);
    if (!lease) {
      throw new AppError('Lease not found', 404);
    }

    if (lease.landlord.toString() !== landlordId) {
      throw new AppError('You do not have permission to update this lease', 403);
    }

    lease.guarantor = guarantorData;
    await lease.save();

    return lease.guarantor!;
  }

  /**
   * Delete guarantor from a lease
   */
  async deleteGuarantor(leaseId: string, landlordId: string): Promise<void> {
    const lease = await Lease.findById(leaseId);
    if (!lease) {
      throw new AppError('Lease not found', 404);
    }

    if (lease.landlord.toString() !== landlordId) {
      throw new AppError('You do not have permission to update this lease', 403);
    }

    lease.guarantor = undefined;
    await lease.save();
  }

  /**
   * Get emergency contacts for a lease
   */
  async getEmergencyContacts(leaseId: string, landlordId: string): Promise<IEmergencyContact[]> {
    const lease = await Lease.findById(leaseId);
    if (!lease) {
      throw new AppError('Lease not found', 404);
    }

    if (lease.landlord.toString() !== landlordId) {
      throw new AppError('You do not have permission to view this lease', 403);
    }

    return lease.emergencyContacts || [];
  }

  /**
   * Add an emergency contact to a lease
   */
  async addEmergencyContact(
    leaseId: string,
    landlordId: string,
    contactData: IEmergencyContact
  ): Promise<IEmergencyContact[]> {
    const lease = await Lease.findById(leaseId);
    if (!lease) {
      throw new AppError('Lease not found', 404);
    }

    if (lease.landlord.toString() !== landlordId) {
      throw new AppError('You do not have permission to update this lease', 403);
    }

    if (!lease.emergencyContacts) {
      lease.emergencyContacts = [];
    }

    // Limit to 3 emergency contacts
    if (lease.emergencyContacts.length >= 3) {
      throw new AppError('Maximum of 3 emergency contacts allowed', 400);
    }

    lease.emergencyContacts.push(contactData);
    await lease.save();

    return lease.emergencyContacts;
  }

  /**
   * Update an emergency contact
   */
  async updateEmergencyContact(
    leaseId: string,
    landlordId: string,
    contactIndex: number,
    contactData: IEmergencyContact
  ): Promise<IEmergencyContact[]> {
    const lease = await Lease.findById(leaseId);
    if (!lease) {
      throw new AppError('Lease not found', 404);
    }

    if (lease.landlord.toString() !== landlordId) {
      throw new AppError('You do not have permission to update this lease', 403);
    }

    if (!lease.emergencyContacts || contactIndex >= lease.emergencyContacts.length) {
      throw new AppError('Emergency contact not found', 404);
    }

    lease.emergencyContacts[contactIndex] = contactData;
    await lease.save();

    return lease.emergencyContacts;
  }

  /**
   * Delete an emergency contact
   */
  async deleteEmergencyContact(
    leaseId: string,
    landlordId: string,
    contactIndex: number
  ): Promise<IEmergencyContact[]> {
    const lease = await Lease.findById(leaseId);
    if (!lease) {
      throw new AppError('Lease not found', 404);
    }

    if (lease.landlord.toString() !== landlordId) {
      throw new AppError('You do not have permission to update this lease', 403);
    }

    if (!lease.emergencyContacts || contactIndex >= lease.emergencyContacts.length) {
      throw new AppError('Emergency contact not found', 404);
    }

    lease.emergencyContacts.splice(contactIndex, 1);
    await lease.save();

    return lease.emergencyContacts;
  }

  /**
   * Send payment reminder to tenant
   */
  async sendPaymentReminder(
    leaseId: string,
    landlordId: string
  ): Promise<{ success: boolean; message: string }> {
    const lease = await Lease.findById(leaseId)
      .populate('tenant', 'firstName lastName email phone')
      .populate('property', 'name')
      .populate('unit', 'unitNumber');

    if (!lease) {
      throw new AppError('Lease not found', 404);
    }

    if (lease.landlord.toString() !== landlordId) {
      throw new AppError('You do not have permission for this lease', 403);
    }

    const tenant = lease.tenant as any;
    const property = lease.property as any;
    const unit = lease.unit as any;

    // Get landlord info
    const landlord = await User.findById(landlordId).select('firstName lastName');
    const landlordName = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Your landlord';

    // Send email reminder
    try {
      await emailOtpService.sendPaymentReminder(
        tenant.email,
        tenant.firstName,
        lease.rentAmount,
        landlordName,
        property.name,
        unit.unitNumber
      );
    } catch (error) {
      console.error('[TenantService] Failed to send payment reminder email:', error);
    }

    // Send SMS reminder
    try {
      await otpService.sendPaymentReminderSms(
        tenant.phone,
        tenant.firstName,
        lease.rentAmount,
        property.name,
        unit.unitNumber
      );
    } catch (error) {
      console.error('[TenantService] Failed to send payment reminder SMS:', error);
    }

    return {
      success: true,
      message: `Payment reminder sent to ${tenant.firstName} ${tenant.lastName}`,
    };
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

  /**
   * Send email and SMS notifications to new tenant
   */
  private async sendTenantNotifications(data: {
    email: string;
    phone: string;
    firstName: string;
    tempPassword: string;
    landlordName: string;
    propertyName: string;
    unitNumber: string;
  }): Promise<void> {
    const { email, phone, firstName, tempPassword, landlordName, propertyName, unitNumber } = data;

    // Send email notification
    try {
      await emailOtpService.sendTenantInvitation(
        email,
        firstName,
        tempPassword,
        landlordName,
        propertyName,
        unitNumber
      );
      console.log(`[TenantService] Invitation email sent to ${email}`);
    } catch (error) {
      console.error(`[TenantService] Failed to send invitation email to ${email}:`, error);
    }

    // Send SMS notification
    try {
      const result = await otpService.sendTenantInvitationSms(
        phone,
        firstName,
        tempPassword,
        landlordName,
        propertyName,
        unitNumber
      );
      if (result.success) {
        console.log(`[TenantService] Invitation SMS sent to ${phone}`);
      }
    } catch (error) {
      console.error(`[TenantService] Failed to send invitation SMS to ${phone}:`, error);
    }
  }
  /**
   * Get pending payments awaiting landlord confirmation
   */
  async getPendingPayments(landlordId: string) {
    const payments = await Transaction.find({
      landlord: landlordId,
      status: 'pending',
    })
      .populate('tenant', 'firstName lastName email phone avatar')
      .populate('lease', 'rentAmount paymentFrequency')
      .sort({ createdAt: -1 });

    // Get property/unit info for each payment via lease
    const results = [];
    for (const payment of payments) {
      const lease = await Lease.findById(payment.lease)
        .populate('property', 'name')
        .populate('unit', 'unitNumber');

      const tenant = payment.tenant as any;
      const prop = (lease?.property as any);
      const unit = (lease?.unit as any);

      results.push({
        id: payment._id.toString(),
        amount: payment.amount,
        type: payment.type,
        description: payment.description,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate,
        notes: payment.notes,
        reference: payment.reference,
        createdAt: payment.createdAt,
        tenant: tenant ? {
          id: tenant._id.toString(),
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          avatar: tenant.avatar,
        } : null,
        property: prop ? { name: prop.name } : null,
        unit: unit ? { unitNumber: unit.unitNumber } : null,
      });
    }

    return results;
  }

  /**
   * Confirm a pending payment
   */
  async confirmPayment(transactionId: string, landlordId: string) {
    const transaction = await Transaction.findOne({
      _id: transactionId,
      landlord: landlordId,
      status: 'pending',
    });

    if (!transaction) {
      throw new AppError('Pending payment not found', 404);
    }

    transaction.status = 'completed';
    transaction.notes = (transaction.notes || '').replace('awaiting landlord confirmation', 'confirmed by landlord');
    await transaction.save();

    // Notify tenant
    const landlord = await User.findById(landlordId).select('firstName lastName');
    const landlordName = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Landlord';

    NotificationService.createNotification(
      transaction.tenant.toString(),
      'Payment Confirmed',
      `${landlordName} confirmed your ${transaction.description || 'payment'} of ₦${transaction.amount.toLocaleString()}.`,
      'payment',
      { transactionId: transaction._id.toString(), status: 'confirmed' }
    ).catch(err => console.error('[TenantService] Failed to notify tenant:', err));

    return { message: 'Payment confirmed', transactionId: transaction._id.toString() };
  }

  /**
   * Reject a pending payment
   */
  async rejectPayment(transactionId: string, landlordId: string, reason?: string) {
    const transaction = await Transaction.findOne({
      _id: transactionId,
      landlord: landlordId,
      status: 'pending',
    });

    if (!transaction) {
      throw new AppError('Pending payment not found', 404);
    }

    transaction.status = 'failed';
    transaction.notes = `Rejected by landlord${reason ? ': ' + reason : ''}`;
    await transaction.save();

    // Notify tenant
    const landlord = await User.findById(landlordId).select('firstName lastName');
    const landlordName = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Landlord';

    NotificationService.createNotification(
      transaction.tenant.toString(),
      'Payment Rejected',
      `${landlordName} rejected your ${transaction.description || 'payment'} of ₦${transaction.amount.toLocaleString()}.${reason ? ' Reason: ' + reason : ''}`,
      'payment',
      { transactionId: transaction._id.toString(), status: 'rejected', reason }
    ).catch(err => console.error('[TenantService] Failed to notify tenant:', err));

    return { message: 'Payment rejected', transactionId: transaction._id.toString() };
  }
}

export default new TenantService();
