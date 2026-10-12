/**
 * CachedAvatar.js
 *
 * Avatar component with FastImage caching.
 * Drop-in replacement for profile pictures, leaderboard avatars, etc.
 *
 * Usage:
 * <CachedAvatar
 *   uri={userProfile.profilePicture}
 *   size={48}
 *   name={userProfile.name}
 * />
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CachedImage from './CachedImage';

const CachedAvatar = memo(({
  uri,
  size = 48,
  name = '',
  borderColor,
  borderWidth = 0,
  backgroundColor = '#EDE7FF',
  textColor = '#7C4DFF',
  priority = 'high',
}) => {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...(borderColor && { borderColor, borderWidth }),
  };

  if (uri && typeof uri === 'string' && uri.length > 0) {
    return (
      <CachedImage
        source={{ uri }}
        style={containerStyle}
        priority={priority}
        fallbackIcon="person"
        fallbackIconSize={size * 0.45}
        fallbackBgColor={backgroundColor}
      />
    );
  }

  // Fallback: show initials
  return (
    <View style={[styles.initialsContainer, containerStyle, { backgroundColor }]}>
      <Text style={[styles.initialsText, { fontSize: size * 0.35, color: textColor }]}>
        {initials}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  initialsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontWeight: '700',
  },
});

export default CachedAvatar;