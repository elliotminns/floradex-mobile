import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Platform, 
  ActivityIndicator 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../types/navigation';
import { useFocusEffect } from '@react-navigation/native';


import { API_URL } from '../types/navigation';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type ProfileScreenProps = {
  navigation: ProfileScreenNavigationProp;
};

// Define your API URL

const ProfileScreen = ({ navigation }: ProfileScreenProps) => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [plantCount, setPlantCount] = useState<number>(0);

  const fetchUserData = async () => {
    try {
      // Get username from storage
      const storedUsername = await AsyncStorage.getItem('username');
      if (storedUsername) {
        setUsername(storedUsername);
      }
      
      // Get token for authorized requests
      const token = await AsyncStorage.getItem('userToken');
      
      if (token) {
        // Fetch plant count
        const response = await fetch(`${API_URL}/api/plants/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const plants = await response.json();
          setPlantCount(plants.length);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Refresh data whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('ProfileScreen focused - refreshing data');
      fetchUserData();
      return () => {
        // Optional cleanup if needed
      };
    }, [])
  );

  // Fetch user data when the screen loads
  useEffect(() => {
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      // Clear all authentication tokens
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('username');
      
      // Navigate to Auth screen
      navigation.replace('Auth');
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  const handleDeleteAccount = async () => {
    // Platform-specific confirmation
    const confirmDeletion = () => {
      // Web uses window.confirm, others use Alert.alert
      if (Platform.OS === 'web') {
        return window.confirm(
          'Are you absolutely sure you want to delete your account? This action CANNOT be undone.'
        );
      }
      
      // For mobile platforms, return a Promise that resolves based on Alert choice
      return new Promise((resolve) => {
        Alert.alert(
          'Confirm Account Deletion',
          'Are you absolutely sure you want to delete your account? This action CANNOT be undone.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false)
            },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => resolve(true)
            }
          ],
          { cancelable: true }
        );
      });
    };

    try {
      // Show confirmation dialog
      const isConfirmed = await confirmDeletion();
      
      // Exit if not confirmed
      if (!isConfirmed) {
        console.log('Account deletion cancelled');
        return;
      }

      // Start loading state
      setLoading(true);

      // Retrieve the authentication token
      const token = await AsyncStorage.getItem('userToken');
      
      // Validate token existence
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Perform API call to delete account
      const response = await fetch(`${API_URL}/api/users/me`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Log full response details for debugging
      console.log('Delete account response status:', response.status);
      
      // Check if the response is successful
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Account deletion failed: ${errorText}`);
      }

      // Clear all stored user data
      await AsyncStorage.multiRemove([
        'userToken', 
        'userId', 
        'username'
      ]);

      // Navigate back to authentication screen
      navigation.replace('Auth');

      // Show success message differently based on platform
      if (Platform.OS === 'web') {
        alert('Your account has been successfully deleted.');
      } else {
        Alert.alert(
          'Account Deleted', 
          'Your account has been successfully deleted.'
        );
      }

    } catch (error) {
      // Handle any errors during the deletion process
      console.error('Account deletion error:', error);
      
      // Show error message differently based on platform
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while deleting your account.';

      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        Alert.alert(
          'Deletion Failed', 
          errorMessage
        );
      }
    } finally {
      // Ensure loading state is reset
      setLoading(false);
    }

    
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{username ? username[0].toUpperCase() : 'U'}</Text>
        </View>
        <Text style={styles.username}>{username || 'Username'}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoLabel}>Plants in collection:</Text>
        <Text style={styles.infoValue}>{plantCount}</Text>
      </View>

      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={handleLogout}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Log Out</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={handleDeleteAccount}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ff3b30" />
        ) : (
          <Text style={styles.deleteText}>Delete Account</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 40,
    color: '#fff',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    width: '100%',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  infoLabel: {
    fontSize: 16,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  deleteButton: {
    padding: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff3b30',
    height: 54,
    justifyContent: 'center',
  },
  deleteText: {
    color: '#ff3b30',
    fontSize: 18,
  },
});

export default ProfileScreen;