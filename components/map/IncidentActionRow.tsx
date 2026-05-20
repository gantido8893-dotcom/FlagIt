import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = {
  accentColor: string;
  iconName: 'arrow-up' | 'arrow-down';
  title: string;
  subtitle: string;
  onPress?: () => void;
  active?: boolean;
  disabled?: boolean;
};

export default function IncidentActionRow({
  accentColor,
  iconName,
  title,
  subtitle,
  onPress,
  active = false,
  disabled = false,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center"
      disabled={!onPress || disabled}
    >
      <View
        className="mr-3 h-10 w-10 items-center justify-center rounded-[10px]"
        style={
          active
            ? { backgroundColor: 'transparent', borderColor: accentColor, borderWidth: 2 }
            : { backgroundColor: accentColor }
        }
      >
        <Ionicons name={iconName} size={20} color={active ? accentColor : '#FFFFFF'} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-[rgba(79,79,79,0.97)]">{title}</Text>
        <Text
          className="mt-0.5 text-xs"
          style={active ? { color: accentColor, fontWeight: '600' } : { color: '#999999' }}
        >
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
