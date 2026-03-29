import { Router } from 'express';
import ListingController from '../controllers/ListingController';
import { protect, authorize, validate } from '../middleware';
import { UserRole } from '../types';
import { param, body, query } from 'express-validator';

const router = Router();

// ============ Public Routes (no auth) ============

// Browse listings
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('minPrice').optional().isInt({ min: 0 }),
    query('maxPrice').optional().isInt({ min: 0 }),
    query('bedrooms').optional().isInt({ min: 1 }),
  ]),
  ListingController.getListings
);

// ============ Protected Routes ============

// Landlord's own listings (must be before /:id)
router.get(
  '/my-listings',
  protect,
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  ListingController.getLandlordListings
);

// Single listing detail (public)
router.get(
  '/:id',
  validate([param('id').isMongoId().withMessage('Invalid listing ID')]),
  ListingController.getListingById
);

// List a unit on marketplace
router.post(
  '/:unitId/list',
  protect,
  authorize(UserRole.LANDLORD),
  validate([
    param('unitId').isMongoId().withMessage('Invalid unit ID'),
    body('listingTitle').optional().isString().isLength({ max: 200 }),
    body('listingDescription').optional().isString().isLength({ max: 2000 }),
  ]),
  ListingController.listUnit
);

// Update listing
router.put(
  '/:unitId/list',
  protect,
  authorize(UserRole.LANDLORD),
  validate([
    param('unitId').isMongoId().withMessage('Invalid unit ID'),
    body('listingTitle').optional().isString().isLength({ max: 200 }),
    body('listingDescription').optional().isString().isLength({ max: 2000 }),
  ]),
  ListingController.updateListing
);

// Unlist a unit
router.delete(
  '/:unitId/list',
  protect,
  authorize(UserRole.LANDLORD),
  validate([param('unitId').isMongoId().withMessage('Invalid unit ID')]),
  ListingController.unlistUnit
);

// Reserve a unit (tenant pays)
router.post(
  '/:unitId/reserve',
  protect,
  authorize(UserRole.TENANT),
  validate([
    param('unitId').isMongoId().withMessage('Invalid unit ID'),
    body('amount').optional().isFloat({ min: 1 }).withMessage('Amount must be positive'),
    body('callbackUrl').optional().isURL().withMessage('Invalid callback URL'),
  ]),
  ListingController.initiateReservation
);

export default router;
