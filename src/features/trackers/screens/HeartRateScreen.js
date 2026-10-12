/**
 * HeartRateScreen - OPTIMIZED with React Query + PAGINATION
 *
 * FIXES APPLIED:
 * 1. ❌ BEFORE: fetchData useCallback + useEffect with [period, fetchTrends] deps → unstable, re-fetches
 * 2. ✅ AFTER: useHeartRateScreen(period) hook — React Query handles caching & deduplication
 * 3. ✅ Period change only re-fetches trends (different queryKey), ranges & logs stay cached
 * 4. ✅ Mutations auto-invalidate cache — no manual fetchData() needed after add/edit/delete
 * 5. ✅ Tab switch returns cached data instantly (staleTime: 60s)
 * 6. ✅ PAGINATION: Logs use useInfiniteQuery — shows 10 at a time with "Load More" button
 */

import React, { useState } from 'react';
import { View, ScrollView, Text, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Svg, { Circle } from 'react-native-svg';
import TrendSection from '../../dashboard/components/TrendSection';
import AddEntryModal from '../components/AddEntryModal';
import EditEntryModal from '../components/EditEntryModal';
import { TrackerSkeleton } from '../../../shared/feedback/SkeletonLoader';
import SwipeableRow from '../../../shared/layout/SwipeableRow';
import LoadMoreButton from '../../../shared/ui/LoadMoreButton';
import Toast from 'react-native-toast-message';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';
import dayjs from 'dayjs';
import { useHeartRateScreen } from '../../../hooks/queries/useTrackerQueries';
import { getErrorMessage } from '../../../utils/errorHandler';

const ADD_FIELDS = [
  { name: 'bpm', label: 'Heart Rate (BPM)', placeholder: 'e.g. 72', keyboardType: 'numeric' },
  { name: 'date', label: 'Date', type: 'date', maximumDate: new Date() },
];

const EDIT_FIELDS = ADD_FIELDS.map((f) => ({ ...f, maximumDate: undefined }));

const ArcProgress = ({ size = 100, strokeWidth = 10, progress = 0, color, bgColor }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const progressLength = (progress / 100) * arcLength;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={bgColor || '#F0F0F0'} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={`${arcLength} ${circumference - arcLength}`} strokeLinecap="round" rotation="135" origin={`${center}, ${center}`} />
        <Circle cx={center} cy={center} r={radius} stroke={color} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={`${progressLength} ${circumference - progressLength}`} strokeLinecap="round" rotation="135" origin={`${center}, ${center}`} />
      </Svg>
    </View>
  );
};

