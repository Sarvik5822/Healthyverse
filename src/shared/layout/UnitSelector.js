import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from '../../theme/tw';
import useTheme from '../../hooks/useTheme';

const UnitSelector = ({ options = [], selected, onSelect }) => {
  const { colors } = useTheme();

  return (
    <View style={[tw`flex-row rounded-2xl p-1`, { backgroundColor: colors.surfaceElevated }]}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[
            tw`flex-1 py-2.5 rounded-xl items-center`,
            selected === opt && { backgroundColor: colors.primary },
          ]}
          onPress={() => onSelect(opt)}
        >
          <Text
            style={[
              tw`text-xs font-bold`,
              { color: selected === opt ? '#FFFFFF' : colors.textMuted },
            ]}
          >
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default UnitSelector;