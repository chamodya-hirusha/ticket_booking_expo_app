import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Dynamic import for Notifee to handle cases where native module isn't available
let notifee: any = null;
let AndroidImportance: any = null;
let AndroidStyle: any = null;

try {
  const notifeeModule = require('@notifee/react-native');
  notifee = notifeeModule.default || notifeeModule;
  AndroidImportance = notifeeModule.AndroidImportance;
  AndroidStyle = notifeeModule.AndroidStyle;
} catch (error) {
  // Notifee not available
}

// Notification storage key
const NOTIFICATIONS_STORAGE_KEY = '@notifications';

// Android notification channel ID
const ANDROID_CHANNEL_ID = 'favorites_channel';

// Notification interface
export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'ticket' | 'promo' | 'system' | 'event';
  read: boolean;
  data?: any;
  createdAt?: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private listeners: Set<(notification: Notification) => void> = new Set();
  private channelCreated: boolean = false;

  private constructor() {
    // Initialization happens lazily when showLocalNotification is called
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Initialize Notifee and create Android channel
  private async initializeNotifee(): Promise<void> {
    if (!notifee) {
      return;
    }

    try {
      if (Platform.OS === 'android' && !this.channelCreated) {
        await notifee.createChannel({
          id: ANDROID_CHANNEL_ID,
          name: 'Favorites Notifications',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        });
        this.channelCreated = true;
      }
    } catch (error) {
      // Error initializing Notifee
    }
  }

  // Save notification to AsyncStorage
  async saveNotification(notification: Notification): Promise<void> {
    try {
      const notifications = await this.loadNotifications();

      // Add new notification at the beginning
      const updatedNotifications = [notification, ...notifications];

      // Limit to last 100 notifications to prevent storage bloat
      const limitedNotifications = updatedNotifications.slice(0, 100);

      await AsyncStorage.setItem(
        NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(limitedNotifications)
      );

      this.listeners.forEach((listener) => listener(notification));
    } catch (error) {
      // Error saving notification
    }
  }

  // Load all notifications from AsyncStorage
  async loadNotifications(): Promise<Notification[]> {
    try {
      const data = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (!data) {
        return [];
      }

      const notifications: Notification[] = JSON.parse(data);

      // Ensure all notifications have required fields
      return notifications.map((n) => ({
        ...n,
        read: n.read ?? false,
        type: n.type || 'system',
      }));
    } catch (error) {
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notifications = await this.loadNotifications();
      const updatedNotifications = notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );

      await AsyncStorage.setItem(
        NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(updatedNotifications)
      );
    } catch (error) {
      // Error marking notification as read
    }
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    try {
      const notifications = await this.loadNotifications();
      const updatedNotifications = notifications.map((n) => ({ ...n, read: true }));

      await AsyncStorage.setItem(
        NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(updatedNotifications)
      );
    } catch (error) {
      // Error marking all notifications as read
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const notifications = await this.loadNotifications();
      const updatedNotifications = notifications.filter((n) => n.id !== notificationId);

      await AsyncStorage.setItem(
        NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(updatedNotifications)
      );
    } catch (error) {
      // Error deleting notification
    }
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    try {
      await AsyncStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
    } catch (error) {
      // Error clearing notifications
    }
  }

  // Get unread count
  async getUnreadCount(): Promise<number> {
    try {
      const notifications = await this.loadNotifications();
      return notifications.filter((n) => !n.read).length;
    } catch (error) {
      return 0;
    }
  }

  // Create a new notification (helper method)
  createNotification(
    title: string,
    message: string,
    type: Notification['type'] = 'system',
    data?: any
  ): Notification {
    return {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      time: this.formatTime(new Date()),
      type,
      read: false,
      data,
      createdAt: new Date().toISOString(),
    };
  }

  // Add and save notification (convenience method)
  async addNotification(
    title: string,
    message: string,
    type: Notification['type'] = 'system',
    data?: any
  ): Promise<void> {
    const notification = this.createNotification(title, message, type, data);
    await this.saveNotification(notification);
  }

  // Show popup notification using Notifee and save to AsyncStorage
  async showLocalNotification(
    title: string,
    message: string,
    type: Notification['type'] = 'system',
    data?: any
  ): Promise<void> {
    // Always save to AsyncStorage first
    const notification = this.createNotification(title, message, type, data);
    await this.saveNotification(notification);

    // Try to display Notifee notification if available
    if (!notifee) {
      return;
    }

    try {
      // Ensure Notifee is initialized
      await this.initializeNotifee();

      // Display popup notification using Notifee
      await notifee.displayNotification({
        title,
        body: message,
        data: data || {},
        android: {
          channelId: ANDROID_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          style: {
            type: AndroidStyle.BIGTEXT,
            text: message,
          },
          smallIcon: 'ic_launcher', // Use your app icon
          color: '#6366f1', // Primary color
        },
        ios: {
          sound: 'default',
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
      });
    } catch (error) {
      // Notification already saved to AsyncStorage, so we're good
    }
  }

  // Add listener for new notifications
  addListener(listener: (notification: Notification) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Format time for display
  private formatTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