const SmallCircularProgress = ({ size = 50, strokeWidth = 5, progress = 0, color, bgColor, children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressValue = (progress / 100) * circumference;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={bgColor || '#F0F0F0'} strokeWidth={strokeWidth} fill="transparent" />
        <Circle cx={center} cy={center} r={radius} stroke={color} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={circumference - progressValue} strokeLinecap="round" rotation="-90" origin={`${center}, ${center}`} />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
};

const MacroCard = ({ label, value, unit, progress, color, bgColor, iconName, colors }) => (
  <View style={[tw`flex-1 items-center rounded-2xl py-4 px-2 mx-1.5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 }]}>
    <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>{value}{unit}</Text>
    <Text style={[tw`text-[11px] mt-1 mb-3`, { color: colors.textMuted }]}>{label}</Text>
    <SmallCircularProgress size={52} strokeWidth={5} progress={progress} color={color} bgColor={bgColor}>
      <Icon name={iconName} size={16} color={color} />
    </SmallCircularProgress>
  </View>
);

const ActivityItem = ({ title, value, subtitle, iconName, iconBgColor, iconColor, colors, onPress, onDelete }) => (
  <View style={[tw`rounded-2xl p-4 mb-3`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }]}>
    <View style={tw`flex-row items-center justify-between`}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={tw`flex-row items-center flex-1`}>
        <View style={[tw`w-10 h-10 rounded-xl items-center justify-center`, { backgroundColor: iconBgColor }]}>
          <Icon name={iconName} size={18} color={iconColor} />
        </View>
        <View style={tw`ml-3 flex-1`}>
          <View style={tw`flex-row items-center`}>
            <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>{title}</Text>
            {subtitle && (
              <View style={[tw`ml-2 px-2 py-0.5 rounded-full`, { backgroundColor: iconBgColor }]}>
                <Text style={[tw`text-[9px] font-bold`, { color: iconColor }]}>{subtitle}</Text>
              </View>
            )}
          </View>
          <Text style={[tw`text-sm mt-1 font-medium`, { color: colors.textMuted }]}>{value}</Text>
        </View>
      </TouchableOpacity>
      <View style={tw`flex-row items-center`}>
        <TouchableOpacity onPress={onDelete} activeOpacity={0.6} style={tw`p-2 mr-1`}>
          <Icon name="delete-outline" size={18} color="#FF6B6B" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={tw`p-2`}>
          <Icon name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const getZoneColor = (zone) => {
  switch (zone) {
    case 'Resting': return '#4DA6FF';
    case 'Light': return '#4DA6FF';
    case 'Normal': return '#00D4AA';
    case 'Moderate': return '#00D4AA';
    case 'Aerobic/Cardio': return '#FFB800';
    case 'Elevated': return '#FFB800';
    case 'Anaerobic': return '#FF8C42';
    case 'Max Effort': return '#FF6B6B';
    case 'High': return '#FF6B6B';
    case 'Critical': return '#FF0000';
    default: return '#00D4AA';
  }
};

const HeartRateScreen = ({ navigation }) => {
  const { colors } = useTheme();

  // Safe go back - prevents "GO_BACK was not handled" error
  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs');
    }
  };

  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('weekly');
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // ─── REACT QUERY: All data managed by single hook (WITH PAGINATION) ─────
  const {
    currentData,
    logs,
    trendData,
    trendLabels,
    isLoading: loading,
    // Pagination controls
    hasMoreLogs,
    loadMoreLogs,
    isLoadingMore,
    totalLogs,
    refetchAll,
    addHeartRate: addMutation,
    updateHeartRate: updateMutation,
    deleteHeartRate: deleteMutation,
  } = useHeartRateScreen(period);

  // No useEffect needed! React Query handles everything.
  // Period change → new queryKey for trends → automatic refetch for trends only!

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  };

  const handleAdd = async (form) => {
    setAddLoading(true);
    try {
      await addMutation.mutateAsync({
        bpm: parseInt(form.bpm, 10),
        date: form.date || new Date().toISOString(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      });
      Toast.show({ type: 'success', text1: 'Heart rate logged successfully!' });
      setShowAdd(false);
      // No manual fetchData() needed! Cache auto-invalidates via onSuccess.
    } catch (e) {
      const msg = getErrorMessage(e, 'Could not save heart rate. Please try again.');
      Toast.show({ type: 'error', text1: 'Failed to log heart rate', text2: msg });
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async (form) => {
    setEditLoading(true);
    try {
      await updateMutation.mutateAsync({
        id: selectedEntry._id,
        data: {
          bpm: parseInt(form.bpm, 10),
          date: form.date,
          timestamp: selectedEntry.timestamp,
        },
      });
      Toast.show({ type: 'success', text1: 'Entry updated successfully!' });
      setShowEdit(false);
    } catch (e) {
      const msg = getErrorMessage(e, 'Could not update entry. Please try again.');
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    } finally {
      setEditLoading(false);
    }
  };

  const confirmDelete = (item) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) },
      ]
    );
  };

  const handleDelete = async (item) => {
    try {
      await deleteMutation.mutateAsync(item._id);
      Toast.show({ type: 'success', text1: 'Entry deleted' });
    } catch (e) {
      const msg = getErrorMessage(e, 'Could not delete entry. Please try again.');
      Toast.show({ type: 'error', text1: 'Delete failed', text2: msg });
    }
  };

  if (loading) {
    return (
      <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
        <View style={{ backgroundColor: '#F3EAFF', paddingTop: 20, paddingBottom: 16, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
          <View style={tw`flex-row items-center justify-between px-5`}>
            <TouchableOpacity onPress={handleGoBack} style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#FFFFFF' }]}>
              <Icon name="chevron-left" size={24} color="#1A1D3F" />
            </TouchableOpacity>
            <Text style={[tw`text-lg font-bold`, { color: '#1A1D3F' }]}>Heart Rate</Text>
            <View style={tw`w-10 h-10`} />
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <TrackerSkeleton />
        </ScrollView>
      </View>
    );
  }

  const hrProgress = currentData.bpm > 0 ? Math.min((currentData.bpm / 200) * 100, 100) : 0;
  const zoneColor = getZoneColor(currentData.zone);

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={{ backgroundColor: '#F3EAFF', paddingTop: 20, paddingBottom: 16, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <View style={tw`flex-row items-center justify-between px-5`}>
          <TouchableOpacity onPress={handleGoBack} style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#FFFFFF' }]}>
            <Icon name="chevron-left" size={24} color="#1A1D3F" />
          </TouchableOpacity>
          <Text style={[tw`text-lg font-bold`, { color: '#1A1D3F' }]}>Heart Rate</Text>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#FFFFFF' }]}>
            <Icon name="add" size={20} color="#1A1D3F" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        contentContainerStyle={tw`px-5 pb-28`}
      >
        {/* Main Heart Rate Card */}
        <View style={[tw`rounded-3xl p-5 mt-5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
          <Text style={[tw`text-sm font-semibold mb-1`, { color: colors.textSecondary }]}>Current Heart Rate</Text>
          <View style={tw`flex-row items-center justify-between`}>
            <View>
              <View style={tw`flex-row items-baseline`}>
                <Text style={[tw`text-4xl font-bold`, { color: colors.textPrimary }]}>{currentData.bpm || '--'}</Text>
                <Text style={[tw`text-lg ml-1`, { color: colors.textMuted }]}>bpm</Text>
              </View>
              <View style={[tw`flex-row items-center mt-2 px-3 py-1.5 rounded-full`, { backgroundColor: zoneColor + '15' }]}>
                <View style={[tw`w-2 h-2 rounded-full mr-2`, { backgroundColor: zoneColor }]} />
                <Text style={[tw`text-xs font-bold`, { color: zoneColor }]}>{currentData.zone || 'No Data'}</Text>
              </View>
            </View>
            <View style={{ position: 'relative' }}>
              <ArcProgress size={85} strokeWidth={9} progress={hrProgress} color="#FF6B6B" bgColor="#EDEDED" />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="favorite" size={22} color="#FF6B6B" />
              </View>
            </View>
          </View>
          {currentData.condition && (
            <View style={[tw`mt-3 px-3 py-2 rounded-xl`, { backgroundColor: '#FFE6E6' }]}>
              <Text style={[tw`text-xs font-medium text-center`, { color: '#FF6B6B' }]}>
                {currentData.condition}
              </Text>
            </View>
          )}
        </View>

        {/* Stat Cards Row */}
        <View style={tw`flex-row mt-4 -mx-1.5`}>
          <MacroCard label="Zone" value={currentData.zone || '--'} unit="" progress={hrProgress} color={zoneColor} bgColor={zoneColor + '15'} iconName="analytics" colors={colors} />
          <MacroCard label="% of MHR" value={currentData.percentOfMHR || '--'} unit="" progress={hrProgress} color="#FF8C42" bgColor="#FFF0E6" iconName="speed" colors={colors} />
          <MacroCard label="Target" value={currentData.range || '60-100'} unit="" progress={50} color="#4DA6FF" bgColor="#EBF5FF" iconName="gps-fixed" colors={colors} />
        </View>

        {/* Recommended Info Card */}
        <View style={[tw`rounded-2xl p-4 mt-4`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }]}>
          <View style={tw`flex-row items-center`}>
            <View style={[tw`w-8 h-8 rounded-lg items-center justify-center mr-3`, { backgroundColor: '#FFE6E6' }]}>
              <Icon name="lightbulb" size={16} color="#FF6B6B" />
            </View>
            <View style={tw`flex-1`}>
              <Text style={[tw`text-xs font-bold mb-1`, { color: colors.textPrimary }]}>Recommended: {currentData.range || '60-100'} bpm</Text>
              <Text style={[tw`text-xs font-medium`, { color: colors.textSecondary }]}>Normal resting heart rate range based on your age and gender</Text>
            </View>
          </View>
        </View>

        {/* Heart Rate Zones */}
        <View style={[tw`rounded-3xl p-5 mt-5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
          <Text style={[tw`text-base font-bold mb-3`, { color: colors.textPrimary }]}>Heart Rate Zones</Text>
          {[
            { label: 'Resting', range: '<60 bpm', color: '#4DA6FF', active: currentData.zone === 'Resting' },
            { label: 'Light', range: '50-60% MHR', color: '#00D4AA', active: currentData.zone === 'Light' },
            { label: 'Moderate', range: '60-70% MHR', color: '#4CAF50', active: currentData.zone === 'Moderate' },
            { label: 'Aerobic/Cardio', range: '70-80% MHR', color: '#FFB800', active: currentData.zone === 'Aerobic/Cardio' },
            { label: 'Anaerobic', range: '80-90% MHR', color: '#FF8C42', active: currentData.zone === 'Anaerobic' },
            { label: 'Max Effort', range: '90-100% MHR', color: '#FF6B6B', active: currentData.zone === 'Max Effort' },
          ].map((zone) => (
            <View key={zone.label} style={[tw`flex-row items-center mb-2 px-3 py-2.5 rounded-xl`, zone.active ? { backgroundColor: zone.color + '10' } : {}]}>
              <View style={[tw`w-3 h-3 rounded-full mr-3`, { backgroundColor: zone.color }]} />
              <Text style={[tw`text-sm font-semibold flex-1`, { color: zone.active ? zone.color : colors.textPrimary }]}>{zone.label}</Text>
              <Text style={[tw`text-xs`, { color: colors.textMuted }]}>{zone.range}</Text>
              {zone.active && <Icon name="arrow-left" size={14} color={zone.color} style={tw`ml-2`} />}
            </View>
          ))}
        </View>

        {/* Trend Chart */}
        <View style={tw`mt-5`}>
          <TrendSection
            title="Heart Rate Trend"
            data={trendData.length > 0 ? trendData : [0, 0, 0, 0, 0, 0, 0]}
            labels={trendLabels.length > 0 ? trendLabels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
            period={period}
            onPeriodChange={setPeriod}
            color="#FF6B6B"
          />
        </View>

        {/* Recent Logs — PAGINATED */}
        <Text style={[tw`text-xl font-bold mt-7 mb-4`, { color: colors.textPrimary }]}>Recent Logs</Text>

        {logs.length === 0 ? (
          <View style={[tw`rounded-2xl p-6 items-center`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }]}>
            <Icon name="favorite" size={40} color={colors.textMuted} />
            <Text style={[tw`text-sm mt-3 font-medium text-center`, { color: colors.textMuted }]}>No logs yet. Tap + to add your first entry.</Text>
          </View>
        ) : (
          <>
            <View style={[tw`rounded-xl px-3 py-2 mb-3`, { backgroundColor: '#FFEBEE' }]}>
              <Text style={[tw`text-xs font-medium text-center`, { color: '#FF6B6B' }]}>
                ← Swipe left on any entry to delete
              </Text>
            </View>
            {logs.map((item) => {
              let displayTime = '';
              if (item.timestamp) {
                const parts = item.timestamp.split(':');
                const h = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10);
                const ampm = h >= 12 ? 'PM' : 'AM';
                const hour12 = h % 12 || 12;
                displayTime = `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
              }
              const dateStr = item.date ? dayjs(item.date).format('MMM D, YYYY') : '';
              const timeValue = displayTime ? `${displayTime} • ${dateStr}` : dateStr;

              return (
                <SwipeableRow key={item._id} onDelete={() => confirmDelete(item)}>
                  <ActivityItem
                    title={`${item.bpm} bpm`}
                    subtitle={item.zone}
                    value={timeValue}
                    iconName="favorite"
                    iconBgColor={getZoneColor(item.zone) + '15'}
                    iconColor={getZoneColor(item.zone)}
                    colors={colors}
                    onPress={() => {
                      setSelectedEntry({
                        ...item,
                        bpm: String(item.bpm || ''),
                      });
                      setShowEdit(true);
                    }}
                    onDelete={() => confirmDelete(item)}
                  />
                </SwipeableRow>
              );
            })}

            {/* Load More Button — PAGINATION */}
            <LoadMoreButton
              hasMore={hasMoreLogs}
              onLoadMore={loadMoreLogs}
              isLoading={isLoadingMore}
              totalCount={totalLogs}
              currentCount={logs.length}
            />
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[tw`absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center`, { backgroundColor: '#FF6B6B', shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }]}
        onPress={() => setShowAdd(true)}
        activeOpacity={0.8}
      >
        <Icon name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <AddEntryModal visible={showAdd} onClose={() => setShowAdd(false)} onSubmit={handleAdd} fields={ADD_FIELDS} loading={addLoading} />
      <EditEntryModal visible={showEdit} onClose={() => setShowEdit(false)} onSubmit={handleEdit} entry={selectedEntry} fields={EDIT_FIELDS} loading={editLoading} />
    </View>
  );
};

export default HeartRateScreen;