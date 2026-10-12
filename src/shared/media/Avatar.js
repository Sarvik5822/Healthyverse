import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import tw from '../../theme/tw';
import useTheme from '../../hooks/useTheme';

const Avatar = ({ uri, name = '', size = 48, showEdit = false, onEditPress }) => {
  const { colors } = useTheme();
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={tw`relative`} accessible accessibilityLabel={name || 'User avatar'}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[tw`rounded-full`, { width: size, height: size, borderWidth: 2, borderColor: colors.primary + '30' }]}
        />
      ) : (
        <View
          style={[
            tw`rounded-full items-center justify-center`,
            {
              width: size,
              height: size,
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Text style={[tw`text-white font-bold`, { fontSize: size * 0.36 }]}>
            {initials || 'U'}
          </Text>
        </View>
      )}
      {showEdit && (
        <TouchableOpacity
          onPress={onEditPress}
          style={[
            tw`absolute bottom-0 right-0 rounded-full items-center justify-center`,
            {
              width: size * 0.32,
              height: size * 0.32,
              backgroundColor: colors.accent,
              borderWidth: 2.5,
              borderColor: colors.surface,
            },
          ]}
          accessibilityLabel="Edit profile picture"
          accessibilityRole="button"
        >
          <Icon name="camera-alt" size={size * 0.16} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default Avatar;