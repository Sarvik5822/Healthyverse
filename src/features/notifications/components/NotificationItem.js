import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const NotificationItem = ({ notification, onPress }) => {
  const { colors } = useTheme();
  const isRead = notification.read;

  return (
    <TouchableOpacity
      style={[
        tw`flex-row items-start px-5 py-4 mb-2 rounded-2xl`,
        { backgroundColor: isRead ? 'transparent' : colors.purpleLight },
      ]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      <View style={[tw`w-10 h-10 rounded-xl items-center justify-center`, { backgroundColor: colors.primary + '15' }]}>
        <Icon name="notifications" size={18} color={colors.primary} />
      </View>
      <View style={tw`ml-3 flex-1`}>
        <Text style={[tw`text-sm font-semibold`, { color: colors.textPrimary }]}>
          {notification.title || 'Notification'}
        </Text>
        <Text style={[tw`text-xs mt-1`, { color: colors.textSecondary }]} numberOfLines={2}>
          {notification.message || notification.body}
        </Text>
        <Text style={[tw`text-[10px] mt-1.5 font-medium`, { color: colors.textMuted }]}>
          {notification.createdAt ? dayjs(notification.createdAt).fromNow() : ''}
        </Text>
      </View>
      {!isRead && (
        <View style={[tw`w-2 h-2 rounded-full mt-2`, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
};

export default NotificationItem;