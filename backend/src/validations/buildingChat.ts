import { body, param } from 'express-validator';

export const sendBuildingMessageValidation = [
  param('propertyId').isMongoId().withMessage('Invalid property ID'),
  body('text')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Message text must be 2000 characters or fewer'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file', 'audio', 'system'])
    .withMessage('Invalid message type'),
  body('attachmentUrl').optional().isURL().withMessage('Invalid attachment URL'),
];

export const buildingPropertyIdParamValidation = [
  param('propertyId').isMongoId().withMessage('Invalid property ID'),
];
