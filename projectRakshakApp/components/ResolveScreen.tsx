import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Alert, ScrollView, Image, ActivityIndicator, TextInput
} from 'react-native';
import { launchCamera, CameraOptions, Asset } from 'react-native-image-picker';
import apiClient from '../api/client';

const ResolveScreen = ({ route, navigation }) => {
  const { personId, personName } = route.params;

  const [step, setStep] = useState('take_photo'); // take_photo -> verifying -> collect_details
  const [capturedPhoto, setCapturedPhoto] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // State for the final form
  const [boothLocation, setBoothLocation] = useState('');
  const [officerContact, setOfficerContact] = useState('');

  const handleTakePhoto = async () => {
    const options: CameraOptions = { mediaType: 'photo', quality: 0.7, saveToPhotos: true };
    await launchCamera(options, (response) => {
      if (response.assets && response.assets.length > 0) {
        setCapturedPhoto(response.assets[0]);
        setStep('photo_taken'); // Move to the next step
      }
    });
  };

  const handleVerifyPhoto = async () => {
    if (!capturedPhoto) return;
    setIsLoading(true);
    setStep('verifying');

    const formData = new FormData();
    formData.append('photo', {
        uri: capturedPhoto.uri,
        type: capturedPhoto.type,
        name: capturedPhoto.fileName,
    });

    try {
        const response = await apiClient.post(`/persons/api/person/${personId}/resolve`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (response.data.success) {
            Alert.alert("Match Confirmed!", "Please enter the final drop-off details.");
            setStep('collect_details'); // Verification successful, move to final step
        }
    } catch (error) {
        const message = error.response?.data?.message || "Verification failed.";
        Alert.alert("Verification Failed", `${message} Re-search will be triggered automatically.`);
        navigation.goBack(); // Go back to previous screen on failure
    } finally {
        setIsLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
      if (!boothLocation || !officerContact) {
          Alert.alert("Missing Details", "Please fill in all fields.");
          return;
      }
      setIsLoading(true);
      try {
          const response = await apiClient.post(`/persons/api/person/${personId}/finalize`, {
              boothLocation,
              officerContact
          });
          if (response.data.success) {
              Alert.alert("Success", "Case has been successfully resolved!");
              navigation.navigate('Home');
          }
      } catch (error) {
          const message = error.response?.data?.message || "Could not finalize the case.";
          Alert.alert("Submission Failed", message);
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}


      <ScrollView contentContainerStyle={styles.container}>
        {/* Person Name Section */}
        <View style={styles.nameContainer}>
          <Text style={styles.nameLabel}>RESOLVING CASE FOR:</Text>
          <Text style={styles.personName}>{personName}</Text>
        </View>

        {/* Step 1 & 2: Photo Capture and Verification */}
        {(step === 'take_photo' || step === 'photo_taken' || step === 'verifying') && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>CONFIRMATION PHOTO</Text>
            <Text style={styles.sectionSubtitle}>
              Take a photo to confirm the person's identity before resolving the case
            </Text>

            <View style={styles.photoContainer}>
              {capturedPhoto ? (
                <View style={styles.photoPreviewContainer}>
                  <Image source={{ uri: capturedPhoto.uri }} style={styles.photoPreview} />
                  <TouchableOpacity
                    style={styles.retakeButton}
                    onPress={handleTakePhoto}
                    disabled={isLoading}
                  >
                    <Text style={styles.retakeText}>📸 Retake Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.cameraButton} onPress={handleTakePhoto}>
                  <Text style={styles.cameraIcon}>📷</Text>
                  <Text style={styles.cameraButtonText}>Take Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {step === 'photo_taken' && (
              <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyPhoto}>
                <Text style={styles.verifyButtonText}>Submit for Verification</Text>
              </TouchableOpacity>
            )}

            {step === 'verifying' && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0056b3" />
                <Text style={styles.loadingText}>Verifying identity...</Text>
              </View>
            )}
          </View>
        )}

        {/* Step 3: Collect Final Details */}
        {step === 'collect_details' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>FINAL DROP-OFF DETAILS</Text>
            <Text style={styles.sectionSubtitle}>
              Please provide the booth location and officer contact details
            </Text>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>BOOTH LOCATION</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Main Entrance, Security Booth A"
                  value={boothLocation}
                  onChangeText={setBoothLocation}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>OFFICER CONTACT NUMBER</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter officer's contact number"
                  value={officerContact}
                  onChangeText={setOfficerContact}
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
              </View>

              <TouchableOpacity
                style={[styles.finalSubmitButton, isLoading && styles.disabledButton]}
                onPress={handleFinalSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.finalSubmitButtonText}>Submit Final Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { width: step === 'take_photo' ? '33%' : step === 'verifying' ? '66%' : '100%' }
            ]} />
          </View>
          <Text style={styles.progressText}>
            {step === 'take_photo' ? 'Step 1 of 3' :
             step === 'verifying' ? 'Step 2 of 3' : 'Step 3 of 3'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },

  // Header styles
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    letterSpacing: 1,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  // Name section styles
  nameContainer: {
    paddingVertical: 25,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 30,
  },
  nameLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  personName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },

  // Section styles
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 25,
    marginBottom: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },

  // Photo section styles
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cameraButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#0056b3',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 40,
    paddingHorizontal: 60,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
  },
  cameraIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  cameraButtonText: {
    color: '#0056b3',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  photoPreviewContainer: {
    alignItems: 'center',
    width: '100%',
  },
  photoPreview: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 15,
    backgroundColor: '#e0e0e0',
  },
  retakeButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  retakeText: {
    color: '#0056b3',
    fontSize: 16,
    fontWeight: '600',
  },

  // Button styles
  verifyButton: {
    backgroundColor: '#28a745',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Loading styles
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
    fontWeight: '500',
  },

  // Form styles
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f9fa',
  },
  finalSubmitButton: {
    backgroundColor: '#000000',
    borderRadius: 25,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  finalSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Progress indicator styles
  progressContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0056b3',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});

export default ResolveScreen;