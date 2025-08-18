import { supabase } from './supabase';

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
      metadata: metadata || {}
    };

    const { error } = await supabase
      .from('notifications')
      .insert([notificationData]);

    if (error) {
      console.error('Error sending notification:', error);
      throw error;
    }

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
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

/**
 * Get user notifications
 * @param userId - The user's telegram ID
 * @param limit - Maximum number of notifications to fetch
 */
export const getUserNotifications = async (userId: string, limit: number = 50) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

/**
 * Clear all notifications for a user
 * @param userId - The user's telegram ID
 */
export const clearUserNotifications = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing notifications:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
}; 