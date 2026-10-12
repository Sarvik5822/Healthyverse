import React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SmallCircularProgress } from './CircularProgress';
import tw from '../../theme/tw';

/**
 * MacroCard - Stat card with circular progress indicator
 * Used across Dashboard, Profile, Leaderboard, GoalProgress, DailyLog, Trackers
 */
const MacroCard = ({ label, value, unit, progress, color, bgColor, iconName, colors }) => {
  return (
    <View
      style={[
        tw`flex-1 items-center rounded-2xl py-4 px-2 mx-1.5`,
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
      <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>
        {value}{unit}
      </Text>
      <Text style={[tw`text-[11px] mt-1 mb-3`, { color: colors.textMuted }]}>{label}</Text>
      <SmallCircularProgress
        size={52}
        strokeWidth={5}
        progress={progress}
        color={color}
        bgColor={bgColor}
      >
        <Icon name={iconName} size={16} color={color} />
      </SmallCircularProgress>
    </View>
  );
};

export default MacroCard;