import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PropertyController } from '../controllers';
import { protect, authorize, validate } from '../middleware';
import { UserRole, AuthRequest } from '../types';
import {
  createPropertyValidation,
  updatePropertyValidation,
  propertyIdValidation,
  addUnitValidation,
  assignAgentValidation,
} from '../validations';
import CloudinaryService from '../services/CloudinaryService';

const router = Router();

// Configure multer for temporary file storage before Cloudinary upload
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
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, HEIC, and WebP images are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// All routes are protected
router.use(protect);

// Image upload endpoint (must be before /:id routes to avoid matching 'upload-image' as an id)
router.post(
  '/upload-image',
  authorize(UserRole.LANDLORD),
  upload.single('image'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No image provided',
        });
        return;
      }

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadImage(req.file.path, 'properties');

      // Clean up temp file after successful upload
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          imageUrl: result.url,
          publicId: result.publicId,
        },
      });
    } catch (error) {
      // Clean up temp file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload image',
      });
    }
  }
);

// Property CRUD
router.post(
  '/',
  authorize(UserRole.LANDLORD),
  validate(createPropertyValidation),
  PropertyController.createProperty
);

router.get('/', PropertyController.getProperties);

router.get(
  '/:id',
  validate(propertyIdValidation),
  PropertyController.getPropertyById
);

router.put(
  '/:id',
  authorize(UserRole.LANDLORD),
  validate(updatePropertyValidation),
  PropertyController.updateProperty
);

router.delete(
  '/:id',
  authorize(UserRole.LANDLORD),
  validate(propertyIdValidation),
  PropertyController.deleteProperty
);

// Units
router.post(
  '/:id/units',
  authorize(UserRole.LANDLORD),
  validate(addUnitValidation),
  PropertyController.addUnit
);

router.get(
  '/:id/units',
  validate(propertyIdValidation),
  PropertyController.getUnits
);

// Agent assignment
router.post(
  '/:id/assign-agent',
  authorize(UserRole.LANDLORD),
  validate(assignAgentValidation),
  PropertyController.assignAgent
);

export default router;
