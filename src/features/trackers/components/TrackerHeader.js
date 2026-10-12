import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';

const TrackerHeader = ({ title, onBackPress, onAddPress }) => {
  const { colors } = useTheme();

  return (
    <View style={[tw`flex-row items-center justify-between px-5 pt-4 pb-3`, { backgroundColor: colors.headerBg }]}>
      <TouchableOpacity
        onPress={onBackPress}
        style={[tw`w-10 h-10 rounded-xl items-center justify-center`, { backgroundColor: colors.surfaceElevated }]}
        accessibilityLabel="Go back"
      >
        <Icon name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={[tw`text-lg font-bold`, { color: colors.textPrimary }]}>{title}</Text>
      {onAddPress ? (
        <TouchableOpacity
          onPress={onAddPress}
          style={[tw`w-10 h-10 rounded-xl items-center justify-center`, { backgroundColor: colors.primary }]}
          accessibilityLabel="Add entry"
        >
          <Icon name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <View style={tw`w-10`} />
      )}
    </View>
  );
};

export default TrackerHeader;