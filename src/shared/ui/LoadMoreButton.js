/**
 * LoadMoreButton — Reusable "Load More" button for paginated lists.
 *
 * Usage:
 *   <LoadMoreButton
 *     hasMore={hasMoreLogs}
 *     onLoadMore={loadMoreLogs}
 *     isLoading={isLoadingMore}
 *     totalCount={totalLogs}
 *     currentCount={logs.length}
 *   />
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import tw from '../../theme/tw';
import useTheme from '../../hooks/useTheme';

const LoadMoreButton = ({
  hasMore,
  onLoadMore,
  isLoading = false,
  totalCount = 0,
  currentCount = 0,
}) => {
  const { colors } = useTheme();

  if (!hasMore && currentCount === 0) return null;

  return (
    <View style={tw`mt-3 mb-2`}>
      {/* Counter */}
      {totalCount > 0 && (
        <Text style={[tw`text-xs text-center mb-2`, { color: colors.textMuted }]}>
          Showing {currentCount} of {totalCount} entries
        </Text>
      )}

      {/* Load More Button */}
      {hasMore && (
        <TouchableOpacity
          onPress={onLoadMore}
          disabled={isLoading}
          activeOpacity={0.7}
          style={[
            tw`flex-row items-center justify-center py-3 px-5 rounded-xl`,
            { backgroundColor: colors.purpleLight || '#F3EAFF' },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Icon name="expand-more" size={18} color={colors.primary} />
              <Text style={[tw`text-sm font-semibold ml-1`, { color: colors.primary }]}>
                Load More
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* All loaded indicator */}
      {!hasMore && currentCount > 0 && totalCount > 0 && (
        <View style={tw`items-center py-2`}>
          <Text style={[tw`text-xs`, { color: colors.textMuted }]}>
            All entries loaded
          </Text>
        </View>
      )}
    </View>
  );
};

export default LoadMoreButton;