import { Router } from 'express';
import SharedBillController from '../controllers/SharedBillController';
import { protect, validate } from '../middleware';
import {
  checkTenantBuildingMembership,
  checkBillCreator,
  checkOwnShare,
  checkBillParticipant,
} from '../middleware/buildingMembership';
import {
  createSharedBillValidation,
  billIdParamValidation,
  shareIdParamValidation,
  disputeShareValidation,
  markShareAsPaidValidation,
  buildingPropertyIdParamValidation,
} from '../validations';

const router = Router();

router.use(protect);

// Cross-property: every share that belongs to the current user.
router.get('/mine', SharedBillController.listMine);

// All bills for a specific building. Tenant of the building OR landlord/agent.
router.get(
  '/property/:propertyId',
  validate(buildingPropertyIdParamValidation),
  checkTenantBuildingMembership(),
  SharedBillController.listForProperty
);

// Tenants create bills for their building.
router.post(
  '/property/:propertyId',
  validate(createSharedBillValidation),
  checkTenantBuildingMembership(),
  SharedBillController.create
);

// Detail — must be a participant (creator, share-holder, landlord, agent).
router.get(
  '/:billId',
  validate(billIdParamValidation),
  checkBillParticipant(),
  SharedBillController.getDetail
);

// Tenant marks their own share as paid.
router.post(
  '/:billId/shares/:shareId/mark-paid',
  validate(markShareAsPaidValidation),
  checkOwnShare(),
  SharedBillController.markPaid
);

// Creator confirms / disputes / cancels.
router.post(
  '/:billId/shares/:shareId/confirm',
  validate(shareIdParamValidation),
  checkBillCreator(),
  SharedBillController.confirm
);

router.post(
  '/:billId/shares/:shareId/dispute',
  validate(disputeShareValidation),
  checkBillCreator(),
  SharedBillController.dispute
);

router.post(
  '/:billId/cancel',
  validate(billIdParamValidation),
  checkBillCreator(),
  SharedBillController.cancel
);

export default router;
