import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ChatController from '../controllers/ChatController';
import { protect, validate } from '../middleware';
import { param, body, query } from 'express-validator';

const router = Router();

// Configure multer for chat attachments
const uploadDir = path.join(process.cwd(), 'uploads', 'chat');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// All chat routes require authentication
router.use(protect);

// Get all conversations
router.get('/conversations', ChatController.getConversations);

// Get unread count
router.get('/unread-count', ChatController.getUnreadCount);

// Upload attachment
router.post('/upload', upload.single('file'), ChatController.uploadAttachment);

// Start or get a conversation
router.post(
  '/conversations',
  validate([
    body('unitId').isMongoId().withMessage('Invalid unit ID'),
  ]),
  ChatController.startConversation
);

// Get messages for a conversation
router.get(
  '/conversations/:id/messages',
  validate([
    param('id').isMongoId().withMessage('Invalid conversation ID'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  ChatController.getMessages
);

// Send a message (text required for text messages, optional for attachments)
router.post(
  '/conversations/:id/messages',
  validate([
    param('id').isMongoId().withMessage('Invalid conversation ID'),
    body('text').optional().isLength({ max: 5000 }),
    body('messageType').optional().isIn(['text', 'image', 'file', 'audio']),
  ]),
  ChatController.sendMessage
);

// Mark conversation as read
router.patch(
  '/conversations/:id/read',
  validate([
    param('id').isMongoId().withMessage('Invalid conversation ID'),
  ]),
  ChatController.markAsRead
);

export default router;
