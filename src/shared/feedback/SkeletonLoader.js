import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import tw from '../../theme/tw';
import useTheme from '../../hooks/useTheme';

// Animated shimmer effect for skeleton loading
const SkeletonLoader = ({ children, style }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View style={[style, { opacity }]}>
      {children}
    </Animated.View>
  );
};

// Individual skeleton bone element
const SkeletonBone = ({ width, height, borderRadius = 8, style }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          width: width || '100%',
          height: height || 16,
          borderRadius,
          backgroundColor: colors.border,
        },
        style,
      ]}
    />
  );
};

// Skeleton for the Dashboard screen header area (steps card + macro cards)
const DashboardSkeleton = () => {
  const { colors } = useTheme();

  return (
    <SkeletonLoader>
      <View style={tw`px-5 pb-28`}>
        {/* Steps Card Skeleton */}
        <View
          style={[
            tw`rounded-3xl p-5 mt-5`,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 12,
              elevation: 3,
            },
          ]}
        >
          <SkeletonBone width={100} height={14} style={tw`mb-3`} />
          <View style={tw`flex-row items-center justify-between`}>
            <View>
              <SkeletonBone width={150} height={36} borderRadius={12} />
              <SkeletonBone width={80} height={14} style={tw`mt-2`} />
            </View>
            <SkeletonBone width={100} height={100} borderRadius={50} />
          </View>
        </View>

        {/* Macro Cards Row Skeleton */}
        <View style={tw`flex-row mt-4 -mx-1.5`}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                tw`flex-1 items-center rounded-2xl py-4 px-2 mx-1.5`,
                {
                  backgroundColor: colors.surface,
                  shadowColor: colors.shadowColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 1,
                  shadowRadius: 8,
                  elevation: 2,
                },
              ]}
            >
              <SkeletonBone width={50} height={18} borderRadius={6} />
              <SkeletonBone width={40} height={10} borderRadius={4} style={tw`mt-2`} />
              <SkeletonBone width={52} height={52} borderRadius={26} style={tw`mt-3`} />
            </View>
          ))}
        </View>

        {/* Today's Health Section Skeleton */}
        <SkeletonBone width={140} height={22} borderRadius={8} style={tw`mt-7 mb-4`} />
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              tw`rounded-2xl p-4 mb-3`,
              {
                backgroundColor: colors.surface,
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 1,
                shadowRadius: 6,
                elevation: 2,
              },
            ]}
          >
            <View style={tw`flex-row items-center`}>
              <SkeletonBone width={40} height={40} borderRadius={12} />
              <View style={tw`ml-3 flex-1`}>
                <SkeletonBone width={100} height={16} borderRadius={6} />
                <SkeletonBone width={160} height={12} borderRadius={4} style={tw`mt-2`} />
              </View>
              <SkeletonBone width={20} height={20} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonLoader>
  );
};

