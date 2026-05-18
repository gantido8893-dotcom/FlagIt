import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  PROFILE_AVATAR_INITIAL,
  PROFILE_USERNAME,
  PROFILE_VERIFIED_LABEL,
} from '../../constants/profile';

export default function ProfileHeader() {
  return (
    <View className="flex-row items-center border-b border-slate-100 pb-5">
      <View className="mr-4 h-16 w-16 items-center justify-center rounded-full bg-slate-200">
        <Text className="text-2xl font-bold text-slate-700">{PROFILE_AVATAR_INITIAL}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-lg font-bold text-slate-900">{PROFILE_USERNAME}</Text>
        <View className="mt-1 flex-row items-center">
          <View className="mr-1.5 h-5 w-5 items-center justify-center rounded-full bg-blue-100">
            <Ionicons name="shield-checkmark" size={14} color="#2563EB" />
          </View>
          <Text className="text-sm font-medium text-blue-600">{PROFILE_VERIFIED_LABEL}</Text>
        </View>
      </View>
    </View>
  );
}
