import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { notificationService, Notification } from '../services/notifications';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  addNotification: (notification: Notification) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load notifications from AsyncStorage
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const loadedNotifications = await notificationService.loadNotifications();
      
      // Sort by creation time (newest first)
      const sortedNotifications = loadedNotifications.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      
      setNotifications(sortedNotifications);
      
      // Calculate unread count
      const unread = sortedNotifications.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('[NotificationContext] Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    loadNotifications();
    
    // Setup listener for new notifications from service
    const unsubscribeService = notificationService.addListener((notification) => {
      // When a new notification is added, refresh the list
      loadNotifications();
    });

    return () => {
      unsubscribeService();
    };
  }, [loadNotifications]);

  // Add notification
  const addNotification = useCallback(async (notification: Notification) => {
    try {
      await notificationService.saveNotification(notification);
      await loadNotifications();
    } catch (error) {
      console.error('[NotificationContext] Error adding notification:', error);
    }
  }, [loadNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('[NotificationContext] Error marking notification as read:', error);
    }
  }, [loadNotifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      await loadNotifications();
    } catch (error) {
      console.error('[NotificationContext] Error marking all notifications as read:', error);
    }
  }, [loadNotifications]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('[NotificationContext] Error deleting notification:', error);
    }
  }, [loadNotifications]);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    try {
      await notificationService.clearAllNotifications();
      await loadNotifications();
    } catch (error) {
      console.error('[NotificationContext] Error clearing all notifications:', error);
    }
  }, [loadNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
        clearAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

