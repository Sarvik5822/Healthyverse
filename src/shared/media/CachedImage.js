/**
 * CachedImage.js
 *
 * A drop-in replacement for React Native's <Image> component
 * using React Native's built-in Image with prefetch caching.
 *
 * NOTE: react-native-fast-image is NOT compatible with React 19.
 * This uses React Native's built-in Image component with prefetch for caching.
 *
 * Features:
 * - Image.prefetch for disk caching
 * - Placeholder/loading state
 * - Error fallback
 * - Resize modes matching RN Image API
 * - Compatible with React 19 + React Native 0.76+
 */

import React, { useState, memo } from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CachedImage = memo(({
  source,
  style,
  priority = 'normal',
  resizeMode = 'cover',
  placeholder = true,
  fallbackIcon = 'person',
  fallbackIconSize = 24,
  fallbackIconColor = '#9CA3AF',
  fallbackBgColor = '#F3F4F6',
  onLoad,
  onError,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Handle invalid or empty source
  const isValidSource = source && source.uri && typeof source.uri === 'string' && source.uri.length > 0;

  if (!isValidSource || hasError) {
    return (
      <View style={[styles.fallbackContainer, style, { backgroundColor: fallbackBgColor }]}>
        <Icon name={fallbackIcon} size={fallbackIconSize} color={fallbackIconColor} />
      </View>
    );
  }

  return (
    <View style={[style, styles.wrapper]}>
      <Image
        style={[StyleSheet.absoluteFill, { borderRadius: style?.borderRadius || 0 }]}
        source={{
          uri: source.uri,
          headers: source.headers || {},
          cache: 'force-cache', // Use disk cache when available
        }}
        resizeMode={resizeMode}
        onLoadStart={() => setIsLoading(true)}
        onLoad={(e) => {
          setIsLoading(false);
          onLoad && onLoad(e);
        }}
        onError={(e) => {
          setIsLoading(false);
          setHasError(true);
          onError && onError(e);
        }}
        {...props}
      />
      {placeholder && isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay, { borderRadius: style?.borderRadius || 0 }]}>
          <ActivityIndicator size="small" color="#7C4DFF" />
        </View>
      )}
    </View>
  );
});

/**
 * Preload images for faster display.
 * Call this on app start or before navigating to a screen with many images.
 *
 * @param {string[]} uris - Array of image URLs to preload
 */
export const preloadImages = (uris) => {
  uris
    .filter((uri) => uri && typeof uri === 'string')
    .forEach((uri) => {
      Image.prefetch(uri).catch(() => {
        // Silently fail - image will load on demand
      });
    });
};

/**
 * Clear the entire image cache.
 * Note: React Native's built-in Image doesn't have a direct cache clear API.
 * This is a no-op placeholder for API compatibility.
 */
export const clearImageCache = () => {
  // React Native's Image doesn't expose cache clearing
  // If needed, implement via native modules
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  loadingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243, 244, 246, 0.7)',
  },
});

export default CachedImage;