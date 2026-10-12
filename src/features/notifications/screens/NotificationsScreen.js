/**
 * NotificationsScreen - OPTIMIZED with React Query
 *
 * FIXES APPLIED:
 * 1. ✅ Uses useNotifications() query hook — cached, deduplicated
 * 2. ✅ Tab switch returns cached data instantly (staleTime: 30s)
 * 3. ✅ Pull-to-refresh invalidates cache cleanly
 * 4. ✅ Mutations auto-invalidate notification cache
 */

import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, RefreshControl, FlatList, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NotificationItem from '../components/NotificationItem';
import { NotificationsSkeleton } from '../../../shared/feedback/SkeletonLoader';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';
import { NotificationContext } from '../../../context/NotificationContext';
import { getNotifications, markAsRead, clearAllNotifications } from '../../../api/notifications';
import { showErrorToast } from '../../../utils/errorHandler';
import { TRACKER_KEYS } from '../../../hooks/queries/useTrackerQueries';

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { setNotificationsList, markAsRead: markContextRead } = useContext(NotificationContext);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // ─── REACT QUERY: Fetch notifications ───────────────────────────────────
  const {
    data: notifications = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: TRACKER_KEYS.notifications,
    queryFn: async () => {
      const res = await getNotifications();
      const data = res.data?.notifications || res.data || [];
      // Sync with NotificationContext for badge count
      setNotificationsList(data);
      return data;
    },
    staleTime: 30 * 1000, // 30s cache
    gcTime: 5 * 60 * 1000,
  });

  // ─── MUTATIONS ──────────────────────────────────────────────────────────
  const markReadMutation = useMutation({
    mutationFn: (id) => markAsRead(id),
    onSuccess: (_, id) => {
      markContextRead(id);
      // Optimistically update cache
      queryClient.setQueryData(TRACKER_KEYS.notifications, (old) =>
        (old || []).map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    },
    onError: (error) => {
      showErrorToast(error, 'mark notification as read');
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => clearAllNotifications(),
    onSuccess: () => {
      queryClient.setQueryData(TRACKER_KEYS.notifications, []);
      setNotificationsList([]);
    },
    onError: (error) => {
      showErrorToast(error, 'clear notifications');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleMarkRead = (id) => {
    markReadMutation.mutate(id);
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearAllMutation.mutate(),
        },
      ]
    );
  };

  const renderEmpty = () => (
    <View style={tw`flex-1 items-center justify-center py-20`}>
      <Icon name="notifications-none" size={64} color={colors.textMuted} />
      <Text style={[tw`text-base mt-4`, { color: colors.textMuted }]}>
        No notifications yet
      </Text>
      <Text style={[tw`text-sm mt-1 text-center px-8`, { color: colors.textMuted }]}>
        You'll see your notifications here when you receive them.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
        <View
          style={[
            tw`flex-row items-center justify-between px-5 pt-4 pb-4`,
            { backgroundColor: colors.surface },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MainTabs');
              }
            }}
            style={tw`p-1`}
          >
            <Icon name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[tw`text-lg font-bold`, { color: colors.textPrimary }]}>
            Notifications
          </Text>
          <View style={tw`w-8`} />
        </View>
        <NotificationsSkeleton />
      </View>
    );
  }

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          tw`flex-row items-center justify-between px-5 pt-4 pb-4`,
          { backgroundColor: colors.surface },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('MainTabs');
            }
          }}
          style={tw`p-1`}
        >
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[tw`text-lg font-bold`, { color: colors.textPrimary }]}>
          Notifications
        </Text>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll} style={tw`p-1`}>
            <Icon name="delete-sweep" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <View style={tw`w-8`} />
        )}
      </View>

      {/* Notification List */}
      <FlatList
        data={notifications}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => handleMarkRead(item._id)}
          />
        )}
        keyExtractor={(item) => item._id}
        contentContainerStyle={tw`px-3 pt-3 pb-6`}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
};

export default NotificationsScreen;