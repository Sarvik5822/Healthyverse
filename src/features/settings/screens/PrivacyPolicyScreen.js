import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';

const PolicySection = ({ title, content, iconName, iconColor, colors }) => (
  <View
    style={[
      tw`rounded-2xl p-4 mb-3`,
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
      <View style={[tw`w-8 h-8 rounded-lg items-center justify-center mr-3`, { backgroundColor: iconColor + '15' }]}>
        <Icon name={iconName} size={16} color={iconColor} />
      </View>
      <Text style={[tw`text-sm font-bold flex-1`, { color: colors.textPrimary }]}>{title}</Text>
    </View>
    <Text style={[tw`text-xs leading-5`, { color: colors.textMuted }]}>{content}</Text>
  </View>
);

const PrivacyPolicyScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const sections = [
    {
      title: 'Data Collection',
      content: 'We collect health metrics you voluntarily enter (steps, weight, heart rate, etc.), account information (name, email), and device information for app functionality.',
      iconName: 'storage',
      iconColor: '#2196F3',
    },
    {
      title: 'Data Usage',
      content: 'Your data is used solely to provide health tracking services, generate insights, and improve your experience. We never sell your personal data.',
      iconName: 'analytics',
      iconColor: '#7C4DFF',
    },
    {
      title: 'Data Security',
      content: 'All health data is encrypted in transit and at rest. We use industry-standard security measures to protect your information.',
      iconName: 'security',
      iconColor: '#4CAF50',
    },
    {
      title: 'Data Sharing',
      content: 'We do not share your personal health data with third parties without your explicit consent. Leaderboard data is shared only with your consent.',
      iconName: 'share',
      iconColor: '#FF8C42',
    },
    {
      title: 'Your Rights',
      content: 'You can request deletion of your data at any time through Settings > Delete Account, or by contacting our support team.',
      iconName: 'gavel',
      iconColor: '#FF4444',
    },
  ];

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
              Your Data Matters 🔒
            </Text>
            <Text style={[tw`text-2xl font-bold mt-1`, { color: '#1A1D3F' }]}>
              Privacy Policy
            </Text>
          </View>
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

      <ScrollView contentContainerStyle={tw`px-5 pt-5 pb-28`} showsVerticalScrollIndicator={false}>
        {/* Last Updated */}
        <View
          style={[
            tw`rounded-3xl p-5 mb-5`,
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
          <View style={tw`flex-row items-center`}>
            <View style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#EDE7FF' }]}>
              <Icon name="privacy-tip" size={20} color="#7C4DFF" />
            </View>
            <View style={tw`ml-3`}>
              <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>Privacy Policy</Text>
              <Text style={[tw`text-xs mt-0.5`, { color: colors.textMuted }]}>Last updated: July 2026</Text>
            </View>
          </View>
        </View>

        {/* Policy Sections */}
        {sections.map((section, i) => (
          <PolicySection key={i} {...section} colors={colors} />
        ))}
      </ScrollView>
    </View>
  );
};

export default PrivacyPolicyScreen;