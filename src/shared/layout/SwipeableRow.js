import React, { useRef } from 'react';
import { Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SwipeableRow = ({ children, onDelete, deleteLabel = 'Delete' }) => {
  const swipeableRef = useRef(null);

  const renderRightActions = (progress, dragX) => {
    const translateX = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });

    const opacity = dragX.interpolate({
      inputRange: [-80, -40, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.deleteContainer, { transform: [{ translateX }], opacity }]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            if (swipeableRef.current) {
              swipeableRef.current.close();
            }
            onDelete();
          }}
          activeOpacity={0.8}
        >
          <Icon name="delete" size={20} color="#FFFFFF" />
          <Text style={styles.deleteText}>{deleteLabel}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      friction={2}
    >
      {children}
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  deleteContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 12,
    marginLeft: -12,
  },
  deleteButton: {
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    height: '100%',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 8,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
});

export default SwipeableRow;