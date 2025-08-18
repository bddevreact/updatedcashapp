import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, AlertTriangle, Info, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { getUserNotifications, markNotificationAsRead, clearUserNotifications } from '../lib/notifications';

interface NotificationCenterProps {
  userId: string;
}

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action_url?: string;
  action_text?: string;
}

interface Activity {
  id: string;
  type: 'task' | 'referral' | 'withdrawal' | 'deposit' | 'level_up' | 'bonus';
  title: string;
  description: string;
  amount?: number;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

export default function NotificationCenter({ userId }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'activities'>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load real notifications from database
  useEffect(() => {
    if (userId && userId !== '0') {
      loadNotifications();
      
      // Auto-refresh notifications every 30 seconds
      const interval = setInterval(() => {
        loadNotifications();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [userId]);

  const loadNotifications = async () => {
    try {
    setIsLoading(true);
      
      // Load real notifications from database
      const dbNotifications = await getUserNotifications(userId, 50);
      
      // Transform database notifications to component format
      const transformedNotifications: Notification[] = dbNotifications.map(dbNotif => ({
        id: dbNotif.id,
        type: dbNotif.type as 'success' | 'warning' | 'info' | 'error',
        title: dbNotif.title,
        message: dbNotif.message,
        timestamp: new Date(dbNotif.created_at),
        read: dbNotif.is_read || false,
        action_url: dbNotif.action_url,
        action_text: dbNotif.action_text
      }));

      setNotifications(transformedNotifications);
      setUnreadCount(transformedNotifications.filter(n => !n.read).length);
      
      // For now, keep mock activities (can be replaced with real data later)
      setActivities([
        {
          id: '1',
          type: 'task',
          title: 'Daily Check-in Completed',
          description: 'Successfully completed daily check-in task',
          amount: 50,
          timestamp: new Date(Date.now() - 300000),
          status: 'completed'
        },
        {
          id: '2',
          type: 'referral',
          title: 'New Referral Added',
          description: 'Ahmed Khan joined via your referral',
          amount: 50,
          timestamp: new Date(Date.now() - 3600000),
          status: 'completed'
        }
      ]);
      
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      // Mark as read in database
      await markNotificationAsRead(id);
      
      // Update local state
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      // Mark all as read in database
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(unreadNotifications.map(n => markNotificationAsRead(n.id)));
      
      // Update local state
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearNotifications = async () => {
    try {
      // Clear notifications from database
      await clearUserNotifications(userId);
      
      // Clear local state
    setNotifications([]);
    setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'referral':
        return <CheckCircle className="w-5 h-5 text-blue-400" />;
      case 'withdrawal':
        return <CheckCircle className="w-5 h-5 text-purple-400" />;
      case 'deposit':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'level_up':
        return <CheckCircle className="w-5 h-5 text-gold" />;
      case 'bonus':
        return <CheckCircle className="w-5 h-5 text-yellow-400" />;
      default:
        return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-400 hover:text-white transition-colors"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-12 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadNotifications}
                    disabled={isLoading}
                    className="p-1 text-gray-400 hover:text-white transition-colors duration-200"
                    title="Refresh notifications"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-700">
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                    activeTab === 'notifications'
                      ? 'text-gold border-b-2 border-gold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Notifications ({notifications.length})
                </button>
                <button
                  onClick={() => setActiveTab('activities')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                    activeTab === 'activities'
                      ? 'text-gold border-b-2 border-gold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Activities ({activities.length})
                </button>
              </div>

              {/* Content */}
              <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto"></div>
                    <p className="mt-2">Loading...</p>
                  </div>
                ) : activeTab === 'notifications' ? (
                  <div className="p-2">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center p-2 mb-2">
                          <button
                            onClick={markAllNotificationsAsRead}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Mark all as read
                          </button>
                          <button
                            onClick={clearNotifications}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Clear all
                          </button>
                        </div>
                        {notifications.map((notification) => (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-3 rounded-lg mb-2 transition-all duration-200 ${
                              notification.read ? 'bg-gray-700/50' : 'bg-blue-500/10 border border-blue-500/20'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {getNotificationIcon(notification.type)}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-white mb-1">
                                  {notification.title}
                                </h4>
                                <p className="text-xs text-gray-300 mb-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-400">
                                    {formatTimeAgo(notification.timestamp)}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {!notification.read && (
                                      <button
                                        onClick={() => handleMarkAsRead(notification.id)}
                                        className="text-xs text-blue-400 hover:text-blue-300"
                                      >
                                        Mark read
                                      </button>
                                    )}
                                    {notification.action_url && (
                                      <a
                                        href={notification.action_url}
                                        className="text-xs text-gold hover:text-yellow-400 flex items-center gap-1"
                                      >
                                        {notification.action_text || 'View'}
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-2">
                    {activities.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No activities yet</p>
                      </div>
                    ) : (
                      activities.map((activity) => (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-3 rounded-lg mb-2 bg-gray-700/50 transition-all duration-200"
                        >
                          <div className="flex items-start gap-3">
                            {getActivityIcon(activity.type)}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-white mb-1">
                                {activity.title}
                              </h4>
                              <p className="text-xs text-gray-300 mb-2">
                                {activity.description}
                              </p>
                              <div className="flex items-center justify-between">
                                {activity.amount && (
                                  <span className="text-xs text-green-400 font-medium">
                                    +৳{activity.amount}
                                  </span>
                                )}
                                <span className="text-xs text-gray-400">
                                  {formatTimeAgo(activity.timestamp)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
} 