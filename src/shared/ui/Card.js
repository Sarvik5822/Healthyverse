import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import tw from '../../theme/tw';
import useTheme from '../../hooks/useTheme';

const Card = ({ children, style, onPress, variant = 'default', noPadding = false }) => {
  const { colors } = useTheme();

  const getCardStyle = () => {
    const base = [
      tw`rounded-3xl`,
      !noPadding && tw`p-5`,
      {
        backgroundColor: colors.surface,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 3,
      },
    ];

    if (variant === 'elevated') {
      base.push({
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 20,
        elevation: 6,
      });
    }

    if (variant === 'outlined') {
      base.push({
        borderWidth: 1,
        borderColor: colors.border,
        shadowOpacity: 0,
        elevation: 0,
      });
    }

    return base;
  };

  if (onPress) {
    return (
      <TouchableOpacity style={[...getCardStyle(), style]} onPress={onPress} activeOpacity={0.85}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[...getCardStyle(), style]}>
      {children}
    </View>
  );
};

export default Card;