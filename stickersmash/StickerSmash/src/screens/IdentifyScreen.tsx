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
  Alert 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

type IdentifyScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Identify'>;

type IdentifyScreenProps = {
  navigation: IdentifyScreenNavigationProp;
};

type IdentificationResult = {
  plant_type: string;
  confidence: number;
  all_predictions: Array<{
    plant_type: string;
    confidence: number;
  }>;
  image_url?: string; // Field for storing the image URL
};

const API_URL = 'http://127.0.0.1:8000';

// Helper function to show error messages
const showErrorMessage = (message: string, title: string = 'Error') => {
  Alert.alert(title, message);
};

const IdentifyScreen = ({ navigation }: IdentifyScreenProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [identificationResult, setIdentificationResult] = useState<IdentificationResult | null>(null);
  const [showResultCard, setShowResultCard] = useState(false);

  const pickImage = async () => {
    // Ask for permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }
    
    // Pick the image
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
  
      // Create a file from the image URI
      const fileResponse = await fetch(image);
      const fileBlob = await fileResponse.blob();
  
      // Create form data to send the image
      const formData = new FormData();
      
      // Append the file as a Blob
      formData.append('file', fileBlob, 'plant_image.jpg');
  
      // Send image to backend for identification
      const response = await fetch(`${API_URL}/api/identify/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
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
        image_data: imageData // Send the base64 image data instead of URL
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

  const renderResultCard = () => {
    if (!showResultCard || !identificationResult) return null;

    const predictions = identificationResult.all_predictions || [];
    
    return (
      <View style={styles.resultCard}>
        <Text style={styles.resultTitle}>Identification Results</Text>
        
        {/* Display the identified plant image if available */}
        {identificationResult.image_url && (
          <Image 
            source={{ uri: identificationResult.image_url }} 
            style={styles.resultImage} 
          />
        )}
        
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Plant Type:</Text>
          <Text style={styles.resultValue}>{identificationResult.plant_type || 'Unknown'}</Text>
        </View>
        
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Confidence:</Text>
          <Text style={styles.resultValue}>
            {identificationResult.confidence 
              ? `${(identificationResult.confidence * 100).toFixed(2)}%` 
              : 'N/A'}
          </Text>
        </View>

        {predictions.length > 0 && (
          <>
            <Text style={styles.predictionsTitle}>All Predictions:</Text>
            <ScrollView style={styles.predictionsContainer}>
              {predictions.map((pred, index) => (
                <View key={index} style={styles.predictionItem}>
                  <Text style={styles.predictionName}>{pred.plant_type}</Text>
                  <Text style={styles.predictionConfidence}>
                    {(pred.confidence * 100).toFixed(2)}%
                  </Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}
        
        <View style={styles.resultButtonContainer}>
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
        <Text style={styles.title}>Identify Plant</Text>
        
        {!showResultCard ? (
          // Show upload area when result card is not visible
          <View style={styles.uploadArea}>
            {image ? (
              <Image source={{ uri: image }} style={styles.image} />
            ) : (
              <>
                <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                  <Text style={styles.uploadText}>+ Upload Image</Text>
                </TouchableOpacity>
                <Text style={styles.helperText}>
                  Take a photo or select an image from your gallery
                </Text>
              </>
            )}
          </View>
        ) : (
          // Show the result card when available
          renderResultCard()
        )}
        
        {image && !showResultCard && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.identifyButton} 
              onPress={identifyPlant}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Identify Plant</Text>
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
      </View>
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
    paddingBottom: 30, // Extra padding at the bottom
  },
  container: {
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 10,
  },
  uploadArea: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    height: 300,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },
  uploadText: {
    color: '#fff',
    fontSize: 18,
  },
  helperText: {
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
  },
  identifyButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    height: 54,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  cancelButton: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
  },
  // Result card styles
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
    resizeMode: 'cover',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultLabel: {
    fontSize: 16,
    color: '#666',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  predictionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 5,
  },
  predictionsContainer: {
    maxHeight: 150,
    marginBottom: 15,
  },
  predictionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  predictionName: {
    fontSize: 14,
  },
  predictionConfidence: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultButtonContainer: {
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    height: 54,
    justifyContent: 'center',
  },
  discardButton: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  discardText: {
    color: '#ff6b6b',
    fontSize: 16,
  },
});

export default IdentifyScreen;