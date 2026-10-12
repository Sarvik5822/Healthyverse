import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NotificationItem from './NotificationItem';
import EmptyState from '../../../shared/feedback/EmptyState';
import LoadingSpinner from '../../../shared/feedback/LoadingSpinner';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';

const NotificationList = ({ notifications = [], isLoading, onMarkRead, onClearAll, onClose }) => {
  const { colors } = useTheme();

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      <View style={[tw`flex-row items-center justify-between px-5 pt-6 pb-4`, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity
          onPress={onClose}
          style={[tw`w-10 h-10 rounded-xl items-center justify-center`, { backgroundColor: colors.surfaceElevated }]}
        >
          <Icon name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[tw`text-lg font-bold`, { color: colors.textPrimary }]}>Notifications</Text>
        <TouchableOpacity
          onPress={onClearAll}
          style={[tw`px-3 py-2 rounded-xl`, { backgroundColor: colors.surfaceElevated }]}
        >
          <Text style={[tw`text-xs font-bold`, { color: colors.primary }]}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : notifications.length === 0 ? (
        <EmptyState icon="notifications-none" title="No Notifications" message="You're all caught up!" />
      ) : (
        <FlatList
          data={notifications}
          renderItem={({ item }) => (
            <NotificationItem notification={item} onPress={() => onMarkRead(item._id)} />
          )}
          keyExtractor={(item) => item._id}
          contentContainerStyle={tw`px-3 pt-3 pb-6`}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default NotificationList;