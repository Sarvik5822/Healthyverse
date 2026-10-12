/**
 * BloodOxygenScreen - OPTIMIZED with React Query + PAGINATION
 *
 * FIXES APPLIED:
 * 1. ❌ BEFORE: fetchData useCallback + useEffect with [period, fetchTrends] deps → unstable, re-fetches
 * 2. ✅ AFTER: useBloodOxygenScreen(period) hook — React Query handles caching & deduplication
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
import { useBloodOxygenScreen } from '../../../hooks/queries/useTrackerQueries';
import { getErrorMessage } from '../../../utils/errorHandler';

const ADD_FIELDS = [
  { name: 'spo2', label: 'SpO2 (%)', placeholder: 'e.g. 98', keyboardType: 'numeric' },
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

const getSpO2Status = (spo2) => {
  if (!spo2 || spo2 === 0) return { status: 'No Data', color: '#9E9E9E' };
  if (spo2 >= 95) return { status: 'Normal', color: '#4CAF50' };
  if (spo2 >= 91) return { status: 'Mild Hypoxia', color: '#FF9800' };
  return { status: 'Low', color: '#F44336' };
};

const BloodOxygenScreen = ({ navigation }) => {
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
    addBloodOxygen: addMutation,
    updateBloodOxygen: updateMutation,
    deleteBloodOxygen: deleteMutation,
  } = useBloodOxygenScreen(period);

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
        value: parseInt(form.spo2, 10),
        date: form.date || new Date().toISOString(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      });
      Toast.show({ type: 'success', text1: 'Blood oxygen logged successfully!' });
      setShowAdd(false);
      // No manual fetchData() needed! Cache auto-invalidates via onSuccess.
    } catch (e) {
      const msg = getErrorMessage(e, 'Could not save blood oxygen. Please try again.');
      Toast.show({ type: 'error', text1: 'Failed to log SpO2', text2: msg });
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
          value: parseInt(form.spo2, 10),
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
            <Text style={[tw`text-lg font-bold`, { color: '#1A1D3F' }]}>Blood Oxygen</Text>
            <View style={tw`w-10 h-10`} />
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <TrackerSkeleton />
        </ScrollView>
      </View>
    );
  }

  const spo2Status = getSpO2Status(currentData.spo2);
  const spo2Progress = currentData.spo2 > 0 ? Math.min(currentData.spo2, 100) : 0;

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={{ backgroundColor: '#F3EAFF', paddingTop: 20, paddingBottom: 16, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <View style={tw`flex-row items-center justify-between px-5`}>
          <TouchableOpacity onPress={handleGoBack} style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#FFFFFF' }]}>
            <Icon name="chevron-left" size={24} color="#1A1D3F" />
          </TouchableOpacity>
          <Text style={[tw`text-lg font-bold`, { color: '#1A1D3F' }]}>Blood Oxygen</Text>
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
        {/* Main SpO2 Card */}
        <View style={[tw`rounded-3xl p-5 mt-5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
          <Text style={[tw`text-sm font-semibold mb-1`, { color: colors.textSecondary }]}>Current SpO2</Text>
          <View style={tw`flex-row items-center justify-between`}>
            <View>
              <View style={tw`flex-row items-baseline`}>
                <Text style={[tw`text-4xl font-bold`, { color: colors.textPrimary }]}>{currentData.spo2 || '--'}</Text>
                <Text style={[tw`text-lg ml-1`, { color: colors.textMuted }]}>%</Text>
              </View>
              <View style={[tw`flex-row items-center mt-2 px-3 py-1.5 rounded-full`, { backgroundColor: spo2Status.color + '15' }]}>
                <View style={[tw`w-2 h-2 rounded-full mr-2`, { backgroundColor: spo2Status.color }]} />
                <Text style={[tw`text-xs font-bold`, { color: spo2Status.color }]}>{spo2Status.status}</Text>
              </View>
            </View>
            <View style={{ position: 'relative' }}>
              <ArcProgress size={85} strokeWidth={9} progress={spo2Progress} color={spo2Status.color} bgColor="#EDEDED" />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="air" size={22} color={spo2Status.color} />
              </View>
            </View>
          </View>
          {currentData.condition && (
            <View style={[tw`mt-3 px-3 py-2 rounded-xl`, { backgroundColor: spo2Status.color + '10' }]}>
              <Text style={[tw`text-xs font-medium text-center`, { color: spo2Status.color }]}>
                {currentData.condition}
              </Text>
            </View>
          )}
        </View>

        {/* Stat Cards Row */}
        <View style={tw`flex-row mt-4 -mx-1.5`}>
          <MacroCard label="SpO2" value={currentData.spo2 ? `${currentData.spo2}` : '--'} unit="%" progress={spo2Progress} color={spo2Status.color} bgColor={spo2Status.color + '15'} iconName="air" colors={colors} />
          <MacroCard label="Status" value={spo2Status.status.split(' ')[0]} unit="" progress={spo2Progress} color={spo2Status.color} bgColor={spo2Status.color + '15'} iconName="check-circle" colors={colors} />
          <MacroCard label="Normal" value="95-100" unit="%" progress={95} color="#4CAF50" bgColor="#E8F5E9" iconName="recommend" colors={colors} />
        </View>

        {/* Recommended Info Card */}
        <View style={[tw`rounded-2xl p-4 mt-4`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }]}>
          <View style={tw`flex-row items-center`}>
            <View style={[tw`w-8 h-8 rounded-lg items-center justify-center mr-3`, { backgroundColor: '#E8F5E9' }]}>
              <Icon name="lightbulb" size={16} color="#4CAF50" />
            </View>
            <View style={tw`flex-1`}>
              <Text style={[tw`text-xs font-bold mb-1`, { color: colors.textPrimary }]}>Recommended: 95-100% SpO2</Text>
              <Text style={[tw`text-xs font-medium`, { color: colors.textSecondary }]}>Healthy oxygen saturation ensures proper organ function. Below 91% requires immediate medical attention.</Text>
            </View>
          </View>
        </View>

        {/* SpO2 Ranges */}
        <View style={[tw`rounded-3xl p-5 mt-5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
          <Text style={[tw`text-base font-bold mb-3`, { color: colors.textPrimary }]}>SpO2 Ranges</Text>
          {[
            { label: 'Normal', range: '95-100%', color: '#4CAF50', desc: 'Healthy oxygen saturation', active: currentData.spo2 >= 95 },
            { label: 'Mild Hypoxia', range: '91-94%', color: '#FF9800', desc: 'Monitor closely', active: currentData.spo2 >= 91 && currentData.spo2 < 95 },
            { label: 'Low', range: '≤ 90%', color: '#F44336', desc: 'Seek medical attention', active: currentData.spo2 > 0 && currentData.spo2 <= 90 },
          ].map((item) => (
            <View key={item.label} style={[tw`flex-row items-center mb-2 px-3 py-2.5 rounded-xl`, item.active ? { backgroundColor: item.color + '10' } : {}]}>
              <View style={[tw`w-3 h-3 rounded-full mr-3`, { backgroundColor: item.color }]} />
              <View style={tw`flex-1`}>
                <Text style={[tw`text-sm font-semibold`, { color: item.active ? item.color : colors.textPrimary }]}>{item.label}</Text>
                <Text style={[tw`text-[10px]`, { color: colors.textMuted }]}>{item.desc}</Text>
              </View>
              <Text style={[tw`text-xs`, { color: colors.textMuted }]}>{item.range}</Text>
              {item.active && <Icon name="arrow-left" size={14} color={item.color} style={tw`ml-2`} />}
            </View>
          ))}
        </View>

        {/* Trend Chart */}
        <View style={tw`mt-5`}>
          <TrendSection
            title="SpO2 Trend"
            data={trendData.length > 0 ? trendData : [0, 0, 0, 0, 0, 0, 0]}
            labels={trendLabels.length > 0 ? trendLabels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
            period={period}
            onPeriodChange={setPeriod}
            color="#4CAF50"
          />
        </View>

        {/* Recent Logs — PAGINATED */}
        <Text style={[tw`text-xl font-bold mt-7 mb-4`, { color: colors.textPrimary }]}>Recent Logs</Text>

        {logs.length === 0 ? (
          <View style={[tw`rounded-2xl p-6 items-center`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }]}>
            <Icon name="air" size={40} color={colors.textMuted} />
            <Text style={[tw`text-sm mt-3 font-medium text-center`, { color: colors.textMuted }]}>No logs yet. Tap + to add your first entry.</Text>
          </View>
        ) : (
          <>
            <View style={[tw`rounded-xl px-3 py-2 mb-3`, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[tw`text-xs font-medium text-center`, { color: '#4CAF50' }]}>
                ← Swipe left on any entry to delete
              </Text>
            </View>
            {logs.map((item) => {
              const itemStatus = getSpO2Status(item.spo2);
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
                    title={`${item.spo2 || 0}% SpO2`}
                    subtitle={itemStatus.status}
                    value={timeValue}
                    iconName="air"
                    iconBgColor={itemStatus.color + '15'}
                    iconColor={itemStatus.color}
                    colors={colors}
                    onPress={() => {
                      setSelectedEntry({
                        ...item,
                        spo2: String(item.spo2 || ''),
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
        style={[tw`absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center`, { backgroundColor: '#4CAF50', shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }]}
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

export default BloodOxygenScreen;