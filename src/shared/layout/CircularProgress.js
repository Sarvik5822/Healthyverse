import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

/**
 * SmallCircularProgress - Full circle progress indicator
 * Used across Dashboard, Profile, Leaderboard, GoalProgress, DailyLog, Trackers
 */
const SmallCircularProgress = ({ size = 50, strokeWidth = 5, progress = 0, color, bgColor, children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressValue = (progress / 100) * circumference;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={bgColor || '#F0F0F0'}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progressValue}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
};

/**
 * ArcProgress - 270-degree arc progress indicator
 * Used in Dashboard and Tracker screens
 */
const ArcProgress = ({ size = 140, strokeWidth = 14, progress = 0, color, bgColor }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const progressLength = (progress / 100) * arcLength;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={bgColor || '#F0F0F0'}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          strokeLinecap="round"
          rotation="135"
          origin={`${center}, ${center}`}
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${progressLength} ${circumference - progressLength}`}
          strokeLinecap="round"
          rotation="135"
          origin={`${center}, ${center}`}
        />
      </Svg>
    </View>
  );
};

export { SmallCircularProgress, ArcProgress };
export default SmallCircularProgress;