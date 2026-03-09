import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, UserRole, KYCStatus, IDDocumentType } from '../types';

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.TENANT,
    },
    avatar: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedEmail: {
      type: String,
    },
    deletedPhone: {
      type: String,
    },
    nin: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
    },
    kyc: {
      status: {
        type: String,
        enum: Object.values(KYCStatus),
        default: KYCStatus.NOT_STARTED,
      },
      selfieUrl: String,
      selfieUploadedAt: Date,
      document: {
        type: {
          type: String,
          enum: Object.values(IDDocumentType),
        },
        number: String,
        imageUrl: String,
        uploadedAt: Date,
      },
      verifiedAt: Date,
      rejectionReason: String,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
export default User;
