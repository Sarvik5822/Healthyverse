/**
 * App.js - OPTIMIZED (HealthDataProvider REMOVED)
 *
 * Changes:
 * 1. QueryProvider (React Query) — handles all API caching & deduplication
 * 2. Zustand stores (healthStore) — global state without Provider nesting
 * 3. HealthDataProvider REMOVED — fully replaced by React Query + Zustand
 *
 * Provider nesting reduced: 7 levels → 6 levels
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryProvider } from './src/providers/QueryProvider';
import { ThemeProvider } from './src/context/ThemeContext';
import { UserProvider } from './src/context/UserContext';
import { UnitPreferencesProvider } from './src/context/UnitPreferencesContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { StepProvider } from './src/context/StepContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/shared/feedback/ErrorBoundary';
import Toast from 'react-native-toast-message';
import tw from './src/theme/tw';

const App = () => {
  return (
    <GestureHandlerRootView style={tw`flex-1`}>
      <SafeAreaProvider>
        <ErrorBoundary>
          {/* React Query Provider — handles all API state */}
          <QueryProvider>
            <ThemeProvider>
              <UserProvider>
                <UnitPreferencesProvider>
                  <NotificationProvider>
                    <StepProvider>
                      <AppNavigator />
                      <Toast
                        topOffset={50}
                        visibilityTime={3000}
                        autoHide
                      />
                    </StepProvider>
                  </NotificationProvider>
                </UnitPreferencesProvider>
              </UserProvider>
            </ThemeProvider>
          </QueryProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;