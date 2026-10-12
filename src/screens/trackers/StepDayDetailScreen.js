/**
 * StepDayDetailScreen.js
 *
 * Google Fit-style "See source data" screen.
 * Shows all individual step entries for a specific day with:
 * - Time windows (startTime → endTime) like Google Fit
 * - Hourly distribution chart using proportional bucketization
 * - Individual entries showing duration and step count
 *
 * Example display:
 * - 08:00 – 08:01 → 120 steps
 * - 08:01 – 08:05 → 480 steps
 * - 14:15 – 14:20 → 600 steps
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import tw from '../../theme/tw';
import useTheme from '../../hooks/useTheme';
import { getStepEntries } from '../../api/trackerFactory';
import StepEntryService from '../../services/StepEntryService';
import dayjs from 'dayjs';

const screenWidth = Dimensions.get('window').width;

// ─── Hourly Bar Chart (with proportional bucketization) ─────────────────────────

const HourlyBarChart = ({ hourlyData, colors }) => {
  const chartWidth = screenWidth - 64;
  const chartHeight = 120;
  const barWidth = (chartWidth - 20) / 24;
  const maxSteps = Math.max(...hourlyData.map(d => d.steps), 1) * 1.2;

  return (
    <View style={[tw`rounded-2xl p-4`, { backgroundColor: colors.surface }]}>
      <Svg width={chartWidth} height={chartHeight + 25}>
        {/* Max value label */}
        <SvgText
          x={chartWidth - 5}
          y={12}
          fontSize={9}
          fill={colors.textMuted}
          textAnchor="end"
        >
          {Math.round(maxSteps).toLocaleString()}
        </SvgText>

        {/* Mid value label */}
        <SvgText
          x={chartWidth - 5}
          y={chartHeight / 2 + 4}
          fontSize={9}
          fill={colors.textMuted}
          textAnchor="end"
        >
          {Math.round(maxSteps / 2).toLocaleString()}
        </SvgText>

        {/* Grid lines */}
        <Line
          x1={10}
          y1={chartHeight / 2}
          x2={chartWidth - 30}
          y2={chartHeight / 2}
          stroke={colors.border || '#E0E0E0'}
          strokeWidth={0.5}
          opacity={0.4}
          strokeDasharray="3 3"
        />

        {/* Bars */}
        {hourlyData.map((item, index) => {
          const barHeight = maxSteps > 0 ? (item.steps / maxSteps) * chartHeight : 0;
          const x = 10 + index * barWidth + barWidth * 0.15;
          const y = chartHeight - barHeight;

          return (
            <React.Fragment key={index}>
              <Rect
                x={x}
                y={Math.max(y, 1)}
                width={barWidth * 0.7}
                height={Math.max(barHeight, item.steps > 0 ? 2 : 0)}
                rx={2}
                fill={item.steps > 0 ? '#5B7FFF' : 'transparent'}
                opacity={0.85}
              />
              {/* Hour labels (every 4 hours) */}
              {index % 4 === 0 && (
                <SvgText
                  x={x + barWidth * 0.35}
                  y={chartHeight + 14}
                  fontSize={9}
                  fill={colors.textMuted}
                  textAnchor="middle"
                >
                  {index}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}

        {/* Last hour label (24) */}
        <SvgText
          x={10 + 24 * barWidth}
          y={chartHeight + 14}
          fontSize={9}
          fill={colors.textMuted}
          textAnchor="middle"
        >
          24
        </SvgText>

        {/* X-axis line */}
        <Line
          x1={10}
          y1={chartHeight}
          x2={chartWidth - 30}
          y2={chartHeight}
          stroke={colors.border || '#333'}
          strokeWidth={1}
          opacity={0.3}
        />
      </Svg>
    </View>
  );
};

// ─── Entry List Item (Google Fit style with time window) ────────────────────────

const EntryItem = ({ entry, colors }) => {
  const startTime = entry.time || dayjs(entry.startTimestamp || entry.timestamp).format('HH:mm');
  const endTime = entry.endTimestamp && entry.endTimestamp !== entry.startTimestamp
    ? dayjs(entry.endTimestamp).format('HH:mm')
    : null;

  // Calculate duration if time window exists
  const durationMs = entry.endTimestamp && entry.startTimestamp
    ? entry.endTimestamp - entry.startTimestamp
    : 0;
  const durationMin = Math.floor(durationMs / 60000);
  const durationSec = Math.floor((durationMs % 60000) / 1000);
  const durationText = durationMs > 1000
    ? (durationMin > 0 ? `${durationMin}m ${durationSec}s` : `${durationSec}s`)
    : null;

  return (
    <View style={[tw`py-3`, { borderBottomWidth: 0.5, borderBottomColor: colors.border || '#2A2A2A' }]}>
      {/* Time window display */}
      <View style={tw`flex-row items-center mb-1`}>
        <Text style={[tw`text-xs font-medium`, { color: '#5B7FFF' }]}>
          {startTime}
          {endTime ? ` – ${endTime}` : ''}
        </Text>
        {durationText && (
          <Text style={[tw`text-xs ml-2`, { color: colors.textMuted }]}>
            ({durationText})
          </Text>
        )}
      </View>
      {/* Step count */}
      <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>
        {entry.steps} {entry.steps === 1 ? 'step' : 'steps'}
      </Text>
    </View>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────

const StepDayDetailScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { date } = route.params; // 'YYYY-MM-DD'

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [totalSteps, setTotalSteps] = useState(0);

  const dateLabel = dayjs(date).format('D MMMM');

  const fetchData = useCallback(async () => {
    try {
      // First try to get from local storage (uses proportional bucketization)
      const localEntries = await StepEntryService.getLocalEntries(date);
      const localHourly = await StepEntryService.getLocalHourlyData(date);

      if (localEntries.length > 0) {
        setEntries(localEntries);
        setHourlyData(localHourly);
        setTotalSteps(localEntries.reduce((sum, e) => sum + e.steps, 0));
      }

      // Also try to fetch from backend (uses server-side proportional bucketization)
      try {
        const response = await getStepEntries({ date });
        if (response.data && response.data.entries && response.data.entries.length > 0) {
          // Use backend data if it has more entries (more complete)
          if (response.data.entries.length >= localEntries.length) {
            setEntries(response.data.entries);
            setHourlyData(response.data.hourlyData || localHourly);
            setTotalSteps(response.data.totalSteps || 0);
          }
        }
      } catch (apiError) {
        // Backend might not have entries yet, use local data
        console.log('[StepDayDetail] Backend fetch failed, using local data');
      }
    } catch (error) {
      console.error('[StepDayDetail] fetchData error:', error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[tw`flex-1 items-center justify-center`, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface || '#1A1A2E', paddingTop: 20, paddingBottom: 16 }}>
        <View style={tw`flex-row items-center justify-between px-5`}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={tw`w-10 h-10 items-center justify-center`}>
            <Icon name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[tw`text-lg font-bold`, { color: colors.textPrimary }]}>{dateLabel}</Text>
          <View style={tw`w-10 h-10`} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        contentContainerStyle={tw`px-5 pb-20`}
      >
        {/* Total Steps Header */}
        <View style={tw`mt-5 mb-4`}>
          <Text style={[tw`text-3xl font-bold`, { color: '#5B7FFF' }]}>
            {totalSteps.toLocaleString()}
            <Text style={[tw`text-base font-normal`, { color: colors.textMuted }]}> steps</Text>
          </Text>
          <Text style={[tw`text-xs mt-1`, { color: colors.textMuted }]}>
            Steps · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>

        {/* Hourly Bar Chart (proportional bucketization) */}
        {hourlyData.length > 0 && (
          <HourlyBarChart hourlyData={hourlyData} colors={colors} />
        )}

        {/* Description */}
        <Text style={[tw`text-xs mt-4 mb-4 leading-4`, { color: colors.textMuted }]}>
          Steps are distributed across hours using proportional time-window calculation. If a walking session spans two hours, steps are split based on how much time falls in each hour.
        </Text>

        {/* Source Data Entries List */}
        <View style={tw`mt-2`}>
          <Text style={[tw`text-sm font-bold mb-3`, { color: colors.textPrimary }]}>
            Source Data
          </Text>

          {entries.length === 0 ? (
            <View style={[tw`items-center py-10 rounded-2xl`, { backgroundColor: colors.surface }]}>
              <Icon name="directions-walk" size={48} color={colors.textMuted} />
              <Text style={[tw`text-sm mt-3 font-medium`, { color: colors.textMuted }]}>
                No step entries recorded for this day
              </Text>
              <Text style={[tw`text-xs mt-2 text-center px-8`, { color: colors.textMuted }]}>
                Step entries are recorded when the app is actively tracking. Start walking to see your detailed step data here.
              </Text>
            </View>
          ) : (
            entries.map((entry, index) => (
              <EntryItem key={`${entry.timestamp || entry.startTimestamp}-${index}`} entry={entry} colors={colors} />
            ))
          )}
        </View>

        {/* Technical Info */}
        {entries.length > 0 && (
          <View style={[tw`mt-6 p-4 rounded-xl`, { backgroundColor: colors.surface }]}>
            <Text style={[tw`text-xs font-medium mb-2`, { color: colors.textMuted }]}>
              How this works
            </Text>
            <Text style={[tw`text-xs leading-4`, { color: colors.textMuted }]}>
              Your phone's step counter sensor batches steps and delivers them periodically. Each entry shows a time window (start → end) with the steps counted during that window. The hourly chart distributes steps proportionally when a window crosses an hour boundary.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default StepDayDetailScreen;