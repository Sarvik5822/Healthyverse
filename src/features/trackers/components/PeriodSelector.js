import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';

const PERIODS = ['weekly', 'monthly', 'yearly'];

const PeriodSelector = ({ selected, onSelect }) => {
  const { colors } = useTheme();

  return (
    <View style={[tw`flex-row rounded-xl p-0.5`, { backgroundColor: colors.surfaceElevated }]}>
      {PERIODS.map((p) => (
        <TouchableOpacity
          key={p}
          style={[
            tw`px-3 py-1.5 rounded-lg`,
            selected === p && { backgroundColor: colors.primary },
          ]}
          onPress={() => onSelect(p)}
        >
          <Text
            style={[
              tw`text-[10px] font-bold capitalize`,
              { color: selected === p ? '#FFFFFF' : colors.textMuted },
            ]}
          >
            {p.slice(0, 1).toUpperCase() + p.slice(1, 2)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default PeriodSelector;