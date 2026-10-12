import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';
import { useUnitPreferences } from '../../../context/UnitPreferencesContext';
import { getGoals, saveGoals } from '../../../api/goals';
import { convertWeight, convertVolume, convertHeight } from '../../../utils/converters';

const GoalInputCard = ({ icon, iconColor, bgColor, label, description, value, onChangeText, placeholder, unitOptions, selectedUnit, onUnitChange, colors }) => (
  <View
    style={[
      tw`rounded-2xl p-4 mb-4`,
      {
        backgroundColor: colors.surface,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 2,
      },
    ]}
  >
    <View style={tw`flex-row items-center mb-3`}>
      <View style={[tw`w-10 h-10 rounded-xl items-center justify-center`, { backgroundColor: bgColor }]}>
        <Icon name={icon} size={18} color={iconColor} />
      </View>
      <View style={tw`ml-3 flex-1`}>
        <Text style={[tw`text-sm font-bold`, { color: colors.textPrimary }]}>{label}</Text>
        {description && <Text style={[tw`text-xs mt-0.5`, { color: colors.textMuted }]}>{description}</Text>}
      </View>
    </View>

    <View
      style={[
        tw`rounded-xl px-4 py-3`,
        { backgroundColor: colors.inputBg || colors.surfaceElevated },
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        style={[tw`text-base`, { color: colors.textPrimary, padding: 0 }]}
      />
    </View>

    {/* Unit Selector */}
    {unitOptions && unitOptions.length > 0 && (
      <View style={tw`flex-row mt-3`}>
        {unitOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              tw`flex-1 py-2.5 rounded-xl items-center justify-center`,
              {
                backgroundColor: selectedUnit === option ? colors.primary || '#7C4DFF' : (colors.inputBg || colors.surfaceElevated),
                marginRight: option === unitOptions[0] ? 8 : 0,
              },
            ]}
            onPress={() => onUnitChange(option)}
          >
            <Text
              style={[
                tw`text-sm font-semibold`,
                { color: selectedUnit === option ? '#FFFFFF' : colors.textMuted },
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
  </View>
);

const DailyGoalsSettingScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { weightUnit: globalWeightUnit, waterUnit: globalWaterUnit, waistUnit: globalWaistUnit } = useUnitPreferences();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Goal values
  const [stepsGoal, setStepsGoal] = useState('');
  const [waterIntakeGoal, setWaterIntakeGoal] = useState('');
  const [waterIntakeUnit, setWaterIntakeUnit] = useState(globalWaterUnit === 'oz' ? 'ounces' : 'liters');
  const [weightGoal, setWeightGoal] = useState('');
  const [weightUnit, setWeightUnit] = useState(globalWeightUnit);
  const [bodyFatGoal, setBodyFatGoal] = useState('');
  const [waistGoal, setWaistGoal] = useState('');
  const [waistUnit, setWaistUnit] = useState(globalWaistUnit);



  const fetchGoals = useCallback(async () => {
    try {
      const res = await getGoals();
      if (res.data) {
        const goals = res.data;
        setStepsGoal(goals.stepsGoal ? String(goals.stepsGoal) : '');
        setWaterIntakeGoal(goals.waterIntakeGoal ? String(goals.waterIntakeGoal) : '');
        setWaterIntakeUnit(goals.waterIntakeUnit || (globalWaterUnit === 'oz' ? 'ounces' : 'liters'));
        setWeightGoal(goals.weightGoal ? String(goals.weightGoal) : '');
        setWeightUnit(goals.weightUnit || globalWeightUnit);
        setBodyFatGoal(goals.bodyFatGoal ? String(goals.bodyFatGoal) : '');
        setWaistGoal(goals.waistCircumferenceGoal ? String(goals.waistCircumferenceGoal) : '');
        setWaistUnit(goals.waistUnit || globalWaistUnit);
      }
    } catch (e) {
      // Silently fail, user can still set goals
    }
  }, [globalWeightUnit, globalWaterUnit, globalWaistUnit]);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      fetchGoals().finally(() => setLoading(false));
    });
    return () => cancelAnimationFrame(rafId);
  }, [fetchGoals]);

  const markChanged = (setter, value) => {
    setter(value);
    setHasChanges(true);
  };

  // Handle unit switching with value conversion for weight goal
  const handleWeightUnitChange = (newUnit) => {
    if (weightUnit !== newUnit && weightGoal.trim()) {
      const numVal = parseFloat(weightGoal);
      if (!isNaN(numVal) && numVal > 0) {
        const converted = convertWeight(numVal, weightUnit, newUnit);
        setWeightGoal(String(converted));
      }
    }
    setWeightUnit(newUnit);
    setHasChanges(true);
  };

  // Handle unit switching with value conversion for water intake goal
  const handleWaterUnitChange = (newUnit) => {
    if (waterIntakeUnit !== newUnit && waterIntakeGoal.trim()) {
      const numVal = parseFloat(waterIntakeGoal);
      if (!isNaN(numVal) && numVal > 0) {
        const converted = convertVolume(numVal, waterIntakeUnit, newUnit);
        setWaterIntakeGoal(String(converted));
      }
    }
    setWaterIntakeUnit(newUnit);
    setHasChanges(true);
  };

  // Handle unit switching with value conversion for waist circumference goal
  const handleWaistUnitChange = (newUnit) => {
    if (waistUnit !== newUnit && waistGoal.trim()) {
      const numVal = parseFloat(waistGoal);
      if (!isNaN(numVal) && numVal > 0) {
        const converted = convertHeight(numVal, waistUnit, newUnit);
        setWaistGoal(String(converted));
      }
    }
    setWaistUnit(newUnit);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const goalData = {};

      if (stepsGoal.trim()) {
        const val = parseInt(stepsGoal, 10);
        if (isNaN(val) || val <= 0) {
          Toast.show({ type: 'error', text1: 'Invalid steps goal' });
          setSaving(false);
          return;
        }
        goalData.stepsGoal = val;
      }

      if (waterIntakeGoal.trim()) {
        const val = parseFloat(waterIntakeGoal);
        if (isNaN(val) || val <= 0) {
          Toast.show({ type: 'error', text1: 'Invalid water intake goal' });
          setSaving(false);
          return;
        }
        goalData.waterIntakeGoal = val;
        goalData.waterIntakeUnit = waterIntakeUnit;
      }

      if (weightGoal.trim()) {
        const val = parseFloat(weightGoal);
        if (isNaN(val) || val <= 0) {
          Toast.show({ type: 'error', text1: 'Invalid weight goal' });
          setSaving(false);
          return;
        }
        goalData.weightGoal = val;
        goalData.weightUnit = weightUnit;
      }

      if (bodyFatGoal.trim()) {
        const val = parseFloat(bodyFatGoal);
        if (isNaN(val) || val <= 0 || val > 100) {
          Toast.show({ type: 'error', text1: 'Invalid body fat goal (0-100%)' });
          setSaving(false);
          return;
        }
        goalData.bodyFatGoal = val;
      }

      if (waistGoal.trim()) {
        const val = parseFloat(waistGoal);
        if (isNaN(val) || val <= 0) {
          Toast.show({ type: 'error', text1: 'Invalid waist goal' });
          setSaving(false);
          return;
        }
        goalData.waistCircumferenceGoal = val;
        goalData.waistUnit = waistUnit;
      }

      if (Object.keys(goalData).length === 0) {
        Toast.show({ type: 'error', text1: 'Please set at least one goal' });
        setSaving(false);
        return;
      }

      await saveGoals(goalData);
      Toast.show({ type: 'success', text1: 'Goals saved successfully! 🎯' });
      setHasChanges(false);
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to save goals';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.headerBg || colors.surfaceElevated,
          paddingTop: 20,
          paddingBottom: 14,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}
      >
        <View style={tw`flex-row items-center justify-between px-5`}>
          <View style={tw`flex-row items-center`}>
            <TouchableOpacity
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
                { backgroundColor: colors.surface },
              ]}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <View>
              <Text style={[tw`text-sm font-medium`, { color: colors.textSecondary }]}>
                Set Your Targets 🎯
              </Text>
              <Text style={[tw`text-2xl font-bold mt-1`, { color: colors.textPrimary }]}>
                Daily Goals
              </Text>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#7C4DFF" />
          <Text style={[tw`text-sm mt-3 font-medium`, { color: colors.textMuted }]}>
            Loading your goals...
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={tw`px-5 pt-5 pb-28`} showsVerticalScrollIndicator={false}>
          <Text style={[tw`text-sm mb-5`, { color: colors.textMuted }]}>
            Set your daily health targets. These goals are used across the app to track your progress.
          </Text>

          {/* Steps Goal */}
          <GoalInputCard
            icon="directions-walk"
            iconColor="#4CAF50"
            bgColor="#E8F5E9"
            label="Daily Steps Goal"
            description="Recommended: 8,000 - 12,000 steps"
            value={stepsGoal}
            onChangeText={(v) => markChanged(setStepsGoal, v)}
            placeholder="e.g. 10000"
            colors={colors}
          />

          {/* Water Intake Goal */}
          <GoalInputCard
            icon="water-drop"
            iconColor="#2196F3"
            bgColor="#E3F2FD"
            label="Daily Water Intake Goal"
            description="Recommended: 2.5 - 3.5 liters"
            value={waterIntakeGoal}
            onChangeText={(v) => markChanged(setWaterIntakeGoal, v)}
            placeholder="e.g. 2.7"
            unitOptions={['liters', 'ounces']}
            selectedUnit={waterIntakeUnit}
            onUnitChange={handleWaterUnitChange}
            colors={colors}
          />

          {/* Weight Goal */}
          <GoalInputCard
            icon="monitor-weight"
            iconColor="#FF8C42"
            bgColor="#FFE4CC"
            label="Target Weight"
            description="Your ideal weight goal"
            value={weightGoal}
            onChangeText={(v) => markChanged(setWeightGoal, v)}
            placeholder="e.g. 75"
            unitOptions={['kg', 'lbs']}
            selectedUnit={weightUnit}
            onUnitChange={handleWeightUnitChange}
            colors={colors}
          />

          {/* Body Fat Goal */}
          <GoalInputCard
            icon="accessibility-new"
            iconColor="#FF6B6B"
            bgColor="#FFEBEE"
            label="Body Fat Goal (%)"
            description="Healthy range: Men 10-20%, Women 18-28%"
            value={bodyFatGoal}
            onChangeText={(v) => markChanged(setBodyFatGoal, v)}
            placeholder="e.g. 22"
            colors={colors}
          />

          {/* Waist Circumference Goal */}
          <GoalInputCard
            icon="straighten"
            iconColor="#9C27B0"
            bgColor="#F3E5F5"
            label="Waist Circumference Goal"
            description="Healthy: Men < 94cm, Women < 80cm"
            value={waistGoal}
            onChangeText={(v) => markChanged(setWaistGoal, v)}
            placeholder="e.g. 70"
            unitOptions={['cm', 'inches']}
            selectedUnit={waistUnit}
            onUnitChange={handleWaistUnitChange}
            colors={colors}
          />

          {/* Save Button */}
          {hasChanges && (
            <TouchableOpacity
              style={[
                tw`py-4 rounded-2xl items-center justify-center mt-4`,
                { backgroundColor: '#7C4DFF', opacity: saving ? 0.7 : 1 },
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[tw`text-base font-bold`, { color: '#FFFFFF' }]}>Save Goals</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default DailyGoalsSettingScreen;