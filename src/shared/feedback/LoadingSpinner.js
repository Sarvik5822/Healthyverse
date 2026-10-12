import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import tw from '../../theme/tw';
import useTheme from '../../hooks/useTheme';

const LoadingSpinner = ({ fullScreen = false, size = 'large' }) => {
  const { colors } = useTheme();

  if (fullScreen) {
    return (
      <View style={[tw`flex-1 items-center justify-center`, { backgroundColor: colors.background }]}>
        <ActivityIndicator size={size} color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={tw`items-center justify-center py-8`}>
      <ActivityIndicator size={size} color={colors.primary} />
    </View>
  );
};

export default LoadingSpinner;