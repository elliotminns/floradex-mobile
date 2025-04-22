// app/index.tsx - final version without type errors
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { RootStackParamList, MainTabParamList } from '../src/types/navigation';

// Import screens
import AuthScreen from '../src/screens/AuthScreen';
import CollectionScreen from '../src/screens/CollectionScreen';
import IdentifyScreen from '../src/screens/IdentifyScreen';
import ProfileScreen from '../src/screens/ProfileScreen';
import PlantDetailScreen from '../src/screens/PlantDetailScreen';

// Create non-typed navigators to avoid the type compatibility issues
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let icon = '•'; // Basic placeholder icon
          
          if (route.name === 'Collection') {
            icon = '🌿';
          } else if (route.name === 'Identify') {
            icon = '📷';
          } else if (route.name === 'Profile') {
            icon = '👤';
          }
          
          return <Text style={{ fontSize: 20 }}>{icon}</Text>;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Collection" component={CollectionScreen} />
      <Tab.Screen name="Identify" component={IdentifyScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Main Navigator
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Auth" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="PlantDetail" component={PlantDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;