import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';

const SettingItem = ({ icon, iconColor, label, subtitle, onPress, colors, showArrow = true }) => (
  <TouchableOpacity
    style={[
      tw`flex-row items-center py-4 px-4 mb-3 rounded-2xl`,
      {
        backgroundColor: colors.surface,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 2,
      },
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[tw`w-10 h-10 rounded-xl items-center justify-center`, { backgroundColor: (iconColor || colors.primary) + '15' }]}>
      <Icon name={icon} size={18} color={iconColor || colors.primary} />
    </View>
    <View style={tw`flex-1 ml-3`}>
      <Text style={[tw`text-sm font-bold`, { color: colors.textPrimary }]}>{label}</Text>
      {subtitle && <Text style={[tw`text-xs mt-0.5`, { color: colors.textMuted }]}>{subtitle}</Text>}
    </View>
    {showArrow && <Icon name="chevron-right" size={20} color={colors.textMuted} />}
  </TouchableOpacity>
);

const SectionTitle = ({ title, colors }) => (
  <Text style={[tw`text-base font-bold mb-3 mt-5 px-1`, { color: colors.textPrimary }]}>
    {title}
  </Text>
);

const SettingsScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Purple gradient header - same as Dashboard */}
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
          <View>
            <Text style={[tw`text-sm font-medium`, { color: '#A0A3BD' }]}>
              Manage Your App ⚙️
            </Text>
            <Text style={[tw`text-2xl font-bold mt-1`, { color: '#1A1D3F' }]}>
              Settings
            </Text>
          </View>
          <View style={tw`flex-row items-center`}>
            <TouchableOpacity
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center`,
                { backgroundColor: '#FFFFFF' },
              ]}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('MainTabs');
                }
              }}
            >
              <Icon name="arrow-back" size={20} color="#1A1D3F" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={tw`px-5 pt-2 pb-28`} showsVerticalScrollIndicator={false}>
        {/* Account */}
        <SectionTitle title="Account" colors={colors} />
        <SettingItem icon="lock" iconColor="#7C4DFF" label="Change Password" subtitle="Update your password" onPress={() => {}} colors={colors} />
        <SettingItem icon="notifications" iconColor="#FF8C42" label="Notifications" subtitle="Push notification preferences" onPress={() => {}} colors={colors} />

        {/* Preferences */}
        <SectionTitle title="Preferences" colors={colors} />
        <SettingItem icon="straighten" iconColor="#2196F3" label="Units" subtitle="kg/lbs, cm/ft, L/oz" onPress={() => navigation.navigate('UnitsSetting')} colors={colors} />
        <SettingItem icon="dark-mode" iconColor="#7C4DFF" label="Appearance" subtitle="Dark / Light mode" onPress={() => {}} colors={colors} />
        <SettingItem icon="language" iconColor="#4CAF50" label="Language" subtitle="English" onPress={() => {}} colors={colors} />

        {/* Goals */}
        <SectionTitle title="Goals" colors={colors} />
        <SettingItem icon="flag" iconColor="#4CAF50" label="Daily Goals" subtitle="Steps, water, weight targets" onPress={() => navigation.navigate('DailyGoalsSetting')} colors={colors} />

        {/* Data */}
        <SectionTitle title="Data & Privacy" colors={colors} />
        <SettingItem icon="download" iconColor="#2196F3" label="Export Data" subtitle="Download your health data" onPress={() => {}} colors={colors} />
        <SettingItem icon="delete-forever" iconColor="#FF4444" label="Delete Account" subtitle="Permanently delete your account" onPress={() => {}} colors={colors} />

        {/* Support */}
        <SectionTitle title="Support" colors={colors} />
        <SettingItem icon="help-outline" iconColor="#2196F3" label="Help Center" onPress={() => navigation.navigate('HelpCenter')} colors={colors} />
        <SettingItem icon="mail-outline" iconColor="#4CAF50" label="Contact Us" onPress={() => navigation.navigate('ContactUs')} colors={colors} />
        <SettingItem icon="privacy-tip" iconColor="#7C4DFF" label="Privacy Policy" onPress={() => navigation.navigate('PrivacyPolicy')} colors={colors} />
        <SettingItem icon="description" iconColor="#FF8C42" label="Terms of Service" onPress={() => navigation.navigate('TermsOfService')} colors={colors} />

        {/* App Info */}
        <View style={tw`items-center mt-8`}>
          <Text style={[tw`text-xs font-medium`, { color: colors.textMuted }]}>HealthyVerse v1.0.0</Text>
          <TouchableOpacity style={tw`mt-2`}>
            <Text style={[tw`text-xs font-bold`, { color: '#7C4DFF' }]}>Rate this app ⭐</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default SettingsScreen;