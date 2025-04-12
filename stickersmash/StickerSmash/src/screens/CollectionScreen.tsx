// src/screens/CollectionScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';

type CollectionScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Collection'>;

type CollectionScreenProps = {
  navigation: CollectionScreenNavigationProp;
};

// Define a type for plant items
type Plant = {
    id: string;
    name: string;
    // Add other plant properties as needed
  };

const CollectionScreen = ({ navigation }: CollectionScreenProps) => {
  // Mock data for plants
  const plants: Plant[] = [
    // Empty for now - will be populated later
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Plant Collection</Text>
      {plants.length > 0 ? (
        <FlatList
          data={plants}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.plantCard}>
              <Text>{item.name}</Text>
            </View>
          )}
          numColumns={2}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No plants in your collection yet</Text>
          <Text style={styles.subtitle}>
            Identify your first plant to start your collection
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  plantCard: {
    flex: 1,
    margin: 8,
    height: 150,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
});

export default CollectionScreen;