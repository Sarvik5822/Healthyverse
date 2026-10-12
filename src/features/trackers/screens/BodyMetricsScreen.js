/**
 * BodyMetricsScreen - OPTIMIZED with React Query + PAGINATION
 *
 * FIXES APPLIED:
 * 1. ❌ BEFORE: fetchData useCallback + useEffect with [period, fetchTrends] deps → unstable
 * 2. ✅ AFTER: useBodyMetricsScreen(period) hook — React Query handles caching & deduplication
 * 3. ✅ Mutations auto-invalidate cache — no manual fetchData() needed
 * 4. ✅ Tab switch returns cached data instantly (staleTime: 60s)
 * 5. ✅ Unit conversion logic preserved (kg/lbs, cm/ft, cm/inches)
 * 6. ✅ Gender-based fields preserved (hips field only for Female users)
 * 7. ✅ PAGINATION: Logs use useInfiniteQuery — shows 10 at a time with "Load More" button
 */

import React, { useState, useMemo } from 'react';
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
import { useUserContext } from '../../../context/UserContext';
import { useUnitPreferences } from '../../../context/UnitPreferencesContext';
import { formatNumber } from '../../../utils/formatters';
import { convertWeight, convertHeight } from '../../../utils/converters';
import { useBodyMetricsScreen } from '../../../hooks/queries/useTrackerQueries';
import { getErrorMessage } from '../../../utils/errorHandler';

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

const getBMIStatus = (bmi) => {
  if (!bmi || bmi === 0) return { status: 'No Data', color: '#9E9E9E' };
  if (bmi < 18.5) return { status: 'Underweight', color: '#4DA6FF' };
  if (bmi < 25) return { status: 'Normal', color: '#4CAF50' };
  if (bmi < 30) return { status: 'Overweight', color: '#FF9800' };
  return { status: 'Obese', color: '#F44336' };
};

const BodyMetricsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { userProfile } = useUserContext();
  const { weightUnit, heightUnit, waistUnit } = useUnitPreferences();

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
    addBodyMetrics: addMutation,
    updateBodyMetrics: updateMutation,
    deleteBodyMetrics: deleteMutation,
  } = useBodyMetricsScreen(period);

  // ==================== GENDER-BASED FIELDS ====================
  const isFemale = userProfile?.gender?.toLowerCase() === 'female';
  const weightLabel = weightUnit === 'lbs' ? 'lbs' : 'kg';
  const heightLabel = heightUnit === 'ft' ? 'ft' : 'cm';
  const waistLabel = waistUnit === 'inches' ? 'inches' : 'cm';

  const ADD_FIELDS = useMemo(() => {
    const baseFields = [
      { name: 'weight', label: `Weight (${weightLabel})`, placeholder: weightUnit === 'lbs' ? 'e.g. 160' : 'e.g. 72.5', keyboardType: 'decimal-pad' },
      { name: 'height', label: `Height (${heightLabel})`, placeholder: heightUnit === 'ft' ? 'e.g. 5.74' : 'e.g. 175', keyboardType: 'decimal-pad' },
      { name: 'waist', label: `Waist (${waistLabel})`, placeholder: waistUnit === 'inches' ? 'e.g. 31.5' : 'e.g. 80', keyboardType: 'decimal-pad' },
      { name: 'neck', label: `Neck (${waistLabel})`, placeholder: waistUnit === 'inches' ? 'e.g. 15' : 'e.g. 38', keyboardType: 'decimal-pad' },
    ];
    if (isFemale) {
      baseFields.push({ name: 'hips', label: `Hips (${waistLabel})`, placeholder: waistUnit === 'inches' ? 'e.g. 37.4' : 'e.g. 95', keyboardType: 'decimal-pad' });
    }
    baseFields.push({ name: 'date', label: 'Date', type: 'date', maximumDate: new Date() });
    return baseFields;
  }, [isFemale, weightUnit, heightUnit, waistUnit, weightLabel, heightLabel, waistLabel]);

  const EDIT_FIELDS = useMemo(() => ADD_FIELDS.map((f) => ({ ...f, maximumDate: undefined })), [ADD_FIELDS]);

  // Unit conversion helpers
  const convertToMetric = (value, field) => {
    if (!value) return undefined;
    const numVal = parseFloat(value);
    if (isNaN(numVal)) return undefined;
    switch (field) {
      case 'weight': return weightUnit === 'lbs' ? convertWeight(numVal, 'lbs', 'kg') : numVal;
      case 'height': return heightUnit === 'ft' ? convertHeight(numVal, 'ft', 'cm') : numVal;
      case 'waist': case 'neck': case 'hips': return waistUnit === 'inches' ? convertHeight(numVal, 'in', 'cm') : numVal;
      default: return numVal;
    }
  };

  const convertFromMetric = (value, field) => {
    if (!value || value === 0) return 0;
    switch (field) {
      case 'weight': return weightUnit === 'lbs' ? convertWeight(value, 'kg', 'lbs') : value;
      case 'height': return heightUnit === 'ft' ? convertHeight(value, 'cm', 'ft') : value;
      case 'waist': return waistUnit === 'inches' ? convertHeight(value, 'cm', 'in') : value;
      default: return value;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  };

  const handleAdd = async (form) => {
    setAddLoading(true);
    try {
      const payload = {
        weight: convertToMetric(form.weight, 'weight'),
        weightUnit: 'kg',
        height: convertToMetric(form.height, 'height'),
        heightUnit: 'cm',
        waist: convertToMetric(form.waist, 'waist'),
        waistUnit: 'cm',
        neck: convertToMetric(form.neck, 'neck'),
        neckUnit: 'cm',
        date: form.date || new Date().toISOString(),
      };
      if (isFemale) {
        payload.hips = convertToMetric(form.hips, 'hips');
        payload.hipsUnit = 'cm';
      }
      await addMutation.mutateAsync(payload);
      Toast.show({ type: 'success', text1: 'Body metrics logged successfully!' });
      setShowAdd(false);
    } catch (e) {
      const msg = getErrorMessage(e, 'Could not save body metrics. Please try again.');
      Toast.show({ type: 'error', text1: 'Failed to log metrics', text2: msg });
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async (form) => {
    setEditLoading(true);
    try {
      const payload = {
        weight: convertToMetric(form.weight, 'weight'),
        weightUnit: 'kg',
        height: convertToMetric(form.height, 'height'),
        heightUnit: 'cm',
        waist: convertToMetric(form.waist, 'waist'),
        waistUnit: 'cm',
        neck: convertToMetric(form.neck, 'neck'),
        neckUnit: 'cm',
        date: form.date,
      };
      if (isFemale) {
        payload.hips = convertToMetric(form.hips, 'hips');
        payload.hipsUnit = 'cm';
      }
      await updateMutation.mutateAsync({ id: selectedEntry._id, data: payload });
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
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry? This action cannot be undone.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) }]);
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
            <Text style={[tw`text-lg font-bold`, { color: '#1A1D3F' }]}>Body Metrics</Text>
            <View style={tw`w-10 h-10`} />
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}><TrackerSkeleton /></ScrollView>
      </View>
    );
  }

  const bmiStatus = getBMIStatus(currentData.bmi);
  const bmiProgress = currentData.bmi > 0 ? Math.min((currentData.bmi / 40) * 100, 100) : 0;
  const bodyFatProgress = currentData.bodyFat > 0 ? Math.min((currentData.bodyFat / 50) * 100, 100) : 0;
  const displayWeight = convertFromMetric(currentData.weight, 'weight');
  const displayHeight = convertFromMetric(currentData.height, 'height');
  // displayWaist available for future use: convertFromMetric(currentData.waistCircumference, 'waist')

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      <View style={{ backgroundColor: '#F3EAFF', paddingTop: 20, paddingBottom: 16, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <View style={tw`flex-row items-center justify-between px-5`}>
          <TouchableOpacity onPress={handleGoBack} style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#FFFFFF' }]}>
            <Icon name="chevron-left" size={24} color="#1A1D3F" />
          </TouchableOpacity>
          <Text style={[tw`text-lg font-bold`, { color: '#1A1D3F' }]}>Body Metrics</Text>
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
        {/* Main Body Metrics Card */}
        <View style={[tw`rounded-3xl p-5 mt-5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
          <Text style={[tw`text-sm font-semibold mb-1`, { color: colors.textSecondary }]}>Current Body Metrics</Text>
          <View style={tw`flex-row items-center justify-between`}>
            <View>
              <View style={tw`flex-row items-baseline`}>
                <Text style={[tw`text-4xl font-bold`, { color: colors.textPrimary }]}>{formatNumber(displayWeight)}</Text>
                <Text style={[tw`text-lg ml-1`, { color: colors.textMuted }]}>{weightUnit}</Text>
              </View>
              <View style={[tw`flex-row items-center mt-2 px-3 py-1.5 rounded-full`, { backgroundColor: bmiStatus.color + '15' }]}>
                <View style={[tw`w-2 h-2 rounded-full mr-2`, { backgroundColor: bmiStatus.color }]} />
                <Text style={[tw`text-xs font-bold`, { color: bmiStatus.color }]}>BMI: {currentData.bmi || '--'} ({bmiStatus.status})</Text>
              </View>
            </View>
            <SmallCircularProgress size={70} strokeWidth={7} progress={bmiProgress} color={bmiStatus.color} bgColor={bmiStatus.color + '20'}>
              <Icon name="monitor-weight" size={22} color={bmiStatus.color} />
            </SmallCircularProgress>
          </View>
        </View>

        {/* Stat Cards */}
        <View style={tw`flex-row mt-4 -mx-1.5`}>
          <MacroCard label="BMI" value={currentData.bmi ? formatNumber(currentData.bmi) : '--'} unit="" progress={bmiProgress} color={bmiStatus.color} bgColor={bmiStatus.color + '15'} iconName="analytics" colors={colors} />
          <MacroCard label="Body Fat" value={currentData.bodyFat ? `${formatNumber(currentData.bodyFat)}` : '--'} unit="%" progress={bodyFatProgress} color="#FF8C42" bgColor="#FFF0E6" iconName="pie-chart" colors={colors} />
          <MacroCard label="Height" value={displayHeight ? `${formatNumber(displayHeight)}` : '--'} unit={` ${heightLabel}`} progress={50} color="#2196F3" bgColor="#E3F2FD" iconName="height" colors={colors} />
        </View>

        {/* BMI Scale */}
        <View style={[tw`rounded-3xl p-5 mt-5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
          <Text style={[tw`text-base font-bold mb-3`, { color: colors.textPrimary }]}>BMI Scale</Text>
          {[
            { label: 'Underweight', range: '< 18.5', color: '#4DA6FF', active: currentData.bmi > 0 && currentData.bmi < 18.5 },
            { label: 'Normal', range: '18.5 - 24.9', color: '#4CAF50', active: currentData.bmi >= 18.5 && currentData.bmi < 25 },
            { label: 'Overweight', range: '25 - 29.9', color: '#FF9800', active: currentData.bmi >= 25 && currentData.bmi < 30 },
            { label: 'Obese', range: '≥ 30', color: '#F44336', active: currentData.bmi >= 30 },
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
            title="Weight Trend"
            data={trendData.length > 0 ? trendData : [0, 0, 0, 0, 0, 0, 0]}
            labels={trendLabels.length > 0 ? trendLabels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
            period={period}
            onPeriodChange={setPeriod}
            color="#7C4DFF"
          />
        </View>

        {/* Recent Logs */}
        <Text style={[tw`text-xl font-bold mt-7 mb-4`, { color: colors.textPrimary }]}>Recent Logs</Text>
        {logs.length === 0 ? (
          <View style={[tw`rounded-2xl p-6 items-center`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }]}>
            <Icon name="monitor-weight" size={40} color={colors.textMuted} />
            <Text style={[tw`text-sm mt-3 font-medium text-center`, { color: colors.textMuted }]}>No logs yet. Tap + to add your first entry.</Text>
          </View>
        ) : (
          <>
            <View style={[tw`rounded-xl px-3 py-2 mb-3`, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[tw`text-xs font-medium text-center`, { color: '#FF8C42' }]}>← Swipe left on any entry to delete</Text>
            </View>
            {logs.map((item) => {
              const itemBMI = getBMIStatus(item.bmi);
              const logWeight = convertFromMetric(item.weight || 0, 'weight');
              const logHeight = convertFromMetric(item.height || 0, 'height');
              const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
              return (
                <SwipeableRow key={item._id} onDelete={() => confirmDelete(item)}>
                  <ActivityItem
                    title={`${formatNumber(logWeight)} ${weightLabel}`}
                    subtitle={item.bmi ? `BMI ${formatNumber(item.bmi)}` : null}
                    value={`${item.height ? `${formatNumber(logHeight)} ${heightLabel} • ` : ''}${dateStr}`}
                    iconName="monitor-weight"
                    iconBgColor={itemBMI.color + '15'}
                    iconColor={itemBMI.color}
                    colors={colors}
                    onPress={() => {
                      setSelectedEntry({
                        ...item,
                        weight: String(convertFromMetric(item.weight || 0, 'weight')),
                        height: String(convertFromMetric(item.height || 0, 'height')),
                        waist: item.waist ? String(convertFromMetric(item.waist, 'waist')) : '',
                        neck: item.neck ? String(convertFromMetric(item.neck, 'waist')) : '',
                        hips: item.hips ? String(convertFromMetric(item.hips, 'waist')) : '',
                      });
                      setShowEdit(true);
                    }}
                    onDelete={() => confirmDelete(item)}
                  />
                </SwipeableRow>
              );
            })}

            {/* Pagination: Load More */}
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
        style={[tw`absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center`, { backgroundColor: '#7C4DFF', shadowColor: '#7C4DFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }]}
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

export default BodyMetricsScreen;