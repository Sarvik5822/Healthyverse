import React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import tw from '../../theme/tw';
import useTheme from '../../hooks/useTheme';

const EmptyState = ({ icon, title, message }) => {
  const { colors } = useTheme();

  return (
    <View style={tw`flex-1 items-center justify-center px-8 py-16`}>
      <View
        style={[
          tw`w-20 h-20 rounded-full items-center justify-center mb-5`,
          { backgroundColor: colors.purpleLight },
        ]}
      >
        <Icon name={icon || 'inbox'} size={36} color={colors.primary} />
      </View>
      <Text style={[tw`text-lg font-bold text-center mb-2`, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[tw`text-sm text-center leading-5`, { color: colors.textMuted }]}>
        {message}
      </Text>
    </View>
  );
};

export default EmptyState;