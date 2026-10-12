import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import DatePickerButton from '../../../shared/ui/DatePickerButton';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';

const PickerField = ({ label, options, value, onSelect, colors }) => {
  return (
    <View style={tw`mb-4`}>
      <Text style={[tw`text-xs font-bold mb-2 tracking-wide uppercase`, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <View style={tw`flex-row flex-wrap gap-2`}>
        {options.map((option) => {
          const isSelected = value === option;
          return (
            <TouchableOpacity
              key={option}
              style={[
                tw`px-4 py-2.5 rounded-2xl`,
                isSelected
                  ? { backgroundColor: colors.primary + '15', borderWidth: 1.5, borderColor: colors.primary }
                  : { backgroundColor: colors.inputBg || colors.surfaceElevated, borderWidth: 1.5, borderColor: 'transparent' },
              ]}
              onPress={() => onSelect(option)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  tw`text-sm font-bold`,
                  { color: isSelected ? colors.primary : colors.textMuted },
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const AddEntryModal = ({ visible, onClose, onSubmit, fields = [], loading }) => {
  const { colors } = useTheme();
  const [form, setForm] = useState({});

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setForm({});
    }
  }, [visible]);

  const handleSubmit = () => {
    onSubmit(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[tw`flex-1 justify-end`, { backgroundColor: colors.overlay || 'rgba(0,0,0,0.4)' }]}>
        <View style={[tw`rounded-t-3xl px-6 pt-6 pb-10 max-h-[85%]`, { backgroundColor: colors.surface }]}>
          <View style={tw`w-10 h-1 rounded-full self-center mb-5`}>
            <View style={[tw`w-full h-full rounded-full`, { backgroundColor: colors.border || '#EDEDED' }]} />
          </View>
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <Text style={[tw`text-xl font-bold`, { color: colors.textPrimary }]}>Add Entry</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[tw`w-8 h-8 rounded-full items-center justify-center`, { backgroundColor: colors.surfaceElevated || '#F5F5F7' }]}
            >
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {fields.map((field) => {
              if (field.type === 'date') {
                return (
                  <DatePickerButton
                    key={field.name}
                    label={field.label}
                    date={form[field.name]}
                    onDateChange={(d) => setForm((p) => ({ ...p, [field.name]: d }))}
                    maximumDate={field.maximumDate}
                  />
                );
              }
              if (field.type === 'picker') {
                return (
                  <PickerField
                    key={field.name}
                    label={field.label}
                    options={field.options}
                    value={form[field.name] || ''}
                    onSelect={(val) => setForm((p) => ({ ...p, [field.name]: val }))}
                    colors={colors}
                  />
                );
              }
              return (
                <Input
                  key={field.name}
                  label={field.label}
                  value={form[field.name] || ''}
                  onChangeText={(t) => setForm((p) => ({ ...p, [field.name]: t }))}
                  placeholder={field.placeholder}
                  keyboardType={field.keyboardType || 'default'}
                />
              );
            })}

            <View style={tw`flex-row gap-3 mt-4`}>
              <View style={tw`flex-1`}>
                <Button title="Cancel" variant="secondary" onPress={onClose} fullWidth />
              </View>
              <View style={tw`flex-1`}>
                <Button title="Save" onPress={handleSubmit} loading={loading} fullWidth />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default AddEntryModal;