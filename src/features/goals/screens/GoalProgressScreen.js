/**
 * GoalProgressScreen - OPTIMIZED with React Query + Zustand
 * 
 * FIXES APPLIED:
 * 1. ❌ BEFORE: fetchAllHealthData in useEffect with unstable dependency → re-fetches on every render
 * 2. ✅ AFTER: useAllHealthData() hook — React Query handles caching & deduplication
 * 3. ✅ Shared cache with Dashboard — if Dashboard already fetched, this uses cached data (0 API calls!)
 * 4. ✅ Trend data has separate query key with period — only re-fetches when period changes
 * 5. ✅ Pull-to-refresh invalidates all queries cleanly
 * 6. ✅ ESLint: Removed unused waterCurrent variable
 */

import React, { useState, useMemo } from 'react';
import { View, ScrollView, RefreshControl, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import GoalCard from '../../../shared/layout/GoalCard';
import TrendSection from '../../dashboard/components/TrendSection';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';
import { useUnitPreferences } from '../../../context/UnitPreferencesContext';
import useSteps from '../../../hooks/useSteps';
import { useAllHealthData, useInvalidateHealth } from '../../../hooks/queries/useHealthQueries';
import { useWeightTrend } from '../../../hooks/queries/useTrendQueries';
import useHealthStore from '../../../store/healthStore';
import { convertWeight, convertVolume } from '../../../utils/converters';
import { GoalProgressSkeleton } from '../../../shared/feedback/SkeletonLoader';

const GoalProgressScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { weightUnit, waterUnit, waistUnit } = useUnitPreferences();
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('weekly');

  // ─── REACT QUERY: Health data (shared cache with Dashboard!) ────────────
  // If Dashboard already fetched this data within staleTime (30s),
  // this returns INSTANTLY from cache — ZERO API calls!
  const {
    weightData: healthWeightData,
    waterData: healthWaterData,
    goalsData,
    isLoading,
    refetchAll,
  } = useAllHealthData();

  // ─── REACT QUERY: Trend data (period-dependent) ─────────────────────────
  const { data: trendResult } = useWeightTrend(period);
  const trendData = trendResult?.data || [];
  const trendLabels = trendResult?.labels || [];

  // ─── ZUSTAND: Steps from sensor (real-time) ─────────────────────────────
  const stepsFromStore = useHealthStore((s) => s.stepsData);

  // ─── LOCAL: Steps from StepContext hook ─────────────────────────────────
  const { todaySteps: localSteps, goal: localGoal } = useSteps();

  // ─── INVALIDATION (for pull-to-refresh) ─────────────────────────────────
  const { invalidateAll } = useInvalidateHealth();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchAll(), invalidateAll()]);
    setRefreshing(false);
  };

  // ─── COMPUTED VALUES ────────────────────────────────────────────────────

  const weightCurrent = healthWeightData.weight || 0;
  const weightApiUnit = healthWeightData.weightUnit || 'kg';
  const weightGoal = goalsData.weightGoal || 0;
  const weightBmi = healthWeightData.bmi || 0;

  const displayWeightCurrent = useMemo(() => {
    return weightCurrent > 0 ? convertWeight(weightCurrent, weightApiUnit, weightUnit) : 0;
  }, [weightCurrent, weightApiUnit, weightUnit]);

  const displayWeightGoal = useMemo(() => {
    return weightGoal > 0 ? convertWeight(weightGoal, goalsData.weightUnit || weightApiUnit, weightUnit) : 0;
  }, [weightGoal, goalsData.weightUnit, weightApiUnit, weightUnit]);

  const waterApiUnit = healthWaterData.intakeUnit || 'liters';
  const waterGoalValue = goalsData.waterIntakeGoal || healthWaterData.goalValue || healthWaterData.goal || 3;

  const preferredWaterAPIUnit = waterUnit === 'oz' ? 'ounces' : 'liters';

  const displayWaterCurrent = useMemo(() => {
    const intake = healthWaterData.intake || 0;
    return intake > 0 ? convertVolume(intake, waterApiUnit, preferredWaterAPIUnit) : 0;
  }, [healthWaterData.intake, waterApiUnit, preferredWaterAPIUnit]);

  const displayWaterGoal = useMemo(() => {
    return waterGoalValue > 0
      ? convertVolume(waterGoalValue, goalsData.waterIntakeUnit || waterApiUnit, preferredWaterAPIUnit)
      : (waterUnit === 'oz' ? 101 : 3);
  }, [waterGoalValue, goalsData.waterIntakeUnit, waterApiUnit, preferredWaterAPIUnit, waterUnit]);

  // Weight progress
  let weightProgress = 0;
  if (displayWeightGoal > 0 && displayWeightCurrent > 0) {
    if (displayWeightGoal < displayWeightCurrent) {
      const diff = displayWeightCurrent - displayWeightGoal;
      weightProgress = Math.max(0, Math.min(100 - (diff / displayWeightCurrent) * 100, 100));
    } else {
      weightProgress = Math.min((displayWeightCurrent / displayWeightGoal) * 100, 100);
    }
  }

  // Steps (merge sensor + API)
  const mergedStepsCurrent = Math.max(localSteps || 0, stepsFromStore.steps || 0);
  const mergedStepsGoal = localGoal || goalsData.stepsGoal || stepsFromStore.goal || 10000;
  const stepsProgress = mergedStepsGoal > 0 ? Math.min((mergedStepsCurrent / mergedStepsGoal) * 100, 100) : 0;
  const waterProgress = displayWaterGoal > 0 ? Math.min((displayWaterCurrent / displayWaterGoal) * 100, 100) : 0;

  // BMI
  const getBMIStatus = (bmi) => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#4DA6FF' };
    if (bmi < 25) return { label: 'Normal', color: '#4CAF50' };
    if (bmi < 30) return { label: 'Overweight', color: '#FF8C42' };
    return { label: 'Obese', color: '#FF4444' };
  };
  const bmiStatus = getBMIStatus(weightBmi);

  const getBMIPosition = (bmi) => {
    if (bmi <= 0) return 0;
    if (bmi < 18.5) return (bmi / 18.5) * 25;
    if (bmi < 25) return 25 + ((bmi - 18.5) / (25 - 18.5)) * 25;
    if (bmi < 30) return 50 + ((bmi - 25) / (30 - 25)) * 25;
    return Math.min(75 + ((bmi - 30) / 10) * 25, 100);
  };
  const bmiPosition = getBMIPosition(weightBmi);

  const hasGoals = weightGoal > 0 || mergedStepsGoal > 10000 || waterGoalValue > 3 || goalsData.bodyFatGoal || goalsData.waistCircumferenceGoal;
  const displayWaterUnitLabel = waterUnit === 'oz' ? ' oz' : ' L';

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={{ backgroundColor: colors.headerBg || colors.surfaceElevated, paddingTop: 20, paddingBottom: 14, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <View style={tw`flex-row items-center justify-between px-5 mb-3`}>
          <View>
            <Text style={[tw`text-sm font-medium`, { color: colors.textSecondary }]}>Track Your Progress 🎯</Text>
            <Text style={[tw`text-2xl font-bold mt-1`, { color: colors.textPrimary }]}>Goal Progress</Text>
          </View>
          <View style={tw`flex-row items-center`}>
            <TouchableOpacity style={[tw`w-10 h-10 rounded-full items-center justify-center mr-3`, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate('DailyGoalsSetting')}>
              <Icon name="edit" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[tw`w-10 h-10 rounded-full items-center justify-center overflow-hidden`, { backgroundColor: colors.surfaceElevated }]} onPress={() => navigation.navigate('Profile')}>
              <Icon name="person" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false}><GoalProgressSkeleton /></ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          contentContainerStyle={tw`px-5 pb-28`}
        >
          {/* No Goals Prompt */}
          {!hasGoals && (
            <TouchableOpacity
              style={[tw`rounded-3xl p-6 mt-5 items-center`, { backgroundColor: colors.surface, borderWidth: 2, borderColor: '#EDE7FF', borderStyle: 'dashed' }]}
              onPress={() => navigation.navigate('DailyGoalsSetting')}
              activeOpacity={0.7}
            >
              <View style={[tw`w-16 h-16 rounded-full items-center justify-center mb-3`, { backgroundColor: '#F3EAFF' }]}>
                <Icon name="flag" size={28} color="#7C4DFF" />
              </View>
              <Text style={[tw`text-lg font-bold`, { color: colors.textPrimary }]}>Set Your Goals</Text>
              <Text style={[tw`text-sm mt-1 text-center`, { color: colors.textMuted }]}>Tap here to set weight, water, steps, and body goals to track your progress</Text>
              <View style={[tw`flex-row items-center mt-3 px-4 py-2 rounded-full`, { backgroundColor: '#7C4DFF' }]}>
                <Icon name="add" size={16} color="#FFFFFF" />
                <Text style={[tw`text-sm font-bold ml-1`, { color: '#FFFFFF' }]}>Set Goals</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Weight Goal Card */}
          <View style={[tw`rounded-3xl p-5 mt-5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <View>
                <Text style={[tw`text-sm font-semibold`, { color: colors.textSecondary }]}>Weight Goal</Text>
                <View style={tw`flex-row items-baseline mt-1`}>
                  <Text style={[tw`text-3xl font-bold`, { color: colors.textPrimary }]}>{displayWeightCurrent || '--'}</Text>
                  <Text style={[tw`text-base ml-1`, { color: colors.textMuted }]}>{weightUnit}</Text>
                </View>
              </View>
              <View style={tw`items-end`}>
                <Text style={[tw`text-xs font-medium`, { color: colors.textMuted }]}>Target</Text>
                <Text style={[tw`text-xl font-bold`, { color: colors.primary }]}>{displayWeightGoal || '--'} {weightUnit}</Text>
              </View>
            </View>
            <View style={[tw`h-2 rounded-full`, { backgroundColor: '#EDE7FF' }]}>
              <View style={[tw`h-2 rounded-full`, { backgroundColor: '#7C4DFF', width: `${Math.min(weightProgress, 100)}%` }]} />
            </View>
            <Text style={[tw`text-xs font-medium mt-2 text-center`, { color: colors.textMuted }]}>
              {weightGoal > 0 ? `${Math.round(weightProgress)}% progress toward your goal` : 'Set a weight goal to track progress'}
            </Text>
          </View>

          {/* BMI Section */}
          <View style={[tw`rounded-3xl p-5 mt-4`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>BMI</Text>
              <View style={[tw`px-3 py-1 rounded-full`, { backgroundColor: bmiStatus.color + '15' }]}>
                <Text style={[tw`text-xs font-bold`, { color: bmiStatus.color }]}>{weightBmi ? weightBmi.toFixed(1) : '--'} • {bmiStatus.label}</Text>
              </View>
            </View>
            <View style={tw`h-2.5 rounded-full overflow-hidden flex-row`}>
              <View style={[tw`flex-1`, { backgroundColor: '#4DA6FF' }]} />
              <View style={[tw`flex-1`, { backgroundColor: '#4CAF50' }]} />
              <View style={[tw`flex-1`, { backgroundColor: '#FF8C42' }]} />
              <View style={[tw`flex-1`, { backgroundColor: '#FF4444' }]} />
            </View>
            {weightBmi > 0 && (
              <View style={{ marginLeft: `${bmiPosition}%`, marginTop: 4 }}>
                <Icon name="arrow-drop-up" size={20} color={bmiStatus.color} style={{ marginLeft: -10 }} />
              </View>
            )}
            <View style={tw`flex-row justify-between mt-2`}>
              {[
                { label: 'Underweight', color: '#4DA6FF' },
                { label: 'Normal', color: '#4CAF50' },
                { label: 'Overweight', color: '#FF8C42' },
                { label: 'Obese', color: '#FF4444' },
              ].map((item) => (
                <View key={item.label} style={tw`flex-row items-center`}>
                  <View style={[tw`w-2.5 h-2.5 rounded-full mr-1.5`, { backgroundColor: item.color }]} />
                  <Text style={[tw`text-[10px] font-medium`, { color: colors.textMuted }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Weight Trend */}
          <View style={tw`mt-5`}>
            <TrendSection
              title="Weight Trend"
              data={trendData.length > 0 ? trendData : [0, 0, 0, 0, 0, 0, 0]}
              labels={trendLabels.length > 0 ? trendLabels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
              period={period}
              onPeriodChange={setPeriod}
              color={colors.primary}
            />
          </View>

          {/* Other Goals */}
          <View style={tw`flex-row items-center justify-between mt-7 mb-4`}>
            <Text style={[tw`text-xl font-bold`, { color: colors.textPrimary }]}>Other Goals</Text>
            <TouchableOpacity style={[tw`flex-row items-center px-3 py-1.5 rounded-full`, { backgroundColor: '#F3EAFF' }]} onPress={() => navigation.navigate('DailyGoalsSetting')}>
              <Icon name="edit" size={14} color="#7C4DFF" />
              <Text style={[tw`text-xs font-bold ml-1`, { color: '#7C4DFF' }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          <GoalCard icon="directions-walk" iconColor="#4CAF50" bgColor="#E8F5E9" label="Daily Steps" current={mergedStepsCurrent.toLocaleString()} goal={mergedStepsGoal.toLocaleString()} unit="" progress={stepsProgress} colors={colors} />
          <GoalCard icon="water-drop" iconColor="#2196F3" bgColor="#E3F2FD" label="Daily Water" current={displayWaterCurrent ? displayWaterCurrent.toFixed(1) : '0'} goal={displayWaterGoal ? displayWaterGoal.toFixed(1) : '3.0'} unit={displayWaterUnitLabel} progress={waterProgress} colors={colors} />

          {goalsData.bodyFatGoal > 0 && (
            <GoalCard icon="accessibility-new" iconColor="#FF6B6B" bgColor="#FFEBEE" label="Body Fat" current="--" goal={String(goalsData.bodyFatGoal)} unit="%" progress={0} colors={colors} />
          )}
          {goalsData.waistCircumferenceGoal > 0 && (
            <GoalCard icon="straighten" iconColor="#9C27B0" bgColor="#F3E5F5" label="Waist Circumference" current="--" goal={String(goalsData.waistCircumferenceGoal)} unit={` ${goalsData.waistUnit || waistUnit}`} progress={0} colors={colors} />
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default GoalProgressScreen;