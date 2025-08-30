import { db } from './firebase';
import { collection, addDoc, updateDoc, doc, query, where, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';

export interface NotificationData {
  user_id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  is_read?: boolean;
  action_url?: string;
  metadata?: Record<string, any>;
}

/**
 * Send a notification to a user
 * @param userId - The user's telegram ID
 * @param type - Notification type
 * @param title - Notification title
 * @param message - Notification message
 * @param actionUrl - Optional action URL
 * @param metadata - Optional metadata
 */
export const sendUserNotification = async (
  userId: string,
  type: 'success' | 'warning' | 'info' | 'error',
  title: string,
  message: string,
  actionUrl?: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const notificationData: NotificationData = {
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      action_url: actionUrl,
      metadata: metadata || {},
      created_at: serverTimestamp()
    };

    await addDoc(collection(db, 'notifications'), notificationData);
    console.log('Notification sent successfully to user:', userId);
  } catch (error) {
    console.error('Error sending notification:', error);
    // Don't throw error to prevent breaking the main flow
  }
};

/**
 * Mark a notification as read
 * @param notificationId - The notification ID
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { 
      is_read: true,
      updated_at: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

/**
 * Get user notifications
 * @param userId - The user's telegram ID
 * @param limit - Maximum number of notifications to fetch
 */
export const getUserNotifications = async (userId: string, limitCount: number = 50) => {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(notificationsQuery);
    const notifications: any[] = [];
    querySnapshot.forEach(doc => {
      notifications.push({ id: doc.id, ...doc.data() });
    });

    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

/**
 * Delete a notification
 * @param notificationId - The notification ID
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { 
      deleted_at: serverTimestamp(),
      is_deleted: true
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
};

/**
 * Get unread notifications count for a user
 * @param userId - The user's telegram ID
 */
export const getUnreadNotificationsCount = async (userId: string): Promise<number> => {
  try {
    const unreadQuery = query(
      collection(db, 'notifications'),
      where('user_id', '==', userId),
      where('is_read', '==', false)
    );
    
    const querySnapshot = await getDocs(unreadQuery);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting unread notifications count:', error);
    return 0;
  }
}; 