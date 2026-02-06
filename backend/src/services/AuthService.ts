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
  email: string;
  password: string;
}

interface AuthResponse {
  user: Partial<IUser>;
  token: string;
}

export class AuthService {
  async register(data: RegisterData): Promise<AuthResponse> {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    const user = await User.create(data);
    const token = generateToken(user);

    return {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      },
      token,
    };
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const user = await User.findOne({ email: data.email }).select('+password');
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

    const token = generateToken(user);

    return {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      },
      token,
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
}

export default new AuthService();
