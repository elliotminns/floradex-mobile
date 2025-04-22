// src/screens/PlantDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Image,
  Platform
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RootStackParamList } from '../types/navigation';

// Define prediction type
export type Prediction = {
  plant_type: string;
  confidence: number;
};

// Define care info type
export type CareInfo = {
  care_instructions?: string;
  watering_frequency?: string;
  sunlight_requirements?: string;
  humidity?: string;
  temperature?: string;
  fertilization?: string;
};

// Define plant type without care_info (since we'll fetch it separately)
export type Plant = {
  _id: string;
  name: string;
  type: string;
  date_added: string;
  image_url?: string;
  confidence: number;
  all_predictions?: Prediction[];
};

// Use separate types for navigation and route for better compatibility
type PlantDetailRouteProp = RouteProp<RootStackParamList, 'PlantDetail'>;
type PlantDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// API base URL
const API_URL = 'http://127.0.0.1:8000';

// Export as a default function component without parameter destructuring
const PlantDetailScreen = () => {
  // Use hooks to get navigation and route
  const navigation = useNavigation<PlantDetailNavigationProp>();
  const route = useRoute<PlantDetailRouteProp>();
  
  // Access the plant from route params
  const { plant } = route.params;
  const [isDeleting, setIsDeleting] = useState(false);
  const [careInfo, setCareInfo] = useState<CareInfo | null>(null);
  const [loadingCare, setLoadingCare] = useState(true);
  const [careError, setCareError] = useState<string | null>(null);
  
  // Format confidence as percentage
  const confidence = plant.confidence 
    ? `${(plant.confidence * 100).toFixed(0)}%` 
    : 'Unknown';
  
  // Format date
  const formattedDate = new Date(plant.date_added).toLocaleDateString();
  
  // Fetch care information when component mounts
  useEffect(() => {
    fetchCareInformation();
  }, []);
  
  // Function to fetch care information for this plant type
  const fetchCareInformation = async () => {
    try {
      setLoadingCare(true);
      setCareError(null);
      
      // Get auth token
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      console.log(`Fetching care info for: ${plant.type}`);
      
      // Make API request to get care information for this plant type
      const response = await fetch(`${API_URL}/api/plant-species/${encodeURIComponent(plant.type)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Handle non-200 responses
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching care information:', errorText);
        throw new Error('Failed to retrieve care information');
      }
      
      // Parse the response
      const speciesData = await response.json();
      console.log('Species data received:', speciesData);
      
      // Extract care information
      const careInformation: CareInfo = {
        care_instructions: speciesData.care_instructions,
        watering_frequency: speciesData.watering_frequency,
        sunlight_requirements: speciesData.sunlight_requirements,
        humidity: speciesData.humidity,
        temperature: speciesData.temperature, 
        fertilization: speciesData.fertilization
      };
      
      // Update state with care information
      setCareInfo(careInformation);
      
    } catch (error) {
      console.error('Failed to fetch care information:', error);
      setCareError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoadingCare(false);
    }
  };
  
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
  
  // Helper function to render a care info item if it exists - updated to match Plant Details style
  const renderCareInfoItem = (label: string, value?: string) => {
    if (!value) return null;
    
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}:</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    );
  };
  
  // Handle deletion
  const handleDelete = async () => {
    // Platform-specific confirmation
    const confirmDeletion = () => {
      if (Platform.OS === 'web') {
        return window.confirm(
          `Are you sure you want to remove "${plant.name || plant.type}" from your collection?`
        );
      }
      
      return new Promise((resolve) => {
        Alert.alert(
          'Confirm Deletion',
          `Are you sure you want to remove "${plant.name || plant.type}" from your collection?`,
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
      const isConfirmed = await confirmDeletion();
      
      if (!isConfirmed) {
        return;
      }
      
      setIsDeleting(true);
      
      // Get auth token
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }
      
      // Delete the plant
      const response = await fetch(`${API_URL}/api/plants/${plant._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      navigation.goBack();
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete plant: ${errorText}`);
      }
      
    } catch (error) {
      console.error('Error deleting plant:', error);
      Alert.alert(
        'Error', 
        error instanceof Error ? error.message : 'Failed to delete plant'
      );
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Retry fetching care information
  const handleRetryCare = () => {
    fetchCareInformation();
  };
  
  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{plant.name || plant.type}</Text>
        <View style={styles.placeholderView} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero section */}
        <View style={styles.heroSection}>
          {plant.image_url ? (
            <Image 
              source={{ uri: getImageUri(plant.image_url) }}
              style={styles.plantImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.plantIconContainer}>
              <Text style={styles.plantIcon}>🌿</Text>
            </View>
          )}
          <Text style={styles.plantName}>{plant.name || plant.type}</Text>
          <Text style={styles.plantType}>{plant.type}</Text>
        </View>
        
        {/* Information cards */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Plant Details</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Species:</Text>
            <Text style={styles.infoValue}>{plant.type}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Added to Collection:</Text>
            <Text style={styles.infoValue}>{formattedDate}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Identification Confidence:</Text>
            <Text style={styles.infoValue}>{confidence}</Text>
          </View>
        </View>
        
        {/* Care instructions section */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Care Instructions</Text>
          
          {loadingCare ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading care information...</Text>
            </View>
          ) : careError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{careError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetryCare}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : careInfo ? (
            <>
              {careInfo.care_instructions && (
                <View style={styles.mainCareInstructions}>
                  <Text style={styles.careInstructionsText}>
                    {careInfo.care_instructions}
                  </Text>
                </View>
              )}
              
              {renderCareInfoItem('Watering', careInfo.watering_frequency)}
              {renderCareInfoItem('Sunlight', careInfo.sunlight_requirements)}
              {renderCareInfoItem('Humidity', careInfo.humidity)}
              {renderCareInfoItem('Temperature', careInfo.temperature)}
              {renderCareInfoItem('Fertilization', careInfo.fertilization)}
            </>
          ) : (
            <Text style={styles.placeholderText}>
              No care information available for this plant.
            </Text>
          )}
        </View>
        
        {/* Predictions section */}
        {plant.all_predictions && plant.all_predictions.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Other Possibilities</Text>
            
            {plant.all_predictions.map((prediction: Prediction, index: number) => (
              <View key={index} style={styles.predictionRow}>
                <Text style={styles.predictionName}>{prediction.plant_type}</Text>
                <Text style={styles.predictionConfidence}>
                  {(prediction.confidence * 100).toFixed(0)}%
                </Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Delete button */}
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Remove from Collection</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholderView: {
    width: 40, // Balance the header
  },
  content: {
    padding: 16,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  plantImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  plantIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  plantIcon: {
    fontSize: 60,
  },
  plantName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  plantType: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#4CAF50',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    paddingLeft: 8,
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  predictionName: {
    fontSize: 16,
  },
  predictionConfidence: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4CAF50',
  },
  mainCareInstructions: {
    backgroundColor: '#f1f8e9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#7cb342',
  },
  careInstructionsText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#33691e',
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#ff5252',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default PlantDetailScreen;