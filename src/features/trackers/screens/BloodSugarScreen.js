/**
 * BloodSugarScreen - OPTIMIZED with React Query + PAGINATION
 *
 * FIXES APPLIED:
 * 1. ❌ BEFORE: fetchData useCallback + useEffect with [period, fetchTrends] deps → unstable
 * 2. ✅ AFTER: useBloodSugarScreen(period) hook — React Query handles caching & deduplication
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
import { useBloodSugarScreen } from '../../../hooks/queries/useTrackerQueries';
import { getErrorMessage } from '../../../utils/errorHandler';

const ADD_FIELDS = [
  { name: 'level', label: 'Blood Sugar (mg/dL)', placeholder: 'e.g. 95', keyboardType: 'numeric' },
  { name: 'unit', label: 'Unit', type: 'picker', options: ['mg/dL', 'mmol/L'] },
  { name: 'type', label: 'Type', type: 'picker', options: ['Fasting', 'Post-Meal', 'Random'] },
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

const getBloodSugarStatus = (level, type) => {
  if (!level || level === 0) return { status: 'No Data', color: '#9E9E9E' };
  if (type === 'Fasting') {
    if (level >= 70 && level <= 99) return { status: 'Normal', color: '#4CAF50' };
    if (level >= 100 && level <= 125) return { status: 'Borderline', color: '#FF9800' };
    if (level < 70) return { status: 'Low', color: '#F44336' };
    return { status: 'High', color: '#F44336' };
  } else if (type === 'Post-Meal') {
    if (level < 140) return { status: 'Normal', color: '#4CAF50' };
    if (level >= 140 && level <= 199) return { status: 'Borderline', color: '#FF9800' };
    return { status: 'High', color: '#F44336' };
  }
  // Random
  if (level < 140) return { status: 'Normal', color: '#4CAF50' };
  if (level >= 140 && level <= 199) return { status: 'Borderline', color: '#FF9800' };
  return { status: 'High', color: '#F44336' };
};

const BloodSugarScreen = ({ navigation }) => {
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
    addBloodSugar: addMutation,
    updateBloodSugar: updateMutation,
    deleteBloodSugar: deleteMutation,
  } = useBloodSugarScreen(period);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  };

  const handleAdd = async (form) => {
    setAddLoading(true);
    try {
      await addMutation.mutateAsync({
        bloodSugar: parseInt(form.level, 10),
        type: form.type || 'Fasting',
        date: form.date || new Date().toISOString(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      });
      Toast.show({ type: 'success', text1: 'Blood sugar logged successfully!' });
      setShowAdd(false);
    } catch (e) {
      const msg = getErrorMessage(e, 'Could not save blood sugar. Please try again.');
      Toast.show({ type: 'error', text1: 'Failed to log blood sugar', text2: msg });
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
          bloodSugar: parseInt(form.level, 10),
          type: form.type || selectedEntry.type,
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
            <Text style={[tw`text-lg font-bold`, { color: '#1A1D3F' }]}>Blood Sugar</Text>
            <View style={tw`w-10 h-10`} />
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <TrackerSkeleton />
        </ScrollView>
      </View>
    );
  }

  const bsStatus = getBloodSugarStatus(currentData.glucose, currentData.mealContext || 'Fasting');
  const bsProgress = currentData.glucose > 0 ? Math.min((currentData.glucose / 200) * 100, 100) : 0;

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={{ backgroundColor: '#F3EAFF', paddingTop: 20, paddingBottom: 16, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <View style={tw`flex-row items-center justify-between px-5`}>
          <TouchableOpacity onPress={handleGoBack} style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#FFFFFF' }]}>
            <Icon name="chevron-left" size={24} color="#1A1D3F" />
          </TouchableOpacity>
          <Text style={[tw`text-lg font-bold`, { color: '#1A1D3F' }]}>Blood Sugar</Text>
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
        {/* Main Blood Sugar Card */}
        <View style={[tw`rounded-3xl p-5 mt-5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
          <Text style={[tw`text-sm font-semibold mb-1`, { color: colors.textSecondary }]}>Latest Blood Sugar</Text>
          <View style={tw`flex-row items-center justify-between`}>
            <View>
              <View style={tw`flex-row items-baseline`}>
                <Text style={[tw`text-4xl font-bold`, { color: colors.textPrimary }]}>{currentData.glucose || '--'}</Text>
                <Text style={[tw`text-lg ml-1`, { color: colors.textMuted }]}>mg/dL</Text>
              </View>
              <View style={tw`flex-row items-center mt-2`}>
                <View style={[tw`px-3 py-1.5 rounded-full mr-2`, { backgroundColor: bsStatus.color + '15' }]}>
                  <Text style={[tw`text-xs font-bold`, { color: bsStatus.color }]}>{bsStatus.status}</Text>
                </View>
                <View style={[tw`px-3 py-1.5 rounded-full`, { backgroundColor: '#EDE7FF' }]}>
                  <Text style={[tw`text-xs font-bold`, { color: '#7C4DFF' }]}>{currentData.mealContext || 'Fasting'}</Text>
                </View>
              </View>
            </View>
            <SmallCircularProgress size={70} strokeWidth={7} progress={bsProgress} color={bsStatus.color} bgColor={bsStatus.color + '20'}>
              <Icon name="bloodtype" size={22} color={bsStatus.color} />
            </SmallCircularProgress>
          </View>
          {currentData.condition && (
            <View style={[tw`mt-3 px-3 py-2 rounded-xl`, { backgroundColor: bsStatus.color + '10' }]}>
              <Text style={[tw`text-xs font-medium text-center`, { color: bsStatus.color }]}>
                {currentData.condition}
              </Text>
            </View>
          )}
        </View>

        {/* Stat Cards Row */}
        <View style={tw`flex-row mt-4 -mx-1.5`}>
          <MacroCard label="Fasting" value={currentData.range || '70-99'} unit="" progress={50} color="#4CAF50" bgColor="#E8F5E9" iconName="restaurant" colors={colors} />
          <MacroCard label="Post-Meal" value="<140" unit="" progress={50} color="#FF8C42" bgColor="#FFF0E6" iconName="lunch-dining" colors={colors} />
          <MacroCard label="Random" value="70-140" unit="" progress={50} color="#7C4DFF" bgColor="#EDE7FF" iconName="shuffle" colors={colors} />
        </View>

        {/* Recommended Info Card */}
        <View style={[tw`rounded-2xl p-4 mt-4`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }]}>
          <View style={tw`flex-row items-center`}>
            <View style={[tw`w-8 h-8 rounded-lg items-center justify-center mr-3`, { backgroundColor: '#FFF0E6' }]}>
              <Icon name="lightbulb" size={16} color="#FF8C42" />
            </View>
            <View style={tw`flex-1`}>
              <Text style={[tw`text-xs font-bold mb-1`, { color: colors.textPrimary }]}>Recommended Ranges (based on your age & gender)</Text>
              <Text style={[tw`text-xs font-medium`, { color: colors.textSecondary }]}>Fasting: 70-99 • Post-Meal: {'<'}140 • Random: 70-140 mg/dL</Text>
            </View>
          </View>
        </View>

        {/* Blood Sugar Ranges */}
        <View style={[tw`rounded-3xl p-5 mt-5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
          <Text style={[tw`text-base font-bold mb-3`, { color: colors.textPrimary }]}>Blood Sugar Ranges (Fasting)</Text>
          {[
            { label: 'Low', range: '< 70 mg/dL', color: '#4DA6FF', active: (currentData.mealContext || 'Fasting') === 'Fasting' && currentData.glucose > 0 && currentData.glucose < 70 },
            { label: 'Normal', range: '70-99 mg/dL', color: '#4CAF50', active: (currentData.mealContext || 'Fasting') === 'Fasting' && currentData.glucose >= 70 && currentData.glucose <= 99 },
            { label: 'Borderline', range: '100-125 mg/dL', color: '#FF9800', active: (currentData.mealContext || 'Fasting') === 'Fasting' && currentData.glucose >= 100 && currentData.glucose <= 125 },
            { label: 'High', range: '> 125 mg/dL', color: '#F44336', active: (currentData.mealContext || 'Fasting') === 'Fasting' && currentData.glucose > 125 },
          ].map((item) => (
            <View key={item.label} style={[tw`flex-row items-center mb-2 px-3 py-2.5 rounded-xl`, item.active ? { backgroundColor: item.color + '10' } : {}]}>
              <View style={[tw`w-3 h-3 rounded-full mr-3`, { backgroundColor: item.color }]} />
              <Text style={[tw`text-sm font-semibold flex-1`, { color: item.active ? item.color : colors.textPrimary }]}>{item.label}</Text>
              <Text style={[tw`text-xs`, { color: colors.textMuted }]}>{item.range}</Text>
              {item.active && <Icon name="arrow-left" size={14} color={item.color} style={tw`ml-2`} />}
            </View>
          ))}
        </View>

        {/* Trend Chart */}
        <View style={tw`mt-5`}>
          <TrendSection
            title="Blood Sugar Trend"
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
            <Icon name="bloodtype" size={40} color={colors.textMuted} />
            <Text style={[tw`text-sm mt-3 font-medium text-center`, { color: colors.textMuted }]}>No logs yet. Tap + to add your first entry.</Text>
          </View>
        ) : (
          <>
            <View style={[tw`rounded-xl px-3 py-2 mb-3`, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[tw`text-xs font-medium text-center`, { color: '#FF8C42' }]}>
                ← Swipe left on any entry to delete
              </Text>
            </View>
            {logs.map((item) => {
              const levelVal = item.glucose || 0;
              const typeVal = item.mealContext || 'Fasting';
              const itemStatus = getBloodSugarStatus(levelVal, typeVal);
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
                    title={`${levelVal} mg/dL`}
                    subtitle={`${typeVal} • ${itemStatus.status}`}
                    value={timeValue}
                    iconName="bloodtype"
                    iconBgColor={itemStatus.color + '15'}
                    iconColor={itemStatus.color}
                    colors={colors}
                    onPress={() => {
                      const rawType = item.mealContext || 'fasting';
                      let normalizedType = 'Fasting';
                      if (rawType.toLowerCase() === 'postmeal' || rawType === 'Post-Meal') normalizedType = 'Post-Meal';
                      else if (rawType.toLowerCase() === 'premeal' || rawType === 'Pre-Meal') normalizedType = 'Random';
                      else if (rawType.toLowerCase() === 'random') normalizedType = 'Random';
                      else if (rawType.toLowerCase() === 'fasting') normalizedType = 'Fasting';
                      else normalizedType = rawType;

                      setSelectedEntry({
                        ...item,
                        level: String(item.glucose || ''),
                        type: normalizedType,
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

export default BloodSugarScreen;