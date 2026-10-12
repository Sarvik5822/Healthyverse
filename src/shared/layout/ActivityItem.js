import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import tw from '../../theme/tw';

/**
 * ActivityItem - List item with icon, title, value, and optional actions
 * Used across Dashboard, Profile, Leaderboard, GoalProgress, DailyLog, Trackers
 */
const ActivityItem = ({
  title,
  value,
  subtitle,
  iconName,
  iconBgColor,
  iconColor,
  colors,
  onPress,
  onDelete,
  rightContent,
}) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress
    ? { onPress, activeOpacity: 0.7 }
    : {};

  return (
    <Wrapper
      style={[
        tw`rounded-2xl p-4 mb-3`,
        {
          backgroundColor: colors.surface,
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 1,
          shadowRadius: 6,
          elevation: 2,
        },
      ]}
      {...wrapperProps}
    >
      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center flex-1`}>
          <View
            style={[
              tw`w-10 h-10 rounded-xl items-center justify-center`,
              { backgroundColor: iconBgColor },
            ]}
          >
            <Icon name={iconName} size={18} color={iconColor} />
          </View>
          <View style={tw`ml-3 flex-1`}>
            <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>{title}</Text>
            <Text style={[tw`text-sm mt-1 font-medium`, { color: colors.textMuted }]}>
              {value}
            </Text>
            {subtitle && (
              <Text style={[tw`text-xs mt-0.5`, { color: colors.textMuted }]}>{subtitle}</Text>
            )}
          </View>
        </View>
        {rightContent ? (
          rightContent
        ) : onDelete ? (
          <View style={tw`flex-row items-center`}>
            <TouchableOpacity onPress={onDelete} activeOpacity={0.6} style={tw`p-2 mr-1`}>
              <Icon name="delete-outline" size={18} color="#FF6B6B" />
            </TouchableOpacity>
            {onPress && (
              <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={tw`p-2`}>
                <Icon name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        ) : onPress ? (
          <Icon name="chevron-right" size={20} color={colors.textMuted} />
        ) : null}
      </View>
    </Wrapper>
  );
};

export default ActivityItem;