import React from 'react';
import { View, Text } from 'react-native';
import tw from '../../theme/tw';
import useTheme from '../../hooks/useTheme';

const PasswordStrengthIndicator = ({ password }) => {
  const { colors } = useTheme();

  if (!password) return null;

  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getStrength();
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const barColors = [colors.error, colors.warning, colors.blue, colors.accent];

  return (
    <View style={tw`mb-4`}>
      <View style={tw`flex-row gap-1.5 mb-1.5`}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              tw`flex-1 h-1 rounded-full`,
              { backgroundColor: i < strength ? barColors[strength - 1] : colors.border },
            ]}
          />
        ))}
      </View>
      <Text style={[tw`text-[10px] font-bold`, { color: strength > 0 ? barColors[strength - 1] : colors.textMuted }]}>
        {strength > 0 ? labels[strength - 1] : 'Enter password'}
      </Text>
    </View>
  );
};

export default PasswordStrengthIndicator;