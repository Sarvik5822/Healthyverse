import React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SmallCircularProgress } from './CircularProgress';
import tw from '../../theme/tw';

/**
 * GoalCard - Goal progress card with icon, progress bar, and circular indicator
 * Used in ProfileScreen and GoalProgressScreen
 */
const GoalCard = ({ icon, iconColor, bgColor, label, current, goal, unit, progress, colors }) => (
  <View
    style={[
      tw`rounded-2xl p-4 mb-3`,
      {
        backgroundColor: colors.surface,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 2,
      },
    ]}
  >
    <View style={tw`flex-row items-center justify-between`}>
      <View style={tw`flex-row items-center flex-1`}>
        <View style={[tw`w-11 h-11 rounded-xl items-center justify-center`, { backgroundColor: bgColor }]}>
          <Icon name={icon} size={20} color={iconColor} />
        </View>
        <View style={tw`ml-3 flex-1`}>
          <Text style={[tw`text-sm font-bold`, { color: colors.textPrimary }]}>{label}</Text>
          <Text style={[tw`text-xs mt-0.5`, { color: colors.textMuted }]}>
            {current}{unit} / {goal}{unit}
          </Text>
        </View>
      </View>
      <SmallCircularProgress size={50} strokeWidth={5} progress={progress} color={iconColor} bgColor={bgColor}>
        <Text style={[tw`text-[10px] font-bold`, { color: iconColor }]}>{Math.round(progress)}%</Text>
      </SmallCircularProgress>
    </View>
    <View style={[tw`h-1.5 rounded-full mt-3`, { backgroundColor: bgColor }]}>
      <View
        style={[tw`h-1.5 rounded-full`, { backgroundColor: iconColor, width: `${Math.min(progress, 100)}%` }]}
      />
    </View>
  </View>
);

export default GoalCard;