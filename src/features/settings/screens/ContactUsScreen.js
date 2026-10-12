import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import Input from '../../../shared/ui/Input';
import Toast from 'react-native-toast-message';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';

const ContactUsScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Toast.show({ type: 'error', text1: 'Please fill in all fields', text2: 'Both subject and message are required.' });
      return;
    }
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      Toast.show({ type: 'success', text1: 'Message sent! ✉️', text2: 'We\'ll get back to you soon.' });
      setSubject('');
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

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
              Get In Touch ✉️
            </Text>
            <Text style={[tw`text-2xl font-bold mt-1`, { color: '#1A1D3F' }]}>
              Contact Us
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
        {/* Contact Form Card */}
        <View
          style={[
            tw`rounded-3xl p-5`,
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
          <Text style={[tw`text-base font-bold mb-1`, { color: colors.textPrimary }]}>
            Send us a message
          </Text>
          <Text style={[tw`text-xs mb-5`, { color: colors.textMuted }]}>
            We typically respond within 24 hours
          </Text>

          <Input
            label="Subject"
            value={subject}
            onChangeText={setSubject}
            placeholder="What's this about?"
          />
          <View style={tw`mt-3`}>
            <Input
              label="Message"
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us more..."
              multiline
              numberOfLines={5}
            />
          </View>

          <TouchableOpacity
            style={[
              tw`mt-5 py-4 rounded-xl items-center`,
              { backgroundColor: loading ? '#B39DDB' : '#7C4DFF' },
            ]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={tw`text-sm font-bold text-white`}>
              {loading ? 'Sending...' : 'Send Message'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Contact Options */}
        <Text style={[tw`text-base font-bold mt-7 mb-3`, { color: colors.textPrimary }]}>
          Other Ways to Reach Us
        </Text>

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
          <View style={tw`flex-row items-center`}>
            <View style={[tw`w-10 h-10 rounded-xl items-center justify-center`, { backgroundColor: '#E3F2FD' }]}>
              <Icon name="email" size={18} color="#2196F3" />
            </View>
            <View style={tw`ml-3 flex-1`}>
              <Text style={[tw`text-sm font-bold`, { color: colors.textPrimary }]}>Email</Text>
              <Text style={[tw`text-xs mt-0.5`, { color: colors.textMuted }]}>support@healthyverse.com</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </View>
        </View>

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
          <View style={tw`flex-row items-center`}>
            <View style={[tw`w-10 h-10 rounded-xl items-center justify-center`, { backgroundColor: '#E8F5E9' }]}>
              <Icon name="chat" size={18} color="#4CAF50" />
            </View>
            <View style={tw`ml-3 flex-1`}>
              <Text style={[tw`text-sm font-bold`, { color: colors.textPrimary }]}>Live Chat</Text>
              <Text style={[tw`text-xs mt-0.5`, { color: colors.textMuted }]}>Available Mon-Fri, 9am-5pm</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ContactUsScreen;