import React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import tw from '../../theme/tw';
import useTheme from '../../hooks/useTheme';

const ErrorMessage = ({ message }) => {
  const { colors } = useTheme();

  if (!message) return null;

  return (
    <View style={[tw`flex-row items-center px-4 py-3 rounded-2xl mb-4`, { backgroundColor: colors.errorLight }]}>
      <Icon name="error-outline" size={18} color={colors.error} />
      <Text style={[tw`text-xs font-semibold ml-2 flex-1`, { color: colors.error }]}>{message}</Text>
    </View>
  );
};

export default ErrorMessage;