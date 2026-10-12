import React from 'react';
import { View, Text, TouchableOpacity, Modal as RNModal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import tw from '../../theme/tw';
import useTheme from '../../hooks/useTheme';

const Modal = ({ visible, onClose, title, children }) => {
  const { colors } = useTheme();

  return (
    <RNModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[tw`flex-1 justify-end`, { backgroundColor: colors.overlay }]}>
        <View style={[tw`rounded-t-3xl px-6 pt-6 pb-10`, { backgroundColor: colors.surface }]}>
          <View style={tw`w-10 h-1 rounded-full self-center mb-5`}>
            <View style={[tw`w-full h-full rounded-full`, { backgroundColor: colors.border }]} />
          </View>
          {title && (
            <View style={tw`flex-row items-center justify-between mb-5`}>
              <Text style={[tw`text-xl font-bold`, { color: colors.textPrimary }]}>{title}</Text>
              <TouchableOpacity
                onPress={onClose}
                style={[tw`w-8 h-8 rounded-full items-center justify-center`, { backgroundColor: colors.surfaceElevated }]}
              >
                <Icon name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          {children}
        </View>
      </View>
    </RNModal>
  );
};

export default Modal;