// /**
//  * MainStack.js - OPTIMIZED with React.lazy
//  *
//  * All tracker, settings, and secondary screens are lazy-loaded.
//  * Only MainTabs (Dashboard, DailyLog, Leaderboard, Profile, GoalProgress)
//  * are eagerly loaded since they're the first screens users see.
//  *
//  * Impact:
//  * - Initial bundle size reduced by ~30-40%
//  * - Faster app startup (only loads what's needed)
//  * - Screens load on-demand when user navigates to them
//  *
//  * NOTE: React.lazy works with React Navigation in React Native 0.72+.
//  * For older versions, use a manual lazy wrapper (see LazyScreen component below).
//  */

// import React, { Suspense, lazy } from 'react';
// import { createStackNavigator } from '@react-navigation/stack';
// import { View, ActivityIndicator, StyleSheet } from 'react-native';
// import MainTabs from './MainTabs';

// // ─── Lazy-loaded Tracker Screens ──────────────────────────────────────────────
// const BodyMetricsScreen = lazy(() => import('../features/trackers/screens/BodyMetricsScreen'));
// const HeartRateScreen = lazy(() => import('../features/trackers/screens/HeartRateScreen'));
// const BloodPressureScreen = lazy(() => import('../features/trackers/screens/BloodPressureScreen'));
// const BloodOxygenScreen = lazy(() => import('../features/trackers/screens/BloodOxygenScreen'));
// const BloodSugarScreen = lazy(() => import('../features/trackers/screens/BloodSugarScreen'));
// const HydrationScreen = lazy(() => import('../features/trackers/screens/HydrationScreen'));
// const StepsScreen = lazy(() => import('../features/trackers/screens/StepsScreen'));
// const StepHistoryScreen = lazy(() => import('../screens/trackers/StepHistoryScreen'));
// const StepDayDetailScreen = lazy(() => import('../screens/trackers/StepDayDetailScreen'));
// const MenstrualTrackerScreen = lazy(() => import('../features/trackers/screens/MenstrualTrackerScreen'));

// // ─── Lazy-loaded Feature Screens ──────────────────────────────────────────────
// const NotificationsScreen = lazy(() => import('../features/notifications/screens/NotificationsScreen'));

// // ─── Lazy-loaded Settings Screens ─────────────────────────────────────────────
// const SettingsScreen = lazy(() => import('../features/settings/screens/SettingsScreen'));
// const UnitsSettingScreen = lazy(() => import('../features/settings/screens/UnitsSettingScreen'));
// const DailyGoalsSettingScreen = lazy(() => import('../features/settings/screens/DailyGoalsSettingScreen'));
// const ContactUsScreen = lazy(() => import('../features/settings/screens/ContactUsScreen'));
// const HelpCenterScreen = lazy(() => import('../features/settings/screens/HelpCenterScreen'));
// const PrivacyPolicyScreen = lazy(() => import('../features/settings/screens/PrivacyPolicyScreen'));
// const TermsOfServiceScreen = lazy(() => import('../features/settings/screens/TermsOfServiceScreen'));

// const Stack = createStackNavigator();

// /**
//  * Loading fallback component for Suspense.
//  * Shows a centered spinner while lazy screen is loading.
//  */
// const ScreenLoader = () => (
//   <View style={styles.loader}>
//     <ActivityIndicator size="large" color="#1A1D3F" />
//   </View>
// );

// /**
//  * Wraps a lazy-loaded component with Suspense for use in Stack.Screen.
//  * React Navigation requires a component reference, not a JSX element,
//  * so we create wrapper components for each lazy screen.
//  */
// const withSuspense = (LazyComponent) => {
//   const SuspenseWrapper = (props) => (
//     <Suspense fallback={<ScreenLoader />}>
//       <LazyComponent {...props} />
//     </Suspense>
//   );
//   // Preserve display name for debugging
//   SuspenseWrapper.displayName = `Lazy(${LazyComponent.displayName || LazyComponent.name || 'Component'})`;
//   return SuspenseWrapper;
// };

// const MainStack = () => {
//   return (
//     <Stack.Navigator screenOptions={{ headerShown: false }}>
//       {/* Eagerly loaded — first screen users see */}
//       <Stack.Screen name="MainTabs" component={MainTabs} />

