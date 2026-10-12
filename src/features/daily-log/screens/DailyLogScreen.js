/**
 * DailyLogScreen - OPTIMIZED with React Query + Zustand
 * 
 * FIXES APPLIED:
 * 1. ❌ BEFORE: fetchLoggedData had [userProfile, weightData, waterData, stepsData] deps → infinite loop
 * 2. ✅ AFTER: useDailyLogData hook with stable queryKey ['dailyLog', date] — no context deps
 * 3. ✅ Mutations auto-invalidate cache after save — no manual refetch needed
 * 4. ✅ Tab switch returns cached data instantly (staleTime: 60s)
 * 5. ✅ Date change triggers new query automatically (different queryKey)
 * 6. ✅ ESLint: Removed unused useCallback import
 */

import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, Text, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, LayoutAnimation } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DatePicker from 'react-native-date-picker';
import { SmallCircularProgress } from '../../../shared/layout/CircularProgress';
import MacroCard from '../../../shared/layout/MacroCard';
import ActivityItem from '../../../shared/layout/ActivityItem';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import UnitSelector from '../../../shared/layout/UnitSelector';
import Toast from 'react-native-toast-message';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';
import { useUserContext } from '../../../context/UserContext';
import { useUnitPreferences } from '../../../context/UnitPreferencesContext';
import { useDailyLogData, useDailyLogMutations } from '../../../hooks/queries/useDailyLogQueries';
import useHealthStore from '../../../store/healthStore';
import { getErrorMessage } from '../../../utils/errorHandler';
import { convertWeight, convertVolume } from '../../../utils/converters';
import { DailyLogSkeleton } from '../../../shared/feedback/SkeletonLoader';
import dayjs from 'dayjs';