// Skeleton for Profile screen
const ProfileSkeleton = () => {
  const { colors } = useTheme();

  return (
    <SkeletonLoader>
      <View style={tw`px-5 pb-28`}>
        {/* Avatar Card Skeleton */}
        <View
          style={[
            tw`rounded-3xl p-5 mt-5 items-center`,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 12,
              elevation: 3,
            },
          ]}
        >
          <SkeletonBone width={90} height={90} borderRadius={45} />
          <SkeletonBone width={120} height={20} borderRadius={8} style={tw`mt-3`} />
          <SkeletonBone width={100} height={14} borderRadius={6} style={tw`mt-2`} />
          <SkeletonBone width={130} height={28} borderRadius={14} style={tw`mt-3`} />
        </View>

        {/* Lifetime Stats Row Skeleton */}
        <View style={tw`flex-row mt-4 -mx-1.5`}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                tw`flex-1 items-center rounded-2xl py-4 px-2 mx-1.5`,
                {
                  backgroundColor: colors.surface,
                  shadowColor: colors.shadowColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 1,
                  shadowRadius: 8,
                  elevation: 2,
                },
              ]}
            >
              <SkeletonBone width={45} height={18} borderRadius={6} />
              <SkeletonBone width={40} height={10} borderRadius={4} style={tw`mt-2`} />
              <SkeletonBone width={52} height={52} borderRadius={26} style={tw`mt-3`} />
            </View>
          ))}
        </View>

        {/* Health Goals Section Skeleton */}
        <View style={tw`flex-row items-center justify-between mt-7 mb-4`}>
          <SkeletonBone width={120} height={22} borderRadius={8} />
          <SkeletonBone width={90} height={28} borderRadius={14} />
        </View>

        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              tw`rounded-2xl p-4 mb-3`,
              {
                backgroundColor: colors.surface,
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 1,
                shadowRadius: 8,
                elevation: 2,
              },
            ]}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center flex-1`}>
                <SkeletonBone width={44} height={44} borderRadius={12} />
                <View style={tw`ml-3 flex-1`}>
                  <SkeletonBone width={100} height={14} borderRadius={6} />
                  <SkeletonBone width={130} height={10} borderRadius={4} style={tw`mt-2`} />
                </View>
              </View>
              <SkeletonBone width={50} height={50} borderRadius={25} />
            </View>
            <SkeletonBone width={'100%'} height={6} borderRadius={3} style={tw`mt-3`} />
          </View>
        ))}

        {/* Achievements Section Skeleton */}
        <SkeletonBone width={130} height={22} borderRadius={8} style={tw`mt-7 mb-4`} />
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              tw`rounded-2xl p-4 mb-3`,
              {
                backgroundColor: colors.surface,
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 1,
                shadowRadius: 6,
                elevation: 2,
              },
            ]}
          >
            <View style={tw`flex-row items-center`}>
              <SkeletonBone width={40} height={40} borderRadius={12} />
              <View style={tw`ml-3 flex-1`}>
                <SkeletonBone width={90} height={16} borderRadius={6} />
                <SkeletonBone width={180} height={12} borderRadius={4} style={tw`mt-2`} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </SkeletonLoader>
  );
};

// Skeleton for Goal Progress screen
const GoalProgressSkeleton = () => {
  const { colors } = useTheme();

  return (
    <SkeletonLoader>
      <View style={tw`px-5 pb-28`}>
        {/* Weight Goal Card Skeleton */}
        <View
          style={[
            tw`rounded-3xl p-5 mt-5`,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 12,
              elevation: 3,
            },
          ]}
        >
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <View>
              <SkeletonBone width={90} height={14} borderRadius={6} />
              <SkeletonBone width={100} height={32} borderRadius={10} style={tw`mt-2`} />
            </View>
            <View style={tw`items-end`}>
              <SkeletonBone width={50} height={12} borderRadius={4} />
              <SkeletonBone width={80} height={22} borderRadius={8} style={tw`mt-1`} />
            </View>
          </View>
          <SkeletonBone width={'100%'} height={8} borderRadius={4} />
          <SkeletonBone width={180} height={12} borderRadius={4} style={tw`mt-2 self-center`} />
        </View>

        {/* BMI Section Skeleton */}
        <View
          style={[
            tw`rounded-3xl p-5 mt-4`,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 12,
              elevation: 3,
            },
          ]}
        >
          <View style={tw`flex-row items-center justify-between mb-3`}>
            <SkeletonBone width={40} height={18} borderRadius={6} />
            <SkeletonBone width={100} height={24} borderRadius={12} />
          </View>
          <SkeletonBone width={'100%'} height={10} borderRadius={5} />
          <View style={tw`flex-row justify-between mt-3`}>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonBone key={i} width={60} height={10} borderRadius={4} />
            ))}
          </View>
        </View>

        {/* Trend Chart Skeleton */}
        <View
          style={[
            tw`rounded-3xl p-5 mt-4`,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 12,
              elevation: 3,
            },
          ]}
        >
          <SkeletonBone width={120} height={18} borderRadius={6} style={tw`mb-4`} />
          <SkeletonBone width={'100%'} height={150} borderRadius={12} />
        </View>

        {/* Other Goals Skeleton */}
        <SkeletonBone width={110} height={22} borderRadius={8} style={tw`mt-7 mb-4`} />
        {[1, 2].map((i) => (
          <View
            key={i}
            style={[
              tw`rounded-2xl p-4 mb-3`,
              {
                backgroundColor: colors.surface,
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 1,
                shadowRadius: 8,
                elevation: 2,
              },
            ]}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center flex-1`}>
                <SkeletonBone width={44} height={44} borderRadius={12} />
                <View style={tw`ml-3 flex-1`}>
                  <SkeletonBone width={90} height={14} borderRadius={6} />
                  <SkeletonBone width={120} height={10} borderRadius={4} style={tw`mt-2`} />
                </View>
              </View>
              <SkeletonBone width={50} height={50} borderRadius={25} />
            </View>
            <SkeletonBone width={'100%'} height={6} borderRadius={3} style={tw`mt-3`} />
          </View>
        ))}
      </View>
    </SkeletonLoader>
  );
};

