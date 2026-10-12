import React from 'react';
import { View, Text } from 'react-native';
import tw from '../../theme/tw';

const Badge = ({ count }) => {
  if (!count || count <= 0) return null;

  return (
    <View
      style={[
        tw`absolute -top-1 -right-1 rounded-full items-center justify-center`,
        {
          minWidth: 18,
          height: 18,
          paddingHorizontal: 4,
          backgroundColor: '#FF6B6B',
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ]}
    >
      <Text style={tw`text-white text-[10px] font-bold`}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
};

export default Badge;