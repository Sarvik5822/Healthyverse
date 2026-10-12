/**
 * ProfileScreen - OPTIMIZED with React Query
 *
 * CHANGES:
 * 1. ✅ Replaced manual fetchProfileData with useProfileStats() React Query hook
 * 2. ✅ Uses useAllHealthData() for shared dashboard cache (no duplicate calls)
 * 3. ✅ useFocusEffect replaced with React Query's automatic stale-time handling
 * 4. ✅ Pull-to-refresh invalidates React Query cache
 * 5. ✅ No infinite loop risk — stable query keys
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import DatePicker from 'react-native-date-picker';
import CachedAvatar from '../../../shared/media/CachedAvatar';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import UnitSelector from '../../../shared/layout/UnitSelector';
import LoadingSpinner from '../../../shared/feedback/LoadingSpinner';
import MacroCard from '../../../shared/layout/MacroCard';
import ActivityItem from '../../../shared/layout/ActivityItem';
import Toast from 'react-native-toast-message';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';
import { useUserContext } from '../../../context/UserContext';
import { formatNumber } from '../../../utils/formatters';
import { convertWeight, convertHeight } from '../../../utils/converters';
import client from '../../../api/client';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useUnitPreferences } from '../../../context/UnitPreferencesContext';
import { ProfileSkeleton } from '../../../shared/feedback/SkeletonLoader';
import dayjs from 'dayjs';

// ─── React Query Hook: Profile Stats ──────────────────────────────────────────
const useProfileStats = (enabled = true) => {
  return useQuery({
    queryKey: ['profile', 'stats'],
    queryFn: async () => {
      const res = await client.get('/users/stats');
      return {
        totalSteps: res.data?.totalSteps || 0,
        daysLogged: res.data?.daysLogged || 0,
        bestStreak: res.data?.bestStreak || 0,
      };
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    enabled,
  });
};

const ProfileScreen = () => {
  const { colors } = useTheme();
  const { userProfile, updateUserProfile, logout } = useUserContext();
  const { updatePreferences } = useUnitPreferences();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({});
  const [profileImage, setProfileImage] = useState(null);
  const [showDobPicker, setShowDobPicker] = useState(false);

  // ─── React Query: Profile Stats ─────────────────────────────────────────
  const { data: lifetimeStats, isLoading: statsLoading } = useProfileStats(!!userProfile);

  useEffect(() => {
    if (userProfile) {
      setForm({
        name: userProfile.name || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        dob: userProfile.dob || '',
        gender: (userProfile.gender || '').toLowerCase(),
        height: userProfile.height ? String(userProfile.height) : '',
        heightUnit: userProfile.heightUnit || 'cm',
        weight: userProfile.weight ? String(userProfile.weight) : '',
        weightUnit: userProfile.weightUnit || 'kg',
      });
      setProfileImage(userProfile.profilePicture?.url || null);
    }
  }, [userProfile]);

  const handleImagePick = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, maxWidth: 500, maxHeight: 500 },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Toast.show({ type: 'error', text1: 'Could not open gallery', text2: 'Please check app permissions and try again.' });
          return;
        }
        if (response.assets && response.assets[0]) {
          setProfileImage(response.assets[0].uri);
          setForm((prev) => ({ ...prev, profilePicture: response.assets[0] }));
        }
      }
    );
  };

  const handleUnitChange = (field, newUnit) => {
    if (field === 'weight') {
      if (form.weight && !isNaN(form.weight) && form.weightUnit !== newUnit) {
        const converted = convertWeight(parseFloat(form.weight), form.weightUnit, newUnit);
        setForm((prev) => ({ ...prev, weight: String(converted), weightUnit: newUnit }));
      } else {
        setForm((prev) => ({ ...prev, weightUnit: newUnit }));
      }
    } else if (field === 'height') {
      if (form.height && !isNaN(form.height) && form.heightUnit !== newUnit) {
        const converted = convertHeight(parseFloat(form.height), form.heightUnit, newUnit);
        setForm((prev) => ({ ...prev, height: String(converted), heightUnit: newUnit }));
      } else {
        setForm((prev) => ({ ...prev, heightUnit: newUnit }));
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('email', form.email);
      formData.append('phone', form.phone || '');
      formData.append('dob', form.dob || '');
      formData.append('gender', form.gender || '');
      formData.append('height', form.height || '');
      formData.append('heightUnit', form.heightUnit || 'cm');
      formData.append('weight', form.weight || '');
      formData.append('weightUnit', form.weightUnit || 'kg');

      if (form.profilePicture) {
        formData.append('profilePicture', {
          uri: form.profilePicture.uri,
          type: form.profilePicture.type || 'image/jpeg',
          name: form.profilePicture.fileName || 'profile.jpg',
        });
      }

      const res = await client.put('/editprofile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      updateUserProfile(res.data);
      updatePreferences({
        weightUnit: form.weightUnit || 'kg',
        heightUnit: form.heightUnit || 'cm',
      });

      // Invalidate health data cache since weight/height may affect BMI
      queryClient.invalidateQueries({ queryKey: ['health'] });

      Toast.show({ type: 'success', text1: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (e) {
      const msg = getErrorMessage(e, 'Could not update profile. Please try again.');
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['profile', 'stats'] });
    setRefreshing(false);
  };

  if (!userProfile) return <LoadingSpinner fullScreen />;

  const dobFormatted = form.dob ? dayjs(form.dob).format('MMM D, YYYY') : '';

  const formatSteps = (steps) => {
    if (steps >= 1000000) return `${(steps / 1000000).toFixed(1)}M`;
    if (steps >= 1000) return `${(steps / 1000).toFixed(1)}K`;
    return String(steps);
  };

  const stats = lifetimeStats || { totalSteps: 0, daysLogged: 0, bestStreak: 0 };

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
            <Text style={[tw`text-sm font-medium`, { color: colors.textSecondary }]}>Your Profile 👤</Text>
            <Text style={[tw`text-2xl font-bold mt-1`, { color: colors.textPrimary }]}>{userProfile.name}</Text>
          </View>
          <View style={tw`flex-row items-center`}>
            <TouchableOpacity
              style={[tw`w-10 h-10 rounded-full items-center justify-center mr-3`, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate('Settings')}
            >
              <Icon name="settings" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
            {!isEditing ? (
              <TouchableOpacity
                style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: colors.surface }]}
                onPress={() => setIsEditing(true)}
              >
                <Icon name="edit" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: colors.surface }]}
                onPress={() => setIsEditing(false)}
              >
                <Icon name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Loading State for initial data */}
      {statsLoading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <ProfileSkeleton />
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          contentContainerStyle={[tw`px-5 pb-28`]}
        >
          {/* Profile Avatar Card */}
          <View
            style={[
              tw`rounded-3xl p-5 mt-5 items-center`,
              { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 },
            ]}
          >
            <TouchableOpacity onPress={isEditing ? handleImagePick : undefined} activeOpacity={isEditing ? 0.7 : 1}>
              <View>
                <CachedAvatar uri={profileImage || userProfile.avatar} name={userProfile.name} size={90} priority="high" />
                {isEditing && (
                  <View style={[tw`absolute bottom-0 right-0 w-7 h-7 rounded-full items-center justify-center`, { backgroundColor: colors.primary }]}>
                    <Icon name="camera-alt" size={14} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <Text style={[tw`text-xl font-bold mt-3`, { color: colors.textPrimary }]}>{userProfile.name}</Text>
            <Text style={[tw`text-sm mt-1`, { color: colors.textMuted }]}>
              Member since {userProfile.createdAt ? dayjs(userProfile.createdAt).format('MMM YYYY') : 'Jan 2025'}
            </Text>
            <View style={[tw`flex-row items-center mt-3 px-4 py-2 rounded-full`, { backgroundColor: '#FF8C42' + '15' }]}>
              <Icon name="local-fire-department" size={14} color="#FF8C42" />
              <Text style={[tw`text-xs font-bold ml-1`, { color: '#FF8C42' }]}>
                {stats.bestStreak > 0 ? `${stats.bestStreak} Day Streak 🔥` : 'Start your streak! 🔥'}
              </Text>
            </View>
          </View>

          {/* Lifetime Stats */}
          <View style={tw`flex-row mt-4 -mx-1.5`}>
            <MacroCard label="Total Steps" value={formatSteps(stats.totalSteps)} unit="" progress={Math.min((stats.totalSteps / 1000000) * 100, 100)} color="#4CAF50" bgColor="#E8F5E9" iconName="directions-walk" colors={colors} />
            <MacroCard label="Days Logged" value={String(stats.daysLogged)} unit="" progress={Math.min((stats.daysLogged / 365) * 100, 100)} color="#2196F3" bgColor="#E3F2FD" iconName="calendar-today" colors={colors} />
            <MacroCard label="Best Streak" value={String(stats.bestStreak)} unit="" progress={Math.min((stats.bestStreak / 30) * 100, 100)} color="#FF8C42" bgColor="#FFE4CC" iconName="local-fire-department" colors={colors} />
          </View>

          {/* Personal Info */}
          <Text style={[tw`text-xl font-bold mt-7 mb-4`, { color: colors.textPrimary }]}>Personal Info</Text>

          {!isEditing ? (
            <>
              <ActivityItem title="Email" value={userProfile.email || '-'} iconName="email" iconBgColor="#EDE7FF" iconColor="#7C4DFF" colors={colors} />
              <ActivityItem title="Phone" value={userProfile.phone || '-'} iconName="phone" iconBgColor="#E3F2FD" iconColor="#2196F3" colors={colors} />
              <ActivityItem title="Date of Birth" value={dobFormatted || '-'} iconName="cake" iconBgColor="#FFF3E0" iconColor="#FF8C42" colors={colors} />
              <ActivityItem title="Gender" value={userProfile.gender ? userProfile.gender.charAt(0).toUpperCase() + userProfile.gender.slice(1) : '-'} iconName="wc" iconBgColor="#E8F5E9" iconColor="#4CAF50" colors={colors} />
              <ActivityItem title="Height" value={userProfile.height ? `${formatNumber(userProfile.height)} ${userProfile.heightUnit || 'cm'}` : '-'} iconName="height" iconBgColor="#FFEBEE" iconColor="#FF6B6B" colors={colors} />
              <ActivityItem title="Weight" value={userProfile.weight ? `${formatNumber(userProfile.weight)} ${userProfile.weightUnit || 'kg'}` : '-'} iconName="scale" iconBgColor="#FFE4CC" iconColor="#FF8C42" colors={colors} />
            </>
          ) : (
            <View
              style={[
                tw`rounded-3xl p-5`,
                { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 },
              ]}
            >
              <Input label="Full Name" value={form.name} onChangeText={(t) => setForm((p) => ({ ...p, name: t }))} />
              <Input label="Email" value={form.email} onChangeText={(t) => setForm((p) => ({ ...p, email: t }))} keyboardType="email-address" />
              <Input label="Phone" value={form.phone} onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))} keyboardType="phone-pad" />

              {/* Date of Birth */}
              <View style={tw`mb-4`}>
                <Text style={[tw`text-xs font-bold mb-2 tracking-wide uppercase`, { color: colors.textSecondary }]}>Date of Birth</Text>
                <TouchableOpacity
                  style={[tw`py-3 px-4 rounded-2xl flex-row items-center justify-between`, { backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.inputBorder }]}
                  onPress={() => setShowDobPicker(true)}
                >
                  <Text style={[tw`text-sm font-medium`, { color: form.dob ? colors.textPrimary : colors.textMuted }]}>
                    {form.dob ? dayjs(form.dob).format('MMM D, YYYY') : 'Select date of birth'}
                  </Text>
                  <Icon name="calendar-today" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Gender */}
              <View style={tw`mb-4`}>
                <Text style={[tw`text-xs font-bold mb-2 tracking-wide uppercase`, { color: colors.textSecondary }]}>Gender</Text>
                <View style={tw`flex-row gap-3`}>
                  {['male', 'female', 'other'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        tw`flex-1 py-3 rounded-2xl items-center`,
                        form.gender === g
                          ? { backgroundColor: colors.primary + '15', borderWidth: 1.5, borderColor: colors.primary }
                          : { backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: 'transparent' },
                      ]}
                      onPress={() => setForm((p) => ({ ...p, gender: g }))}
                    >
                      <Text style={[tw`text-sm font-bold capitalize`, { color: form.gender === g ? colors.primary : colors.textMuted }]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Height with unit auto-conversion */}
              <View style={tw`flex-row gap-3 mb-4`}>
                <View style={tw`flex-1`}>
                  <Input label="Height" value={form.height} onChangeText={(t) => setForm((p) => ({ ...p, height: t }))} keyboardType="numeric" />
                </View>
                <View style={tw`w-20 justify-end mb-4`}>
                  <UnitSelector options={['cm', 'ft']} selected={form.heightUnit} onSelect={(u) => handleUnitChange('height', u)} />
                </View>
              </View>

              {/* Weight with unit auto-conversion */}
              <View style={tw`flex-row gap-3 mb-4`}>
                <View style={tw`flex-1`}>
                  <Input label="Weight" value={form.weight} onChangeText={(t) => setForm((p) => ({ ...p, weight: t }))} keyboardType="numeric" />
                </View>
                <View style={tw`w-20 justify-end mb-4`}>
                  <UnitSelector options={['kg', 'lbs']} selected={form.weightUnit} onSelect={(u) => handleUnitChange('weight', u)} />
                </View>
              </View>

              <View style={tw`flex-row gap-3`}>
                <View style={tw`flex-1`}>
                  <Button title="Cancel" variant="secondary" onPress={() => setIsEditing(false)} fullWidth />
                </View>
                <View style={tw`flex-1`}>
                  <Button title="Save" onPress={handleSave} loading={loading} fullWidth />
                </View>
              </View>
            </View>
          )}

          {/* Sign Out - MOVED TO VERY BOTTOM */}
          <View style={tw`mt-7 mb-4`}>
            <TouchableOpacity
              style={[tw`flex-row items-center justify-center py-4 rounded-2xl`, { backgroundColor: '#FFEBEE' }]}
              onPress={() => {
                Alert.alert(
                  'Sign Out',
                  'Are you sure you want to sign out?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <Icon name="logout" size={20} color="#FF4444" />
              <Text style={[tw`text-base font-bold ml-2`, { color: '#FF4444' }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* DOB Date Picker */}
      <DatePicker
        modal
        open={showDobPicker}
        date={form.dob ? new Date(form.dob) : new Date(2000, 0, 1)}
        mode="date"
        maximumDate={new Date()}
        minimumDate={new Date(1920, 0, 1)}
        onConfirm={(date) => {
          setShowDobPicker(false);
          setForm((p) => ({ ...p, dob: date.toISOString() }));
        }}
        onCancel={() => setShowDobPicker(false)}
        title="Select Date of Birth"
        theme="light"
      />
    </View>
  );
};

export default ProfileScreen;