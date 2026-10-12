/**
 * BloodPressureScreen - OPTIMIZED with React Query + PAGINATION
 *
 * FIXES APPLIED:
 * 1. ❌ BEFORE: fetchData useCallback + useEffect with [period, fetchTrends] deps → unstable
 * 2. ✅ AFTER: useBloodPressureScreen(period) hook — React Query handles caching & deduplication
 * 3. ✅ Mutations auto-invalidate cache — no manual fetchData() needed
 * 4. ✅ Tab switch returns cached data instantly (staleTime: 60s)
 * 5. ✅ PAGINATION: Logs use useInfiniteQuery — shows 10 at a time with "Load More" button
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
import { useBloodPressureScreen } from '../../../hooks/queries/useTrackerQueries';
import { getErrorMessage } from '../../../utils/errorHandler';

const ADD_FIELDS = [
  { name: 'systolic', label: 'Systolic (mmHg)', placeholder: 'e.g. 120', keyboardType: 'numeric' },
  { name: 'diastolic', label: 'Diastolic (mmHg)', placeholder: 'e.g. 80', keyboardType: 'numeric' },
  { name: 'date', label: 'Date', type: 'date', maximumDate: new Date() },
];

const EDIT_FIELDS = ADD_FIELDS.map((f) => ({ ...f, maximumDate: undefined }));

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

const getBPStatus = (systolic, diastolic) => {
  if (systolic < 120 && diastolic < 80) return { status: 'Normal', color: '#4CAF50' };
  if (systolic < 130 && diastolic < 80) return { status: 'Elevated', color: '#FF9800' };
  if (systolic < 140 || diastolic < 90) return { status: 'High Stage 1', color: '#FF5722' };
  if (systolic >= 140 || diastolic >= 90) return { status: 'High Stage 2', color: '#F44336' };
  return { status: 'Unknown', color: '#9E9E9E' };
};

const BloodPressureScreen = ({ navigation }) => {
  const { colors } = useTheme();

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
    addBloodPressure: addMutation,
    updateBloodPressure: updateMutation,
    deleteBloodPressure: deleteMutation,
  } = useBloodPressureScreen(period);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  };

  const handleAdd = async (form) => {
    setAddLoading(true);
    try {
      await addMutation.mutateAsync({
        systolic: parseInt(form.systolic, 10),
        diastolic: parseInt(form.diastolic, 10),
        date: form.date || new Date().toISOString(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      });
      Toast.show({ type: 'success', text1: 'Blood pressure logged successfully!' });
      setShowAdd(false);
    } catch (e) {
      const msg = getErrorMessage(e, 'Could not save blood pressure. Please try again.');
      Toast.show({ type: 'error', text1: 'Failed to log blood pressure', text2: msg });
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
          systolic: parseInt(form.systolic, 10),
          diastolic: parseInt(form.diastolic, 10),
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
            <Text style={[tw`text-lg font-bold`, { color: '#1A1D3F' }]}>Blood Pressure</Text>
            <View style={tw`w-10 h-10`} />
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <TrackerSkeleton />
        </ScrollView>
      </View>
    );
  }

  const bpStatus = getBPStatus(currentData.systolic, currentData.diastolic);
  const systolicProgress = currentData.systolic > 0 ? Math.min((currentData.systolic / 180) * 100, 100) : 0;
  const diastolicProgress = currentData.diastolic > 0 ? Math.min((currentData.diastolic / 120) * 100, 100) : 0;

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={{ backgroundColor: '#F3EAFF', paddingTop: 20, paddingBottom: 16, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <View style={tw`flex-row items-center justify-between px-5`}>
          <TouchableOpacity onPress={handleGoBack} style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#FFFFFF' }]}>
            <Icon name="chevron-left" size={24} color="#1A1D3F" />
          </TouchableOpacity>
          <Text style={[tw`text-lg font-bold`, { color: '#1A1D3F' }]}>Blood Pressure</Text>
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
        {/* Main BP Card */}
        <View style={[tw`rounded-3xl p-5 mt-5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
          <Text style={[tw`text-sm font-semibold mb-1`, { color: colors.textSecondary }]}>Current Blood Pressure</Text>
          <View style={tw`flex-row items-center justify-between`}>
            <View>
              <View style={tw`flex-row items-baseline`}>
                <Text style={[tw`text-4xl font-bold`, { color: colors.textPrimary }]}>{currentData.systolic}/{currentData.diastolic}</Text>
                <Text style={[tw`text-sm ml-2`, { color: colors.textMuted }]}>mmHg</Text>
              </View>
              <View style={[tw`flex-row items-center mt-2 px-3 py-1.5 rounded-full`, { backgroundColor: bpStatus.color + '15' }]}>
                <View style={[tw`w-2 h-2 rounded-full mr-2`, { backgroundColor: bpStatus.color }]} />
                <Text style={[tw`text-xs font-bold`, { color: bpStatus.color }]}>{bpStatus.status}</Text>
              </View>
            </View>
            <SmallCircularProgress size={70} strokeWidth={7} progress={systolicProgress} color={bpStatus.color} bgColor={bpStatus.color + '20'}>
              <Icon name="speed" size={22} color={bpStatus.color} />
            </SmallCircularProgress>
          </View>
          {currentData.condition && (
            <View style={[tw`mt-3 px-3 py-2 rounded-xl`, { backgroundColor: bpStatus.color + '10' }]}>
              <Text style={[tw`text-xs font-medium text-center`, { color: bpStatus.color }]}>
                {currentData.condition}
              </Text>
            </View>
          )}
        </View>

        {/* Stat Cards Row */}
        <View style={tw`flex-row mt-4 -mx-1.5`}>
          <MacroCard label="Systolic" value={String(currentData.systolic || '--')} unit=" mmHg" progress={systolicProgress} color="#FF8C42" bgColor="#FFF0E6" iconName="arrow-upward" colors={colors} />
          <MacroCard label="Diastolic" value={String(currentData.diastolic || '--')} unit=" mmHg" progress={diastolicProgress} color="#7C4DFF" bgColor="#EDE7FF" iconName="arrow-downward" colors={colors} />
          <MacroCard label="Status" value={bpStatus.status.split(' ')[0]} unit="" progress={systolicProgress} color={bpStatus.color} bgColor={bpStatus.color + '15'} iconName="check-circle" colors={colors} />
        </View>

        {/* Recommended Info Card */}
        <View style={[tw`rounded-2xl p-4 mt-4`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }]}>
          <View style={tw`flex-row items-center`}>
            <View style={[tw`w-8 h-8 rounded-lg items-center justify-center mr-3`, { backgroundColor: '#FFF0E6' }]}>
              <Icon name="lightbulb" size={16} color="#FF8C42" />
            </View>
            <View style={tw`flex-1`}>
              <Text style={[tw`text-xs font-bold mb-1`, { color: colors.textPrimary }]}>Recommended Range (based on your age & gender)</Text>
              <Text style={[tw`text-xs font-medium`, { color: colors.textSecondary }]}>Systolic: {currentData.systolicRange || '90-120'} mmHg • Diastolic: {currentData.diastolicRange || '60-80'} mmHg</Text>
            </View>
          </View>
        </View>

        {/* Trend Chart */}
        <View style={tw`mt-5`}>
          <TrendSection
            title="Systolic Trend"
            data={trendData.length > 0 ? trendData : [0, 0, 0, 0, 0, 0, 0]}
            labels={trendLabels.length > 0 ? trendLabels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
            period={period}
            onPeriodChange={setPeriod}
            color="#FF8C42"
          />
        </View>

        {/* Recent Logs — PAGINATED */}
        <Text style={[tw`text-xl font-bold mt-7 mb-4`, { color: colors.textPrimary }]}>Recent Logs</Text>

        {logs.length === 0 ? (
          <View style={[tw`rounded-2xl p-6 items-center`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }]}>
            <Icon name="speed" size={40} color={colors.textMuted} />
            <Text style={[tw`text-sm mt-3 font-medium text-center`, { color: colors.textMuted }]}>No logs yet. Tap + to add your first entry.</Text>
          </View>
        ) : (
          <>
            <View style={[tw`rounded-xl px-3 py-2 mb-3`, { backgroundColor: '#EDE7FF' }]}>
              <Text style={[tw`text-xs font-medium text-center`, { color: '#7C4DFF' }]}>
                ← Swipe left on any entry to delete
              </Text>
            </View>
            {logs.map((item) => {
              const itemStatus = getBPStatus(item.systolic, item.diastolic);
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
                    title={`${item.systolic}/${item.diastolic} mmHg`}
                    subtitle={itemStatus.status}
                    value={timeValue}
                    iconName="speed"
                    iconBgColor={itemStatus.color + '15'}
                    iconColor={itemStatus.color}
                    colors={colors}
                    onPress={() => {
                      setSelectedEntry({
                        ...item,
                        systolic: String(item.systolic || ''),
                        diastolic: String(item.diastolic || ''),
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
        style={[tw`absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center`, { backgroundColor: '#FF8C42', shadowColor: '#FF8C42', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }]}
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

export default BloodPressureScreen;