// Skeleton for Tracker screens (Steps, Hydration, Blood Pressure, etc.)
const TrackerSkeleton = () => {
  const { colors } = useTheme();

  return (
    <SkeletonLoader>
      <View style={tw`px-5 pb-28`}>
        {/* Main Progress Card Skeleton */}
        <View
          style={[
            tw`rounded-3xl p-5 mt-5`,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 12,
              elevation: 3,
            },
          ]}
        >
          <SkeletonBone width={130} height={14} borderRadius={6} style={tw`mb-2`} />
          <View style={tw`flex-row items-center justify-between`}>
            <View>
              <SkeletonBone width={140} height={36} borderRadius={12} />
              <SkeletonBone width={80} height={14} borderRadius={6} style={tw`mt-2`} />
            </View>
            <SkeletonBone width={85} height={85} borderRadius={43} />
          </View>
        </View>

        {/* Stat Cards Row Skeleton */}
        <View style={tw`flex-row mt-4 -mx-1.5`}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                tw`flex-1 items-center rounded-2xl py-4 px-2 mx-1.5`,
                {
                  backgroundColor: colors.surface,
                  shadowColor: colors.shadowColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 1,
                  shadowRadius: 8,
                  elevation: 2,
                },
              ]}
            >
              <SkeletonBone width={45} height={18} borderRadius={6} />
              <SkeletonBone width={40} height={10} borderRadius={4} style={tw`mt-2`} />
              <SkeletonBone width={52} height={52} borderRadius={26} style={tw`mt-3`} />
            </View>
          ))}
        </View>

        {/* Trend Chart Skeleton */}
        <View
          style={[
            tw`rounded-3xl p-5 mt-5`,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 12,
              elevation: 3,
            },
          ]}
        >
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <SkeletonBone width={100} height={18} borderRadius={6} />
            <SkeletonBone width={120} height={28} borderRadius={14} />
          </View>
          <SkeletonBone width={'100%'} height={150} borderRadius={12} />
        </View>

        {/* Recent Logs Section Skeleton */}
        <SkeletonBone width={110} height={22} borderRadius={8} style={tw`mt-7 mb-4`} />
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              tw`rounded-2xl p-4 mb-3`,
              {
                backgroundColor: colors.surface,
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 1,
                shadowRadius: 6,
                elevation: 2,
              },
            ]}
          >
            <View style={tw`flex-row items-center`}>
              <SkeletonBone width={40} height={40} borderRadius={12} />
              <View style={tw`ml-3 flex-1`}>
                <SkeletonBone width={80} height={16} borderRadius={6} />
                <SkeletonBone width={130} height={12} borderRadius={4} style={tw`mt-2`} />
              </View>
              <SkeletonBone width={20} height={20} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonLoader>
  );
};

// Skeleton for Notifications screen
const NotificationsSkeleton = () => {
  const { colors } = useTheme();

  return (
    <SkeletonLoader>
      <View style={tw`px-3 pt-3 pb-6`}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View
            key={i}
            style={[
              tw`rounded-2xl p-4 mb-3`,
              {
                backgroundColor: colors.surface,
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 1,
                shadowRadius: 4,
                elevation: 1,
              },
            ]}
          >
            <View style={tw`flex-row items-start`}>
              <SkeletonBone width={40} height={40} borderRadius={20} />
              <View style={tw`ml-3 flex-1`}>
                <SkeletonBone width={160} height={16} borderRadius={6} />
                <SkeletonBone width={'90%'} height={12} borderRadius={4} style={tw`mt-2`} />
                <SkeletonBone width={80} height={10} borderRadius={4} style={tw`mt-2`} />
              </View>
              <SkeletonBone width={8} height={8} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonLoader>
  );
};

