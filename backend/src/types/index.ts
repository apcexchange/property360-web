import { Request } from 'express';
import { Document } from 'mongoose';

// User roles
export enum UserRole {
  LANDLORD = 'landlord',
  TENANT = 'tenant',
  AGENT = 'agent',
}

// User interface
export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  isVerified: boolean;
  isActive: boolean;
  nin?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Property interface
export interface IProperty extends Document {
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  propertyType: 'apartment' | 'house' | 'commercial' | 'land';
  units: number;
  owner: IUser['_id'];
  agent?: IUser['_id'];
  images: string[];
  amenities: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Unit interface
export interface IUnit extends Document {
  property: IProperty['_id'];
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  size: number;
  rentAmount: number;
  isOccupied: boolean;
  tenant?: IUser['_id'];
  createdAt: Date;
  updatedAt: Date;
}

// Lease interface
export interface ILease extends Document {
  property: IProperty['_id'];
  unit: IUnit['_id'];
  tenant: IUser['_id'];
  landlord: IUser['_id'];
  startDate: Date;
  endDate: Date;
  rentAmount: number;
  paymentFrequency: 'monthly' | 'quarterly' | 'annually';
  securityDeposit: number;
  status: 'active' | 'expired' | 'terminated';
  createdAt: Date;
  updatedAt: Date;
}

// Transaction interface
export interface ITransaction extends Document {
  lease: ILease['_id'];
  tenant: IUser['_id'];
  landlord: IUser['_id'];
  amount: number;
  type: 'rent' | 'deposit' | 'maintenance' | 'other';
  status: 'pending' | 'completed' | 'failed';
  paymentMethod: string;
  reference: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Maintenance request interface
export interface IMaintenanceRequest extends Document {
  property: IProperty['_id'];
  unit: IUnit['_id'];
  tenant: IUser['_id'];
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  images: string[];
  assignedTo?: IUser['_id'];
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Notification interface
export interface INotification extends Document {
  user: IUser['_id'];
  title: string;
  message: string;
  type: 'payment' | 'maintenance' | 'lease' | 'general';
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Extended Request with user
export interface AuthRequest extends Request {
  user?: IUser;
}

// API Response type
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
