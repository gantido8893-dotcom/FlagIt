import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, ImageSourcePropType, Pressable, Text, View } from 'react-native';

import { FIGMA_INCIDENT_HERO } from '../../constants/figmaAssets';
import type { IncidentReport } from '../../types/incident';
import { formatDistanceAway, formatPostedAt, getIncidentTitle } from '../../utils/incidentDisplay';

const COLORS = {
  border: '#E5E7EB',
  ongoing: '#EE0000',
  resolved: '#5CD121',
  muted: '#7D7D7D',
  typeTag: '#FEF2F2',
  typeText: '#DC2626',
} as const;

type Props = {
  post: IncidentReport;
  userLatitude?: number;
  userLongitude?: number;
  onPress?: () => void;
};

export default function PostHistoryCard({ post, userLatitude, userLongitude, onPress }: Props) {
  const heroSource: ImageSourcePropType =
    post.imageUrl ? { uri: post.imageUrl } : post.heroImageSource ?? FIGMA_INCIDENT_HERO;

  const verifyCount = post.verifyCount ?? 0;
  const flagCount = post.flagCount ?? 0;
  const resolveCount = post.resolveCount ?? 0;
  const isNearDeletion = resolveCount >= 3;

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 overflow-hidden rounded-2xl border bg-white shadow-sm active:opacity-80"
      style={{ borderColor: COLORS.border }}
    >
      <View className="flex-row">
        {/* Thumbnail */}
        <Image
          source={heroSource}
          className="h-24 w-24"
          resizeMode="cover"
          accessibilityLabel="Incident thumbnail"
        />

        {/* Content */}
        <View className="flex-1 px-3 py-2.5">
          <View className="flex-row items-start justify-between gap-1">
            <Text
              className="flex-1 text-sm font-bold leading-5 text-slate-900"
              numberOfLines={2}
            >
              {getIncidentTitle(post)}
            </Text>
            {/* Type badge */}
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: COLORS.typeTag }}
            >
              <Text className="text-[10px] font-semibold" style={{ color: COLORS.typeText }}>
                {post.type}
              </Text>
            </View>
          </View>

          {post.description ? (
            <Text className="mt-0.5 text-[11px] text-slate-500" numberOfLines={1}>
              {post.description}
            </Text>
          ) : null}

          {/* Stats row */}
          <View className="mt-2 flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <Ionicons name="arrow-up-circle-outline" size={13} color="#40A4E8" />
              <Text className="text-[11px] font-medium text-slate-500">{verifyCount}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="arrow-down-circle-outline" size={13} color="#FA5252" />
              <Text className="text-[11px] font-medium text-slate-500">{flagCount}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons
                name="checkmark-circle-outline"
                size={13}
                color={isNearDeletion ? '#EE0000' : '#5CD121'}
              />
              <Text
                className="text-[11px] font-medium"
                style={{ color: isNearDeletion ? '#EE0000' : '#6B7280' }}
              >
                {resolveCount}/5
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View className="mt-1.5 flex-row items-center justify-between">
            <Text className="text-[10px] text-slate-400">{formatPostedAt(post.timePosted)}</Text>
            <Text className="text-[10px] text-slate-400">
              {formatDistanceAway(post, userLatitude, userLongitude)}
            </Text>
          </View>
        </View>

        {/* Chevron */}
        <View className="items-center justify-center pr-3">
          <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
        </View>
      </View>

      {/* Near-deletion warning strip */}
      {isNearDeletion ? (
        <View className="bg-red-50 px-3 py-1.5">
          <Text className="text-center text-[10px] font-semibold text-red-500">
            ⚠️ This post will be deleted when 5 people mark it resolved
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}