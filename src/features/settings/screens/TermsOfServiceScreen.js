import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';

const TermSection = ({ number, title, content, colors }) => (
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
      <View style={[tw`w-8 h-8 rounded-lg items-center justify-center mr-3`, { backgroundColor: '#EDE7FF' }]}>
        <Text style={[tw`text-xs font-bold`, { color: '#7C4DFF' }]}>{number}</Text>
      </View>
      <Text style={[tw`text-sm font-bold flex-1`, { color: colors.textPrimary }]}>{title}</Text>
    </View>
    <Text style={[tw`text-xs leading-5`, { color: colors.textMuted }]}>{content}</Text>
  </View>
);

const TermsOfServiceScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const terms = [
    {
      title: 'Acceptance of Terms',
      content: 'By using HealthyVerse, you agree to be bound by these Terms of Service. If you do not agree, please discontinue use of the app.',
    },
    {
      title: 'Health Information Disclaimer',
      content: 'HealthyVerse provides health tracking tools for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment.',
    },
    {
      title: 'User Responsibilities',
      content: 'Users are responsible for the accuracy of data they input. You agree to use the app in compliance with all applicable laws and not to misuse the service.',
    },
    {
      title: 'Account Security',
      content: 'You are responsible for maintaining the confidentiality of your account credentials. Notify us immediately of any unauthorized access.',
    },
    {
      title: 'Service Modifications',
      content: 'We reserve the right to modify, suspend, or discontinue the service at any time. Continued use after changes constitutes acceptance of new terms.',
    },
    {
      title: 'Limitation of Liability',
      content: 'HealthyVerse is not liable for any health decisions made based on data tracked in the app. Always consult healthcare professionals for medical decisions.',
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
              Important Information 📋
            </Text>
            <Text style={[tw`text-2xl font-bold mt-1`, { color: '#1A1D3F' }]}>
              Terms of Service
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
        {/* Header Card */}
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
            <View style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#FFF3E0' }]}>
              <Icon name="description" size={20} color="#FF8C42" />
            </View>
            <View style={tw`ml-3`}>
              <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>Terms of Service</Text>
              <Text style={[tw`text-xs mt-0.5`, { color: colors.textMuted }]}>Effective: July 2026</Text>
            </View>
          </View>
        </View>

        {/* Terms Sections */}
        {terms.map((term, i) => (
          <TermSection key={i} number={i + 1} title={term.title} content={term.content} colors={colors} />
        ))}
      </ScrollView>
    </View>
  );
};

export default TermsOfServiceScreen;