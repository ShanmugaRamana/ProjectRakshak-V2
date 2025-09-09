import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image
} from 'react-native';
import apiClient from '../api/client';

// Language translations
const translations = {
  en: {
    login: 'Login',
    mobileNumber: 'Mobile Number',
    password: 'Password',
    logIn: 'Log In',
    error: 'Error',
    loginFailed: 'Login Failed',
    fillAllFields: 'Please fill in all fields',
    connectionError: 'Connection Error. Please check the server IP address.'
  },
  hi: {
    login: 'लॉगिन',
    mobileNumber: 'मोबाइल नंबर',
    password: 'पासवर्ड',
    logIn: 'लॉग इन',
    error: 'त्रुटि',
    loginFailed: 'लॉगिन असफल',
    fillAllFields: 'कृपया सभी फ़ील्ड भरें',
    connectionError: 'कनेक्शन त्रुटि। कृपया सर्वर आईपी पता जांचें।'
  }
};

const RakshakLogo = () => (
  <View style={styles.logoContainer}>
    <Image
      source={require('../assets/logo.png')}
      style={styles.logoImage}
      resizeMode="cover"
    />
  </View>
);

const LoginScreen = ({ onLoginSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');

  const t = translations[language];

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'hi' : 'en');
  };

  const handleLogin = async () => {
    if (!phoneNumber || !password) {
      Alert.alert(t.error, t.fillAllFields);
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.post('/staff-auth/login', {
        phoneNumber,
        password,
      });

      if (response.data.success) {
        onLoginSuccess();
      }
    } catch (error) {
      const message = error.response?.data?.message || t.connectionError;
      Alert.alert(t.loginFailed, message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <RakshakLogo />

        {/* Header Section with Language Toggle */}
        <View style={styles.headerContainer}>
          <Text style={styles.loginTitle}>{t.login}</Text>
          <View style={styles.languageToggle}>
            <TouchableOpacity onPress={toggleLanguage}>
              <Text style={[styles.languageText, language === 'en' && styles.activeLanguage]}>
                En
              </Text>
            </TouchableOpacity>
            <Text style={styles.languageSeparator}> / </Text>
            <TouchableOpacity onPress={toggleLanguage}>
              <Text style={[styles.languageText, language === 'hi' && styles.activeLanguage]}>
                हि
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t.mobileNumber}
              placeholderTextColor="#999"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t.password}
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>{t.logIn}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: 80,
    paddingBottom: 40,
  },

  // Logo Styles - Edge to Edge
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
    width: '100%',
    paddingHorizontal: 0,
  },
  logoImage: {
    width: '100%',
    height: 300,
  },

  // Header Styles
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 60,
    paddingHorizontal: 32,
  },
  loginTitle: {
    fontSize: 35,
    fontWeight: '600',
    color: '#333333',
  },
  languageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  languageText: {
    fontSize: 20,
    color: '#999999',
    fontWeight: '400',
  },
  activeLanguage: {
    color: '#333333',
    fontWeight: '600',
  },
  languageSeparator: {
    fontSize: 16,
    color: '#999999',
    fontWeight: '400',
  },

  // Form Styles
  formContainer: {
    width: '100%',
    paddingHorizontal: 30,

  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  loginButton: {
    backgroundColor: '#000000',
    borderRadius: 40,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
});

export default LoginScreen;