import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal
} from 'react-native';
import { LeafletView } from 'react-native-leaflet-view';
import apiClient from '../api/client';

// This data structure maps the camera names from your database to their GPS coordinates.
// In a real-world app, this might come from an API.
const cameraPositions = {
    'Camera C1': { lat: 23.1836, lng: 75.7668 },
    'Camera C2': { lat: 23.1826, lng: 75.7693 },
    'CAM 1': { lat: 23.1836, lng: 75.7668 },
    // Add other cameras here as needed
};

const FoundPersonDetailScreen = ({ route, navigation }) => {
  const { personId } = route.params;

  const [person, setPerson] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMapVisible, setIsMapVisible] = useState(false);

  useEffect(() => {
    const fetchPersonDetails = async () => {
      try {
        const response = await apiClient.get(`/persons/api/app/person/${personId}`);
        setPerson(response.data);
      } catch (error) {
        Alert.alert("Error", "Could not load person details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPersonDetails();
  }, [personId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#0056b3" />
      </SafeAreaView>
    );
  }

  if (!person) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
            <Text style={styles.errorText}>Could not load person details.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const registeredImage = person.images && person.images.length > 0
    ? person.images[0].url
    : null;

  // Get the GPS coordinates for the camera where the person was found
  const foundLocationCoords = cameraPositions[person.foundOnCamera];

  // Define a standard camera marker for the map modal
  const cameraMarker = {
      position: foundLocationCoords,
      icon: '🎥',
      size: [20, 20],
  };

  // Define the red circle shape to highlight the area
  const highlightCircle = {
      shapeType: 'Circle',
      center: foundLocationCoords,
      radius: 40, // Radius in meters
      color: '#dc3545', // Red color for the circle's border
      fillColor: '#dc3545',
      fillOpacity: 0.2, // Make it semi-transparent
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header */}


        {/* Comparison Photos Section */}
        <View style={styles.photoContainer}>
          {registeredImage && (
            <View style={styles.imageBox}>
              <Text style={styles.imageLabel}>Registered Photo</Text>
              <Image source={{ uri: registeredImage }} style={styles.image} />
            </View>
          )}
          {person.foundSnapshotUrl && (
            <View style={styles.imageBox}>
              <Text style={styles.imageLabel}>Live Snapshot</Text>
              <Image source={{ uri: person.foundSnapshotUrl }} style={styles.image} />
            </View>
          )}
        </View>

        {/* Person Name and Found On */}
        <View style={styles.nameContainer}>
          <Text style={styles.personName}>{person.fullName}</Text>
          <Text style={styles.foundOnText}>FOUND ON: {person.foundOnCamera || 'N/A'}</Text>
        </View>

        {/* Location Button */}
        <View style={styles.locationContainer}>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => {
                if (foundLocationCoords) {
                    setIsMapVisible(true);
                } else {
                    Alert.alert("Location Unavailable", "The exact coordinates for this camera have not been configured.");
                }
            }}
          >
            <View style={styles.locationButtonContent}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText}>CLICK HERE TO VIEW LOCATION</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Contact Details Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>CONTACT DETAILS</Text>
          <Text style={styles.sectionContent}>{person.personContactNumber || '978945600'}</Text>
        </View>

        {/* Last Found Location Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>LAST FOUND LOCATION</Text>
          <Text style={styles.sectionContent}>Near River Ghats</Text>
        </View>

        {/* Identification Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>IDENTIFICATION</Text>
          <Text style={styles.sectionContent}>{person.identificationDetails || 'Blue Tshirt'}</Text>
        </View>

        {/* Report Form Button */}
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => navigation.navigate('ResolveCase', {
            personId: person._id,
            personName: person.fullName
          })}
        >
          <Text style={styles.reportButtonText}>Report Form</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Map Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isMapVisible}
        onRequestClose={() => setIsMapVisible(false)}
      >
        <View style={styles.modalContainer}>
            <View style={styles.mapModal}>
                {foundLocationCoords && (
                    <LeafletView
                        mapCenterPosition={foundLocationCoords}
                        zoom={18}
                        mapMarkers={[cameraMarker]}
                        mapShapes={[highlightCircle]}
                    />
                )}
                <TouchableOpacity style={styles.closeButton} onPress={() => setIsMapVisible(false)}>
                    <Text style={styles.closeButtonText}>Close Map</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  container: {
    flex: 1
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 18,
    color: 'red'
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

  // Photo section styles
  photoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 25,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  imageBox: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 10,
  },
  imageLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  image: {
    width: 140,
    height: 140,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
  },

  // Name section styles
  nameContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  personName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  foundOnText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // Location button styles
  locationContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  locationButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  locationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  locationText: {
    fontSize: 14,
    color: 'gray',
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Section styles
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  sectionContent: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Report button styles
  reportButton: {
    backgroundColor: '#000000',
    marginHorizontal: 20,
    marginVertical: 30,
    paddingVertical: 18,
    borderRadius: 40,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  mapModal: {
    width: '95%',
    height: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    marginLeft: -75,
    width: 150,
    paddingVertical: 12,
    backgroundColor: '#0056b3',
    borderRadius: 25,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FoundPersonDetailScreen;