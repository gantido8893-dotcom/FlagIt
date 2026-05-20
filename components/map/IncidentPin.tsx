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
  const pinColor = INCIDENT_PIN_COLORS[incident.type] ?? '#16A34A';

  return (
    <View
      className="items-center"
      collapsable={false}
      style={{ opacity: isActive ? 1 : 0.95, width: 88, height: 104, alignItems: 'center' }}
    >
      <View className="items-center justify-center" style={{ width: 72, height: 72 }}>
        <View
          style={{
            position: 'absolute',
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: pinColor,
            opacity: 0.28,
          }}
        />
        <View
          className="items-center rounded-2xl border-2 border-white px-3 py-2 shadow-lg"
          style={{
            backgroundColor: pinColor,
            minWidth: 58,
            transform: [{ scale: isActive ? 1.18 : 1.06 }],
          }}
        >
          <View className="h-9 w-9 items-center justify-center rounded-lg bg-white/25">
            {incident.placeholderImage ? (
              <View className="h-7 w-7 items-center justify-center rounded bg-white/40">
                <Ionicons name="image-outline" size={16} color="#FFFFFF" />
              </View>
            ) : (
              <Ionicons name="alert-circle-outline" size={20} color="#FFFFFF" />
            )}
          </View>
          <Text
            className="mt-1 max-w-[86px] text-center text-[11px] font-extrabold text-white"
            numberOfLines={1}
          >
            {incident.type}
          </Text>
        </View>
      </View>
      <View
        className="-mt-2 h-4 w-4 rotate-45 border-b-2 border-r-2 border-white"
        style={{ backgroundColor: pinColor }}
      />
    </View>
  );
}
