import { Router } from 'express';
import BuildingController from '../controllers/BuildingController';
import { protect, validate } from '../middleware';
import { checkTenantBuildingMembership } from '../middleware/buildingMembership';
import {
  sendBuildingMessageValidation,
  buildingPropertyIdParamValidation,
} from '../validations';

const router = Router();

router.use(protect);

router.get(
  '/:propertyId/preview',
  validate(buildingPropertyIdParamValidation),
  checkTenantBuildingMembership(),
  BuildingController.getPreview
);

router.get(
  '/:propertyId/chat',
  validate(buildingPropertyIdParamValidation),
  checkTenantBuildingMembership(),
  BuildingController.getChat
);

router.get(
  '/:propertyId/chat/messages',
  validate(buildingPropertyIdParamValidation),
  checkTenantBuildingMembership(),
  BuildingController.listMessages
);

router.post(
  '/:propertyId/chat/messages',
  validate(sendBuildingMessageValidation),
  checkTenantBuildingMembership(),
  BuildingController.sendMessage
);

router.post(
  '/:propertyId/chat/read',
  validate(buildingPropertyIdParamValidation),
  checkTenantBuildingMembership(),
  BuildingController.markRead
);

router.get(
  '/:propertyId/neighbors',
  validate(buildingPropertyIdParamValidation),
  checkTenantBuildingMembership(),
  BuildingController.listNeighbors
);

export default router;
