import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { INCIDENT_PIN_COLORS } from '../../constants/incidentColors';
import type { IncidentReport } from '../../types/incident';

type Props = {
  incident: IncidentReport;
  isActive?: boolean;
};

/**
 * Placeholder map pin — replace Image/icon blocks with final Figma assets later.
 */
export default function IncidentPin({ incident, isActive = false }: Props) {
  const pinColor = INCIDENT_PIN_COLORS[incident.type];

  return (
    <View className="items-center" style={{ opacity: isActive ? 1 : 0.92 }}>
      <View
        className="items-center rounded-2xl border-2 border-white px-2 py-1 shadow-md"
        style={{
          backgroundColor: pinColor,
          minWidth: 44,
          transform: [{ scale: isActive ? 1.12 : 1 }],
        }}
      >
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-white/25">
          {incident.placeholderImage ? (
            <View className="h-6 w-6 items-center justify-center rounded bg-white/40">
              <Ionicons name="image-outline" size={14} color="#FFFFFF" />
            </View>
          ) : (
            <Ionicons name="alert-circle-outline" size={18} color="#FFFFFF" />
          )}
        </View>
        <Text className="mt-0.5 max-w-[72px] text-center text-[10px] font-bold text-white" numberOfLines={1}>
          {incident.type}
        </Text>
      </View>
      <View
        className="-mt-1 h-3 w-3 rotate-45 border-b-2 border-r-2 border-white"
        style={{ backgroundColor: pinColor }}
      />
    </View>
  );
}
