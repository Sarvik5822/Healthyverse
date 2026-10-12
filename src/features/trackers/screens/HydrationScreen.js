/**
 * HydrationScreen - OPTIMIZED with React Query + PAGINATION
 *
 * FIXES APPLIED:
 * 1. ❌ BEFORE: fetchData useCallback + useEffect with [period, fetchTrends] deps → unstable
 * 2. ✅ AFTER: useHydrationScreen(period) hook — React Query handles caching & deduplication
 * 3. ✅ Mutations auto-invalidate cache — no manual fetchData() needed
 * 4. ✅ Quick add uses mutation with auto-invalidation
 * 5. ✅ Tab switch returns cached data instantly (staleTime: 30s for water)
 * 6. ✅ PAGINATION: Logs use useInfiniteQuery — shows 10 at a time with "Load More" button
 */

import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ArcProgress } from '../../../shared/layout/CircularProgress';
import MacroCard from '../../../shared/layout/MacroCard';
import ActivityItem from '../../../shared/layout/ActivityItem';
import TrendSection from '../../dashboard/components/TrendSection';
import AddEntryModal from '../components/AddEntryModal';
import EditEntryModal from '../components/EditEntryModal';
import { TrackerSkeleton } from '../../../shared/feedback/SkeletonLoader';
import SwipeableRow from '../../../shared/layout/SwipeableRow';
import LoadMoreButton from '../../../shared/ui/LoadMoreButton';
import Toast from 'react-native-toast-message';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';
import { useUnitPreferences } from '../../../context/UnitPreferencesContext';
import { formatNumber, formatDate, formatDateTime } from '../../../utils/formatters';
import { convertVolume } from '../../../utils/converters';
import { useHydrationScreen } from '../../../hooks/queries/useTrackerQueries';
import { getErrorMessage } from '../../../utils/errorHandler';

