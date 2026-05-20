import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import IncidentFloatingCard from '../components/map/IncidentFloatingCard';
import { getCurrentUser } from '../services/authService';
import { fetchIncidents, updateIncidentVotes } from '../services/dbService';
import { INCIDENT_PIN_COLORS } from '../constants/incidentColors';
import type { IncidentReport } from '../types/incident';
import { getCurrentCoordinates, type Coordinates } from '../utils/location';
import { DEFAULT_REGION, getRegionForIncidents } from '../utils/mapRegion';

type VoteState = Record<string, { verify?: boolean; flag?: boolean; resolve?: boolean }>;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const mapRef = useRef<MapView>(null);

  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [activeIncident, setActiveIncident] = useState<IncidentReport | null>(null);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCentered, setHasCentered] = useState(false);
  const [voteState, setVoteState] = useState<VoteState>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const voteKeyRef = useRef<string | null>(null);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchIncidents();
      setIncidents(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVoteState = useCallback(async () => {
    const { user } = await getCurrentUser();
    const userId = user?.id ?? null;
    setCurrentUserId(userId);

    const key = `flagit:votes:${userId ?? 'anon'}`;
    voteKeyRef.current = key;

    try {
      const stored = await AsyncStorage.getItem(key);
      setVoteState(stored ? (JSON.parse(stored) as VoteState) : {});
    } catch {
      setVoteState({});
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setHasCentered(false);
      loadIncidents();
      loadVoteState();
      getCurrentCoordinates().then(setUserCoords);
    }, [loadIncidents, loadVoteState]),
  );

  useEffect(() => {
    if (hasCentered) {
      return;
    }

    if (userCoords) {
      mapRef.current?.animateToRegion(
        {
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        400,
      );
      setHasCentered(true);
      return;
    }

    if (incidents.length > 0) {
      mapRef.current?.animateToRegion(getRegionForIncidents(incidents), 400);
      setHasCentered(true);
    }
  }, [hasCentered, incidents, userCoords]);

  const applyIncidentUpdate = useCallback((updated: IncidentReport) => {
    setIncidents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setActiveIncident((prev) => (prev?.id === updated.id ? updated : prev));
  }, []);

  const handleVote = useCallback(
    async (incidentId: string, type: 'verify' | 'flag' | 'resolve') => {
      const current = incidents.find((item) => item.id === incidentId);
      if (!current) return;

      if (!currentUserId) {
        Alert.alert('Sign in required', 'Please sign in to vote on reports.');
        return;
      }

      const existingVote = voteState[incidentId]?.[type];
      if (existingVote) {
        Alert.alert('Vote recorded', 'You can only vote once per report.');
        return;
      }

      if (
        (type === 'verify' || type === 'flag') &&
        (voteState[incidentId]?.verify || voteState[incidentId]?.flag)
      ) {
        Alert.alert('Vote recorded', 'You can only vote once per report.');
        return;
      }

      const updated: IncidentReport = {
        ...current,
        verifyCount:
          type === 'verify' ? (current.verifyCount ?? 0) + 1 : current.verifyCount ?? 0,
        flagCount:
          type === 'flag' ? (current.flagCount ?? 0) + 1 : current.flagCount ?? 0,
        resolveCount:
          type === 'resolve' ? (current.resolveCount ?? 0) + 1 : current.resolveCount ?? 0,
      };

      applyIncidentUpdate(updated);

      const nextVoteState: VoteState = {
        ...voteState,
        [incidentId]: { ...voteState[incidentId], [type]: true },
      };
      setVoteState(nextVoteState);
      if (voteKeyRef.current) {
        await AsyncStorage.setItem(voteKeyRef.current, JSON.stringify(nextVoteState));
      }

      const result = await updateIncidentVotes(incidentId, {
        verifyCount: updated.verifyCount,
        flagCount: updated.flagCount,
        resolveCount: updated.resolveCount,
      });

      if (!result.success) {
        applyIncidentUpdate(current);
        setVoteState(voteState);
        if (voteKeyRef.current) {
          await AsyncStorage.setItem(voteKeyRef.current, JSON.stringify(voteState));
        }
        Alert.alert('Could not update', 'Please try again.');
        return;
      }

      applyIncidentUpdate(result.incident);
    },
    [applyIncidentUpdate, currentUserId, incidents, voteState],
  );

  const handleRefreshPress = useCallback(() => {
    loadIncidents();
  }, [loadIncidents]);

  const activeVotes = activeIncident ? voteState[activeIncident.id] : undefined;

  return (
    <View className="flex-1 bg-white">
      {loading && incidents.length === 0 ? (
        <View className="absolute inset-0 z-10 items-center justify-center bg-white/80">
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      ) : null}

      <Pressable
        onPress={handleRefreshPress}
        className="absolute z-20 h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow"
        style={{ right: 16, bottom: tabBarHeight + Math.max(insets.bottom, 12) }}
        accessibilityLabel="Refresh reports"
      >
        {loading ? (
          <ActivityIndicator size="small" color="#16A34A" />
        ) : (
          <Ionicons name="refresh" size={20} color="#0F172A" />
        )}
      </Pressable>

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton
      >
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            coordinate={{
              latitude: incident.latitude,
              longitude: incident.longitude,
            }}
            onPress={() => setActiveIncident(incident)}
            pinColor={INCIDENT_PIN_COLORS[incident.type] ?? '#16A34A'}
          />
        ))}
      </MapView>

      {activeIncident ? (
        <>
          {/* Transparent full-screen overlay — tap anywhere outside card to dismiss */}
          <Pressable
            className="absolute inset-0 z-10"
            onPress={() => setActiveIncident(null)}
          />
          <View
            className="absolute left-0 right-0 z-20 px-1"
            style={{ bottom: tabBarHeight + Math.max(insets.bottom, 8) }}
            pointerEvents="box-none"
          >
            <IncidentFloatingCard
              incident={activeIncident}
              userLatitude={userCoords?.latitude}
              userLongitude={userCoords?.longitude}
              onVerifyPress={() => handleVote(activeIncident.id, 'verify')}
              onFlagPress={() => handleVote(activeIncident.id, 'flag')}
              onResolvedPress={() => handleVote(activeIncident.id, 'resolve')}
              isVerified={Boolean(activeVotes?.verify)}
              isFlagged={Boolean(activeVotes?.flag)}
              isResolved={Boolean(activeVotes?.resolve)}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}