import React from 'react';
import { View, Text } from 'react-native';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';

const ProgressCard = ({ label, value, unit, goal, goalUnit, status, statusColor }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        tw`rounded-3xl p-4`,
        {
          backgroundColor: colors.surface,
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 12,
          elevation: 3,
        },
      ]}
    >
      <Text style={[tw`text-[10px] font-bold uppercase tracking-wide mb-2`, { color: colors.textMuted }]}>
        {label}
      </Text>
      <View style={tw`flex-row items-baseline`}>
        <Text style={[tw`text-2xl font-bold`, { color: colors.textPrimary }]}>{value}</Text>
        {unit && <Text style={[tw`text-xs font-semibold ml-1`, { color: colors.textMuted }]}>{unit}</Text>}
      </View>
      {goal && (
        <Text style={[tw`text-xs mt-1`, { color: colors.textSecondary }]}>
          Goal: {goal} {goalUnit}
        </Text>
      )}
      {status && (
        <View style={tw`flex-row items-center mt-2`}>
          <View style={[tw`w-1.5 h-1.5 rounded-full mr-1.5`, { backgroundColor: statusColor || colors.accent }]} />
          <Text style={[tw`text-[10px] font-bold`, { color: statusColor || colors.accent }]}>{status}</Text>
        </View>
      )}
    </View>
  );
};

export default ProgressCard;