// ─── TrackerSection Component (unchanged) ─────────────────────────────────────
const TrackerSection = ({ title, icon, iconColor, iconBgColor, items, expanded, onToggle, colors, navigation }) => {
  return (
    <View style={tw`mb-4`}>
      <TouchableOpacity
        style={[
          tw`rounded-2xl p-4 flex-row items-center justify-between`,
          {
            backgroundColor: colors.surface,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 1,
            shadowRadius: 8,
            elevation: 2,
          },
        ]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={tw`flex-row items-center flex-1`}>
          <View
            style={[
              tw`w-11 h-11 rounded-xl items-center justify-center`,
              { backgroundColor: iconBgColor },
            ]}
          >
            <Icon name={icon} size={20} color={iconColor} />
          </View>
          <View style={tw`ml-3 flex-1`}>
            <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>{title}</Text>
            <Text style={[tw`text-xs mt-0.5`, { color: colors.textMuted }]}>
              {items.length} {items.length === 1 ? 'tracker' : 'trackers'}
            </Text>
          </View>
        </View>
        <View
          style={[
            tw`w-8 h-8 rounded-full items-center justify-center`,
            { backgroundColor: expanded ? iconBgColor : colors.border },
          ]}
        >
          <Icon
            name={expanded ? 'expand-less' : 'expand-more'}
            size={22}
            color={expanded ? iconColor : colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={tw`mt-2 ml-3`}>
          {items.map((item) => (
            <ActivityItem
              key={item.key}
              title={item.label}
              value={item.description}
              iconName={item.icon}
              iconBgColor={item.color + '15'}
              iconColor={item.color}
              colors={colors}
              onPress={() => navigation.navigate(item.screen)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// ─── QuickLogSheet Component (unchanged) ──────────────────────────────────────
const QuickLogSheet = ({ visible, onClose, category, onSave, colors, defaultWeightUnit, defaultWaterUnit }) => {
  const [inputValue, setInputValue] = useState('');
  const [inputValue2, setInputValue2] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!inputValue.trim()) {
      Toast.show({ type: 'error', text1: `${category?.label} is required` });
      return;
    }
    setLoading(true);
    try {
      const value = category?.key === 'bp'
        ? `${inputValue}/${inputValue2}`
        : inputValue;
      await onSave(category?.key, value, selectedUnit);
      Toast.show({ type: 'success', text1: `${category?.label} logged!` });
      setInputValue('');
      setInputValue2('');
      onClose();
    } catch (_e) {
      // Error handled in onSave
    } finally {
      setLoading(false);
    }
  };

  const handleUnitChange = (newUnit) => {
    if (selectedUnit && newUnit !== selectedUnit && inputValue.trim()) {
      const numVal = parseFloat(inputValue);
      if (!isNaN(numVal) && numVal > 0) {
        let converted = numVal;
        if (category?.key === 'weight') {
          const fromUnit = selectedUnit === 'kg' ? 'kg' : 'lbs';
          const toUnit = newUnit === 'kg' ? 'kg' : 'lbs';
          converted = convertWeight(numVal, fromUnit, toUnit);
        } else if (category?.key === 'water') {
          const fromUnit = selectedUnit === 'L' ? 'liters' : 'ounces';
          const toUnit = newUnit === 'L' ? 'liters' : 'ounces';
          converted = convertVolume(numVal, fromUnit, toUnit);
        }
        setInputValue(String(converted));
      }
    }
    setSelectedUnit(newUnit);
  };

  React.useEffect(() => {
    if (category?.units) {
      if (category.key === 'weight') {
        setSelectedUnit(defaultWeightUnit || category.units[0]);
      } else if (category.key === 'water') {
        setSelectedUnit(defaultWaterUnit || category.units[0]);
      } else {
        setSelectedUnit(category.units[0]);
      }
    } else {
      setSelectedUnit(null);
    }
  }, [category, defaultWeightUnit, defaultWaterUnit]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={[tw`flex-1`, { backgroundColor: 'rgba(0,0,0,0.4)' }]} activeOpacity={1} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={tw`flex-1 justify-end`}>
          <TouchableOpacity activeOpacity={1}>
            <View style={[tw`rounded-t-3xl px-5 pt-6 pb-8`, { backgroundColor: colors.surface }]}>
              <View style={[tw`w-10 h-1 rounded-full self-center mb-5`, { backgroundColor: '#EDEDED' }]} />
              <View style={tw`flex-row items-center mb-5`}>
                <View style={[tw`w-10 h-10 rounded-xl items-center justify-center`, { backgroundColor: (category?.color || '#7C4DFF') + '15' }]}>
                  <Icon name={category?.icon || 'add'} size={20} color={category?.color || '#7C4DFF'} />
                </View>
                <Text style={[tw`text-lg font-bold ml-3`, { color: colors.textPrimary }]}>
                  Log {category?.label}
                </Text>
              </View>

              {category?.key === 'bp' ? (
                <View>
                  <Input label="Systolic (mmHg)" value={inputValue} onChangeText={setInputValue} placeholder="e.g. 120" keyboardType="numeric" />
                  <Input label="Diastolic (mmHg)" value={inputValue2} onChangeText={setInputValue2} placeholder="e.g. 80" keyboardType="numeric" />
                </View>
              ) : (
                <View>
                  <Input label={category?.inputLabel || 'Value'} value={inputValue} onChangeText={setInputValue} placeholder={category?.placeholder || 'Enter value'} keyboardType="numeric" />
                  {category?.units && (
                    <View style={tw`mt-2 mb-2`}>
                      <UnitSelector options={category.units} selected={selectedUnit} onSelect={handleUnitChange} />
                    </View>
                  )}
                </View>
              )}

              <View style={tw`flex-row gap-3 mt-4`}>
                <View style={tw`flex-1`}>
                  <Button title="Cancel" variant="secondary" onPress={onClose} fullWidth />
                </View>
                <View style={tw`flex-1`}>
                  <Button title="Save" onPress={handleSave} loading={loading} fullWidth />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── MenstrualQuickLogSheet (unchanged from original) ─────────────────────────
const MenstrualQuickLogSheet = ({ visible, onClose, onSave, colors, menstrualStatus }) => {
  const [selectedAction, setSelectedAction] = useState(null);
  const [flowIntensity, setFlowIntensity] = useState('Medium');
  const [cramps, setCramps] = useState('None');
  const [mood, setMood] = useState(null);
  const [loading, setLoading] = useState(false);

  const flowOptions = ['Light', 'Medium', 'Heavy'];
  const crampsOptions = ['None', 'Mild', 'Moderate', 'Severe'];
  const moodOptions = ['Happy', 'Calm', 'Irritable', 'Anxious', 'Sad', 'Energetic', 'Tired'];

  const handleSave = async () => {
    if (!selectedAction) {
      Toast.show({ type: 'error', text1: 'Please select an action' });
      return;
    }
    setLoading(true);
    try {
      await onSave(selectedAction, { flow: flowIntensity, cramps, mood });
      Toast.show({ type: 'success', text1: 'Menstrual data logged! 🌸' });
      setSelectedAction(null);
      setFlowIntensity('Medium');
      setCramps('None');
      setMood(null);
      onClose();
    } catch (_e) {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (visible) {
      setSelectedAction(null);
      setFlowIntensity('Medium');
      setCramps('None');
      setMood(null);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={[tw`flex-1`, { backgroundColor: 'rgba(0,0,0,0.4)' }]} activeOpacity={1} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={tw`flex-1 justify-end`}>
          <TouchableOpacity activeOpacity={1}>
            <View style={[tw`rounded-t-3xl px-5 pt-6 pb-8`, { backgroundColor: colors.surface }]}>
              <View style={[tw`w-10 h-1 rounded-full self-center mb-5`, { backgroundColor: '#EDEDED' }]} />
              <View style={tw`flex-row items-center mb-5`}>
                <View style={[tw`w-10 h-10 rounded-xl items-center justify-center`, { backgroundColor: '#FCE4EC' }]}>
                  <Icon name="calendar-month" size={20} color="#E91E63" />
                </View>
                <View style={tw`ml-3`}>
                  <Text style={[tw`text-lg font-bold`, { color: colors.textPrimary }]}>Log Period</Text>
                  {menstrualStatus.isActive && (
                    <Text style={[tw`text-xs font-medium`, { color: '#E91E63' }]}>
                      Period Active — Day {menstrualStatus.currentDay || '?'}
                    </Text>
                  )}
                  {!menstrualStatus.isActive && menstrualStatus.daysUntilNext !== null && (
                    <Text style={[tw`text-xs font-medium`, { color: colors.textMuted }]}>
                      Next expected in {menstrualStatus.daysUntilNext} days
                    </Text>
                  )}
                </View>
              </View>

              <Text style={[tw`text-xs font-bold mb-3 tracking-wide uppercase`, { color: colors.textSecondary }]}>
                What would you like to log?
              </Text>

              <View style={tw`mb-4`}>
                {!menstrualStatus.isActive && (
                  <TouchableOpacity
                    style={[tw`rounded-2xl p-4 mb-2 flex-row items-center`, { backgroundColor: selectedAction === 'start' ? '#E91E63' + '15' : colors.background, borderWidth: selectedAction === 'start' ? 1.5 : 0, borderColor: '#E91E63' }]}
                    onPress={() => setSelectedAction('start')}
                    activeOpacity={0.7}
                  >
                    <View style={[tw`w-9 h-9 rounded-full items-center justify-center`, { backgroundColor: '#FCE4EC' }]}>
                      <Icon name="play-arrow" size={18} color="#E91E63" />
                    </View>
                    <View style={tw`ml-3 flex-1`}>
                      <Text style={[tw`text-sm font-bold`, { color: colors.textPrimary }]}>Start Period</Text>
                      <Text style={[tw`text-xs`, { color: colors.textMuted }]}>Mark today as period start</Text>
                    </View>
                    {selectedAction === 'start' && <Icon name="check-circle" size={20} color="#E91E63" />}
                  </TouchableOpacity>
                )}
                {menstrualStatus.isActive && (
                  <TouchableOpacity
                    style={[tw`rounded-2xl p-4 mb-2 flex-row items-center`, { backgroundColor: selectedAction === 'end' ? '#E91E63' + '15' : colors.background, borderWidth: selectedAction === 'end' ? 1.5 : 0, borderColor: '#E91E63' }]}
                    onPress={() => setSelectedAction('end')}
                    activeOpacity={0.7}
                  >
                    <View style={[tw`w-9 h-9 rounded-full items-center justify-center`, { backgroundColor: '#FCE4EC' }]}>
                      <Icon name="stop" size={18} color="#E91E63" />
                    </View>
                    <View style={tw`ml-3 flex-1`}>
                      <Text style={[tw`text-sm font-bold`, { color: colors.textPrimary }]}>End Period</Text>
                      <Text style={[tw`text-xs`, { color: colors.textMuted }]}>Mark today as period end</Text>
                    </View>
                    {selectedAction === 'end' && <Icon name="check-circle" size={20} color="#E91E63" />}
                  </TouchableOpacity>
                )}
                {menstrualStatus.isActive && (
                  <TouchableOpacity
                    style={[tw`rounded-2xl p-4 mb-2 flex-row items-center`, { backgroundColor: selectedAction === 'flow' ? '#E91E63' + '15' : colors.background, borderWidth: selectedAction === 'flow' ? 1.5 : 0, borderColor: '#E91E63' }]}
                    onPress={() => setSelectedAction('flow')}
                    activeOpacity={0.7}
                  >
                    <View style={[tw`w-9 h-9 rounded-full items-center justify-center`, { backgroundColor: '#FCE4EC' }]}>
                      <Icon name="water-drop" size={18} color="#E91E63" />
                    </View>
                    <View style={tw`ml-3 flex-1`}>
                      <Text style={[tw`text-sm font-bold`, { color: colors.textPrimary }]}>Log Today's Flow</Text>
                      <Text style={[tw`text-xs`, { color: colors.textMuted }]}>Update flow intensity for today</Text>
                    </View>
                    {selectedAction === 'flow' && <Icon name="check-circle" size={20} color="#E91E63" />}
                  </TouchableOpacity>
                )}
              </View>

              {(selectedAction === 'start' || selectedAction === 'flow') && (
                <>
                  <View style={tw`mb-4`}>
                    <Text style={[tw`text-xs font-bold mb-2 tracking-wide uppercase`, { color: colors.textSecondary }]}>Flow Intensity</Text>
                    <View style={tw`flex-row gap-2`}>
                      {flowOptions.map((option) => (
                        <TouchableOpacity key={option} style={[tw`flex-1 py-3 rounded-2xl items-center`, { backgroundColor: flowIntensity === option ? '#E91E63' + '15' : colors.background, borderWidth: flowIntensity === option ? 1.5 : 0, borderColor: '#E91E63' }]} onPress={() => setFlowIntensity(option)}>
                          <Text style={[tw`text-xs font-bold`, { color: flowIntensity === option ? '#E91E63' : colors.textMuted }]}>{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={tw`mb-4`}>
                    <Text style={[tw`text-xs font-bold mb-2 tracking-wide uppercase`, { color: colors.textSecondary }]}>Cramps</Text>
                    <View style={tw`flex-row gap-2`}>
                      {crampsOptions.map((option) => (
                        <TouchableOpacity key={option} style={[tw`flex-1 py-3 rounded-2xl items-center`, { backgroundColor: cramps === option ? '#E91E63' + '15' : colors.background, borderWidth: cramps === option ? 1.5 : 0, borderColor: '#E91E63' }]} onPress={() => setCramps(option)}>
                          <Text style={[tw`text-[10px] font-bold`, { color: cramps === option ? '#E91E63' : colors.textMuted }]}>{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={tw`mb-4`}>
                    <Text style={[tw`text-xs font-bold mb-2 tracking-wide uppercase`, { color: colors.textSecondary }]}>Mood (optional)</Text>
                    <View style={tw`flex-row flex-wrap gap-2`}>
                      {moodOptions.map((option) => (
                        <TouchableOpacity key={option} style={[tw`px-3 py-2 rounded-2xl`, { backgroundColor: mood === option ? '#E91E63' + '15' : colors.background, borderWidth: mood === option ? 1.5 : 0, borderColor: '#E91E63' }]} onPress={() => setMood(mood === option ? null : option)}>
                          <Text style={[tw`text-xs font-bold`, { color: mood === option ? '#E91E63' : colors.textMuted }]}>{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              <View style={tw`flex-row gap-3 mt-2`}>
                <View style={tw`flex-1`}>
                  <Button title="Cancel" variant="secondary" onPress={onClose} fullWidth />
                </View>
                <View style={tw`flex-1`}>
                  <Button title="Save" onPress={handleSave} loading={loading} fullWidth />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

const DailyLogScreen = () => {
  const { colors } = useTheme();
  const { userProfile } = useUserContext();
  const { weightUnit, waterUnit } = useUnitPreferences();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);
  const [showMenstrualSheet, setShowMenstrualSheet] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  // ─── REACT QUERY: Fetch daily log data ──────────────────────────────────
  // This REPLACES the old fetchLoggedData useCallback + useEffect pattern.
  // Query key = ['dailyLog', 'data', '2026-07-18'] — stable, no context deps!
  const {
    data: loggedToday = {},
    isLoading: loadingData,
    refetch,
  } = useDailyLogData(selectedDate, userProfile);

  // ─── REACT QUERY: Mutations for saving entries ──────────────────────────
  const mutations = useDailyLogMutations(selectedDate);

  // ─── ZUSTAND: Get steps data (from sensor, always fresh) ────────────────
  const stepsFromStore = useHealthStore((s) => s.stepsData.steps);

  // Merge steps: use whichever is higher (sensor vs API)
  const mergedLoggedToday = React.useMemo(() => {
    const isToday = dayjs(selectedDate).isSame(dayjs(), 'day');
    if (isToday && stepsFromStore > 0) {
      return {
        ...loggedToday,
        steps: Math.max(loggedToday.steps || 0, stepsFromStore),
      };
    }
    return loggedToday;
  }, [loggedToday, stepsFromStore, selectedDate]);

  // Extract menstrual status from query data
  const menstrualStatus = loggedToday._menstrualStatus || {
    isActive: false,
    currentDay: null,
    daysUntilNext: null,
    activeEntryId: null,
  };

  // Categories for quick logging
  const categories = [
    { key: 'weight', icon: 'scale', color: '#FF8C42', label: 'Weight', inputLabel: 'Weight', placeholder: 'e.g. 72.5', screen: 'BodyMetrics', units: ['kg', 'lbs'] },
    { key: 'water', icon: 'water-drop', color: '#2196F3', label: 'Water', inputLabel: 'Intake', placeholder: 'e.g. 0.5', screen: 'Hydration', units: ['L', 'oz'] },
    { key: 'heartRate', icon: 'favorite', color: '#FF6B6B', label: 'Heart Rate', inputLabel: 'BPM', placeholder: 'e.g. 72', screen: 'HeartRate' },
    { key: 'bp', icon: 'speed', color: '#7C4DFF', label: 'Blood Pressure', inputLabel: 'Systolic/Diastolic', placeholder: 'e.g. 120', screen: 'BloodPressure' },
    ...(userProfile?.gender?.toLowerCase() === 'female' ? [{ key: 'menstrual', icon: 'calendar-month', color: '#E91E63', label: 'Menstrual', screen: 'MenstrualTracker' }] : []),
  ];

  // Tracker sections
  const trackerSections = [
    {
      key: 'activity',
      title: 'Activity & Hydration',
      icon: 'directions-run',
      iconColor: '#4CAF50',
      iconBgColor: '#E8F5E9',
      items: [
        { key: 'steps', icon: 'directions-walk', color: '#4CAF50', label: 'Steps Tracker', description: 'Track daily steps, distance & calories', screen: 'Steps' },
        { key: 'hydration', icon: 'water-drop', color: '#2196F3', label: 'Hydration Tracker', description: 'Monitor water intake & hydration goals', screen: 'Hydration' },
      ],
    },
    {
      key: 'vitals',
      title: 'Vitals',
      icon: 'monitor-heart',
      iconColor: '#FF6B6B',
      iconBgColor: '#FFEBEE',
      items: [
        { key: 'heartRate', icon: 'favorite', color: '#FF6B6B', label: 'Heart Rate', description: 'Monitor BPM, zones & trends', screen: 'HeartRate' },
        { key: 'bp', icon: 'speed', color: '#7C4DFF', label: 'Blood Pressure', description: 'Track systolic & diastolic readings', screen: 'BloodPressure' },
        { key: 'bloodOxygen', icon: 'air', color: '#00BCD4', label: 'Blood Oxygen (SpO2)', description: 'Monitor oxygen saturation levels', screen: 'BloodOxygen' },
        { key: 'bloodSugar', icon: 'bloodtype', color: '#FF5722', label: 'Blood Sugar', description: 'Track glucose levels & trends', screen: 'BloodSugar' },
      ],
    },
    {
      key: 'bodyMetrics',
      title: 'Body Metrics',
      icon: 'accessibility-new',
      iconColor: '#FF8C42',
      iconBgColor: '#FFF3E0',
      items: [
        { key: 'body', icon: 'scale', color: '#FF8C42', label: 'Body Metrics', description: 'Weight, height, BMI & body composition', screen: 'BodyMetrics' },
      ],
    },
    ...(userProfile?.gender?.toLowerCase() === 'female' ? [{
      key: 'menstrual',
      title: 'Menstrual Cycle',
      icon: 'calendar-month',
      iconColor: '#E91E63',
      iconBgColor: '#FCE4EC',
      items: [
        { key: 'menstrualTracker', icon: 'calendar-month', color: '#E91E63', label: 'Menstrual Tracker', description: 'Period tracking, predictions & reminders', screen: 'MenstrualTracker' },
      ],
    }] : []),
  ];

  const toggleSection = (sectionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  // ─── SAVE HANDLER (uses mutations) ──────────────────────────────────────
  const handleSave = async (key, value, unit) => {
    const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
    const currentTimestamp = new Date().toTimeString().slice(0, 5);

    const categoryLabels = { weight: 'weight', water: 'water intake', heartRate: 'heart rate', bp: 'blood pressure' };

    try {
      switch (key) {
        case 'weight': {
          const weightVal = parseFloat(value);
          if (isNaN(weightVal) || weightVal <= 0) {
            Toast.show({ type: 'error', text1: 'Invalid value', text2: 'Please enter a valid weight' });
            throw new Error('Invalid weight');
          }
          await mutations.addWeight.mutateAsync({ weight: weightVal, weightUnit: unit || weightUnit, date: dateStr });
          break;
        }
        case 'water': {
          const waterVal = parseFloat(value);
          if (isNaN(waterVal) || waterVal <= 0) {
            Toast.show({ type: 'error', text1: 'Invalid value', text2: 'Please enter a valid water intake' });
            throw new Error('Invalid water');
          }
          const apiWaterUnit = (unit || waterUnit) === 'L' ? 'liters' : ((unit || waterUnit) === 'oz' ? 'ounces' : (unit || 'liters'));
          await mutations.addWater.mutateAsync({ waterIntake: waterVal, waterUnit: apiWaterUnit, date: dateStr, timestamp: new Date().toTimeString().slice(0, 8) });
          break;
        }
        case 'heartRate': {
          const bpmVal = parseInt(value, 10);
          if (isNaN(bpmVal) || bpmVal <= 0) {
            Toast.show({ type: 'error', text1: 'Invalid value', text2: 'Please enter a valid heart rate' });
            throw new Error('Invalid heart rate');
          }
          await mutations.addHeartRate.mutateAsync({ bpm: bpmVal, date: dateStr, timestamp: currentTimestamp });
          break;
        }
        case 'bp': {
          const parts = value.split('/');
          const systolic = parseInt(parts[0], 10);
          const diastolic = parseInt(parts[1], 10);
          if (isNaN(systolic) || isNaN(diastolic) || systolic <= 0 || diastolic <= 0) {
            Toast.show({ type: 'error', text1: 'Invalid value', text2: 'Please enter valid blood pressure values' });
            throw new Error('Invalid BP');
          }
          await mutations.addBp.mutateAsync({ systolic, diastolic, date: dateStr, timestamp: currentTimestamp });
          break;
        }
        default:
          break;
      }
      // No manual refetch needed! Mutation's onSuccess auto-invalidates the cache.
    } catch (error) {
      if (error.response) {
        const msg = getErrorMessage(error, `Could not save ${categoryLabels[key] || 'data'}. Please try again.`);
        Toast.show({ type: 'error', text1: `Failed to save ${categoryLabels[key] || 'data'}`, text2: msg });
      }
      throw error;
    }
  };

  // ─── MENSTRUAL SAVE HANDLER ─────────────────────────────────────────────
  const handleMenstrualSave = async (action, data) => {
    const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
    try {
      switch (action) {
        case 'start':
          await mutations.addMenstrual.mutateAsync({
            startDate: dateStr, endDate: null, flow: data.flow || 'Medium',
            cramps: data.cramps || 'None', mood: data.mood || null,
            discharge: 'None', energyLevel: null, sexualActivity: null, notes: '',
          });
          break;
        case 'end':
          if (menstrualStatus.activeEntryId) {
            await mutations.updateMenstrual.mutateAsync({ id: menstrualStatus.activeEntryId, data: { endDate: dateStr } });
          }
          break;
        case 'flow':
          if (menstrualStatus.activeEntryId) {
            await mutations.updateMenstrual.mutateAsync({
              id: menstrualStatus.activeEntryId,
              data: { flow: data.flow || 'Medium', cramps: data.cramps || 'None', mood: data.mood || null },
            });
          }
          break;
        default:
          break;
      }
    } catch (error) {
      const msg = getErrorMessage(error, 'Could not save menstrual data. Please try again.');
      Toast.show({ type: 'error', text1: 'Failed to save', text2: msg });
      throw error;
    }
  };

  // ─── PULL TO REFRESH ────────────────────────────────────────────────────
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // ─── COMPUTED VALUES ────────────────────────────────────────────────────
  const formattedDate = dayjs(selectedDate).format('ddd, MMM D, YYYY');
  const isToday = dayjs(selectedDate).isSame(dayjs(), 'day');
  const categoryKeys = categories.map(c => c.key);
  const loggedCount = categoryKeys.filter(key => mergedLoggedToday[key] !== undefined && mergedLoggedToday[key] !== null).length;
  const totalCategories = categories.length;
  const logProgress = totalCategories > 0 ? Math.min((loggedCount / totalCategories) * 100, 100) : 0;

  const getDisplayWeight = () => {
    if (!mergedLoggedToday.weight) return '--';
    const apiUnit = mergedLoggedToday.weightUnit || 'kg';
    if (apiUnit === weightUnit) return mergedLoggedToday.weight;
    return convertWeight(mergedLoggedToday.weight, apiUnit, weightUnit);
  };

  const getDisplayWater = () => {
    if (!mergedLoggedToday.water) return '--';
    const apiUnit = mergedLoggedToday.waterUnit || 'liters';
    const preferredApiUnit = waterUnit === 'oz' ? 'ounces' : 'liters';
    if (apiUnit === preferredApiUnit) return Number(mergedLoggedToday.water).toFixed(1);
    return convertVolume(mergedLoggedToday.water, apiUnit, preferredApiUnit).toFixed(1);
  };

  const getMenstrualDisplayText = () => {
    if (mergedLoggedToday.menstrual) {
      if (menstrualStatus.isActive) return `Day ${menstrualStatus.currentDay || '?'} • ${mergedLoggedToday.menstrual} ✓`;
      return `${mergedLoggedToday.menstrual} logged ✓`;
    }
    if (menstrualStatus.isActive) return `Period Active — Day ${menstrualStatus.currentDay || '?'}`;
    if (menstrualStatus.daysUntilNext !== null) return `Next in ~${menstrualStatus.daysUntilNext} days`;
    return 'Tap to log';
  };

  const goToPreviousDay = () => setSelectedDate(dayjs(selectedDate).subtract(1, 'day').toDate());
  const goToNextDay = () => {
    const next = dayjs(selectedDate).add(1, 'day');
    if (next.isAfter(dayjs(), 'day')) return;
    setSelectedDate(next.toDate());
  };

  const handleCategoryPress = (cat) => {
    if (cat.key === 'menstrual') setShowMenstrualSheet(true);
    else setActiveSheet(cat);
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={{ backgroundColor: colors.headerBg || colors.surfaceElevated, paddingTop: 20, paddingBottom: 14, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <View style={tw`flex-row items-center justify-between px-5 mb-3`}>
          <View>
            <Text style={[tw`text-sm font-medium`, { color: colors.textSecondary }]}>{isToday ? 'Today' : formattedDate}</Text>
            <Text style={[tw`text-2xl font-bold mt-1`, { color: colors.textPrimary }]}>Daily Log</Text>
          </View>
          <View style={tw`flex-row items-center`}>
            <TouchableOpacity style={[tw`w-10 h-10 rounded-full items-center justify-center mr-3`, { backgroundColor: colors.surface }]} onPress={() => setShowDatePicker(true)}>
              <Icon name="calendar-today" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={[tw`w-10 h-10 rounded-full items-center justify-center overflow-hidden`, { backgroundColor: colors.surfaceElevated }]} onPress={() => navigation.navigate('Profile')}>
              <Icon name="person" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loadingData ? (
        <ScrollView showsVerticalScrollIndicator={false}><DailyLogSkeleton /></ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          contentContainerStyle={[tw`px-5 pb-28`]}
        >
          {/* Date Navigation */}
          <View style={[tw`rounded-2xl p-4 mt-5 flex-row items-center justify-between`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 }]}>
            <TouchableOpacity style={[tw`w-9 h-9 rounded-full items-center justify-center`, { backgroundColor: colors.surfaceElevated }]} onPress={goToPreviousDay}>
              <Icon name="chevron-left" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <View style={tw`items-center`}>
                <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>{isToday ? 'Today' : dayjs(selectedDate).format('MMM D, YYYY')}</Text>
                <Text style={[tw`text-xs mt-0.5`, { color: colors.textMuted }]}>{dayjs(selectedDate).format('dddd')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[tw`w-9 h-9 rounded-full items-center justify-center`, { backgroundColor: isToday ? colors.border : colors.surfaceElevated }]} onPress={goToNextDay} disabled={isToday}>
              <Icon name="chevron-right" size={22} color={isToday ? colors.textMuted : colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Log Progress */}
          <View style={[tw`rounded-3xl p-5 mt-4`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
            <Text style={[tw`text-sm font-semibold mb-1`, { color: colors.textSecondary }]}>Logging Progress</Text>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-baseline`}>
                <Text style={[tw`text-4xl font-bold`, { color: colors.textPrimary }]}>{loggedCount}</Text>
                <Text style={[tw`text-lg ml-1`, { color: colors.textMuted }]}>/{totalCategories} logged</Text>
              </View>
              <SmallCircularProgress size={65} strokeWidth={7} progress={logProgress} color="#7C4DFF" bgColor="#EDE7FF">
                <Text style={[tw`text-xs font-bold`, { color: '#7C4DFF' }]}>{Math.round(logProgress)}%</Text>
              </SmallCircularProgress>
            </View>
          </View>

          {/* Macro Cards */}
          <View style={tw`flex-row mt-4 -mx-1.5`}>
            <MacroCard label="Weight" value={getDisplayWeight()} unit={mergedLoggedToday.weight ? ` ${weightUnit}` : ''} progress={mergedLoggedToday.weight ? 100 : 0} color="#FF8C42" bgColor="#FFE4CC" iconName="scale" colors={colors} />
            <MacroCard label="Water" value={getDisplayWater()} unit={mergedLoggedToday.water ? ` ${waterUnit}` : ''} progress={mergedLoggedToday.water ? 100 : 0} color="#2196F3" bgColor="#E3F2FD" iconName="water-drop" colors={colors} />
            <MacroCard label="Steps" value={mergedLoggedToday.steps ? mergedLoggedToday.steps.toLocaleString() : '--'} unit="" progress={mergedLoggedToday.steps ? 100 : 0} color="#4CAF50" bgColor="#E8F5E9" iconName="directions-walk" colors={colors} />
          </View>

          {/* Log Health Data */}
          <Text style={[tw`text-xl font-bold mt-7 mb-4`, { color: colors.textPrimary }]}>Log Health Data</Text>
          {categories.map((cat) => (
            <ActivityItem
              key={cat.key}
              title={cat.label}
              value={cat.key === 'menstrual' ? getMenstrualDisplayText() : mergedLoggedToday[cat.key] ? `${mergedLoggedToday[cat.key]} logged ✓` : 'Tap to log'}
              iconName={cat.icon}
              iconBgColor={cat.color + '15'}
              iconColor={cat.color}
              colors={colors}
              onPress={() => handleCategoryPress(cat)}
            />
          ))}

          {/* Detailed Trackers */}
          <Text style={[tw`text-xl font-bold mt-7 mb-4`, { color: colors.textPrimary }]}>Detailed Trackers</Text>
          <Text style={[tw`text-sm mb-4 -mt-2`, { color: colors.textMuted }]}>Tap a section to explore detailed tracking</Text>
          {trackerSections.map((section) => (
            <TrackerSection key={section.key} title={section.title} icon={section.icon} iconColor={section.iconColor} iconBgColor={section.iconBgColor} items={section.items} expanded={!!expandedSections[section.key]} onToggle={() => toggleSection(section.key)} colors={colors} navigation={navigation} />
          ))}
        </ScrollView>
      )}

      <QuickLogSheet visible={!!activeSheet} onClose={() => setActiveSheet(null)} category={activeSheet} onSave={handleSave} colors={colors} defaultWeightUnit={weightUnit} defaultWaterUnit={waterUnit} />
      <MenstrualQuickLogSheet visible={showMenstrualSheet} onClose={() => setShowMenstrualSheet(false)} onSave={handleMenstrualSave} colors={colors} menstrualStatus={menstrualStatus} />
      <DatePicker modal open={showDatePicker} date={selectedDate} mode="date" maximumDate={new Date()} onConfirm={(date) => { setShowDatePicker(false); setSelectedDate(date); }} onCancel={() => setShowDatePicker(false)} title="Select Date" theme="light" />
    </View>
  );
};

export default DailyLogScreen;