// Skeleton for DailyLog screen
const DailyLogSkeleton = () => {
  const { colors } = useTheme();

  return (
    <SkeletonLoader>
      <View style={tw`px-5 pb-28`}>
        {/* Date Navigation Card Skeleton */}
        <View
          style={[
            tw`rounded-2xl p-4 mt-5 flex-row items-center justify-between`,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 1,
              shadowRadius: 8,
              elevation: 2,
            },
          ]}
        >
          <SkeletonBone width={36} height={36} borderRadius={18} />
          <View style={tw`items-center`}>
            <SkeletonBone width={100} height={16} borderRadius={6} />
            <SkeletonBone width={60} height={12} borderRadius={4} style={tw`mt-1`} />
          </View>
          <SkeletonBone width={36} height={36} borderRadius={18} />
        </View>

        {/* Logging Progress Card Skeleton */}
        <View
          style={[
            tw`rounded-3xl p-5 mt-4`,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 12,
              elevation: 3,
            },
          ]}
        >
          <SkeletonBone width={120} height={14} style={tw`mb-3`} />
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-baseline`}>
              <SkeletonBone width={40} height={36} borderRadius={12} />
              <SkeletonBone width={80} height={18} borderRadius={6} style={tw`ml-2`} />
            </View>
            <SkeletonBone width={65} height={65} borderRadius={33} />
          </View>
        </View>

        {/* Stat Cards Row Skeleton */}
        <View style={tw`flex-row mt-4 -mx-1.5`}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                tw`flex-1 items-center rounded-2xl py-4 px-2 mx-1.5`,
                {
                  backgroundColor: colors.surface,
                  shadowColor: colors.shadowColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 1,
                  shadowRadius: 8,
                  elevation: 2,
                },
              ]}
            >
              <SkeletonBone width={50} height={18} borderRadius={6} />
              <SkeletonBone width={40} height={10} borderRadius={4} style={tw`mt-2`} />
              <SkeletonBone width={52} height={52} borderRadius={26} style={tw`mt-3`} />
            </View>
          ))}
        </View>

        {/* Log Health Data Section Skeleton */}
        <SkeletonBone width={140} height={22} borderRadius={8} style={tw`mt-7 mb-4`} />
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[
              tw`rounded-2xl p-4 mb-3`,
              {
                backgroundColor: colors.surface,
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 1,
                shadowRadius: 6,
                elevation: 2,
              },
            ]}
          >
            <View style={tw`flex-row items-center`}>
              <SkeletonBone width={40} height={40} borderRadius={12} />
              <View style={tw`ml-3 flex-1`}>
                <SkeletonBone width={100} height={16} borderRadius={6} />
                <SkeletonBone width={140} height={12} borderRadius={4} style={tw`mt-2`} />
              </View>
              <SkeletonBone width={20} height={20} borderRadius={4} />
            </View>
          </View>
        ))}

        {/* Detailed Trackers Section Skeleton */}
        <SkeletonBone width={160} height={22} borderRadius={8} style={tw`mt-7 mb-4`} />
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              tw`rounded-2xl p-4 mb-4 flex-row items-center justify-between`,
              {
                backgroundColor: colors.surface,
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 1,
                shadowRadius: 8,
                elevation: 2,
              },
            ]}
          >
            <View style={tw`flex-row items-center flex-1`}>
              <SkeletonBone width={44} height={44} borderRadius={12} />
              <View style={tw`ml-3 flex-1`}>
                <SkeletonBone width={120} height={16} borderRadius={6} />
                <SkeletonBone width={70} height={10} borderRadius={4} style={tw`mt-2`} />
              </View>
            </View>
            <SkeletonBone width={32} height={32} borderRadius={16} />
          </View>
        ))}
      </View>
    </SkeletonLoader>
  );
};

export {
  SkeletonLoader,
  SkeletonBone,
  DashboardSkeleton,
  ProfileSkeleton,
  GoalProgressSkeleton,
  TrackerSkeleton,
  NotificationsSkeleton,
  DailyLogSkeleton,
};

export default SkeletonLoader;