import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INCIDENT_PIN_COLORS } from '../constants/incidentColors';
import { INCIDENT_TYPES } from '../constants/incidentTypes';
import type { RootTabParamList } from '../navigation/types';
import { createIncident } from '../services/dbService';
import type { IncidentType } from '../types/incident';
import { getCurrentCoordinates, type Coordinates } from '../utils/location';
import { DEFAULT_REGION } from '../utils/mapRegion';

type ContributeNav = BottomTabNavigationProp<RootTabParamList, 'Add'>;

const MAP_PICKER_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };
const GEO_EPSILON = 0.00005;

export default function ContributeScreen() {
  const navigation = useNavigation<ContributeNav>();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<IncidentType>('Traffic');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMode, setLocationMode] = useState<'current' | 'map'>('current');
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locationPreviewLoading, setLocationPreviewLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>({
    ...DEFAULT_REGION,
    ...MAP_PICKER_DELTA,
  });
  const [mapExpanded, setMapExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const expandedMapHeight = Math.min(windowHeight * 0.72, 560);
  const lastGeocodeRef = useRef<Coordinates | null>(null);

  const pickImage = useCallback(async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        source === 'camera'
          ? 'Allow camera access to take a photo of the incident.'
          : 'Allow photo library access to attach an image of the incident.',
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }, []);

  const showImageOptions = useCallback(() => {
    Alert.alert('Incident photo', 'Add a photo of what you are reporting.', [
      { text: 'Take photo', onPress: () => pickImage('camera') },
      { text: 'Choose from library', onPress: () => pickImage('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [pickImage]);

  const resolveLocation = useCallback(async (preferLastKnown = false) => {
    setLocationLoading(true);
    try {
      if (preferLastKnown) {
        try {
          const lastPosition = await Location.getLastKnownPositionAsync();
          if (lastPosition?.coords) {
            const quickCoords = {
              latitude: lastPosition.coords.latitude,
              longitude: lastPosition.coords.longitude,
            };
            setCoords(quickCoords);
            setMapRegion({
              latitude: quickCoords.latitude,
              longitude: quickCoords.longitude,
              latitudeDelta: MAP_PICKER_DELTA.latitudeDelta,
              longitudeDelta: MAP_PICKER_DELTA.longitudeDelta,
            });
          }
        } catch {
          // Ignore last-known failures and fall back to live coordinates.
        }
      }

      const position = await getCurrentCoordinates();
      if (position) {
        setCoords(position);
        setMapRegion({
          latitude: position.latitude,
          longitude: position.longitude,
          latitudeDelta: MAP_PICKER_DELTA.latitudeDelta,
          longitudeDelta: MAP_PICKER_DELTA.longitudeDelta,
        });
      }
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const resolveLocationLabel = useCallback(async (position: Coordinates | null) => {
    if (!position) {
      setLocationLabel(null);
      return;
    }

    const last = lastGeocodeRef.current;
    if (
      last &&
      Math.abs(last.latitude - position.latitude) < GEO_EPSILON &&
      Math.abs(last.longitude - position.longitude) < GEO_EPSILON
    ) {
      return;
    }

    setLocationPreviewLoading(true);
    try {
      const fallbackLabel = `Near ${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`;
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationLabel(fallbackLabel);
        lastGeocodeRef.current = position;
        return;
      }

      let providerStatus: Location.LocationProviderStatus | null = null;
      try {
        providerStatus = await Location.getProviderStatusAsync();
      } catch {
        providerStatus = null;
      }

      if (providerStatus && !providerStatus.locationServicesEnabled) {
        setLocationLabel(fallbackLabel);
        lastGeocodeRef.current = position;
        return;
      }

      if (providerStatus && providerStatus.networkAvailable === false) {
        setLocationLabel(fallbackLabel);
        lastGeocodeRef.current = position;
        return;
      }

      const results = await Location.reverseGeocodeAsync({
        latitude: position.latitude,
        longitude: position.longitude,
      });
      const address = results[0];
      const primary = [address?.name, address?.street, address?.city]
        .filter(Boolean)
        .join(', ');
      const fallback = [address?.region, address?.country]
        .filter(Boolean)
        .join(', ');
      const label = primary || fallback;

      setLocationLabel(label || fallbackLabel);
      lastGeocodeRef.current = position;
    } catch (error) {
      setLocationLabel(
        `Near ${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`,
      );
      lastGeocodeRef.current = position;
    } finally {
      setLocationPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    resolveLocationLabel(coords);
  }, [coords, resolveLocationLabel]);

  useEffect(() => {
    if (locationMode === 'current' && !coords && !locationLoading) {
      resolveLocation(true);
    }
  }, [coords, locationLoading, locationMode, resolveLocation]);

  const handleUseCurrentLocation = useCallback(async () => {
    setLocationMode('current');
    setMapExpanded(false);
    await resolveLocation(true);
  }, [resolveLocation]);

  const handleChooseFromMap = useCallback(async () => {
    setLocationMode('map');
    if (coords) {
      return;
    }
    await resolveLocation(true);
  }, [coords, resolveLocation]);

  const handleMapRegionChange = useCallback((region: Region) => {
    setMapRegion(region);
    setCoords({ latitude: region.latitude, longitude: region.longitude });
  }, []);

  const handleSave = async () => {
    const trimmed = description.trim();

    setSubmitting(true);
    try {
      const position =
        coords ?? (locationMode === 'current' ? await getCurrentCoordinates() : null);
      if (!position) {
        Alert.alert('Location required', 'Please choose a location to continue.');
        return;
      }
      setCoords(position);

      const result = await createIncident({
        type: eventType,
        description: trimmed || null,
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null,
        locationLabel:
          locationLabel ||
          `Near ${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`,
        imageUrl: imageUri ?? null,
      });

      if (!result.success) {
        if (result.error === 'NEARBY_DUPLICATE') {
          Alert.alert(
            'Report blocked',
            'An incident has already been reported nearby.',
          );
        } else if (result.error === 'NOT_AUTHENTICATED') {
          Alert.alert('Sign in required', 'Please sign in to submit a report.');
        } else {
          Alert.alert('Unable to save', 'Please try again in a moment.');
        }
        return;
      }

      setDescription('');
      setEventType('Traffic');
      setImageUri(null);
      if (position) {
        setCoords(position);
      }

      Alert.alert('Saved', 'Your incident report has been added to the map.', [
        { text: 'View map', onPress: () => navigation.navigate('Explore') },
        { text: 'OK', style: 'cancel' },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-2xl font-bold text-slate-900">Report incident</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Location, date, and time are captured automatically when you save.
        </Text>

        <Text className="mb-2 mt-6 text-sm font-semibold text-slate-700">Location</Text>
        <View className="rounded-lg border border-slate-200 bg-white p-3">
          <View className="flex-row gap-2">
            <Pressable
              onPress={handleUseCurrentLocation}
              disabled={submitting}
              className={`flex-1 items-center rounded-lg py-3 ${
                locationMode === 'current'
                  ? 'bg-green-600'
                  : 'bg-slate-100'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  locationMode === 'current' ? 'text-white' : 'text-slate-700'
                }`}
              >
                Use my location
              </Text>
            </Pressable>
            <Pressable
              onPress={handleChooseFromMap}
              disabled={submitting}
              className={`flex-1 items-center rounded-lg py-3 ${
                locationMode === 'map' ? 'bg-green-600' : 'bg-slate-100'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  locationMode === 'map' ? 'text-white' : 'text-slate-700'
                }`}
              >
                Choose on map
              </Text>
            </Pressable>
          </View>

          {locationMode === 'map' ? (
            <View className="mt-3 overflow-hidden rounded-lg border border-slate-200">
              <MapView
                style={{ height: mapExpanded ? expandedMapHeight : 220, width: '100%' }}
                region={mapRegion}
                onRegionChangeComplete={handleMapRegionChange}
                showsUserLocation
                showsMyLocationButton
              />
              <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
                <Ionicons name="location-sharp" size={28} color="#16A34A" />
              </View>
              <Pressable
                onPress={() => setMapExpanded((prev) => !prev)}
                className="absolute bottom-2 right-2 h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow"
              >
                <Ionicons
                  name={mapExpanded ? 'contract-outline' : 'expand-outline'}
                  size={20}
                  color="#0F172A"
                />
              </Pressable>
            </View>
          ) : null}

          <View className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Location preview
            </Text>
            {locationLoading || locationPreviewLoading ? (
              <View className="mt-2 flex-row items-center">
                <ActivityIndicator size="small" color="#2E7D32" />
                <Text className="ml-2 text-sm text-slate-600">Looking up location...</Text>
              </View>
            ) : coords ? (
              <View className="mt-1">
                <Text className="text-sm font-medium text-slate-800">
                  {locationLabel ?? 'Selected location'}
                </Text>
                <Text className="mt-1 text-xs text-slate-500">
                  {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                </Text>
              </View>
            ) : (
              <Text className="mt-1 text-sm text-slate-600">
                Choose a location to preview it.
              </Text>
            )}
          </View>
        </View>

        <Text className="mb-2 mt-6 text-sm font-semibold text-slate-700">Incident photo</Text>
        <Text className="mb-2 text-xs text-slate-500">
          Optional - helps others verify what you saw.
        </Text>
        {imageUri ? (
          <View className="overflow-hidden rounded-lg border border-slate-200">
            <Image
              source={{ uri: imageUri }}
              className="h-48 w-full"
              resizeMode="cover"
              accessibilityLabel="Selected incident photo"
            />
            <View className="flex-row border-t border-slate-200 bg-slate-50">
              <Pressable
                onPress={showImageOptions}
                disabled={submitting}
                className="flex-1 items-center py-3"
              >
                <Text className="text-sm font-medium text-brand">Change photo</Text>
              </Pressable>
              <View className="w-px bg-slate-200" />
              <Pressable
                onPress={() => setImageUri(null)}
                disabled={submitting}
                className="flex-1 items-center py-3"
              >
                <Text className="text-sm font-medium text-slate-600">Remove</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={showImageOptions}
            disabled={submitting}
            className="items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 py-10"
          >
            <Ionicons name="camera-outline" size={32} color="#64748B" />
            <Text className="mt-2 text-sm font-medium text-slate-700">Add photo</Text>
            <Text className="mt-1 text-xs text-slate-500">Camera or photo library</Text>
          </Pressable>
        )}

        <Text className="mb-2 mt-6 text-sm font-semibold text-slate-700">Description</Text>
        <TextInput
          className="min-h-[120px] rounded-lg border border-slate-200 bg-slate-50 p-3 text-base text-slate-900"
          style={{ textAlignVertical: 'top' }}
          placeholder="What is happening?"
          placeholderTextColor="#94A3B8"
          multiline
          value={description}
          onChangeText={setDescription}
          editable={!submitting}
        />

        <Text className="mb-2 mt-6 text-sm font-semibold text-slate-700">Type of event</Text>
        <View className="flex-row flex-wrap gap-2">
          {INCIDENT_TYPES.map((type) => {
            const selected = eventType === type;
            const color = INCIDENT_PIN_COLORS[type];
            return (
              <Pressable
                key={type}
                onPress={() => setEventType(type)}
                disabled={submitting}
                className={`rounded-lg border px-3 py-2 ${
                  selected ? 'border-brand bg-green-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <View className="flex-row items-center">
                  <View
                    className="mr-2 h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <Text
                    className={`text-sm font-medium ${selected ? 'text-brand' : 'text-slate-700'}`}
                  >
                    {type}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text className="mt-4 text-xs text-slate-500">
          Reports of the same type within 2 km of an existing pin cannot be submitted.
        </Text>

        <Pressable
          onPress={handleSave}
          disabled={submitting || locationLoading}
          className={`mt-8 items-center rounded-lg py-4 ${
            submitting || locationLoading ? 'bg-green-400' : 'bg-green-600'
          }`}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-base font-semibold text-white">Save</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
