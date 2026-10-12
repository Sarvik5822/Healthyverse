import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';

const FAQItem = ({ question, answer, colors }) => (
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
    <View style={tw`flex-row items-start`}>
      <View style={[tw`w-8 h-8 rounded-lg items-center justify-center mr-3`, { backgroundColor: '#EDE7FF' }]}>
        <Icon name="help-outline" size={16} color="#7C4DFF" />
      </View>
      <View style={tw`flex-1`}>
        <Text style={[tw`text-sm font-bold mb-2`, { color: colors.textPrimary }]}>{question}</Text>
        <Text style={[tw`text-xs leading-5`, { color: colors.textMuted }]}>{answer}</Text>
      </View>
    </View>
  </View>
);

const HelpCenterScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const faqs = [
    { q: 'How do I track my daily steps?', a: 'Go to the Daily Log tab and enter your step count, or use the Steps tracker for detailed history.' },
    { q: 'How do I set health goals?', a: 'Tap the flag icon in the header to view and manage your health goals, or go to Profile > Health Goals.' },
    { q: 'Can I export my health data?', a: 'This feature is coming soon. Stay tuned for updates!' },
    { q: 'How do I change my password?', a: 'Go to Settings > Change Password to update your account security.' },
    { q: 'How do I track my menstrual cycle?', a: 'If your profile gender is set to Female, the Menstrual Tracker will appear in your Daily Log and Drawer menu.' },
    { q: 'How do I add friends?', a: 'Go to the Leaderboard tab, tap on any user, and press the Add Friend button in their profile.' },
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
              We're Here to Help 💡
            </Text>
            <Text style={[tw`text-2xl font-bold mt-1`, { color: '#1A1D3F' }]}>
              Help Center
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
        {/* FAQ Section Title */}
        <Text style={[tw`text-xl font-bold mb-4`, { color: colors.textPrimary }]}>
          Frequently Asked Questions
        </Text>

        {faqs.map((faq, i) => (
          <FAQItem key={i} question={faq.q} answer={faq.a} colors={colors} />
        ))}

        {/* Contact Support Card */}
        <View
          style={[
            tw`rounded-3xl p-5 mt-5 items-center`,
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
          <View style={[tw`w-12 h-12 rounded-full items-center justify-center mb-3`, { backgroundColor: '#EDE7FF' }]}>
            <Icon name="support-agent" size={24} color="#7C4DFF" />
          </View>
          <Text style={[tw`text-base font-bold mb-1`, { color: colors.textPrimary }]}>
            Still need help?
          </Text>
          <Text style={[tw`text-xs text-center mb-4`, { color: colors.textMuted }]}>
            Our support team is ready to assist you
          </Text>
          <TouchableOpacity
            style={[tw`px-6 py-3 rounded-xl`, { backgroundColor: '#7C4DFF' }]}
            onPress={() => navigation.navigate('ContactUs')}
          >
            <Text style={tw`text-sm font-bold text-white`}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default HelpCenterScreen;