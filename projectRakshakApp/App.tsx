import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import all screen components
import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/HomeScreen';
import FoundPersonDetailScreen from './components/FoundPersonDetailScreen';
import ResolveScreen from './components/ResolveScreen'; // <-- 1. IMPORT THE NEW SCREEN

const SplashScreen = () => (
  <View style={styles.splashContainer}>
    <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
    <Image
      source={require('./assets/logo.png')}
      style={styles.logo}
      resizeMode="contain"
    />
  </View>
);

const Stack = createNativeStackNavigator();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 2500);
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  // If the splash screen is loading, we show it exclusively.
  if (isLoading) {
    return <SplashScreen />;
  }

  // Once loading is finished, we render the main navigation structure.
  return (
      <NavigationContainer>
        <Stack.Navigator>
          {isLoggedIn ? (
            <>
              <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
              <Stack.Screen
                name="FoundPersonDetail"
                component={FoundPersonDetailScreen}
                options={{ title: 'Found Person Details' }}
              />
              {/* --- 2. ADD THE NEW SCREEN TO THE STACK --- */}
              <Stack.Screen
                name="ResolveCase"
                component={ResolveScreen}
                options={{ title: 'Resolve Case' }} // This sets the header title
              />
            </>
          ) : (
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {(props) => <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    );
  };

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: '90%',
    height: 400,
  },
});

export default App;