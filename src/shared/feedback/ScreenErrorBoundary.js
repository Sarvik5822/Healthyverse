/**
 * ScreenErrorBoundary.js
 *
 * A convenience wrapper for screen-level error boundaries.
 * Wraps FeatureErrorBoundary with full-screen error display.
 *
 * Usage in navigation:
 * <Stack.Screen name="Dashboard">
 *   {() => (
 *     <ScreenErrorBoundary screenName="Dashboard">
 *       <DashboardScreen />
 *     </ScreenErrorBoundary>
 *   )}
 * </Stack.Screen>
 *
 * Or wrap inside the screen itself:
 * const DashboardScreen = () => (
 *   <ScreenErrorBoundary screenName="Dashboard">
 *     <DashboardContent />
 *   </ScreenErrorBoundary>
 * );
 */

import React from 'react';
import FeatureErrorBoundary from './FeatureErrorBoundary';

const ScreenErrorBoundary = ({ screenName, children, colors, onError }) => {
  return (
    <FeatureErrorBoundary
      feature={screenName}
      compact={false}
      colors={colors}
      onError={onError}
    >
      {children}
    </FeatureErrorBoundary>
  );
};

export default ScreenErrorBoundary;