import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';
import { useUserContext } from '../../../context/UserContext';
import { useUnitPreferences } from '../../../context/UnitPreferencesContext';
import client from '../../../api/client';

const UnitOption = ({ label, options, selected, onSelect, colors }) => (
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
    <Text style={[tw`text-sm font-bold mb-3`, { color: colors.textPrimary }]}>{label}</Text>
    <View style={tw`flex-row`}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            tw`flex-1 py-3 rounded-xl items-center justify-center`,
            {
              backgroundColor: selected === option.value ? '#7C4DFF' : '#F5F5F7',
              marginRight: option !== options[options.length - 1] ? 10 : 0,
            },
          ]}
          onPress={() => onSelect(option.value)}
        >
          <Text
            style={[
              tw`text-sm font-semibold`,
              { color: selected === option.value ? '#FFFFFF' : colors.textMuted },
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const UnitsSettingScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { userProfile, updateUserProfile } = useUserContext();
  const { updatePreferences } = useUnitPreferences();

  const [weightUnit, setWeightUnit] = useState('kg');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [waterUnit, setWaterUnit] = useState('L');
  const [waistUnit, setWaistUnit] = useState('cm');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize from user profile
  useEffect(() => {
    if (userProfile) {
      setWeightUnit(userProfile.weightUnit || 'kg');
      setHeightUnit(userProfile.heightUnit || 'cm');
      setWaistUnit(userProfile.waistUnit || 'cm');
      // Normalize water unit for display
      const rawWater = userProfile.waterUnit || 'L';
      if (rawWater === 'liters' || rawWater === 'L') {
        setWaterUnit('L');
      } else {
        setWaterUnit('oz');
      }
    }
  }, [userProfile]);

  const handleUnitChange = (setter, value) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('weightUnit', weightUnit);
      formData.append('heightUnit', heightUnit);
      formData.append('waistUnit', waistUnit);
      // Send water unit in API format
      const waterUnitAPI = waterUnit === 'oz' ? 'ounces' : 'liters';
      formData.append('waterUnit', waterUnitAPI);

      // Also send existing profile fields to avoid overwriting
      if (userProfile.name) formData.append('name', userProfile.name);
      if (userProfile.email) formData.append('email', userProfile.email);
      if (userProfile.phone) formData.append('phone', userProfile.phone);
      if (userProfile.dob) formData.append('dob', userProfile.dob);
      if (userProfile.gender) formData.append('gender', userProfile.gender);
      if (userProfile.height) formData.append('height', String(userProfile.height));
      if (userProfile.weight) formData.append('weight', String(userProfile.weight));

      const res = await client.put('/editprofile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      updateUserProfile(res.data);

      // Sync unit preferences globally
      updatePreferences({
        weightUnit,
        heightUnit,
        waterUnit,
        waistUnit,
      });

      Toast.show({ type: 'success', text1: 'Units updated successfully! ✅' });
      setHasChanges(false);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Could not update units. Please try again.';
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#F3EAFF',
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
                { backgroundColor: '#FFFFFF' },
              ]}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={20} color="#1A1D3F" />
            </TouchableOpacity>
            <View>
              <Text style={[tw`text-sm font-medium`, { color: '#A0A3BD' }]}>
                Preferences 📐
              </Text>
              <Text style={[tw`text-2xl font-bold mt-1`, { color: '#1A1D3F' }]}>
                Units
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={tw`px-5 pt-5 pb-28`} showsVerticalScrollIndicator={false}>
        <Text style={[tw`text-sm mb-5`, { color: colors.textMuted }]}>
          Choose your preferred measurement units. Changes will apply across the entire app.
        </Text>

        <UnitOption
          label="Weight"
          options={[
            { value: 'kg', label: 'Kilograms (kg)' },
            { value: 'lbs', label: 'Pounds (lbs)' },
          ]}
          selected={weightUnit}
          onSelect={(v) => handleUnitChange(setWeightUnit, v)}
          colors={colors}
        />

        <UnitOption
          label="Height"
          options={[
            { value: 'cm', label: 'Centimeters (cm)' },
            { value: 'ft', label: 'Feet (ft)' },
          ]}
          selected={heightUnit}
          onSelect={(v) => handleUnitChange(setHeightUnit, v)}
          colors={colors}
        />

        <UnitOption
          label="Water Intake"
          options={[
            { value: 'L', label: 'Liters (L)' },
            { value: 'oz', label: 'Ounces (oz)' },
          ]}
          selected={waterUnit}
          onSelect={(v) => handleUnitChange(setWaterUnit, v)}
          colors={colors}
        />

        <UnitOption
          label="Waist Circumference"
          options={[
            { value: 'cm', label: 'Centimeters (cm)' },
            { value: 'inches', label: 'Inches (in)' },
          ]}
          selected={waistUnit}
          onSelect={(v) => handleUnitChange(setWaistUnit, v)}
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
              <Text style={[tw`text-base font-bold`, { color: '#FFFFFF' }]}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

export default UnitsSettingScreen;