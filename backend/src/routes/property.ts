import { Router } from 'express';
import { PropertyController } from '../controllers';
import { protect, authorize, validate } from '../middleware';
import { UserRole } from '../types';
import {
  createPropertyValidation,
  updatePropertyValidation,
  propertyIdValidation,
  addUnitValidation,
  assignAgentValidation,
} from '../validations';

const router = Router();

// All routes are protected
router.use(protect);

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
