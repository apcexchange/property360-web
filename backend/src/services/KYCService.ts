import path from 'path';
import fs from 'fs';
import { User } from '../models/User';
import { KYCStatus, IDDocumentType, IUser } from '../types';
import CloudinaryService from './CloudinaryService';

interface UploadSelfieData {
  userId: string;
  file: Express.Multer.File;
}

interface UploadDocumentData {
  userId: string;
  documentType: IDDocumentType;
  documentNumber: string;
  file: Express.Multer.File;
}

interface KYCStatusResponse {
  status: KYCStatus;
  selfieUploaded: boolean;
  documentUploaded: boolean;
  selfieUrl?: string;
  document?: {
    type: IDDocumentType;
    number: string;
    imageUrl: string;
  };
}

class KYCService {
  private uploadDir: string;

  constructor() {
    // Create uploads directory if it doesn't exist
    this.uploadDir = path.join(process.cwd(), 'uploads', 'kyc');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadSelfie(data: UploadSelfieData): Promise<IUser> {
    const { userId, file } = data;

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Upload to Cloudinary
    const result = await CloudinaryService.uploadImage(file.path, 'kyc/selfies');

    // Clean up temp file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Update user with Cloudinary URL
    user.kyc = user.kyc || { status: KYCStatus.NOT_STARTED };
    user.kyc.selfieUrl = result.url;
    user.kyc.selfieUploadedAt = new Date();

    // Update status to pending if both selfie and document are uploaded
    if (user.kyc.document?.imageUrl) {
      user.kyc.status = KYCStatus.PENDING;
    }

    await user.save();

    return user;
  }

  async uploadDocument(data: UploadDocumentData): Promise<IUser> {
    const { userId, documentType, documentNumber, file } = data;

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate document number based on type
    this.validateDocumentNumber(documentType, documentNumber);

    // Upload to Cloudinary
    const result = await CloudinaryService.uploadImage(file.path, 'kyc/documents');

    // Clean up temp file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Update user with Cloudinary URL
    user.kyc = user.kyc || { status: KYCStatus.NOT_STARTED };
    user.kyc.document = {
      type: documentType,
      number: documentNumber,
      imageUrl: result.url,
      uploadedAt: new Date(),
    };

    // Also update the NIN field if it's a NIN document
    if (documentType === IDDocumentType.NIN) {
      user.nin = documentNumber;
    }

    // Update status to pending if both selfie and document are uploaded
    if (user.kyc.selfieUrl) {
      user.kyc.status = KYCStatus.PENDING;
    }

    await user.save();

    return user;
  }

  async getKYCStatus(userId: string): Promise<KYCStatusResponse> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const kyc = user.kyc || { status: KYCStatus.NOT_STARTED };

    return {
      status: kyc.status || KYCStatus.NOT_STARTED,
      selfieUploaded: !!kyc.selfieUrl,
      documentUploaded: !!kyc.document?.imageUrl,
      selfieUrl: kyc.selfieUrl,
      document: kyc.document ? {
        type: kyc.document.type,
        number: kyc.document.number,
        imageUrl: kyc.document.imageUrl,
      } : undefined,
    };
  }

  async verifyKYC(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.kyc?.selfieUrl || !user.kyc?.document?.imageUrl) {
      throw new Error('KYC documents not complete');
    }

    user.kyc.status = KYCStatus.VERIFIED;
    user.kyc.verifiedAt = new Date();
    user.isVerified = true;

    await user.save();

    return user;
  }

  async rejectKYC(userId: string, reason: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.kyc = user.kyc || { status: KYCStatus.NOT_STARTED };
    user.kyc.status = KYCStatus.REJECTED;
    user.kyc.rejectionReason = reason;

    await user.save();

    return user;
  }

  private validateDocumentNumber(type: IDDocumentType, number: string): void {
    const trimmedNumber = number.trim();

    switch (type) {
      case IDDocumentType.NIN:
        // NIN is 11 digits
        if (!/^\d{11}$/.test(trimmedNumber)) {
          throw new Error('NIN must be exactly 11 digits');
        }
        break;
      case IDDocumentType.DRIVERS_LICENSE:
        // Driver's license format varies, basic validation
        if (trimmedNumber.length < 5) {
          throw new Error('Invalid driver\'s license number');
        }
        break;
      case IDDocumentType.PASSPORT:
        // Nigerian passport: 1 letter + 8 digits
        if (!/^[A-Z]\d{8}$/i.test(trimmedNumber)) {
          throw new Error('Invalid passport number format');
        }
        break;
      case IDDocumentType.VOTERS_CARD:
        // Voter's card is 19 characters
        if (trimmedNumber.length < 10) {
          throw new Error('Invalid voter\'s card number');
        }
        break;
      default:
        throw new Error('Invalid document type');
    }
  }
}

export default new KYCService();
