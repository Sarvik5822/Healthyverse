import React, { useEffect, memo, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import DashboardScreen from '../features/dashboard/screens/DashboardScreen';
import DailyLogScreen from '../features/daily-log/screens/DailyLogScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import GoalProgressScreen from '../features/goals/screens/GoalProgressScreen';
import ScreenErrorBoundary from '../shared/feedback/ScreenErrorBoundary';
import useTheme from '../hooks/useTheme';

const Tab = createBottomTabNavigator();

// Default fallback colors to prevent crashes if theme context is not yet ready
const DEFAULT_COLORS = {
  primary: '#1A1D3F',
  surface: '#FFFFFF',
  border: '#E8E8EE',
  textMuted: '#9CA3AF',
  shadowColor: '#000000',
};

const AnimatedTabIcon = memo(({ routeName, focused, colors }) => {
  // Safety: use fallback colors if colors prop is undefined
  const safeColors = colors || DEFAULT_COLORS;

  let iconName;
  if (routeName === 'Dashboard') iconName = 'dashboard';
  else if (routeName === 'GoalProgress') iconName = 'flag';
  else if (routeName === 'DailyLog') iconName = 'edit-note';
  else if (routeName === 'Profile') iconName = 'person';

  const scale = useSharedValue(focused ? 1.05 : 0.95);

  useEffect(() => {
    scale.value = withTiming(focused ? 1.05 : 0.95, { duration: 150 });
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.iconWrapper}>
      <Animated.View
        style={[
          styles.iconCircle,
          focused
            ? { backgroundColor: safeColors.primary || '#1A1D3F' }
            : { backgroundColor: safeColors.surface || '#FFFFFF', borderWidth: 1.5, borderColor: safeColors.border || '#E8E8EE' },
          animatedStyle,
        ]}
      >
        <Icon
          name={iconName}
          size={22}
          color={focused ? '#FFFFFF' : safeColors.textMuted || '#9CA3AF'}
        />
      </Animated.View>
    </View>
  );
});

// Wrap each screen with ScreenErrorBoundary for per-tab error isolation
const DashboardWithBoundary = () => (
  <ScreenErrorBoundary screenName="Dashboard">
    <DashboardScreen />
  </ScreenErrorBoundary>
);

const GoalProgressWithBoundary = () => (
  <ScreenErrorBoundary screenName="Goal Progress">
    <GoalProgressScreen />
  </ScreenErrorBoundary>
);

const DailyLogWithBoundary = () => (
  <ScreenErrorBoundary screenName="Daily Log">
    <DailyLogScreen />
  </ScreenErrorBoundary>
);

const ProfileWithBoundary = () => (
  <ScreenErrorBoundary screenName="Profile">
    <ProfileScreen />
  </ScreenErrorBoundary>
);

// ─── Tab Icon Factories (defined OUTSIDE component to avoid unstable references) ───
const createTabIconRenderer = (routeName) => {
  const TabIcon = ({ focused, colors }) => (
    <AnimatedTabIcon routeName={routeName} focused={focused} colors={colors} />
  );
  return TabIcon;
};

const DashboardTabIcon = createTabIconRenderer('Dashboard');
const GoalProgressTabIcon = createTabIconRenderer('GoalProgress');
const DailyLogTabIcon = createTabIconRenderer('DailyLog');
const ProfileTabIcon = createTabIconRenderer('Profile');

const MainTabs = () => {
  const { colors } = useTheme();

  const screenOptions = useMemo(() => ({
    headerShown: false,
    lazy: true,
    tabBarStyle: [
      styles.tabBar,
      {
        backgroundColor: (colors && colors.surface) || '#FFFFFF',
        shadowColor: (colors && colors.shadowColor) || '#000000',
      },
    ],
    tabBarShowLabel: false,
  }), [colors]);

  // Create stable tabBarIcon functions using useCallback
  const renderDashboardIcon = useCallback(
    ({ focused }) => <DashboardTabIcon focused={focused} colors={colors} />,
    [colors]
  );
  const renderGoalProgressIcon = useCallback(
    ({ focused }) => <GoalProgressTabIcon focused={focused} colors={colors} />,
    [colors]
  );
  const renderDailyLogIcon = useCallback(
    ({ focused }) => <DailyLogTabIcon focused={focused} colors={colors} />,
    [colors]
  );
  const renderProfileIcon = useCallback(
    ({ focused }) => <ProfileTabIcon focused={focused} colors={colors} />,
    [colors]
  );

  // Stable options objects
  const dashboardOptions = useMemo(() => ({ tabBarIcon: renderDashboardIcon }), [renderDashboardIcon]);
  const goalProgressOptions = useMemo(() => ({ tabBarIcon: renderGoalProgressIcon }), [renderGoalProgressIcon]);
  const dailyLogOptions = useMemo(() => ({ tabBarIcon: renderDailyLogIcon }), [renderDailyLogIcon]);
  const profileOptions = useMemo(() => ({ tabBarIcon: renderProfileIcon }), [renderProfileIcon]);

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Dashboard" component={DashboardWithBoundary} options={dashboardOptions} />
      <Tab.Screen name="GoalProgress" component={GoalProgressWithBoundary} options={goalProgressOptions} />
      <Tab.Screen name="DailyLog" component={DailyLogWithBoundary} options={dailyLogOptions} />
      <Tab.Screen name="Profile" component={ProfileWithBoundary} options={profileOptions} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 0,
    height: 70,
    paddingBottom: 8,
    paddingTop: 10,
    paddingHorizontal: 16,
    borderRadius: 35,
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 16,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MainTabs;