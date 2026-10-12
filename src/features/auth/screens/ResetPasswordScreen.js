import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import Button from '../../../shared/ui/Button';
import Input from '../../../shared/ui/Input';
import ErrorMessage from '../../../shared/feedback/ErrorMessage';
import Toast from 'react-native-toast-message';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';
import { isValidPassword } from '../../../utils/validators';

const ResetPasswordScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleReset = async () => {
    setError('');
    if (!isValidPassword(password)) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      Toast.show({ type: 'success', text1: 'Password reset successfully' });
      navigation.navigate('Login');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
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
          <Icon name="lock" size={28} color={colors.accent} />
        </View>
        <Text style={[tw`text-2xl font-bold mb-2`, { color: colors.textPrimary }]}>Reset Password</Text>
        <Text style={[tw`text-sm mb-8`, { color: colors.textSecondary }]}>
          Create a new strong password for your account.
        </Text>

        <ErrorMessage message={error} />

        <Input
          label="New Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter new password"
          secureTextEntry={!showPassword}
          leftIcon={<Icon name="lock" size={18} color={colors.textMuted} />}
          rightIcon={
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Icon name={showPassword ? 'visibility-off' : 'visibility'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          }
        />
        <Input
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          secureTextEntry={!showPassword}
          leftIcon={<Icon name="lock" size={18} color={colors.textMuted} />}
        />

        <View style={tw`mt-4`}>
          <Button title="Reset Password" onPress={handleReset} loading={loading} fullWidth size="lg" />
        </View>
      </View>
    </View>
  );
};

export default ResetPasswordScreen;