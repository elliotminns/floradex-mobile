// src/screens/IdentifyScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';

type IdentifyScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Identify'>;

type IdentifyScreenProps = {
  navigation: IdentifyScreenNavigationProp;
};

const IdentifyScreen = ({ navigation }: IdentifyScreenProps) => {
  const [image, setImage] = useState<string | null>(null);

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
    }
  };

  const identifyPlant = () => {
    // This will be connected to your API later
    console.log('Identifying plant from image:', image);
    // For now, mock a success
    alert('Plant identified! (This will be connected to your API later)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Identify Plant</Text>
      
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
      
      {image && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.identifyButton} onPress={identifyPlant}>
            <Text style={styles.buttonText}>Identify Plant</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => setImage(null)}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
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
});

export default IdentifyScreen;