import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DatePicker from 'react-native-date-picker';
import tw from '../../theme/tw';
import useTheme from '../../hooks/useTheme';
import dayjs from 'dayjs';

const DatePickerButton = ({ label, date, onDateChange, maximumDate, minimumDate }) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={tw`mb-4`}>
      {label && (
        <Text style={[tw`text-xs font-bold mb-2 uppercase tracking-wide`, { color: colors.textSecondary }]}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        style={[
          tw`flex-row items-center rounded-2xl px-4 py-3.5`,
          { backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.inputBorder },
        ]}
        onPress={() => setOpen(true)}
      >
        <Icon name="calendar-today" size={18} color={colors.textMuted} />
        <Text style={[tw`text-sm font-medium ml-3 flex-1`, { color: date ? colors.textPrimary : colors.textMuted }]}>
          {date ? dayjs(date).format('MMM DD, YYYY') : 'Select date'}
        </Text>
        <Icon name="chevron-right" size={18} color={colors.textMuted} />
      </TouchableOpacity>
      <DatePicker
        modal
        open={open}
        date={date || new Date()}
        mode="date"
        maximumDate={maximumDate}
        minimumDate={minimumDate}
        onConfirm={(d) => { setOpen(false); onDateChange(d); }}
        onCancel={() => setOpen(false)}
      />
    </View>
  );
};

export default DatePickerButton;