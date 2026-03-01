import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import TenancyAgreementController from '../controllers/TenancyAgreementController';
import { UserRole } from '../types';
import {
  uploadAgreementValidation,
  getAgreementsByLeaseValidation,
  getAgreementsByPropertyValidation,
  agreementIdValidation,
} from '../validations/tenancyAgreement';

const router = Router();

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept PDF, DOCX, and images
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'image/webp',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOCX, and image files (JPEG, PNG, HEIC, WebP) are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max for documents
  },
});

// All routes require authentication
router.use(protect);

/**
 * @route   POST /tenancy-agreements/lease/:leaseId
 * @desc    Upload a tenancy agreement for a lease
 * @access  Private (Landlord only)
 */
router.post(
  '/lease/:leaseId',
  authorize(UserRole.LANDLORD),
  upload.single('document'),
  validate(uploadAgreementValidation),
  TenancyAgreementController.uploadAgreement
);

/**
 * @route   GET /tenancy-agreements/lease/:leaseId
 * @desc    Get all agreements for a lease
 * @access  Private (Landlord or Tenant)
 */
router.get(
  '/lease/:leaseId',
  validate(getAgreementsByLeaseValidation),
  TenancyAgreementController.getAgreementsByLease
);

/**
 * @route   GET /tenancy-agreements/property/:propertyId
 * @desc    Get all agreements for a property
 * @access  Private (Landlord only)
 */
router.get(
  '/property/:propertyId',
  authorize(UserRole.LANDLORD),
  validate(getAgreementsByPropertyValidation),
  TenancyAgreementController.getAgreementsByProperty
);

/**
 * @route   GET /tenancy-agreements/:id
 * @desc    Get a single agreement
 * @access  Private (Landlord or Tenant)
 */
router.get(
  '/:id',
  validate(agreementIdValidation),
  TenancyAgreementController.getAgreement
);

/**
 * @route   GET /tenancy-agreements/:id/status
 * @desc    Get processing status of an agreement
 * @access  Private (Landlord or Tenant)
 */
router.get(
  '/:id/status',
  validate(agreementIdValidation),
  TenancyAgreementController.getProcessingStatus
);

/**
 * @route   DELETE /tenancy-agreements/:id
 * @desc    Delete an agreement
 * @access  Private (Landlord only)
 */
router.delete(
  '/:id',
  authorize(UserRole.LANDLORD),
  validate(agreementIdValidation),
  TenancyAgreementController.deleteAgreement
);

/**
 * @route   POST /tenancy-agreements/:id/acknowledge
 * @desc    Tenant acknowledges an agreement
 * @access  Private (Tenant only)
 */
router.post(
  '/:id/acknowledge',
  authorize(UserRole.TENANT),
  validate(agreementIdValidation),
  TenancyAgreementController.acknowledgeAgreement
);

// ============ E-Signature Routes ============

/**
 * @route   POST /tenancy-agreements/:id/send-for-signing
 * @desc    Send agreement to tenant for e-signature
 * @access  Private (Landlord only)
 */
router.post(
  '/:id/send-for-signing',
  authorize(UserRole.LANDLORD),
  validate(agreementIdValidation),
  TenancyAgreementController.sendForSigning
);

/**
 * @route   GET /tenancy-agreements/:id/signing-status
 * @desc    Get e-signature status of an agreement
 * @access  Private (Landlord or Tenant)
 */
router.get(
  '/:id/signing-status',
  validate(agreementIdValidation),
  TenancyAgreementController.getSigningStatus
);

/**
 * @route   POST /tenancy-agreements/:id/resend-reminder
 * @desc    Resend signing reminder to tenant
 * @access  Private (Landlord only)
 */
router.post(
  '/:id/resend-reminder',
  authorize(UserRole.LANDLORD),
  validate(agreementIdValidation),
  TenancyAgreementController.resendSigningReminder
);

/**
 * @route   GET /tenancy-agreements/:id/signing-link
 * @desc    Get signing link for tenant
 * @access  Private (Tenant only)
 */
router.get(
  '/:id/signing-link',
  authorize(UserRole.TENANT),
  validate(agreementIdValidation),
  TenancyAgreementController.getSigningLink
);

export default router;
