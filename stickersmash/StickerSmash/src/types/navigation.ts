// src/types/navigation.ts - simplify your types
import { Plant } from '../screens/PlantDetailScreen';

// Root navigator types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  PlantDetail: { plant: Plant };
};

// Tab navigator types
export type MainTabParamList = {
  Collection: undefined;
  Identify: undefined;
  Profile: undefined;
};