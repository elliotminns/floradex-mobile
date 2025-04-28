import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  ActivityIndicator, 
  Platform, 
  Alert,
  Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { API_URL } from '../types/navigation';

// Get screen dimensions for responsive sizing
const { width, height } = Dimensions.get('window');

type IdentifyScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Identify'>;

type IdentifyScreenProps = {
  navigation: IdentifyScreenNavigationProp;
};

// Updated type to include care_info
type IdentificationResult = {
  plant_type: string;
  confidence: number;
  all_predictions: Array<{
    plant_type: string;
    confidence: number;
  }>;
  image_url?: string; // Field for storing the image URL
  care_info?: {
    care_instructions?: string;
    watering_frequency?: string;
    sunlight_requirements?: string;
    humidity?: string;
    temperature?: string;
    fertilization?: string;
  };
};

// Helper function to show error messages
const showErrorMessage = (message: string, title: string = 'Error') => {
  Alert.alert(title, message);
};

const IdentifyScreen = ({ navigation }: IdentifyScreenProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [identificationResult, setIdentificationResult] = useState<IdentificationResult | null>(null);
  const [showResultCard, setShowResultCard] = useState(false);

  // Function to take a photo using the camera
  const takePhoto = async () => {
    // Ask for camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to make this work!');
      return;
    }
    
    // Launch camera
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      // Reset any previous identification results
      setIdentificationResult(null);
      setShowResultCard(false);
    }
  };

  // Function to pick an image from the library
  const pickImage = async () => {
    // Ask for permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Sorry, we need media library permissions to make this work!');
      return;
    }
    
    // Pick the image - using string value for mediaTypes
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      // Reset any previous identification results
      setIdentificationResult(null);
      setShowResultCard(false);
    }
  };

  // Function to show image selection options
  const showImageOptions = () => {
    Alert.alert(
      'Select Image Source',
      'How would you like to add a plant image?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
        {
          text: 'Take Photo',
          onPress: takePhoto
        },
        {
          text: 'Choose from Library',
          onPress: pickImage
        }
      ]
    );
  };

  const identifyPlant = async () => {
    // Ensure an image is selected
    if (!image) {
      showErrorMessage('Please select an image first');
      return;
    }
  
    // Start loading state
    setLoading(true);
  
    try {
      // Get the authentication token and user ID
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      
      if (!token || !userId) {
        throw new Error('Authentication information not found. Please log in.');
      }
  
      // Create form data to send the image
      const formData = new FormData();
      
      // Append the file with the correct structure for React Native
      formData.append('file', {
        uri: image,
        type: 'image/jpeg',
        name: 'plant_image.jpg'
      } as any);
  
      console.log('Sending identification request with image uri:', image);
  
      // Send image to backend for identification
      const response = await fetch(`${API_URL}/api/identify/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          // Don't set Content-Type here - it will be set automatically with the correct boundary
        },
        body: formData
      });
  
      // Check if the response is successful
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Identification error response:', errorText);
        throw new Error(`Plant identification failed: ${errorText}`);
      }
  
      // Parse the identification result
      const result = await response.json();
      
      // Always use the local image URI for display, regardless of what the server returns
      if (image) {
        result.image_url = image;
        console.log('Using local image URI:', image);
      }
      
      console.log('Identification result with local image:', result);
      
      // Store the identification result in state
      setIdentificationResult(result);
      setShowResultCard(true);
  
    } catch (error) {
      // Handle any errors
      console.error('Plant identification error:', error);
      showErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred during plant identification'
      );
    } finally {
      // Reset loading state
      setLoading(false);
    }
  };

  const addToCollection = async () => {
    if (!identificationResult) {
      showErrorMessage('No identification result to save');
      return;
    }

    setLoading(true);

    try {
      // Get the authentication token and user ID
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      
      if (!token || !userId) {
        throw new Error('Authentication information not found. Please log in.');
      }

      // Convert image to base64 if it's a local URI
      let imageData = "";
      if (image) {
        try {
          console.log('Converting image to base64:', image);
          const response = await fetch(image);
          const blob = await response.blob();
          imageData = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              // Extract only the base64 part without the data:image/jpeg;base64, prefix
              const result = reader.result as string;
              const base64data = result.split(',')[1] || result;
              resolve(base64data);
            };
            reader.readAsDataURL(blob);
          });
          console.log('Successfully converted image to base64, length:', imageData.length);
        } catch (error) {
          console.error("Error converting image:", error);
        }
      }

      // Prepare the plant data for submission
      const plantData = {
        type: identificationResult.plant_type || 'Unknown',
        user_id: userId,
        date_added: new Date().toISOString(),
        name: identificationResult.plant_type || 'Unidentified Plant',
        confidence: identificationResult.confidence || 0,
        all_predictions: identificationResult.all_predictions || [],
        image_data: imageData, // Send the base64 image data instead of URL
      };
  
      // Log the plant data to be sent (without the full image data for readability)
      console.log('Plant Data to Submit:', {
        ...plantData,
        image_data: imageData ? `[Base64 string of length: ${imageData.length}]` : 'None'
      });
  
      // Add the identified plant to the collection
      const addToCollectionResponse = await fetch(`${API_URL}/api/plants/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(plantData)
      });
  
      // Log the collection response details
      console.log('Add to Collection Response:', {
        status: addToCollectionResponse.status,
        headers: Object.fromEntries(addToCollectionResponse.headers.entries()),
      });

      const responseText = await addToCollectionResponse.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('Response data:', responseData);
      } catch (e) {
        console.log('Response text (not JSON):', responseText);
      }
  
      // Check if the response is successful
      if (!addToCollectionResponse.ok) {
        console.error('Collection error response:', responseText);
        throw new Error(`Failed to add plant to collection: ${responseText}`);
      }
  
      // Show success message
      showErrorMessage('Plant added to your collection!', 'Success');
      
      // Reset the screen
      setImage(null);
      setIdentificationResult(null);
      setShowResultCard(false);
      
    } catch (error) {
      // Handle any errors
      console.error('Add to collection error:', error);
      showErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred when adding plant to collection'
      );
    } finally {
      setLoading(false);
    }
  };

  const cancelIdentification = () => {
    // Reset states
    setIdentificationResult(null);
    setShowResultCard(false);
  };

  // Dynamic style for the image container
  const imageContainerStyle = {
    ...styles.imageContainer,
    height: image ? 300 : 400, // Taller container when showing options
  };

  // Helper function to render a care info item if it exists (styled like PlantDetailScreen)
  const renderCareInfoItem = (label: string, value?: string) => {
    if (!value) return null;
    
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}:</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    );
  };

  const renderResultCard = () => {
    if (!showResultCard || !identificationResult) return null;

    const predictions = identificationResult.all_predictions || [];
    const careInfo = identificationResult.care_info || {};
    
    return (
      <View style={styles.resultsContainer}>
        {/* Plant image */}
        <View style={styles.imageCard}>
          {identificationResult.image_url && (
            <Image 
              source={{ uri: identificationResult.image_url }} 
              style={styles.resultImage} 
            />
          )}
        </View>
        
        {/* Identification results card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Plant Details</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plant Type:</Text>
            <Text style={styles.infoValue}>{identificationResult.plant_type || 'Unknown'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Confidence:</Text>
            <Text style={styles.infoValue}>
              {identificationResult.confidence 
                ? `${(identificationResult.confidence * 100).toFixed(0)}%` 
                : 'N/A'}
            </Text>
          </View>
        </View>
        
        {/* Care instructions card */}
        {careInfo && Object.keys(careInfo).length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Care Instructions</Text>
            
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
          </View>
        )}

        {/* Other possibilities card */}
        {predictions.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Other Possibilities</Text>
            
            {predictions.map((pred, index) => (
              <View key={index} style={styles.infoRow}>
                <Text style={styles.predictionName}>{pred.plant_type}</Text>
                <Text style={styles.predictionConfidence}>
                  {(pred.confidence * 100).toFixed(0)}%
                </Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Action buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={addToCollection}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save to Collection</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.discardButton}
            onPress={cancelIdentification}
            disabled={loading}
          >
            <Text style={styles.discardText}>Discard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.scrollContainer} 
      contentContainerStyle={styles.scrollContentContainer}
    >
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Plant Identifier</Text>
          <Text style={styles.subtitle}>Take or upload a photo to identify your plant</Text>
        </View>
        
        {!showResultCard ? (
          <>
            {/* Image container - adjustable height based on whether image is present */}
            <View style={imageContainerStyle}>
              {image ? (
                <Image 
                  source={{ uri: image }} 
                  style={styles.selectedImage} 
                />
              ) : (
                <View style={styles.imageOptionsContainer}>
                  {/* Decorative plant icon at the top */}
                  <View style={styles.decorativeIconContainer}>
                    <Ionicons name="leaf" size={60} color="#4CAF50" />
                  </View>
                  
                  {/* Primary Option: Take Photo */}
                  <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
                    <Ionicons name="camera" size={30} color="#fff" />
                    <Text style={styles.cameraText}>Take Photo</Text>
                  </TouchableOpacity>
                  
                  {/* Secondary Option: Upload Image */}
                  <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.orText}>OR</Text>
                    <View style={styles.divider} />
                  </View>
                  
                  <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                    <Ionicons name="images" size={24} color="#fff" />
                    <Text style={styles.uploadText}>Choose from Library</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.helperText}>
                    For best results, ensure the plant is well-lit and centered in the frame
                  </Text>
                </View>
              )}
            </View>
            
            {/* Buttons shown when image is selected */}
            {image && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.identifyButton} 
                  onPress={identifyPlant}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="search" size={24} color="#fff" style={styles.buttonIcon} />
                      <Text style={styles.buttonText}>Identify Plant</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setImage(null)}
                  disabled={loading}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          // Show the result card when available
          renderResultCard()
        )}
      </View>
      
      {/* Add bottom padding for better scrolling experience */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingVertical: 10,
  },
  container: {
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#3e8e41', 
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  // Base image container style
  imageContainer: {
    backgroundColor: '#fff',
    borderRadius: 20, // More rounded corners
    width: '100%',
    // Height is set dynamically in the component
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    marginBottom: 20,
    padding: 15, // Add padding inside the container
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16, // Rounded corners for the image
    resizeMode: 'contain', // Ensure the whole image fits
  },
  imageOptionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%', // Leave some padding on sides
    paddingVertical: 20, // More vertical padding
  },
  decorativeIconContainer: {
    marginBottom: 30,
    backgroundColor: '#e8f5e9',
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#c8e6c9',
  },
  cameraButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12, // More rounded corners
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  cameraText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  orText: {
    marginHorizontal: 16,
    color: '#666',
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#7CB342',
    padding: 16,
    borderRadius: 12, // More rounded corners
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 1,
  },
  uploadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  helperText: {
    color: '#757575',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  // Results section
  resultsContainer: {
    width: '100%',
  },
  imageCard: {
    backgroundColor: '#fff',
    borderRadius: 20, // More rounded corners
    overflow: 'hidden',
    marginBottom: 20,
    padding: 15, // Add padding
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultImage: {
    width: '100%',
    height: 300, // Match the height of the pre-identification container
    borderRadius: 16, // Rounded corners for the image
    resizeMode: 'contain', // Show the whole image without cropping
  },
  // Info card styles
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20, // More rounded corners
    padding: 24, // More padding
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#3e8e41',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12, // More vertical padding
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    paddingLeft: 8,
    color: '#333',
  },
  // Care instructions
  mainCareInstructions: {
    backgroundColor: '#f1f8e9',
    borderRadius: 12, // More rounded corners
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#7cb342',
  },
  careInstructionsText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#33691e',
  },
  // Predictions
  predictionName: {
    fontSize: 16,
    color: '#333',
  },
  predictionConfidence: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  // Action buttons
  buttonContainer: {
    width: '100%',
    marginTop: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  identifyButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12, // More rounded corners
    alignItems: 'center',
    marginBottom: 16,
    height: 56,
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12, // More rounded corners
    alignItems: 'center',
    marginBottom: 16,
    height: 56,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12, // More rounded corners
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f8f8f8',
  },
  cancelText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '500',
  },
  discardButton: {
    padding: 16,
    borderRadius: 12, // More rounded corners
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff6b6b',
    backgroundColor: '#fff',
  },
  discardText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 40, // Add extra space at the bottom
  }
});

export default IdentifyScreen;