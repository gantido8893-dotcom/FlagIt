import { Image, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = {
  displayName: string;
  avatarUrl: string | null;
  isVerifiedContributor: boolean;
};
export default function ProfileHeader({
  displayName,
  avatarUrl,
  isVerifiedContributor,
}: Props) {
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <View className="flex-row items-center border-b border-slate-100 pb-5">
      <View className="mr-4 h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-200">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className="h-16 w-16" />
        ) : (
          <Text className="text-2xl font-bold text-slate-700">{initial}</Text>
        )}
      </View>
      <View className="flex-1">
        <Text className="text-lg font-bold text-slate-900">{displayName}</Text>
        {isVerifiedContributor ? (
          <View className="mt-1 flex-row items-center">
            <View className="mr-1.5 h-5 w-5 items-center justify-center rounded-full bg-blue-100">
              <Ionicons name="shield-checkmark" size={14} color="#2563EB" />
            </View>
            <Text className="text-sm font-medium text-blue-600">
              Verified Community Contributor
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
