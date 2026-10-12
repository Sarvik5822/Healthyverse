import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, StatusBar, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useUserContext } from '../../../context/UserContext';
import Button from '../../../shared/ui/Button';
import Input from '../../../shared/ui/Input';
import ErrorMessage from '../../../shared/feedback/ErrorMessage';
import Toast from 'react-native-toast-message';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';
import { isValidEmail, isValidPassword } from '../../../utils/validators';

const LoginScreen = () => {
  const navigation = useNavigation();
  const { login } = useUserContext();
  const { isDark, colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!isValidEmail(email)) { setError('Please enter a valid email'); return; }
    if (!isValidPassword(password)) { setError('Password must be at least 8 characters'); return; }

    setLoading(true);
    try {
      await login(email, password);
      Toast.show({ type: 'success', text1: 'Welcome back!' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw`flex-1`}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScrollView
        style={[tw`flex-1`, { backgroundColor: colors.background }]}
        contentContainerStyle={tw`flex-grow justify-center px-6 py-10`}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & Branding */}
        <View style={tw`items-center mb-10`}>
          <View
            style={[
              tw`w-20 h-20 rounded-3xl items-center justify-center mb-5`,
              { backgroundColor: colors.primary + '15' },
            ]}
          >
            <Icon name="favorite" size={36} color={colors.primary} />
          </View>
          <Text style={[tw`text-3xl font-bold`, { color: colors.textPrimary }]}>HealthyVerse</Text>
          <Text style={[tw`text-sm mt-2`, { color: colors.textMuted }]}>Your Personal Health Companion</Text>
        </View>

        {/* Welcome Text */}
        <View style={tw`mb-8`}>
          <Text style={[tw`text-2xl font-bold`, { color: colors.textPrimary }]}>Welcome Back</Text>
          <Text style={[tw`text-sm mt-1`, { color: colors.textSecondary }]}>
            Sign in to continue tracking your health journey
          </Text>
        </View>

        <ErrorMessage message={error} />

        {/* Form */}
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
          leftIcon={<Icon name="email" size={20} color={colors.textMuted} />}
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry={!showPassword}
          leftIcon={<Icon name="lock" size={20} color={colors.textMuted} />}
          rightIcon={
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Icon name={showPassword ? 'visibility-off' : 'visibility'} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          }
        />

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={tw`self-end mb-8`}>
          <Text style={[tw`text-sm font-bold`, { color: colors.primary }]}>Forgot Password?</Text>
        </TouchableOpacity>

        <Button title="Sign In" onPress={handleLogin} loading={loading} fullWidth size="lg" />

        <View style={tw`flex-row items-center justify-center mt-8`}>
          <Text style={[tw`text-sm`, { color: colors.textSecondary }]}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={[tw`text-sm font-bold`, { color: colors.primary }]}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;