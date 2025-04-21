// src/utils/alertUtils.ts
import { Platform, Alert } from 'react-native';

// Simple alert for error messages or notifications
export const showMessage = (
  message: string,
  title: string = 'Message'
) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// Confirmation dialog with OK/Cancel buttons
export const showConfirmation = (
  message: string,
  title: string = 'Confirm',
  onConfirm: () => void,
  onCancel?: () => void
) => {
  // On web, use the built-in confirm dialog
  if (Platform.OS === 'web') {
    const result = window.confirm(`${title}: ${message}`);
    if (result) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    // On mobile, use React Native's Alert
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel
        },
        {
          text: 'OK',
          style: 'destructive',
          onPress: onConfirm
        }
      ],
      { cancelable: true }
    );
  }
};

// Delete confirmation with customized buttons
export const showDeleteConfirmation = (
  message: string,
  title: string = 'Delete Confirmation',
  onConfirm: () => void,
  onCancel?: () => void
) => {
  // On web, use the built-in confirm dialog
  if (Platform.OS === 'web') {
    const result = window.confirm(`${title}: ${message}`);
    if (result) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    // On mobile, use React Native's Alert
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onConfirm
        }
      ],
      { cancelable: true }
    );
  }
};