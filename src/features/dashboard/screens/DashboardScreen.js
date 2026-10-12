/**
 * DashboardScreen - OPTIMIZED with Combined Dashboard API + React Query + Zustand
 *
 * KEY CHANGE: Now uses useCombinedDashboard() hook which calls
 * GET /api/dashboard/combined — a SINGLE endpoint that returns ALL data.
 *
 * BEFORE: 5-7 separate API calls (getWeightAndBMIStats, getWaterIntakeStats,
 *         getHeartRateRanges, getBloodPressureRanges, getGoals)
 * AFTER:  1 combined API call → all data in ~200ms
 *
 * Also shares cache with GoalProgressScreen via Zustand store sync.
 */

import React, { useState, useMemo, memo } from 'react';
import { View, ScrollView, RefreshControl, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';
import { useUserContext } from '../../../context/UserContext';
import { useUnitPreferences } from '../../../context/UnitPreferencesContext';
import useSteps from '../../../hooks/useSteps';
import { useCombinedDashboard } from '../../../hooks/queries/useCombinedDashboard';
import useHealthStore from '../../../store/healthStore';
import { convertWeight, convertVolume } from '../../../utils/converters';
import { DashboardSkeleton } from '../../../shared/feedback/SkeletonLoader';
import { ArcProgress } from '../../../shared/layout/CircularProgress';
import MacroCard from '../../../shared/layout/MacroCard';
import ActivityItem from '../../../shared/layout/ActivityItem';
import FeatureErrorBoundary from '../../../shared/feedback/FeatureErrorBoundary';
import CachedAvatar from '../../../shared/media/CachedAvatar';
import dayjs from 'dayjs';

// ─── Memoized Sub-Components (moved OUTSIDE DashboardScreen) ────────────────

const WeekCalendar = memo(({ colors }) => {
  const today = dayjs();
  const startOfWeek = today.startOf('week');
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day')), [startOfWeek]);

  return (
    <View style={tw`flex-row justify-between mt-4`}>
      {days.map((day, index) => {
        const isToday = day.isSame(today, 'day');
        return (
          <View key={index} style={tw`items-center`}>
            <Text style={[tw`text-xs font-medium`, { color: colors.textMuted }]}>
              {day.format('dd')}
            </Text>
            <View
              style={[
                tw`w-9 h-9 rounded-full items-center justify-center mt-1.5`,
                isToday && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  tw`text-sm font-bold`,
                  { color: isToday ? '#FFFFFF' : colors.textPrimary },
                ]}
              >
                {day.format('D')}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
});

const StepsCard = memo(({ mergedSteps, mergedGoal, stepsProgress, colors }) => (
  <View
    style={[
      tw`rounded-3xl p-5 mt-5`,
      {
        backgroundColor: colors.surface,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 3,
      },
    ]}
  >
    <Text style={[tw`text-sm font-semibold mb-1`, { color: colors.textSecondary }]}>
      Today's Goal
    </Text>
    <View style={tw`flex-row items-center justify-between`}>
      <View style={tw`flex-row items-baseline`}>
        <Text style={[tw`text-4xl font-bold`, { color: colors.textPrimary }]}>
          {mergedSteps.toLocaleString()}
        </Text>
        <Text style={[tw`text-lg ml-1`, { color: colors.textMuted }]}>
          /{mergedGoal.toLocaleString()}
        </Text>
      </View>
      <View style={{ position: 'relative' }}>
        <ArcProgress
          size={100}
          strokeWidth={12}
          progress={stepsProgress}
          color="#7C4DFF"
          bgColor="#EDEDED"
        />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="directions-walk" size={24} color="#7C4DFF" />
          <Text style={[tw`text-[10px] font-bold mt-0.5`, { color: colors.textMuted }]}>steps</Text>
        </View>
      </View>
    </View>
  </View>
));

const MacroCardsRow = memo(({ displayWeight, weightUnit, weightProgress, displayWaterIntake, waterUnit, waterProgress, heartRateData, hrProgress, colors }) => (
  <View style={tw`flex-row mt-4 -mx-1.5`}>
    <MacroCard
      label="Weight"
      value={displayWeight ? `${displayWeight}` : '--'}
      unit={displayWeight ? ` ${weightUnit}` : ''}
      progress={weightProgress}
      color="#FF8C42"
      bgColor="#FFE4CC"
      iconName="scale"
      colors={colors}
    />
    <MacroCard
      label="Water Intake"
      value={displayWaterIntake ? `${displayWaterIntake.toFixed(1)}` : '--'}
      unit={displayWaterIntake ? ` ${waterUnit}` : ''}
      progress={waterProgress}
      color="#2196F3"
      bgColor="#E3F2FD"
      iconName="water-drop"
      colors={colors}
    />
    <MacroCard
      label="Heart Rate"
      value={heartRateData.bpm ? `${heartRateData.bpm}` : '--'}
      unit=" bpm"
      progress={hrProgress}
      color="#FF6B6B"
      bgColor="#FFEBEE"
      iconName="favorite"
      colors={colors}
    />
  </View>
));

const HealthSection = memo(({ bpData, weightData, displayWaterIntake, displayWaterGoal, waterUnit, colors }) => (
  <>
    <Text style={[tw`text-xl font-bold mt-7 mb-4`, { color: colors.textPrimary }]}>
      Today's Health
    </Text>

    <ActivityItem
      title="Blood Pressure"
      value={bpData.systolic ? `${bpData.systolic}/${bpData.diastolic} mmHg • ${bpData.status || 'Normal'}` : 'No data yet'}
      iconName="speed"
      iconBgColor="#EDE7FF"
      iconColor="#7C4DFF"
      colors={colors}
    />
    <ActivityItem
      title="BMI"
      value={weightData.bmi ? `${weightData.bmi.toFixed(1)} • ${weightData.bmi < 18.5 ? 'Underweight' : weightData.bmi < 25 ? 'Normal' : weightData.bmi < 30 ? 'Overweight' : 'Obese'}` : 'No data yet'}
      iconName="analytics"
      iconBgColor="#FFF3E0"
      iconColor="#FF8C42"
      colors={colors}
    />
    <ActivityItem
      title="Water Goal"
      value={`${displayWaterIntake.toFixed(1)} / ${displayWaterGoal.toFixed(1)} ${waterUnit}`}
      iconName="water-drop"
      iconBgColor="#E3F2FD"
      iconColor="#2196F3"
      colors={colors}
    />
  </>
));

// ─── Main Dashboard Component ───────────────────────────────────────────────

const DashboardScreen = () => {
  const { colors } = useTheme();
  const { userProfile } = useUserContext();
  const { weightUnit, waterUnit } = useUnitPreferences();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const { todaySteps: localSteps, goal: localGoal } = useSteps();

  // ─── COMBINED DASHBOARD API: Single endpoint for all data ───────────────
  // Replaces useAllHealthData() which made 5 separate API calls.
  // Now makes 1 call to /api/dashboard/combined → all data at once.
  const {
    weightData,
    waterData,
    heartRateData,
    bpData,
    isLoading,
    refetchAll,
  } = useCombinedDashboard();

  // ─── ZUSTAND: Steps from sensor (real-time, no re-render cascade) ───────
  const stepsFromStore = useHealthStore((s) => s.stepsData);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  };

  // ─── Memoized computed values ─────────────────────────────────────────────

  const displayWeight = useMemo(() => {
    const weight = weightData.weight || 0;
    if (weight <= 0) return 0;
    return convertWeight(weight, weightData.weightUnit || 'kg', weightUnit);
  }, [weightData.weight, weightData.weightUnit, weightUnit]);

  const { displayWaterIntake, displayWaterGoal } = useMemo(() => {
    const preferredWaterAPIUnit = waterUnit === 'oz' ? 'ounces' : 'liters';
    const intake = (waterData.intake || 0) > 0
      ? convertVolume(waterData.intake, waterData.intakeUnit || 'liters', preferredWaterAPIUnit)
      : 0;
    const goalValue = (waterData.goalValue || waterData.goal || 3) > 0
      ? convertVolume(waterData.goalValue || waterData.goal || 3, waterData.intakeUnit || 'liters', preferredWaterAPIUnit)
      : (waterUnit === 'oz' ? 101 : 3);
    return { displayWaterIntake: intake, displayWaterGoal: goalValue };
  }, [waterData.intake, waterData.goalValue, waterData.goal, waterData.intakeUnit, waterUnit]);

  const { mergedSteps, mergedGoal, stepsProgress } = useMemo(() => {
    const steps = Math.max(localSteps || 0, stepsFromStore.steps || 0);
    const goalVal = localGoal || stepsFromStore.goal || 10000;
    const progress = goalVal > 0 ? Math.min((steps / goalVal) * 100, 100) : 0;
    return { mergedSteps: steps, mergedGoal: goalVal, stepsProgress: progress };
  }, [localSteps, stepsFromStore.steps, localGoal, stepsFromStore.goal]);

  const weightProgress = useMemo(() => {
    const bmi = weightData.bmi || 0;
    return (weightData.weight || 0) > 0 ? Math.min((bmi / 25) * 100, 100) : 0;
  }, [weightData.weight, weightData.bmi]);

  const waterProgress = useMemo(() => {
    return displayWaterGoal > 0 ? Math.min((displayWaterIntake / displayWaterGoal) * 100, 100) : 0;
  }, [displayWaterIntake, displayWaterGoal]);

  const hrProgress = useMemo(() => {
    const bpm = heartRateData?.bpm || 0;
    return bpm > 0 ? Math.min((bpm / 200) * 100, 100) : 0;
  }, [heartRateData]);

  // Normalize heart rate data for display
  const normalizedHR = useMemo(() => ({
    bpm: heartRateData?.bpm || 0,
    zone: heartRateData?.zone || '',
  }), [heartRateData]);

  // Normalize BP data for display
  const normalizedBP = useMemo(() => ({
    systolic: bpData?.systolic || 0,
    diastolic: bpData?.diastolic || 0,
    status: bpData?.status || '',
  }), [bpData]);

  // Normalize weight data for display
  const normalizedWeight = useMemo(() => ({
    weight: weightData.weight || 0,
    bmi: weightData.bmi || 0,
    weightUnit: weightData.weightUnit || 'kg',
  }), [weightData]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Purple gradient header */}
      <View
        style={{
          backgroundColor: colors.headerBg || colors.surfaceElevated,
          paddingTop: 20,
          paddingBottom: 14,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}
      >
        <View style={tw`flex-row items-center justify-between px-5 mb-3`}>
          <View>
            <Text style={[tw`text-sm font-medium`, { color: colors.textSecondary }]}>
              Welcome Back 👋
            </Text>
            <Text style={[tw`text-2xl font-bold mt-1`, { color: colors.textPrimary }]}>
              {userProfile?.name || 'User'}
            </Text>
          </View>
          <View style={tw`flex-row items-center`}>
            <TouchableOpacity
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
                { backgroundColor: colors.surface },
              ]}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon name="notifications-none" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center overflow-hidden`,
                { backgroundColor: colors.surfaceElevated },
              ]}
              onPress={() => navigation.navigate('Profile')}
            >
              <CachedAvatar
                uri={userProfile?.profilePicture}
                size={40}
                name={userProfile?.name}
                priority="high"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={tw`px-5`}>
          <WeekCalendar colors={colors} />
        </View>
      </View>

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <DashboardSkeleton />
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={[tw`px-5 pb-28`]}
        >
          {/* Steps section with error boundary */}
          <FeatureErrorBoundary feature="Steps" compact colors={colors}>
            <StepsCard
              mergedSteps={mergedSteps}
              mergedGoal={mergedGoal}
              stepsProgress={stepsProgress}
              colors={colors}
            />
          </FeatureErrorBoundary>

          {/* Health metrics with error boundary */}
          <FeatureErrorBoundary feature="Health Metrics" compact colors={colors}>
            <MacroCardsRow
              displayWeight={displayWeight}
              weightUnit={weightUnit}
              weightProgress={weightProgress}
              displayWaterIntake={displayWaterIntake}
              waterUnit={waterUnit}
              waterProgress={waterProgress}
              heartRateData={normalizedHR}
              hrProgress={hrProgress}
              colors={colors}
            />
          </FeatureErrorBoundary>

          {/* Health details with error boundary */}
          <FeatureErrorBoundary feature="Health Details" compact colors={colors}>
            <HealthSection
              bpData={normalizedBP}
              weightData={normalizedWeight}
              displayWaterIntake={displayWaterIntake}
              displayWaterGoal={displayWaterGoal}
              waterUnit={waterUnit}
              colors={colors}
            />
          </FeatureErrorBoundary>
        </ScrollView>
      )}
    </View>
  );
};

export default DashboardScreen;