import { Image, ImageSourcePropType, Pressable, Text, View } from 'react-native';

import { FIGMA_INCIDENT_HERO, FIGMA_VERIFIED_BADGE } from '../../constants/figmaAssets';
import type { IncidentReport } from '../../types/incident';
import {
  formatDistanceAway,
  formatPostedAt,
  getIncidentTitle,
} from '../../utils/incidentDisplay';
import IncidentActionRow from './IncidentActionRow';

const COLORS = {
  border: '#FA5252',
  ongoing: '#EE0000',
  verified: '#40A4E8',
  resolved: '#5CD121',
  muted: '#7D7D7D',
  footer: 'rgba(79,79,79,0.97)',
} as const;

type Props = {
  incident: IncidentReport;
  userLatitude?: number;
  userLongitude?: number;
  onVerifyPress?: () => void;
  onFlagPress?: () => void;
  onResolvedPress?: () => void;
};

export default function IncidentFloatingCard({
  incident,
  userLatitude,
  userLongitude,
  onVerifyPress,
  onFlagPress,
  onResolvedPress,
}: Props) {
  const heroSource: ImageSourcePropType =
    incident.heroImageSource ?? FIGMA_INCIDENT_HERO;

  const verifyCount = incident.verifyCount ?? 0;
  const flagCount = incident.flagCount ?? 0;
  const postedBy = incident.postedBy ?? 'Community Member';

  return (
    <View
      className="overflow-hidden rounded-[23px] border-2 bg-white shadow-lg"
      style={{ borderColor: COLORS.border }}
    >
      <Image
        source={heroSource}
        className="h-32 w-full"
        resizeMode="cover"
        accessibilityLabel="Incident photo placeholder"
      />

      <View className="px-4 pb-4 pt-3">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-xl font-bold leading-6 text-black" numberOfLines={2}>
            {getIncidentTitle(incident)}
          </Text>
          <View
            className="rounded-[20px] px-3 py-1.5"
            style={{ backgroundColor: COLORS.ongoing }}
          >
            <Text className="text-[10px] font-semibold text-white">Ongoing</Text>
          </View>
        </View>

        <Text className="mt-2 text-[10px] font-semibold leading-4 text-black">
          {incident.description}
        </Text>

        <View className="mt-3 flex-row items-start justify-between">
          <View className="mr-2 flex-1">
            <View className="flex-row items-center">
              <Image
                source={FIGMA_VERIFIED_BADGE}
                className="mr-1.5 h-5 w-5"
                resizeMode="contain"
                accessibilityLabel="Verified badge"
              />
              <Text className="text-xs font-semibold" style={{ color: COLORS.verified }}>
                Verified by community
              </Text>
            </View>
            <Text className="mt-1.5 text-xs font-semibold" style={{ color: COLORS.muted }}>
              Posted by : {postedBy}
            </Text>
          </View>

          <Pressable
            onPress={onResolvedPress}
            className="rounded-[10px] border px-4 py-2"
            style={{ borderColor: COLORS.resolved }}
          >
            <Text className="text-sm font-semibold" style={{ color: COLORS.resolved }}>
              Resolved
            </Text>
          </Pressable>
        </View>

        <View className="mt-4">
          <IncidentActionRow
            accentColor={COLORS.verified}
            iconName="arrow-up"
            title="Verify this report"
            subtitle={`${verifyCount} people have verified this report as true`}
            onPress={onVerifyPress}
          />
          <IncidentActionRow
            accentColor={COLORS.border}
            iconName="arrow-down"
            title="Flag this report"
            subtitle={`${flagCount} people have flagged this report as false`}
            onPress={onFlagPress}
          />
        </View>

        <View className="mt-1 flex-row items-center justify-between">
          <Text className="text-[11px] font-medium" style={{ color: COLORS.footer }}>
            {formatPostedAt(incident.timePosted)}
          </Text>
          <Text className="text-[11px] font-medium" style={{ color: COLORS.muted }}>
            {formatDistanceAway(incident, userLatitude, userLongitude)}
          </Text>
        </View>
      </View>
    </View>
  );
}
