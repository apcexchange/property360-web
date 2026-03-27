import { Router } from 'express';
import NotificationController from '../controllers/NotificationController';
import { protect, validate } from '../middleware';
import { param, query } from 'express-validator';

const router = Router();

// All routes require authentication (any role)
router.use(protect);

// Get notifications (paginated)
router.get(
  '/',
  validate([
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ]),
  NotificationController.getNotifications
);

// Get unread count
router.get('/unread-count', NotificationController.getUnreadCount);

// Mark one notification as read
router.patch(
  '/:id/read',
  validate([
    param('id')
      .isMongoId()
      .withMessage('Invalid notification ID'),
  ]),
  NotificationController.markAsRead
);

// Mark all notifications as read
router.patch('/read-all', NotificationController.markAllAsRead);

export default router;
