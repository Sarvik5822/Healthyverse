import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import Button from '../../../shared/ui/Button';
import Input from '../../../shared/ui/Input';
import DatePickerButton from '../../../shared/ui/DatePickerButton';
import UnitSelector from '../../../shared/layout/UnitSelector';
import PasswordStrengthIndicator from '../../../shared/layout/PasswordStrengthIndicator';
import ErrorMessage from '../../../shared/feedback/ErrorMessage';
import Toast from 'react-native-toast-message';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';
import { isValidEmail, isValidPassword } from '../../../utils/validators';
import { convertWeight, convertHeight } from '../../../utils/converters';
import { register } from '../../../api/auth';

const STEPS = ['Account', 'Personal', 'Photo'];

const RegisterScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    dob: null, gender: '', height: '', heightUnit: 'cm', weight: '', weightUnit: 'kg', phone: '',
    photo: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // Handle unit switching with value conversion
  const handleUnitChange = (field, newUnit) => {
    if (field === 'heightUnit' && form.heightUnit !== newUnit && form.height.trim()) {
      const numVal = parseFloat(form.height);
      if (!isNaN(numVal) && numVal > 0) {
        const converted = convertHeight(numVal, form.heightUnit, newUnit);
        setForm((prev) => ({ ...prev, height: String(converted), heightUnit: newUnit }));
        return;
      }
    } else if (field === 'weightUnit' && form.weightUnit !== newUnit && form.weight.trim()) {
      const numVal = parseFloat(form.weight);
      if (!isNaN(numVal) && numVal > 0) {
        const converted = convertWeight(numVal, form.weightUnit, newUnit);
        setForm((prev) => ({ ...prev, weight: String(converted), weightUnit: newUnit }));
        return;
      }
    }
    setForm((prev) => ({ ...prev, [field]: newUnit }));
  };

  const validateStep0 = () => {
    setError('');
    if (!form.name.trim()) { setError('Name is required'); return false; }
    if (!isValidEmail(form.email)) { setError('Valid email is required'); return false; }
    if (!isValidPassword(form.password)) { setError('Password must be at least 8 characters'); return false; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return false; }
    return true;
  };

  const validateStep1 = () => {
    setError('');
    if (!form.dob) { setError('Date of birth is required'); return false; }
    if (!form.gender) { setError('Please select gender'); return false; }
    return true;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    setStep((s) => s + 1);
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('fullName', form.name);
      formData.append('email', form.email);
      formData.append('password', form.password);
      formData.append('dob', form.dob.toISOString());
      formData.append('gender', form.gender);
      if (form.height) formData.append('height', form.height);
      formData.append('heightUnit', form.heightUnit);
      if (form.weight) formData.append('weight', form.weight);
      formData.append('weightUnit', form.weightUnit);
      if (form.phone) formData.append('phone', form.phone);
      if (form.photo) formData.append('profilePicture', { uri: form.photo.uri, name: form.photo.fileName, type: form.photo.type });

      await register(formData);
      Toast.show({ type: 'success', text1: 'Registration successful! Please login.' });
      navigation.navigate('Login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { launchImageLibrary } = require('react-native-image-picker');
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7 });
      if (result.assets && result.assets[0]) {
        updateForm('photo', result.assets[0]);
      }
    } catch (e) {
      console.log('Image picker error', e);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw`flex-1`}>
      <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={tw`flex-row items-center px-5 py-4`}>
          <TouchableOpacity
            onPress={() => step > 0 ? setStep(step - 1) : navigation.goBack()}
            style={[tw`w-10 h-10 rounded-xl items-center justify-center`, { backgroundColor: colors.surface }]}
          >
            <Icon name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[tw`text-lg font-bold ml-4`, { color: colors.textPrimary }]}>Create Account</Text>
        </View>

        {/* Step Indicator */}
        <View style={tw`flex-row mx-5 mb-6 items-center`}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <View style={tw`items-center`}>
                <View
                  style={[
                    tw`w-10 h-10 rounded-full items-center justify-center`,
                    i <= step
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  {i < step ? (
                    <Icon name="check" size={18} color="#FFFFFF" />
                  ) : (
                    <Text style={[tw`text-xs font-bold`, { color: i <= step ? '#FFFFFF' : colors.textMuted }]}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[tw`text-[10px] font-bold mt-1.5`, { color: i <= step ? colors.primary : colors.textMuted }]}>{s}</Text>
              </View>
              {i < STEPS.length - 1 && (
                <View style={[tw`flex-1 h-0.5 mx-2 rounded-full`, { backgroundColor: i < step ? colors.primary : colors.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        <ScrollView style={tw`flex-1 px-5`} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <ErrorMessage message={error} />

          {step === 0 && (
            <>
              <Input label="Full Name" value={form.name} onChangeText={(t) => updateForm('name', t)} placeholder="Enter your full name" leftIcon={<Icon name="person" size={18} color={colors.textMuted} />} />
              <Input label="Email" value={form.email} onChangeText={(t) => updateForm('email', t)} placeholder="Enter your email" keyboardType="email-address" leftIcon={<Icon name="email" size={18} color={colors.textMuted} />} />
              <Input label="Password" value={form.password} onChangeText={(t) => updateForm('password', t)} placeholder="Create a password" secureTextEntry={!showPassword} leftIcon={<Icon name="lock" size={18} color={colors.textMuted} />} rightIcon={<TouchableOpacity onPress={() => setShowPassword(!showPassword)}><Icon name={showPassword ? 'visibility-off' : 'visibility'} size={18} color={colors.textMuted} /></TouchableOpacity>} />
              <PasswordStrengthIndicator password={form.password} />
              <Input label="Confirm Password" value={form.confirmPassword} onChangeText={(t) => updateForm('confirmPassword', t)} placeholder="Confirm your password" secureTextEntry={!showConfirm} leftIcon={<Icon name="lock" size={18} color={colors.textMuted} />} rightIcon={<TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}><Icon name={showConfirm ? 'visibility-off' : 'visibility'} size={18} color={colors.textMuted} /></TouchableOpacity>} />
            </>
          )}

          {step === 1 && (
            <>
              <DatePickerButton label="Date of Birth" date={form.dob} onDateChange={(d) => updateForm('dob', d)} maximumDate={new Date()} />
              <View style={tw`mb-4`}>
                <Text style={[tw`text-xs font-bold mb-2 uppercase tracking-wide`, { color: colors.textSecondary }]}>Gender</Text>
                <View style={tw`flex-row gap-3`}>
                  {['male', 'female', 'other'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        tw`flex-1 py-3 rounded-2xl items-center`,
                        form.gender === g
                          ? { backgroundColor: colors.primary + '15', borderWidth: 1.5, borderColor: colors.primary }
                          : { backgroundColor: colors.surfaceElevated, borderWidth: 1.5, borderColor: 'transparent' },
                      ]}
                      onPress={() => updateForm('gender', g)}
                    >
                      <Text style={[tw`text-sm font-bold capitalize`, { color: form.gender === g ? colors.primary : colors.textSecondary }]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={tw`mb-4`}>
                <Text style={[tw`text-xs font-bold mb-2 uppercase tracking-wide`, { color: colors.textSecondary }]}>Height</Text>
                <View style={tw`flex-row gap-3`}>
                  <View style={tw`flex-1`}>
                    <Input value={form.height} onChangeText={(t) => updateForm('height', t)} placeholder="Height" keyboardType="numeric" />
                  </View>
                  <View style={tw`w-24`}>
                    <UnitSelector options={['cm', 'ft']} selected={form.heightUnit} onSelect={(u) => handleUnitChange('heightUnit', u)} />
                  </View>
                </View>
              </View>
              <View style={tw`mb-4`}>
                <Text style={[tw`text-xs font-bold mb-2 uppercase tracking-wide`, { color: colors.textSecondary }]}>Weight</Text>
                <View style={tw`flex-row gap-3`}>
                  <View style={tw`flex-1`}>
                    <Input value={form.weight} onChangeText={(t) => updateForm('weight', t)} placeholder="Weight" keyboardType="numeric" />
                  </View>
                  <View style={tw`w-24`}>
                    <UnitSelector options={['kg', 'lbs']} selected={form.weightUnit} onSelect={(u) => handleUnitChange('weightUnit', u)} />
                  </View>
                </View>
              </View>
              <Input label="Phone (Optional)" value={form.phone} onChangeText={(t) => updateForm('phone', t)} placeholder="Enter phone number" keyboardType="phone-pad" leftIcon={<Icon name="phone" size={18} color={colors.textMuted} />} />
            </>
          )}

          {step === 2 && (
            <View style={tw`items-center py-10`}>
              <TouchableOpacity
                onPress={pickImage}
                style={[
                  tw`w-32 h-32 rounded-full items-center justify-center`,
                  { backgroundColor: colors.surfaceElevated, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary + '50' },
                ]}
              >
                {form.photo ? (
                  <View style={[tw`w-full h-full rounded-full items-center justify-center`, { backgroundColor: colors.accent + '15' }]}>
                    <Icon name="check-circle" size={48} color={colors.accent} />
                  </View>
                ) : (
                  <View style={tw`items-center`}>
                    <Icon name="camera-alt" size={32} color={colors.primary} />
                    <Text style={[tw`text-[10px] font-bold mt-2`, { color: colors.textMuted }]}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={[tw`text-sm mt-4`, { color: colors.textSecondary }]}>
                {form.photo ? 'Photo selected ✓' : 'Tap to add profile photo (optional)'}
              </Text>
            </View>
          )}

          <View style={tw`flex-row gap-3 mt-6 mb-8`}>
            {step < 2 && (
              <View style={tw`flex-1`}>
                <Button title="Continue" onPress={handleNext} fullWidth size="lg" />
              </View>
            )}
            {step === 2 && (
              <>
                <View style={tw`flex-1`}>
                  <Button title="Skip" variant="secondary" onPress={handleRegister} fullWidth size="lg" />
                </View>
                <View style={tw`flex-1`}>
                  <Button title="Register" onPress={handleRegister} loading={loading} fullWidth size="lg" />
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;