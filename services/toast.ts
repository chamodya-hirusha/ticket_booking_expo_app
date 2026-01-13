import { Alert, Platform } from 'react-native';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  title?: string;
}

class ToastService {
  private static instance: ToastService;
  private toastQueue: Array<{ message: string; options: ToastOptions }> = [];
  private isShowing = false;

  private constructor() { }

  static getInstance(): ToastService {
    if (!ToastService.instance) {
      ToastService.instance = new ToastService();
    }
    return ToastService.instance;
  }

  show(message: string, options: ToastOptions = {}): void {
    const { type = 'error', title } = options;

    // On Android, use ToastAndroid for non-error messages for better UX
    if (Platform.OS === 'android' && (type === 'success' || type === 'info')) {
      const ToastAndroid = require('react-native').ToastAndroid;
      ToastAndroid.showWithGravity(
        message,
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM
      );
      return;
    }

    // For validation errors and important messages (or iOS), use Alert
    this.showAlert(message, title || this.getDefaultTitle(type));
  }

  /**
   * Show success toast
   */
  success(message: string, title?: string): void {
    this.show(message, { type: 'success', title });
  }

  /**
   * Show error toast
   */
  error(message: string, title?: string): void {
    this.show(message, { type: 'error', title });
  }

  /**
   * Show info toast
   */
  info(message: string, title?: string): void {
    this.show(message, { type: 'info', title });
  }

  /**
   * Show warning toast
   */
  warning(message: string, title?: string): void {
    this.show(message, { type: 'warning', title });
  }

  private showAlert(message: string, title: string): void {
    // Use React Native Alert for cross-platform support
    Alert.alert(title, message, [{ text: 'OK', style: 'default' }], {
      cancelable: true,
    });
  }

  private getDefaultTitle(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
      default:
        return 'Notification';
    }
  }
}

export const toast = ToastService.getInstance();

