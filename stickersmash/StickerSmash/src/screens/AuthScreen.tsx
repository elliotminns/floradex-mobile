// src/screens/AuthScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;

type AuthScreenProps = {
  navigation: AuthScreenNavigationProp;
};

// Define your API URL - update with your backend URL
//const API_URL = 'http://127.0.0.1:8000'; // For web
// const API_URL = 'http://10.0.2.2:8000'; // For Android emulator
import { API_URL } from '../types/navigation';

const AuthScreen = ({ navigation }: AuthScreenProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setLoading(true);
    
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      
      // For FastAPI OAuth2PasswordRequestForm, use application/x-www-form-urlencoded
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      console.log('Sending request to:', `${API_URL}${endpoint}`);
      console.log('With data:', { username, password });
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      // Log the full response for debugging
      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);
      
      let data;
      try {
        // Try to parse the response as JSON
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing response:', e);
        data = { detail: responseText };
      }
      
      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }
      
      // Save the auth token
      await AsyncStorage.setItem('userToken', data.access_token);
      await AsyncStorage.setItem('userId', data._id);
      await AsyncStorage.setItem('username', data.username);
      
      // Navigate to the main app
      navigation.replace('Main');
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert(
        'Authentication Failed', 
        isLogin ? 'Invalid username or password' : 'Failed to create account'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Floradex</Text>
      <Text style={styles.subtitle}>
        {isLogin ? 'Log in to your account' : 'Create a new account'}
      </Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.disabledButton]} 
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isLogin ? 'Log In' : 'Register'}</Text>
          )}
        </TouchableOpacity>
        
      </View>

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)} disabled={loading}>
        <Text style={styles.switchText}>
          {isLogin ? "Don't have an account? Register" : "Already have an account? Log in"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  form: {
    width: '100%',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 5,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  devButton: {
    backgroundColor: '#999',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchText: {
    color: '#4CAF50',
    fontSize: 16,
  },
});

export default AuthScreen;