import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect } from '../middleware/auth';
import KYCService from '../services/KYCService';
import { AuthRequest, IDDocumentType } from '../types';

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
  // Accept only images
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and HEIC images are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// Upload selfie
router.post(
  '/selfie',
  protect,
  upload.single('selfie'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No selfie image provided',
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const user = await KYCService.uploadSelfie({
        userId: req.user._id.toString(),
        file: req.file,
      });

      res.status(200).json({
        success: true,
        message: 'Selfie uploaded successfully',
        data: {
          selfieUrl: user.kyc?.selfieUrl,
          kycStatus: user.kyc?.status,
        },
      });
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload selfie',
      });
    }
  }
);

// Upload ID document
router.post(
  '/document',
  protect,
  upload.single('document'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No document image provided',
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { documentType, documentNumber } = req.body;

      if (!documentType || !documentNumber) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        res.status(400).json({
          success: false,
          message: 'Document type and number are required',
        });
        return;
      }

      // Validate document type
      if (!Object.values(IDDocumentType).includes(documentType)) {
        fs.unlinkSync(req.file.path);
        res.status(400).json({
          success: false,
          message: 'Invalid document type',
        });
        return;
      }

      const user = await KYCService.uploadDocument({
        userId: req.user._id.toString(),
        documentType: documentType as IDDocumentType,
        documentNumber,
        file: req.file,
      });

      res.status(200).json({
        success: true,
        message: 'Document uploaded successfully',
        data: {
          document: user.kyc?.document,
          kycStatus: user.kyc?.status,
        },
      });
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload document',
      });
    }
  }
);

// Get KYC status
router.get('/status', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const status = await KYCService.getKYCStatus(req.user._id.toString());

    res.status(200).json({
      success: true,
      message: 'KYC status retrieved',
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get KYC status',
    });
  }
});

export default router;