const HydrationScreen = ({ navigation }) => {
  const { colors } = useTheme();

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs');
    }
  };

  const { waterUnit } = useUnitPreferences();
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('weekly');
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // ─── REACT QUERY: All data managed by single hook (WITH PAGINATION) ─────
  const {
    progress,
    logs,
    recommended,
    trendData,
    trendLabels,
    isLoading: loading,
    // Pagination controls
    hasMoreLogs,
    loadMoreLogs,
    isLoadingMore,
    totalLogs,
    refetchAll,
    addHydration: addMutation,
    updateHydration: updateMutation,
    deleteHydration: deleteMutation,
  } = useHydrationScreen(period);

  // Dynamic fields based on user's water unit preference
  const ADD_FIELDS = useMemo(() => [
    { name: 'intake', label: `Water Intake (${waterUnit})`, placeholder: waterUnit === 'oz' ? 'e.g. 16' : 'e.g. 0.5', keyboardType: 'decimal-pad' },
    { name: 'date', label: 'Date', type: 'date', maximumDate: new Date() },
  ], [waterUnit]);

  const EDIT_FIELDS = useMemo(() => ADD_FIELDS.map((f) => ({ ...f, maximumDate: undefined })), [ADD_FIELDS]);

  // Convert liters value to display unit
  const convertToDisplayUnit = (litersValue) => {
    if (!litersValue) return 0;
    if (waterUnit === 'oz') {
      return convertVolume(litersValue, 'liters', 'ounces');
    }
    return litersValue;
  };

  // Convert user input (in display unit) to liters for API
  const convertToLiters = (value) => {
    if (!value) return 0;
    const numVal = parseFloat(value);
    if (isNaN(numVal)) return 0;
    if (waterUnit === 'oz') {
      return convertVolume(numVal, 'ounces', 'liters');
    }
    return numVal;
  };

  // Quick add amounts based on unit
  const quickAddAmounts = useMemo(() => {
    if (waterUnit === 'oz') {
      return [8, 12, 16, 32];
    }
    return [0.25, 0.5, 0.75, 1.0];
  }, [waterUnit]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  };

  const handleAdd = async (form) => {
    setAddLoading(true);
    try {
      const intakeInLiters = convertToLiters(form.intake);
      await addMutation.mutateAsync({
        waterIntake: intakeInLiters,
        waterUnit: 'liters',
        date: form.date || new Date().toISOString(),
        timestamp: new Date().toTimeString().slice(0, 8),
      });
      Toast.show({ type: 'success', text1: 'Water intake logged!' });
      setShowAdd(false);
    } catch (e) {
      const msg = getErrorMessage(e, 'Could not save water intake. Please try again.');
      Toast.show({ type: 'error', text1: 'Failed to log intake', text2: msg });
    } finally {
      setAddLoading(false);
    }
  };

  const handleQuickAdd = async (amount) => {
    try {
      const intakeInLiters = waterUnit === 'oz' ? convertVolume(amount, 'ounces', 'liters') : amount;
      await addMutation.mutateAsync({
        waterIntake: intakeInLiters,
        waterUnit: 'liters',
        date: new Date().toISOString(),
        timestamp: new Date().toTimeString().slice(0, 8),
      });
      Toast.show({ type: 'success', text1: `Added ${amount}${waterUnit} of water` });
    } catch (e) {
      const msg = getErrorMessage(e, 'Could not add water. Please try again.');
      Toast.show({ type: 'error', text1: 'Failed to add water', text2: msg });
    }
  };

  const handleEdit = async (form) => {
    setEditLoading(true);
    try {
      const intakeInLiters = convertToLiters(form.intake);
      await updateMutation.mutateAsync({
        id: selectedEntry._id,
        data: { waterIntake: intakeInLiters, waterUnit: 'liters', date: form.date },
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
        <View style={{ backgroundColor: colors.headerBg || '#F3EAFF', paddingTop: 20, paddingBottom: 16, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
          <View style={tw`flex-row items-center justify-between px-5`}>
            <TouchableOpacity onPress={handleGoBack} style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#FFFFFF' }]}>
              <Icon name="chevron-left" size={24} color="#1A1D3F" />
            </TouchableOpacity>
            <Text style={[tw`text-lg font-bold`, { color: '#1A1D3F' }]}>Hydration</Text>
            <View style={tw`w-10 h-10`} />
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <TrackerSkeleton />
        </ScrollView>
      </View>
    );
  }

  // Convert progress values to display unit
  const displayIntake = convertToDisplayUnit(progress.intake);
  const displayGoal = convertToDisplayUnit(progress.goal);
  const displayRecommended = convertToDisplayUnit(progress.recommended);
  const waterProgress = progress.goal > 0 ? Math.min((progress.intake / progress.goal) * 100, 100) : 0;
  const remainingWater = Math.max(0, displayGoal - displayIntake);

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={{ backgroundColor: colors.headerBg || '#F3EAFF', paddingTop: 20, paddingBottom: 16, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <View style={tw`flex-row items-center justify-between px-5`}>
          <TouchableOpacity onPress={handleGoBack} style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#FFFFFF' }]}>
            <Icon name="chevron-left" size={24} color="#1A1D3F" />
          </TouchableOpacity>
          <Text style={[tw`text-lg font-bold`, { color: '#1A1D3F' }]}>Hydration</Text>
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
        {/* Main Water Card */}
        <View style={[tw`rounded-3xl p-5 mt-5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
          <Text style={[tw`text-sm font-semibold mb-1`, { color: colors.textSecondary }]}>Today's Water Intake</Text>
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-baseline`}>
              <Text style={[tw`text-4xl font-bold`, { color: colors.textPrimary }]}>{formatNumber(displayIntake)}</Text>
              <Text style={[tw`text-lg ml-1`, { color: colors.textMuted }]}>/{formatNumber(displayGoal)} {waterUnit}</Text>
            </View>
            <View style={{ position: 'relative' }}>
              <ArcProgress size={85} strokeWidth={9} progress={waterProgress} color="#4DA6FF" bgColor="#EDEDED" />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="water-drop" size={22} color="#4DA6FF" />
              </View>
            </View>
          </View>
        </View>

        {/* Quick Add Buttons */}
        <View style={[tw`rounded-3xl p-5 mt-4`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
          <Text style={[tw`text-sm font-bold mb-3`, { color: colors.textPrimary }]}>Quick Add</Text>
          <View style={tw`flex-row gap-3`}>
            {quickAddAmounts.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[tw`flex-1 py-3 rounded-xl items-center`, { backgroundColor: '#EBF5FF' }]}
                onPress={() => handleQuickAdd(amount)}
                activeOpacity={0.7}
              >
                <Text style={[tw`text-xs font-bold`, { color: '#4DA6FF' }]}>+{amount}{waterUnit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stat Cards Row */}
        <View style={tw`flex-row mt-4 -mx-1.5`}>
          <MacroCard label="Recommended" value={recommended?.water || `${formatNumber(displayRecommended)}`} unit={` ${waterUnit}`} progress={waterProgress} color="#7C4DFF" bgColor="#EDE7FF" iconName="recommend" colors={colors} />
          <MacroCard label="Progress" value={`${Math.round(waterProgress)}`} unit="%" progress={waterProgress} color="#4DA6FF" bgColor="#EBF5FF" iconName="trending-up" colors={colors} />
          <MacroCard label="Remaining" value={formatNumber(remainingWater)} unit={` ${waterUnit}`} progress={100 - waterProgress} color="#FF8C42" bgColor="#FFF0E6" iconName="emoji-events" colors={colors} />
        </View>

        {/* Recommended Info */}
        {recommended?.why && (
          <View style={[tw`rounded-2xl p-4 mt-4`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }]}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-8 h-8 rounded-lg items-center justify-center mr-3`, { backgroundColor: '#EBF5FF' }]}>
                <Icon name="lightbulb" size={16} color="#4DA6FF" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={[tw`text-xs font-bold mb-1`, { color: colors.textPrimary }]}>Why {recommended.water}?</Text>
                <Text style={[tw`text-xs font-medium`, { color: colors.textSecondary }]}>{recommended.why}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Trend Chart */}
        <View style={tw`mt-5`}>
          <TrendSection
            title="Water Intake"
            type="bar"
            data={trendData.length > 0 ? trendData : [0, 0, 0, 0, 0, 0, 0]}
            labels={trendLabels.length > 0 ? trendLabels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
            period={period}
            onPeriodChange={setPeriod}
            color="#4DA6FF"
          />
        </View>

        {/* Recent Logs — PAGINATED */}
        <Text style={[tw`text-xl font-bold mt-7 mb-4`, { color: colors.textPrimary }]}>Recent Logs</Text>

        {logs.length === 0 ? (
          <View style={[tw`rounded-2xl p-6 items-center`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }]}>
            <Icon name="water-drop" size={40} color={colors.textMuted} />
            <Text style={[tw`text-sm mt-3 font-medium text-center`, { color: colors.textMuted }]}>No logs yet. Tap + to add your first entry.</Text>
          </View>
        ) : (
          <>
            <View style={[tw`rounded-xl px-3 py-2 mb-3`, { backgroundColor: '#EBF5FF' }]}>
              <Text style={[tw`text-xs font-medium text-center`, { color: '#4DA6FF' }]}>
                ← Swipe left on any entry to delete
              </Text>
            </View>
            {logs.map((item) => {
              const logIntake = convertToDisplayUnit(item.waterIntake || item.intake);
              const displayTime = (() => {
                const dateStr = formatDate(item.date);
                if (item.timestamp) {
                  const parts = item.timestamp.split(':');
                  let hours = parseInt(parts[0], 10);
                  const minutes = parts[1] || '00';
                  const ampm = hours >= 12 ? 'PM' : 'AM';
                  hours = hours % 12 || 12;
                  return `${dateStr} ${hours}:${minutes} ${ampm}`;
                }
                if (item.createdAt) {
                  return formatDateTime(item.createdAt);
                }
                return dateStr;
              })();
              return (
                <SwipeableRow key={item._id} onDelete={() => confirmDelete(item)}>
                  <ActivityItem
                    title={`${formatNumber(logIntake)} ${waterUnit}`}
                    value={displayTime}
                    iconName="water-drop"
                    iconBgColor="#EBF5FF"
                    iconColor="#4DA6FF"
                    colors={colors}
                    onPress={() => {
                      const editIntake = convertToDisplayUnit(item.waterIntake || item.intake || 0);
                      setSelectedEntry({
                        ...item,
                        intake: String(editIntake),
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
        style={[tw`absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center`, { backgroundColor: '#4DA6FF', shadowColor: '#4DA6FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }]}
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

export default HydrationScreen;