//       {/* Lazy-loaded Tracker Screens */}
//       <Stack.Screen name="BodyMetrics" component={withSuspense(BodyMetricsScreen)} />
//       <Stack.Screen name="HeartRate" component={withSuspense(HeartRateScreen)} />
//       <Stack.Screen name="BloodPressure" component={withSuspense(BloodPressureScreen)} />
//       <Stack.Screen name="BloodOxygen" component={withSuspense(BloodOxygenScreen)} />
//       <Stack.Screen name="BloodSugar" component={withSuspense(BloodSugarScreen)} />
//       <Stack.Screen name="Hydration" component={withSuspense(HydrationScreen)} />
//       <Stack.Screen name="Steps" component={withSuspense(StepsScreen)} />
//       <Stack.Screen name="StepHistory" component={withSuspense(StepHistoryScreen)} />
//       <Stack.Screen name="StepDayDetail" component={withSuspense(StepDayDetailScreen)} />
//       <Stack.Screen name="MenstrualTracker" component={withSuspense(MenstrualTrackerScreen)} />

//       {/* Lazy-loaded Feature Screens */}
//       <Stack.Screen name="Notifications" component={withSuspense(NotificationsScreen)} />

//       {/* Lazy-loaded Settings Screens */}
//       <Stack.Screen name="Settings" component={withSuspense(SettingsScreen)} />
//       <Stack.Screen name="UnitsSetting" component={withSuspense(UnitsSettingScreen)} />
//       <Stack.Screen name="DailyGoalsSetting" component={withSuspense(DailyGoalsSettingScreen)} />
//       <Stack.Screen name="ContactUs" component={withSuspense(ContactUsScreen)} />
//       <Stack.Screen name="HelpCenter" component={withSuspense(HelpCenterScreen)} />
//       <Stack.Screen name="PrivacyPolicy" component={withSuspense(PrivacyPolicyScreen)} />
//       <Stack.Screen name="TermsOfService" component={withSuspense(TermsOfServiceScreen)} />
//     </Stack.Navigator>
//   );
// };

// const styles = StyleSheet.create({
//   loader: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#FFFFFF',
//   },
// });

// export default MainStack;

/**
 * MainStack.js
 *
 * All screens are eagerly loaded.
 * Removed React.lazy, Suspense, and withSuspense wrapper.
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainTabs from './MainTabs';

// ─── Tracker Screens ──────────────────────────────────────────────────────────
import BodyMetricsScreen from '../features/trackers/screens/BodyMetricsScreen';
import HeartRateScreen from '../features/trackers/screens/HeartRateScreen';
import BloodPressureScreen from '../features/trackers/screens/BloodPressureScreen';
import BloodOxygenScreen from '../features/trackers/screens/BloodOxygenScreen';
import BloodSugarScreen from '../features/trackers/screens/BloodSugarScreen';
import HydrationScreen from '../features/trackers/screens/HydrationScreen';
import StepsScreen from '../features/trackers/screens/StepsScreen';
import StepHistoryScreen from '../screens/trackers/StepHistoryScreen';
import StepDayDetailScreen from '../screens/trackers/StepDayDetailScreen';
import MenstrualTrackerScreen from '../features/trackers/screens/MenstrualTrackerScreen';

// ─── Feature Screens ──────────────────────────────────────────────────────────
import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';

// ─── Settings Screens ─────────────────────────────────────────────────────────
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import UnitsSettingScreen from '../features/settings/screens/UnitsSettingScreen';
import DailyGoalsSettingScreen from '../features/settings/screens/DailyGoalsSettingScreen';
import ContactUsScreen from '../features/settings/screens/ContactUsScreen';
import HelpCenterScreen from '../features/settings/screens/HelpCenterScreen';
import PrivacyPolicyScreen from '../features/settings/screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../features/settings/screens/TermsOfServiceScreen';

const Stack = createStackNavigator();

const MainStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main Tabs */}
      <Stack.Screen name="MainTabs" component={MainTabs} />

      {/* Tracker Screens */}
      <Stack.Screen name="BodyMetrics" component={BodyMetricsScreen} />
      <Stack.Screen name="HeartRate" component={HeartRateScreen} />
      <Stack.Screen name="BloodPressure" component={BloodPressureScreen} />
      <Stack.Screen name="BloodOxygen" component={BloodOxygenScreen} />
      <Stack.Screen name="BloodSugar" component={BloodSugarScreen} />
      <Stack.Screen name="Hydration" component={HydrationScreen} />
      <Stack.Screen name="Steps" component={StepsScreen} />
      <Stack.Screen name="StepHistory" component={StepHistoryScreen} />
      <Stack.Screen name="StepDayDetail" component={StepDayDetailScreen} />
      <Stack.Screen name="MenstrualTracker" component={MenstrualTrackerScreen} />

      {/* Feature Screens */}
      <Stack.Screen name="Notifications" component={NotificationsScreen} />

      {/* Settings Screens */}
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="UnitsSetting" component={UnitsSettingScreen} />
      <Stack.Screen name="DailyGoalsSetting" component={DailyGoalsSettingScreen} />
      <Stack.Screen name="ContactUs" component={ContactUsScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
};

export default MainStack;