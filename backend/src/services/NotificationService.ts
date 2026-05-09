import { Notification } from '../models';
import { INotification } from '../types';
import { getIO } from '../socket/socketServer';

// Push the notification to its recipient over Socket.IO if they're online.
// Falls back silently if the socket server isn't initialized yet (e.g. during
// startup or in tests). Online users get instant updates; offline users still
// have the persisted Notification document to fetch on next app open.
function pushToUser(notification: INotification): void {
  try {
    const io = getIO();
    io.to(`user:${notification.user.toString()}`).emit('notification:new', notification);
  } catch {
    /* socket server not initialized */
  }
}

export class NotificationService {
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: INotification['type'],
    data?: Record<string, unknown>
  ): Promise<INotification> {
    const [created] = await this.createMany([userId], title, message, type, data);
    return created;
  }

  /**
   * Fan out a single notification event to many recipients atomically.
   * Used by features that fire multiple notifications from one action
   * (e.g. a new shared bill notifying every participant). Pushes to each
   * recipient's `user:${userId}` Socket.IO room.
   */
  async createMany(
    userIds: string[],
    title: string,
    message: string,
    type: INotification['type'],
    data?: Record<string, unknown>
  ): Promise<INotification[]> {
    if (userIds.length === 0) return [];

    const docs = userIds.map(userId => ({
      user: userId,
      title,
      message,
      type,
      data,
    }));

    const created = (await Notification.insertMany(docs)) as unknown as INotification[];
    created.forEach(pushToUser);
    return created;
  }

  async getNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ notifications: INotification[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ user: userId }),
    ]);

    return {
      notifications,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ user: userId, isRead: false });
  }

  async markAsRead(notificationId: string, userId: string): Promise<INotification | null> {
    return Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true },
      { new: true }
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );
  }
}

export default new NotificationService();
