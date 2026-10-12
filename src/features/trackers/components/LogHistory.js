import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';

const LogHistory = ({ data, columns, onEdit, onDelete, ListHeaderComponent }) => {
  const { colors } = useTheme();

  const renderItem = ({ item }) => (
    <View
      style={[
        tw`flex-row items-center py-4 px-4 mb-2 rounded-2xl`,
        { backgroundColor: colors.surface },
      ]}
    >
      <View style={tw`flex-1`}>
        {columns.map((col) => (
          <Text
            key={col.key}
            style={[
              tw`text-xs mb-0.5`,
              col.bold
                ? [tw`text-sm font-bold`, { color: colors.textPrimary }]
                : { color: colors.textSecondary },
            ]}
          >
            {col.format ? col.format(item[col.key]) : item[col.key]}
          </Text>
        ))}
      </View>
      <View style={tw`flex-row gap-2`}>
        {onEdit && (
          <TouchableOpacity
            onPress={() => onEdit(item)}
            style={[tw`w-8 h-8 rounded-lg items-center justify-center`, { backgroundColor: colors.purpleLight }]}
          >
            <Icon name="edit" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity
            onPress={() => onDelete(item)}
            style={[tw`w-8 h-8 rounded-lg items-center justify-center`, { backgroundColor: colors.errorLight }]}
          >
            <Icon name="delete" size={14} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View>
      {ListHeaderComponent}
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        scrollEnabled={false}
      />
    </View>
  );
};

export default LogHistory;