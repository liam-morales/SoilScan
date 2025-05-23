import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const API_ENDPOINT = 'https://soilscanMLtraining-soilscan-api2.hf.space/predict';

const HomeScreen = () => {
  const [image, setImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedColor, setSelectedColor] = useState(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
          Alert.alert(
            'Permissions Required',
            'Camera and media library permissions are required to use this app.'
          );
        }
      }
    })();
  }, []);

const uploadImageToAPI = async (fileUri) => {
  setIsAnalyzing(true);

  let result = null; // ✅ declare up front

  try {
    const fileName = fileUri.split('/').pop();
    const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';



// ✅ Log the raw response from your FastAPI backend
console.log("Raw response:", text);
    if (!contentType.includes('application/json')) {
      throw new Error(`Non-JSON response: ${text.slice(0, 300)}`);
    }

    try {
      result = JSON.parse(text);
    } catch (e) {
      throw new Error(`Failed to parse JSON: ${text.slice(0, 300)}`);
    }

    if (!result || result.error) {
      throw new Error(result?.error || 'Unknown error');
    }

    const output = result.predictions;

    if (!Array.isArray(output)) {
      throw new Error('Unexpected API response format');
    }

    const formattedResults = output.map((item) => ({
      name: item.color_name || 'Unknown',
      hex: item.hex_color || '#FFFFFF',
      description: item.description || 'No description available.',
      properties: item.properties || [],
      confidence: Math.round(item.confidence * 100),
      munsellCode: item.munsell_code || 'N/A',
    }));

    setResults(formattedResults);
    setSelectedColor(formattedResults[0]);

  } catch (error) {
    console.error('Upload Error:', error);
    Alert.alert('Error', `Failed to analyze soil color:\n\n${error.message}`);
    setResults([]);
    setSelectedColor(null);
  } finally {
    setIsAnalyzing(false);
  }
};




  const handleCapture = async () => {
    try {
      const pickerResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!pickerResult.canceled && pickerResult.assets?.length > 0) {
        const imageUri = pickerResult.assets[0].uri;
        setImage(imageUri);
        setResults([]);
        setSelectedColor(null);
        await uploadImageToAPI(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', `Camera error: ${error.message}`);
    }
  };

  const handleUpload = async () => {
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!pickerResult.canceled && pickerResult.assets?.length > 0) {
        const imageUri = pickerResult.assets[0].uri;
        setImage(imageUri);
        setResults([]);
        setSelectedColor(null);
        await uploadImageToAPI(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', `Upload error: ${error.message}`);
    }
  };

  const openMunsellGuide = () => {
    const munsellUrl = 'https://www.nrcs.usda.gov/resources/education-and-teaching-materials/soil-color-chart';
    Linking.canOpenURL(munsellUrl)
      .then(supported => {
        if (!supported) {
          Alert.alert('Error', 'Cannot open Munsell Guide URL.');
        } else {
          return Linking.openURL(munsellUrl);
        }
      })
      .catch((err) => Alert.alert('Error', `Error opening URL: ${err.message}`));
  };

  return (
    <ScrollView style={styles.container}>
      {/* Rest of your JSX remains exactly the same */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scan Soil Sample</Text>

        <View style={styles.scanPreview}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <Icon
                name="camera"
                size={48}
                color="#1A3C40"
                style={styles.placeholderIcon}
              />
              <Text style={styles.placeholderText}>No image captured</Text>
            </View>
          )}

          {isAnalyzing && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#5D9C59" />
              <Text style={styles.loadingText}>Analyzing soil color...</Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleCapture}>
            <Icon name="camera" size={18} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Capture</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineButton} onPress={handleUpload}>
            <Icon name="upload" size={18} color="#5D9C59" style={styles.buttonIcon} />
            <Text style={[styles.buttonText, { color: '#5D9C59' }]}>Upload</Text>
          </TouchableOpacity>
        </View>
      </View>

      {selectedColor && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="tint" size={20} color="#5D9C59" style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Primary Soil Color</Text>
          </View>

          <View style={styles.primaryResultCard}>
            <View style={styles.colorHeader}>
              <View
                style={[styles.colorSwatch, { backgroundColor: selectedColor.hex }]}
              />
              <View>
                <Text style={styles.primaryColorName}>{selectedColor.name}</Text>
                <Text style={styles.munsellCode}>{selectedColor.munsellCode}</Text>
              </View>
            </View>

            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceValue}>
                {selectedColor.confidence}% Match
              </Text>
              <View style={styles.confidenceBar}>
                <View
                  style={[
                    styles.confidenceFill,
                    { width: `${selectedColor.confidence}%` },
                  ]}
                />
              </View>
            </View>

            <Text style={styles.description}>{selectedColor.description}</Text>

            <View style={styles.propertiesContainer}>
              {selectedColor.properties.map((prop, i) => (
                <View key={i} style={styles.propertyTag}>
                  <Text style={styles.propertyText}>{prop}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.learnMoreButton}
              onPress={openMunsellGuide}
            >
              <Text style={styles.learnMoreText}>
                Learn about Munsell Colors
              </Text>
              <Icon name="external-link" size={14} color="#5D9C59" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {results.length > 1 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="palette" size={20} color="#5D9C59" style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Alternative Matches</Text>
          </View>

          {results.slice(1).map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.soilCard}
              onPress={() => setSelectedColor(item)}
            >
              <View style={styles.colorHeader}>
                <View
                  style={[styles.colorIndicator, { backgroundColor: item.hex }]}
                />
                <View>
                  <Text style={styles.soilType}>{item.name}</Text>
                  <Text style={styles.munsellCode}>{item.munsellCode}</Text>
                </View>
              </View>

              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceValue}>{item.confidence}%</Text>
                <View style={styles.confidenceBar}>
                  <View
                    style={[
                      styles.confidenceFill,
                      { width: `${item.confidence}%` },
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to Get Best Results</Text>
        <View style={styles.tipItem}>
          <Icon name="lightbulb-o" size={16} color="#5D9C59" />
          <Text style={styles.tipText}>Photograph soil in natural daylight</Text>
        </View>
        <View style={styles.tipItem}>
          <Icon name="lightbulb-o" size={16} color="#5D9C59" />
          <Text style={styles.tipText}>
            Use moist (not wet) soil for accurate color
          </Text>
        </View>
        <View style={styles.tipItem}>
          <Icon name="lightbulb-o" size={16} color="#5D9C59" />
          <Text style={styles.tipText}>
            Remove surface debris before photographing
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

// Your StyleSheet remains exactly the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A3C40',
  },
  sectionIcon: {
    marginRight: 8,
  },
  scanPreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#C7E8CA',
    borderRadius: 12,
    marginVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    opacity: 0.7,
    marginBottom: 8,
  },
  placeholderText: {
    color: '#1A3C40',
    opacity: 0.7,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#1A3C40',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#5D9C59',
    borderRadius: 25,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#5D9C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  outlineButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#5D9C59',
    borderRadius: 25,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryResultCard: {
    backgroundColor: '#EDF7ED',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#5D9C59',
  },
  soilCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  colorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  colorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  primaryColorName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A3C40',
  },
  soilType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A3C40',
  },
  munsellCode: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidenceValue: {
    fontWeight: '600',
    marginRight: 8,
    color: '#1A3C40',
    fontSize: 14,
  },
  confidenceBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#5D9C59',
    borderRadius: 4,
  },
  description: {
    marginVertical: 8,
    color: '#1A3C40',
    lineHeight: 20,
  },
  propertiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  propertyTag: {
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 25,
    marginRight: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  propertyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A3C40',
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  learnMoreText: {
    color: '#5D9C59',
    marginRight: 6,
    fontWeight: '500',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    marginLeft: 8,
    color: '#1A3C40',
  },
});

export default HomeScreen;
