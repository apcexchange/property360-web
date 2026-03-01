import { User } from '../models';
import { IUser, UserRole } from '../types';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware';

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
    // Find user by email or phone number
    const identifier = data.identifier.toLowerCase().trim();
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { phone: identifier },
      ],
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

    // Permanently delete the user account
    await User.findByIdAndDelete(userId);
  }
}

export default new AuthService();
