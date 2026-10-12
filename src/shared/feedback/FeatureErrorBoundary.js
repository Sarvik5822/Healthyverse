/**
 * FeatureErrorBoundary.js
 *
 * A reusable, feature-scoped error boundary that:
 * - Catches errors in a specific feature/section without crashing the whole app
 * - Shows a compact, themed error UI with retry option
 * - Logs errors with feature context for easier debugging
 * - Supports custom fallback UI
 * - Auto-recovers on navigation (optional)
 *
 * Usage:
 * <FeatureErrorBoundary feature="Dashboard" onRetry={() => refetch()}>
 *   <DashboardContent />
 * </FeatureErrorBoundary>
 *
 * Compact mode (for cards/sections):
 * <FeatureErrorBoundary feature="Steps Card" compact colors={colors}>
 *   <StepsCard />
 * </FeatureErrorBoundary>
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

class FeatureErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const { feature = 'Unknown', onError } = this.props;

    // Log with feature context
    if (__DEV__) {
      console.error(`[${feature}] Error caught by FeatureErrorBoundary:`, error);
      console.error(`[${feature}] Component stack:`, errorInfo?.componentStack);
    }

    this.setState({ errorInfo });

    // Call optional error callback (for analytics/monitoring)
    if (onError) {
      onError(error, errorInfo, feature);
    }
  }

  handleRetry = () => {
    const { onRetry } = this.props;
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (onRetry) {
      onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          retry: this.handleRetry,
        });
      }

      const { feature = 'This section', compact = false, colors } = this.props;
      const themeColors = colors || {
        surface: '#FFFFFF',
        textPrimary: '#1F2937',
        textSecondary: '#6B7280',
        primary: '#7C4DFF',
        error: '#EF4444',
        errorBg: '#FEF2F2',
      };

      if (compact) {
        // Compact inline error (for cards, sections)
        return (
          <View style={[styles.compactContainer, { backgroundColor: themeColors.errorBg || '#FEF2F2' }]}>
            <Icon name="error-outline" size={20} color={themeColors.error || '#EF4444'} />
            <Text style={[styles.compactText, { color: themeColors.textSecondary || '#6B7280' }]}>
              {feature} failed to load
            </Text>
            <TouchableOpacity onPress={this.handleRetry} style={styles.compactRetry}>
              <Icon name="refresh" size={18} color={themeColors.primary || '#7C4DFF'} />
            </TouchableOpacity>
          </View>
        );
      }

      // Full-size error (for screens, major sections)
      return (
        <View style={[styles.container, { backgroundColor: themeColors.surface || '#FFFFFF' }]}>
          <View style={[styles.iconCircle, { backgroundColor: themeColors.errorBg || '#FEF2F2' }]}>
            <Icon name="error-outline" size={32} color={themeColors.error || '#EF4444'} />
          </View>
          <Text style={[styles.title, { color: themeColors.textPrimary || '#1F2937' }]}>
            Something went wrong
          </Text>
          <Text style={[styles.message, { color: themeColors.textSecondary || '#6B7280' }]}>
            {feature} encountered an error. Please try again.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.devError} numberOfLines={3}>
              {this.state.error.message}
            </Text>
          )}
          <TouchableOpacity
            onPress={this.handleRetry}
            style={[styles.retryButton, { backgroundColor: themeColors.primary || '#7C4DFF' }]}
          >
            <Icon name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  devError: {
    fontSize: 11,
    color: '#EF4444',
    fontFamily: 'monospace',
    marginBottom: 16,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
  },
  compactText: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
  },
  compactRetry: {
    padding: 4,
  },
});

export default FeatureErrorBoundary;