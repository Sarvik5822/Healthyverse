import React from 'react';
import { View, Text, TextInput } from 'react-native';
import tw from '../../theme/tw';
import useTheme from '../../hooks/useTheme';

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
  leftIcon,
  rightIcon,
  keyboardType = 'default',
  autoCapitalize = 'none',
  editable = true,
  multiline = false,
  numberOfLines,
  style,
  onFocus,
  onBlur,
}) => {
  const { isDark, colors } = useTheme();
  const [isFocused, setIsFocused] = React.useState(false);

  const multilineStyle = React.useMemo(() => {
    if (!multiline) return undefined;
    return {
      textAlignVertical: 'top',
      minHeight: numberOfLines ? numberOfLines * 22 : 88,
    };
  }, [multiline, numberOfLines]);

  const getContainerStyle = () => {
    const base = [
      tw`flex-row items-center rounded-2xl px-4 py-3.5`,
      {
        backgroundColor: colors.inputBg,
        borderWidth: 1.5,
        borderColor: colors.inputBorder,
      },
    ];
    if (isFocused) {
      base.push({
        borderColor: colors.primary,
        backgroundColor: isDark ? colors.surface : '#FFFFFF',
      });
    }
    if (error) {
      base.push({ borderColor: colors.error });
    }
    return base;
  };

  return (
    <View style={tw`mb-4`}>
      {label && (
        <Text style={[tw`text-xs font-bold mb-2 tracking-wide uppercase`, { color: colors.textSecondary }]}>
          {label}
        </Text>
      )}
      <View style={getContainerStyle()}>
        {leftIcon && <View style={tw`mr-3`}>{leftIcon}</View>}
        <TextInput
          style={[
            tw`flex-1 text-sm`,
            { color: colors.textPrimary, fontWeight: '500' },
            multilineStyle,
            style,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
        />
        {rightIcon && <View style={tw`ml-3`}>{rightIcon}</View>}
      </View>
      {error && (
        <Text style={[tw`text-xs mt-1.5 font-medium`, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
};

export default Input;