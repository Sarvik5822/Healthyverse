import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from '../../theme/tw';

/**
 * ErrorBoundary Component
 * Catches unhandled JavaScript errors in child components
 * and displays a fallback UI instead of crashing the app.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to monitoring service (Sentry, Crashlytics, etc.)
    // In production, replace console.error with your error reporting service
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <View style={tw`flex-1 justify-center items-center px-6 bg-white`}>
          <Text style={tw`text-2xl font-bold text-gray-800 mb-2`}>
            Oops! Something went wrong
          </Text>
          <Text style={tw`text-base text-gray-500 text-center mb-6`}>
            The app encountered an unexpected error. Please try again.
          </Text>
          <TouchableOpacity
            onPress={this.handleReset}
            style={tw`bg-purple-600 px-8 py-3 rounded-xl`}
          >
            <Text style={tw`text-white font-semibold text-base`}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;