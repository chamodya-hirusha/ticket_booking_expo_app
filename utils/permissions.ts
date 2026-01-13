import { Alert, Linking, Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';

export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

export const requestMediaLibraryPermission = async (): Promise<PermissionResult> => {
  try {

    const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();

    if (status === 'granted') {
      return {
        granted: true,
        canAskAgain: true,
        status: 'granted',
      };
    }

    if (status === 'denied' && !canAskAgain) {
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }

    const permissionResult = await MediaLibrary.requestPermissionsAsync();

    return {
      granted: permissionResult.status === 'granted',
      canAskAgain: permissionResult.canAskAgain ?? true,
      status: permissionResult.status,
    };
  } catch (error: any) {
    return {
      granted: false,
      canAskAgain: true,
      status: 'undetermined',
    };
  }
};

export const showPermissionSettingsAlert = (
  title: string = 'Permission Required',
  message: string = 'Please enable photo library access in your device settings to save images.'
) => {
  Alert.alert(
    title,
    message,
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Open Settings',
        onPress: () => {
          if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
          } else {
            Linking.openSettings();
          }
        },
      },
    ]
  );
};

export const requestMediaLibraryPermissionWithAlert = async (
  showSettingsAlert: boolean = true
): Promise<boolean> => {
  const result = await requestMediaLibraryPermission();

  if (result.granted) {
    return true;
  }

  if (result.status === 'denied' && !result.canAskAgain && showSettingsAlert) {
    showPermissionSettingsAlert(
      'Permission Denied',
      'Photo library access is required to save ticket QR codes. Please enable it in your device settings.'
    );
  } else if (result.status === 'denied' && result.canAskAgain) {
    Alert.alert(
      'Permission Required',
      'Please grant permission to save images to your gallery.',
      [{ text: 'OK' }]
    );
  } else {
    Alert.alert(
      'Permission Required',
      'Please grant permission to save images to your gallery.',
      [{ text: 'OK' }]
    );
  }

  return false;
};

export const checkMediaLibraryPermission = async (): Promise<boolean> => {
  try {
    const { status } = await MediaLibrary.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    return false;
  }
};

