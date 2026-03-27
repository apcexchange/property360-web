import { Notification } from '../models';
import { INotification } from '../types';

export class NotificationService {
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: INotification['type'],
    data?: Record<string, unknown>
  ): Promise<INotification> {
    return Notification.create({
      user: userId,
      title,
      message,
      type,
      data,
    });
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
