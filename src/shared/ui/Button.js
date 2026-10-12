import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import tw from '../../theme/tw';
import useTheme from '../../hooks/useTheme';

const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  fullWidth = false,
  size = 'md',
}) => {
  const { isDark, colors } = useTheme();

  const getSizeStyle = () => {
    if (size === 'sm') return tw`px-4 py-2.5 rounded-xl`;
    if (size === 'lg') return tw`px-6 py-4.5 rounded-2xl`;
    return tw`px-5 py-3.5 rounded-2xl`;
  };

  const getButtonStyle = () => {
    const base = [getSizeStyle(), tw`items-center justify-center flex-row`];
    if (disabled || loading) return [...base, tw`opacity-50`];
    if (variant === 'primary') return [...base, { backgroundColor: colors.primary }];
    if (variant === 'secondary')
      return [...base, { backgroundColor: isDark ? colors.surfaceElevated : colors.purpleLight, borderWidth: 0 }];
    if (variant === 'destructive') return [...base, { backgroundColor: colors.error }];
    if (variant === 'ghost') return [...base, tw`bg-transparent`];
    if (variant === 'outline') return [...base, { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: 'transparent' }];
    return base;
  };

  const getTextStyle = () => {
    const base = tw`font-bold`;
    const sizeText = size === 'sm' ? tw`text-xs` : size === 'lg' ? tw`text-base` : tw`text-sm`;
    if (variant === 'primary') return [base, sizeText, tw`text-white`];
    if (variant === 'secondary') return [base, sizeText, { color: colors.primary }];
    if (variant === 'destructive') return [base, sizeText, tw`text-white`];
    if (variant === 'ghost') return [base, sizeText, { color: colors.primary }];
    if (variant === 'outline') return [base, sizeText, { color: colors.primary }];
    return [base, sizeText];
  };

  return (
    <TouchableOpacity
      style={[...getButtonStyle(), fullWidth && tw`w-full`, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityLabel={title}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary : '#FFFFFF'} size="small" />
      ) : (
        <View style={tw`flex-row items-center gap-2`}>
          {icon}
          <Text style={[...getTextStyle(), textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default Button;