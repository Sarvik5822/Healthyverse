import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import ErrorMessage from '../../shared/feedback/ErrorMessage';
import Toast from 'react-native-toast-message';
import tw from '../../theme/tw';
import useTheme from '../../hooks/useTheme';

const OTPScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const email = route.params?.email || '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setError('');
    if (otp.length < 4) { setError('Please enter a valid OTP'); return; }
    setLoading(true);
    try {
      Toast.show({ type: 'success', text1: 'OTP verified' });
      navigation.navigate('ResetPassword', { email, otp });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[tw`flex-1 px-5`, { backgroundColor: colors.background }]}>
      <View style={tw`flex-row items-center py-4`}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[tw`w-10 h-10 rounded-xl items-center justify-center`, { backgroundColor: colors.surface }]}
        >
          <Icon name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={tw`flex-1 justify-center`}>
        <View style={[tw`w-16 h-16 rounded-2xl items-center justify-center mb-6`, { backgroundColor: colors.accentLight }]}>
          <Icon name="verified" size={28} color={colors.accent} />
        </View>
        <Text style={[tw`text-2xl font-bold mb-2`, { color: colors.textPrimary }]}>Verify OTP</Text>
        <Text style={[tw`text-sm mb-8`, { color: colors.textSecondary }]}>
          Enter the verification code sent to {email}
        </Text>

        <ErrorMessage message={error} />

        <Input
          label="Verification Code"
          value={otp}
          onChangeText={setOtp}
          placeholder="Enter OTP"
          keyboardType="number-pad"
          leftIcon={<Icon name="pin" size={18} color={colors.textMuted} />}
        />

        <View style={tw`mt-4`}>
          <Button title="Verify" onPress={handleVerify} loading={loading} fullWidth size="lg" />
        </View>

        <TouchableOpacity style={tw`items-center mt-6`}>
          <Text style={[tw`text-sm font-bold`, { color: colors.primary }]}>Resend Code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OTPScreen;