import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import IncidentFloatingCard from '../components/map/IncidentFloatingCard';
import PostHistoryCard from '../components/profile/PostHistoryCard';
import ProfileHeader from '../components/profile/ProfileHeader';
import { signOut } from '../services/authService';
import { fetchUserPosts, fetchUserProfile } from '../services/dbService';
import type { IncidentReport } from '../types/incident';
import type { UserProfile } from '../types/profile';

const IS_DEV = __DEV__;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [selectedPost, setSelectedPost] = useState<IncidentReport | null>(null);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const data = await fetchUserProfile();
      setProfile(data);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUserPosts();
      setPosts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
      loadProfile();
    }, [loadPosts, loadProfile]),
  );

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const { error } = await signOut();
      if (error) {
        Alert.alert('Sign out failed', error.message);
      }
    } finally {
      setSigningOut(false);
    }
  };

  const handleClearStorage = async () => {
    Alert.alert(
      'Clear App Storage',
      'This will wipe all locally cached data including auth state. You will be signed out. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Done', 'Storage cleared. Restart the app.');
            } catch (e) {
              Alert.alert('Error', 'Failed to clear storage.');
            }
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Scrollable content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 16,
        }}
      >
        <ProfileHeader
          displayName={profile?.displayName ?? 'Your profile'}
          avatarUrl={profile?.avatarUrl ?? null}
          isVerifiedContributor={profile?.isVerifiedContributor ?? false}
        />

        {profileLoading ? (
          <View className="mt-3 flex-row items-center">
            <ActivityIndicator size="small" color="#2E7D32" />
            <Text className="ml-2 text-xs text-slate-500">Loading profile...</Text>
          </View>
        ) : null}

        <Text className="mb-2 mt-6 text-base font-bold text-slate-900">
          Uploaded Posts and Events
        </Text>
        <Text className="mb-4 text-xs font-medium text-red-600">
          Posts are automatically deleted after 7 days
        </Text>

        {loading ? (
          <ActivityIndicator color="#2E7D32" className="mt-4" />
        ) : posts.length === 0 ? (
          <View className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6">
            <Text className="text-center text-sm text-slate-500">
              No uploads yet. Report an incident from the Add tab to see it here.
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <PostHistoryCard
              key={post.id}
              post={post}
              onPress={() => setSelectedPost(post)}
            />
          ))
        )}
      </ScrollView>

      {/* Pinned bottom actions */}
      <View
        className="border-t border-slate-100 bg-white px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          onPress={handleSignOut}
          disabled={signingOut}
          className="items-center rounded-lg bg-red-200 py-3"
        >
          {signingOut ? (
            <ActivityIndicator color="#DC2626" />
          ) : (
            <Text className="text-sm font-semibold text-red-600">Sign out</Text>
          )}
        </Pressable>

        {IS_DEV ? (
          <Pressable
            onPress={handleClearStorage}
            className="mt-2 items-center rounded-lg border border-dashed border-slate-300 py-2"
          >
            <Text className="text-xs font-medium text-slate-400">
              [DEV] Clear AsyncStorage
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Incident preview modal */}
      <Modal
        visible={!!selectedPost}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPost(null)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/60"
          onPress={() => setSelectedPost(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}
          >
            {selectedPost ? (
              <IncidentFloatingCard incident={selectedPost} />
            ) : null}

            <Pressable
              onPress={() => setSelectedPost(null)}
              className="mt-3 items-center rounded-xl bg-white py-3.5 shadow-sm"
            >
              <Text className="text-sm font-semibold text-slate-700">Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}