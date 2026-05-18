import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { INCIDENT_PIN_COLORS } from '../../constants/incidentColors';
import type { IncidentReport } from '../../types/incident';

type Props = {
  post: IncidentReport;
};

export default function PostHistoryCard({ post }: Props) {
  const accentColor = INCIDENT_PIN_COLORS[post.type];

  return (
    <View className="mb-3 h-20 flex-row items-center rounded-lg bg-green-200 px-4">
      <View
        className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white/60"
        style={{ borderWidth: 2, borderColor: accentColor }}
      >
        <Ionicons name="image-outline" size={18} color={accentColor} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-slate-900">{post.type}</Text>
        <Text className="text-xs text-slate-700" numberOfLines={1}>
          {post.description}
        </Text>
        <Text className="mt-0.5 text-[11px] text-slate-600">
          {post.timePosted} · {post.datePosted}
        </Text>
      </View>
    </View>
  );
}
