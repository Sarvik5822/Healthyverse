import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import Button from '../../../shared/ui/Button';
import Input from '../../../shared/ui/Input';
import ErrorMessage from '../../../shared/feedback/ErrorMessage';
import Toast from 'react-native-toast-message';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';
import { isValidEmail } from '../../../utils/validators';

const ForgotPasswordScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!isValidEmail(email)) { setError('Please enter a valid email'); return; }
    setLoading(true);
    try {
      Toast.show({ type: 'success', text1: 'OTP sent to your email' });
      navigation.navigate('OTP', { email });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw`flex-1`}>
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
          <View style={[tw`w-16 h-16 rounded-2xl items-center justify-center mb-6`, { backgroundColor: colors.purpleLight }]}>
            <Icon name="lock-reset" size={28} color={colors.primary} />
          </View>
          <Text style={[tw`text-2xl font-bold mb-2`, { color: colors.textPrimary }]}>Forgot Password?</Text>
          <Text style={[tw`text-sm mb-8`, { color: colors.textSecondary }]}>
            Enter your email and we'll send you a verification code to reset your password.
          </Text>

          <ErrorMessage message={error} />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            leftIcon={<Icon name="email" size={18} color={colors.textMuted} />}
          />

          <View style={tw`mt-4`}>
            <Button title="Send Verification Code" onPress={handleSubmit} loading={loading} fullWidth size="lg" />
          </View>

          <TouchableOpacity onPress={() => navigation.goBack()} style={tw`items-center mt-6`}>
            <Text style={[tw`text-sm font-bold`, { color: colors.primary }]}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;