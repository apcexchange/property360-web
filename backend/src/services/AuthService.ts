import { User, Lease, Unit } from '../models';
import { IUser, UserRole } from '../types';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware';
import emailOtpService from './EmailOtpService';

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
}

interface LoginData {
  identifier: string;
  password: string;
}

interface AuthResponse {
  user: Partial<IUser>;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  async register(data: RegisterData): Promise<AuthResponse> {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    const user = await User.create(data);
    const accessToken = generateToken(user);
    // For now, use the same token as refresh token (implement proper refresh token later)
    const refreshToken = accessToken;

    return {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        avatar: user.avatar || user.kyc?.selfieUrl,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(data: LoginData): Promise<AuthResponse> {
    // Find user by email or phone number (exclude deleted accounts)
    const identifier = data.identifier.toLowerCase().trim();
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { phone: identifier },
      ],
      isDeleted: { $ne: true },
    }).select('+password');
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401);
    }

    const accessToken = generateToken(user);
    // For now, use the same token as refresh token (implement proper refresh token later)
    const refreshToken = accessToken;

    return {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        avatar: user.avatar || user.kyc?.selfieUrl,
      },
      accessToken,
      refreshToken,
    };
  }

  async getProfile(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }

  async updateProfile(
    userId: string,
    data: Partial<IUser>
  ): Promise<IUser | null> {
    const { password, email, role, ...updateData } = data as Record<string, unknown>;
    return User.findByIdAndUpdate(userId, updateData, { new: true });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    user.password = newPassword;
    await user.save();
  }

  async findUserByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() });
  }

  async resetPassword(email: string, newPassword: string): Promise<void> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.password = newPassword;
    await user.save();
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid password', 401);
    }

    // Store original contact info before anonymizing
    const originalEmail = user.email;
    const originalPhone = user.phone;
    const userName = `${user.firstName} ${user.lastName}`;
    const userRole = user.role;

    // If tenant, handle lease termination and landlord notification
    if (userRole === UserRole.TENANT) {
      await this.handleTenantAccountDeletion(userId, userName, originalEmail);
    }

    // Anonymize the account (soft delete)
    // This allows the user to re-register with the same email/phone later
    // while preserving the record for landlord's historical purposes
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedEmail = originalEmail;
    user.deletedPhone = originalPhone;
    user.email = `deleted_${user._id}@deleted.local`;
    user.phone = `deleted_${user._id}`;
    user.password = 'DELETED_ACCOUNT'; // Will be hashed by pre-save hook
    user.isActive = false;

    await user.save();

    console.log(`[AuthService] Account soft-deleted for user ${userId} (${userName})`);
  }

  /**
   * Handle cleanup when a tenant deletes their account
   * - Terminates active leases
   * - Updates units to vacant
   * - Notifies landlords
   */
  private async handleTenantAccountDeletion(
    tenantId: string,
    tenantName: string,
    tenantEmail: string
  ): Promise<void> {
    // Find all active leases for this tenant
    const activeLeases = await Lease.find({
      tenant: tenantId,
      status: 'active',
    }).populate('landlord', 'email firstName lastName')
      .populate('property', 'name')
      .populate('unit', 'unitNumber');

    for (const lease of activeLeases) {
      // Terminate the lease
      lease.status = 'terminated';
      await lease.save();

      // Update unit to vacant
      await Unit.findByIdAndUpdate(lease.unit, {
        isOccupied: false,
        tenant: undefined,
      });

      // Notify the landlord
      const landlord = lease.landlord as any;
      const property = lease.property as any;
      const unit = lease.unit as any;

      if (landlord?.email) {
        try {
          await emailOtpService.sendTenantDeletedNotification(
            landlord.email,
            landlord.firstName,
            tenantName,
            property?.name || 'Unknown Property',
            unit?.unitNumber || 'Unknown Unit'
          );
          console.log(`[AuthService] Notified landlord ${landlord.email} about tenant deletion`);
        } catch (error) {
          console.error(`[AuthService] Failed to notify landlord:`, error);
        }
      }
    }

    console.log(`[AuthService] Processed ${activeLeases.length} active leases for deleted tenant`);
  }
}

export default new AuthService();
