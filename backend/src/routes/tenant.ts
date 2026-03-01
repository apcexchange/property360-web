import { Router } from 'express';
import TenantController from '../controllers/TenantController';
import { protect, authorize, validate } from '../middleware';
import { UserRole } from '../types';
import {
  assignTenantValidation,
  unitIdValidation,
  propertyIdParamValidation,
  searchTenantValidation,
} from '../validations';

const router = Router();

// All routes are protected
router.use(protect);

// Get all tenants for the landlord (across all properties)
router.get(
  '/',
  authorize(UserRole.LANDLORD),
  TenantController.getAllTenants
);

// Search for existing users to assign as tenants
router.get(
  '/search',
  authorize(UserRole.LANDLORD),
  validate(searchTenantValidation),
  TenantController.searchTenants
);

// Get tenants for a specific property
router.get(
  '/property/:propertyId',
  authorize(UserRole.LANDLORD),
  validate(propertyIdParamValidation),
  TenantController.getTenantsByProperty
);

// Get vacant units for a property (for tenant assignment flow)
router.get(
  '/property/:propertyId/vacant-units',
  authorize(UserRole.LANDLORD),
  validate(propertyIdParamValidation),
  TenantController.getVacantUnits
);

// Assign a tenant to a unit
router.post(
  '/unit/:unitId/assign',
  authorize(UserRole.LANDLORD),
  validate(assignTenantValidation),
  TenantController.assignTenant
);

// Remove a tenant from a unit
router.delete(
  '/unit/:unitId',
  authorize(UserRole.LANDLORD),
  validate(unitIdValidation),
  TenantController.removeTenant
);

export default router;
