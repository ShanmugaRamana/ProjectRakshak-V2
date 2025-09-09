import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity
} from 'react-native';
import { LeafletView } from 'react-native-leaflet-view';
import apiClient from '../api/client'; // Your centralized API client

const HomeScreen = ({ navigation }) => {
  // --- State to hold the list fetched from the DB and a loading status ---
  const [foundPeople, setFoundPeople] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Ref to store the interval ID for cleanup
  const intervalRef = useRef(null);

  const templeCoords = {
    lat: 23.1828,
    lng: 75.7679,
  };

  // Define the markers for the temple and cameras
  const allMapMarkers = [
    {
      position: templeCoords,
      icon: '📍',
      size: [32, 32],
      title: 'Mahakaleshwar Jyotirlinga'
    },
    {
      position: { lat: 23.1836, lng: 75.7668 },
      icon: '🎥',
      size: [24, 24],
      title: 'Camera C1'
    },
    {
      position: { lat: 23.1826, lng: 75.7693 },
      icon: '🎥',
      size: [24, 24],
      title: 'Camera C2'
    }
  ];

  // Function to fetch found people data
  const fetchFoundPeople = async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }

      console.log("Attempting to fetch found people from the database...");
      // Call the API endpoint we created on the Node.js server
      const response = await apiClient.get('/persons/api/persons/found');

      if (Array.isArray(response.data)) {
        setFoundPeople(response.data);
        console.log(`Successfully fetched ${response.data.length} found person(s).`);
      } else {
        // Handle cases where the API might return an unexpected format
        setFoundPeople([]);
      }
    } catch (error) {
      console.error("Failed to fetch found people:", error);
      // Only show alert on initial load, not on background refreshes
      if (showLoading) {
        Alert.alert("Connection Error", "Could not load the list of found people from the server.");
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  // Effect for initial data fetch and setting up auto-refresh
  useEffect(() => {
    // Initial fetch with loading indicator
    fetchFoundPeople(true);

    // Set up interval for auto-refresh every 5 seconds
    intervalRef.current = setInterval(() => {
      console.log("Auto-refreshing found people data...");
      fetchFoundPeople(false); // Don't show loading spinner for background refreshes
    }, 5000); // 5 seconds = 5000 milliseconds

    // Cleanup function to clear interval when component unmounts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log("Auto-refresh interval cleared");
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Effect to handle navigation focus (optional: refresh when user returns to screen)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Refresh data when screen comes into focus
      console.log("Screen focused, refreshing data...");
      fetchFoundPeople(false);
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* === Top Part: Map === */}
        <View style={styles.mapContainer}>
          <LeafletView
            mapCenterPosition={templeCoords}
            zoom={17}
            mapMarkers={allMapMarkers}
          />
        </View>

        {/* === Bottom Part: List of Found Persons === */}
        <View style={styles.bottomContainer}>
          <Text style={styles.listHeader}>Recently Found</Text>
          {isLoading ? (
            // While fetching, show a loading spinner
            <ActivityIndicator style={{ flex: 1 }} size="large" color="#0056b3" />
          ) : foundPeople.length > 0 ? (
            // If people are found, display them in a scrollable list
            <ScrollView>
              {foundPeople.map((person) => (
                // --- THIS IS THE UPDATED PART ---
                // The View is now a TouchableOpacity that navigates on press
                <TouchableOpacity
                  key={person._id}
                  style={styles.foundPersonContainer}
                  onPress={() => navigation.navigate('FoundPersonDetail', { personId: person._id })}
                >
                  <Image
                    source={{ uri: person.foundSnapshotUrl }}
                    style={styles.snapshotImage}
                  />
                  <View style={styles.foundPersonInfo}>
                    <Text style={styles.foundPersonName}>{person.fullName}</Text>
                    <Text style={styles.cameraName}>Detected on: {person.foundOnCamera}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            // If no people are found, show a placeholder
            <View style={styles.placeholderContent}>
              <Text style={styles.placeholderText}>No one found yet</Text>
              <Text style={styles.placeholderSubtext}>Recently found persons will appear here.</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 3,
  },
  bottomContainer: {
    flex: 2,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  listHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  placeholderText: {
    fontSize: 18,
    color: '#666'
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 5,
  },
  foundPersonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  snapshotImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#e0e0e0',
  },
  foundPersonInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  foundPersonName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cameraName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default HomeScreen;