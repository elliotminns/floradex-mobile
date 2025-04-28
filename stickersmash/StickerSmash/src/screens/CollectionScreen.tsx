// src/screens/CollectionScreen.tsx
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  RefreshControl, 
  Alert, 
  Platform, 
  Image,
  SafeAreaView 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showMessage, showDeleteConfirmation } from '../utils/alertUtils';
import Ionicons from '@expo/vector-icons/Ionicons';

// Import navigation types
import { useNavigation } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../types/navigation';

// Define the composite navigation type for accessing both tab and stack navigators
type CollectionScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Collection'>,
  NativeStackNavigationProp<RootStackParamList>
>;

// Define the Plant interface for this component
interface Plant {
  _id: string;
  name: string;
  type: string;
  date_added: string;
  image_url?: string;
  confidence: number;
  all_predictions?: Array<{
    plant_type: string;
    confidence: number;
  }>;
}


import { API_URL } from '../types/navigation';

const CollectionScreen = () => {
  // Use the useNavigation hook with our composite type
  const navigation = useNavigation<CollectionScreenNavigationProp>();
  
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Function to get proper image URI
  const getImageUri = (imageUrl: string | undefined): string => {
    if (!imageUrl) return '';
    
    // If it starts with 'http', it's already a full URL
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // If it starts with '/', it's a server path that needs the API_URL prepended
    if (imageUrl.startsWith('/')) {
      return `${API_URL}${imageUrl}`;
    }
    
    // Otherwise, just return the URL as is (could be a local file URI)
    return imageUrl;
  };

  // Function to fetch plants from the API
  const fetchPlants = async () => {
    try {
      setError(null);
      // Get the authentication token
      
      const token = await AsyncStorage.getItem('userToken');
      console.log(token);
      
      if (!token) {
        console.error('No authentication token found');
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Reset image errors when fetching new plants
      setImageErrors({});
      
      // Try different potential API endpoints
      const endpoints = [
        '/api/plants/'       // New endpoint
      ];
      
      let response = null;
      let validEndpoint = null;
      
      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        const url = `${API_URL}${endpoint}`;
        console.log('Trying to fetch plants from:', url);
        
        try {
          const tempResponse = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log(`Response status for ${endpoint}:`, tempResponse.status);
          
          if (tempResponse.ok) {
            response = tempResponse;
            validEndpoint = url;
            break;
          }
        } catch (e) {
          console.log(`Endpoint ${endpoint} failed:`, e);
        }
      }
      
      if (!response) {
        throw new Error('Failed to fetch plants from any endpoint');
      }
      
      console.log('Successfully connected to endpoint:', validEndpoint);
      
      // Log response headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value: string, key: string) => {
        headers[key] = value;
      });
      console.log('Response headers:', headers);
      
      const responseText = await response.text();
      console.log('Response text length:', responseText.length);
      
      // Parse the response
      const data = responseText ? JSON.parse(responseText) : [];
      console.log('Parsed data:', data);
      
      // Check if data is an array
      if (Array.isArray(data)) {
        setPlants(data);
        console.log(`Loaded ${data.length} plants`);
        
        // Log image URLs for debugging
        data.forEach(plant => {
          if (plant.image_url) {
            console.log(`Plant ${plant._id} has image URL: ${plant.image_url}`);
            console.log(`Full image URL will be: ${getImageUri(plant.image_url)}`);
          }
        });
      } else {
        console.error('Data is not an array:', data);
        setPlants([]);
        setError('Received invalid data format from server');
      }
    } catch (error) {
      console.error('Error fetching plants:', error);
      setError(`Failed to load plants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Handle image loading error
  const handleImageError = (plantId: string, error: any) => {
    console.error(`Image loading error for plant ${plantId}:`, error);
    setImageErrors(prev => ({
      ...prev,
      [plantId]: true
    }));
  };
  
  // Load plants when the screen is first rendered
  useEffect(() => {
    console.log('CollectionScreen mounted or focused');
    fetchPlants();
    
    // Add a listener for when this screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('CollectionScreen focused');
      fetchPlants();
    });
    
    // Clean up the listener when the component is unmounted
    return unsubscribe;
  }, [navigation]);
  
  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchPlants();
  };
  
  // Handle plant item press - navigate to plant detail screen
  const handlePlantPress = (plant: Plant) => {
    console.log('Plant card pressed for plant:', plant._id);
    
    // Use the root stack navigation to go to PlantDetail screen
    navigation.navigate('PlantDetail', { plant });
  };

  // Function to navigate to the Identify screen
  const navigateToIdentify = () => {
    navigation.navigate('Identify');
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading your plants...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Plant Collection</Text>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPlants}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {!error && plants.length > 0 ? (
        <>
          <FlatList
            data={plants}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.plantCard}
                onPress={() => handlePlantPress(item)}
              >
                {/* Plant Image or Placeholder */}
                {item.image_url && !imageErrors[item._id] ? (
                  <Image 
                    source={{ uri: getImageUri(item.image_url) }}
                    style={styles.plantImage} 
                    onError={(e) => handleImageError(item._id, e.nativeEvent.error)}
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>🌿</Text>
                  </View>
                )}
                
                {/* Plant Details */}
                <View style={styles.plantDetails}>
                  <Text style={styles.plantName}>{item.name || item.type}</Text>
                  <Text style={styles.plantType}>{item.type}</Text>
                  <Text style={styles.plantDate}>
                    Added: {new Date(item.date_added).toLocaleDateString()}
                  </Text>
                  {item.confidence > 0 && (
                    <Text style={styles.plantConfidence}>
                      Confidence: {(item.confidence * 100).toFixed(0)}%
                    </Text>
                  )}
                </View>
                
              </TouchableOpacity>
            )}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#4CAF50']}
              />
            }
          />
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No plants in your collection yet</Text>
          <Text style={styles.subtitle}>
            Identify your first plant to start your collection
          </Text>
          <TouchableOpacity 
            style={styles.identifyButton}
            onPress={navigateToIdentify}
          >
            <Text style={styles.buttonText}>Identify a Plant</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Persistent Floating Identify Button */}
      {plants.length > 0 && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={navigateToIdentify}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={24} color="#fff" />
          <Text style={styles.floatingButtonText}>Identify Plant</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100, // Extra padding at bottom to account for floating button
  },
  plantCard: {
    flex: 1,
    margin: 8,
    minHeight: 230, // Fixed minimum height
    maxHeight: 280, // Maximum height instead of fixed height
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    overflow: 'hidden', // Prevents children from flowing out of the card
  },
  plantImage: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: 90,
    backgroundColor: '#e0f2e9',
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 36,
  },
  plantDetails: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  plantName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  plantType: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  plantDate: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  plantConfidence: {
    fontSize: 11,
    color: '#4CAF50',
    marginBottom: 4,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    padding: 8,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
    marginTop: 'auto', // Pushes the button to the bottom
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  identifyButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 5,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#c62828',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
  },
  // Floating button styles
  floatingButton: {
    position: 'absolute',
    bottom: 15,
    alignSelf: 'center',
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  floatingButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  }
});

export default CollectionScreen;