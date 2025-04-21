import { Platform, Alert } from 'react-native';

export const showErrorMessage = (
  message: string, 
  title: string = 'Error'
) => {
  if (Platform.OS === 'web') {
    window.alert(message);
  } else {
    Alert.alert(title, message);
  }
};