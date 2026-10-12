/**
 * StepHistoryScreen.js
 * 
 * Google Fit-style step history and trends screen.
 * Features:
 * - Day/Week/Month view toggle (like Google Fit)
 * - Day view: Hourly bar chart (0-24h) + activity sessions list
 * - Week view: Daily bar chart + description + daily breakdown list
 * - Month view: Bubble calendar + description + weekly summaries
 * - "See source data" link for detailed day view
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import tw from '../../theme/tw';
import useTheme from '../../hooks/useTheme';
import useSteps from '../../hooks/useSteps';
import { getStepsTrends, getStepEntries } from '../../api/trackerFactory';
import { TrackerSkeleton } from '../../shared/feedback/SkeletonLoader';
import StepEntryService from '../../services/StepEntryService';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

const screenWidth = Dimensions.get('window').width;

// ─── Constants ──────────────────────────────────────────────────────────────────

const VIEW_MODES = ['Day', 'Week', 'Month'];
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Helper Functions ───────────────────────────────────────────────────────────

const getWeekDates = (referenceDate) => {
  const startOfWeek = dayjs(referenceDate).startOf('isoWeek');
  const dates = [];
  for (let i = 0; i < 7; i++) {
    dates.push(startOfWeek.add(i, 'day'));
  }
  return dates;
};

const getMonthDays = (referenceDate) => {
  const startOfMonth = dayjs(referenceDate).startOf('month');
  const endOfMonth = dayjs(referenceDate).endOf('month');
  const daysInMonth = endOfMonth.date();
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(startOfMonth.date(i));
  }
  return days;
};

/**
 * Group step entries into activity sessions (like Google Fit).
 * Entries within 5 minutes of each other are grouped into one session.
 * Sessions are labeled based on time of day.
 */
const groupEntriesIntoSessions = (entries) => {
  if (!entries || entries.length === 0) return [];

  const sessions = [];
  let currentSession = null;
  const GAP_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes gap = new session

  entries.forEach((entry) => {
    const entryTime = entry.timestamp;

    if (!currentSession) {
      currentSession = {
        startTime: entryTime,
        endTime: entryTime,
        steps: entry.steps,
        entries: [entry],
      };
    } else {
      const gap = entryTime - currentSession.endTime;
      if (gap <= GAP_THRESHOLD_MS) {
        currentSession.endTime = entryTime;
        currentSession.steps += entry.steps;
        currentSession.entries.push(entry);
      } else {
        sessions.push(currentSession);
        currentSession = {
          startTime: entryTime,
          endTime: entryTime,
          steps: entry.steps,
          entries: [entry],
        };
      }
    }
  });

  if (currentSession) {
    sessions.push(currentSession);
  }

  return sessions.map((session) => {
    const startHour = dayjs(session.startTime).hour();
    let label = 'Walk';
    if (startHour >= 5 && startHour < 12) {
      label = 'Morning walk';
    } else if (startHour >= 12 && startHour < 17) {
      label = 'Afternoon walk';
    } else if (startHour >= 17 && startHour < 21) {
      label = 'Evening walk';
    } else {
      label = 'Night walk';
    }

    const durationMs = session.endTime - session.startTime;
    const durationMin = Math.floor(durationMs / 60000);
    const durationSec = Math.floor((durationMs % 60000) / 1000);

    return {
      ...session,
      label,
      timeLabel: dayjs(session.startTime).format('HH:mm'),
      duration: durationMin > 0 ? `${durationMin}m ${durationSec}s` : `${durationSec}s`,
    };
  }).filter(session => session.steps > 0);
};

// ─── View Mode Selector (Google Fit style - text tabs with underline) ────────────

const ViewModeSelector = ({ selected, onSelect, colors }) => (
  <View style={tw`flex-row justify-around border-b`} borderBottomColor={colors.border || '#E0E0E0'}>
    {VIEW_MODES.map((mode) => (
      <TouchableOpacity
        key={mode}
        style={[
          tw`py-3 px-6`,
          selected === mode && { borderBottomWidth: 2, borderBottomColor: colors.textPrimary },
        ]}
        onPress={() => onSelect(mode)}
      >
        <Text
          style={[
            tw`text-sm`,
            { color: selected === mode ? colors.textPrimary : colors.textMuted },
            selected === mode && tw`font-bold`,
          ]}
        >
          {mode}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Date Navigator (Previous/Next arrows with date label) ──────────────────────

const DateNavigator = ({ label, subtitle, onPrev, onNext, canGoNext, colors }) => (
  <View style={tw`items-center mt-4 mb-3`}>
    <View style={tw`flex-row items-center justify-between w-full`}>
      <TouchableOpacity
        onPress={onPrev}
        style={tw`w-9 h-9 items-center justify-center`}
      >
        <Icon name="chevron-left" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <View style={tw`items-center`}>
        <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>{label}</Text>
        {subtitle && (
          <View style={tw`flex-row items-center mt-1`}>
            <Icon name="directions-walk" size={13} color="#5B7FFF" />
            <Text style={[tw`text-xs ml-1`, { color: colors.textMuted }]}>{subtitle}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        onPress={onNext}
        disabled={!canGoNext}
        style={[tw`w-9 h-9 items-center justify-center`, { opacity: canGoNext ? 1 : 0.3 }]}
      >
        <Icon name="chevron-right" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Hourly Bar Chart (0-24 hours, Google Fit Day view style) ───────────────────

const HourlyBarChart = ({ hourlyData, colors }) => {
  const chartWidth = screenWidth - 64;
  const chartHeight = 130;
  const barWidth = (chartWidth - 40) / 24;
  const maxSteps = Math.max(...hourlyData.map(d => d.steps), 1) * 1.2;

  return (
    <View style={tw`mt-2`}>
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
          y1={0}
          x2={chartWidth - 30}
          y2={0}
          stroke={colors.border || '#E0E0E0'}
          strokeWidth={0.5}
          opacity={0.3}
        />
        <Line
          x1={10}
          y1={chartHeight / 2}
          x2={chartWidth - 30}
          y2={chartHeight / 2}
          stroke={colors.border || '#E0E0E0'}
          strokeWidth={0.5}
          opacity={0.3}
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

// ─── Weekly Bar Chart (Google Fit style - simple bars with day labels) ───────────

const WeekBarChart = ({ weekDates, stepsData, colors }) => {
  const chartWidth = screenWidth - 64;
  const chartHeight = 150;
  const barWidth = (chartWidth - 20) / 7;
  const maxSteps = Math.max(...weekDates.map(d => stepsData[d.format('YYYY-MM-DD')] || 0), 1) * 1.2;
  const today = dayjs().format('YYYY-MM-DD');

  return (
    <View style={tw`mt-2`}>
      <Svg width={chartWidth} height={chartHeight + 30}>
        {/* Grid lines */}
        <Line
          x1={10}
          y1={0}
          x2={chartWidth - 10}
          y2={0}
          stroke={colors.border || '#E0E0E0'}
          strokeWidth={0.5}
          opacity={0.3}
        />
        <Line
          x1={10}
          y1={chartHeight / 2}
          x2={chartWidth - 10}
          y2={chartHeight / 2}
          stroke={colors.border || '#E0E0E0'}
          strokeWidth={0.5}
          opacity={0.3}
          strokeDasharray="3 3"
        />

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

        {/* Bars */}
        {weekDates.map((date, index) => {
          const dateStr = date.format('YYYY-MM-DD');
          const steps = stepsData[dateStr] || 0;
          const barHeight = maxSteps > 0 ? (steps / maxSteps) * chartHeight : 0;
          const x = 10 + index * barWidth + barWidth * 0.2;
          const y = chartHeight - barHeight;
          const isToday = dateStr === today;

          return (
            <React.Fragment key={dateStr}>
              <Rect
                x={x}
                y={Math.max(y, 1)}
                width={barWidth * 0.6}
                height={Math.max(barHeight, steps > 0 ? 2 : 0)}
                rx={3}
                fill="#5B7FFF"
                opacity={0.85}
              />
              {/* Day label */}
              <SvgText
                x={x + barWidth * 0.3}
                y={chartHeight + 16}
                fontSize={10}
                fill={isToday ? colors.textPrimary : colors.textMuted}
                textAnchor="middle"
                fontWeight={isToday ? 'bold' : 'normal'}
              >
                {DAYS_OF_WEEK[index]}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* X-axis line */}
        <Line
          x1={10}
          y1={chartHeight}
          x2={chartWidth - 10}
          y2={chartHeight}
          stroke={colors.border || '#333'}
          strokeWidth={1}
          opacity={0.3}
        />
      </Svg>
    </View>
  );
};

// ─── Activity Session Item (Google Fit style) ───────────────────────────────────

const ActivitySessionItem = ({ session, colors }) => (
  <View style={[tw`py-4`, { borderBottomWidth: 0.5, borderBottomColor: colors.border || '#E0E0E0' }]}>
    <View style={tw`flex-row items-center mb-1`}>
      <Icon name="directions-walk" size={14} color={colors.textMuted} />
      <Text style={[tw`text-xs ml-1`, { color: colors.textMuted }]}>
        {session.timeLabel}
      </Text>
    </View>
    <Text style={[tw`text-base font-bold mb-1`, { color: colors.textPrimary }]}>
      {session.label}
    </Text>
    <View style={tw`flex-row items-center`}>
      <Text style={[tw`text-xs`, { color: colors.textMuted }]}>
        {session.duration}
      </Text>
      <Text style={[tw`text-xs mx-2`, { color: colors.textMuted }]}>·</Text>
      <Icon name="directions-walk" size={12} color="#5B7FFF" />
      <Text style={[tw`text-xs ml-1`, { color: colors.textMuted }]}>
        {session.steps.toLocaleString()} steps
      </Text>
    </View>
  </View>
);

// ─── Weekly Day Breakdown Item (Google Fit style) ───────────────────────────────

const WeekDayItem = ({ date, steps, onPress, colors }) => {
  const isToday = date.isSame(dayjs(), 'day');
  const isFuture = date.isAfter(dayjs(), 'day');
  const dateLabel = date.format('ddd, D MMM');

  return (
    <TouchableOpacity
      onPress={() => !isFuture && onPress(date.format('YYYY-MM-DD'))}
      disabled={isFuture}
      activeOpacity={0.7}
      style={[tw`py-4`, { borderBottomWidth: 0.5, borderBottomColor: colors.border || '#E0E0E0', opacity: isFuture ? 0.4 : 1 }]}
    >
      <View style={tw`flex-row items-center`}>
        <Icon name="directions-walk" size={14} color={colors.textMuted} />
        <Text style={[tw`text-xs ml-1`, { color: colors.textMuted }]}>
          {isToday ? 'Today' : dateLabel}
        </Text>
      </View>
      <Text style={[tw`text-lg font-bold mt-1`, { color: colors.textPrimary }]}>
        {steps > 0 ? `${steps.toLocaleString()} steps` : 'No data'}
      </Text>
    </TouchableOpacity>
  );
};

// ─── Monthly Bubble Calendar (Google Fit style - exactly like image) ─────────────

const MonthBubbleCalendar = ({ referenceDate, stepsData, goal, onSelectDate, colors }) => {
  const monthDays = getMonthDays(referenceDate);
  const today = dayjs().format('YYYY-MM-DD');
  const todayDayOfWeek = dayjs().isoWeekday(); // 1=Mon, 7=Sun
  const firstDayOfMonth = dayjs(referenceDate).startOf('month');
  const startOffset = firstDayOfMonth.isoWeekday() - 1;

  // Calculate max steps for sizing bubbles
  const allSteps = monthDays.map(d => stepsData[d.format('YYYY-MM-DD')] || 0);
  const maxSteps = Math.max(...allSteps, goal, 1);

  // Create grid with empty cells for offset
  const gridCells = [];
  for (let i = 0; i < startOffset; i++) {
    gridCells.push(null);
  }
  monthDays.forEach(d => gridCells.push(d));

  // Split into weeks (rows of 7)
  const weeks = [];
  for (let i = 0; i < gridCells.length; i += 7) {
    weeks.push(gridCells.slice(i, i + 7));
  }

  const cellSize = (screenWidth - 80) / 7;
  const maxBubbleSize = cellSize * 0.9;
  const minBubbleSize = cellSize * 0.4;

  return (
    <View style={tw`mt-3`}>
      {/* Weeks grid */}
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={tw`flex-row justify-between mb-2`}>
          {week.map((day, dayIndex) => {
            if (!day) {
              return <View key={`empty-${dayIndex}`} style={{ width: cellSize, height: cellSize }} />;
            }

            const dateStr = day.format('YYYY-MM-DD');
            const steps = stepsData[dateStr] || 0;
            const isToday = dateStr === today;
            const isFuture = day.isAfter(dayjs(), 'day');

            // Calculate bubble size based on steps
            const ratio = steps > 0 ? Math.min(steps / maxSteps, 1) : 0;
            const bubbleSize = steps > 0
              ? minBubbleSize + (maxBubbleSize - minBubbleSize) * ratio
              : 0;

            // Color: darker blue for more steps (like Google Fit)
            let bubbleColor = '#5B7FFF';
            let bubbleOpacity = 0.4 + (ratio * 0.6);
            if (ratio >= 0.8) {
              bubbleColor = '#3D5AFE';
              bubbleOpacity = 1;
            }

            return (
              <TouchableOpacity
                key={dateStr}
                onPress={() => !isFuture && onSelectDate(dateStr)}
                disabled={isFuture}
                style={[
                  { width: cellSize, height: cellSize, alignItems: 'center', justifyContent: 'center' },
                  { opacity: isFuture ? 0.4 : 1 },
                ]}
                activeOpacity={0.7}
              >
                {steps > 0 ? (
                  <View
                    style={{
                      width: bubbleSize,
                      height: bubbleSize,
                      borderRadius: bubbleSize / 2,
                      backgroundColor: bubbleColor,
                      opacity: bubbleOpacity,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={[tw`text-xs font-bold`, { color: '#FFFFFF' }]}>
                      {day.format('D')}
                    </Text>
                  </View>
                ) : (
                  <View style={tw`items-center justify-center`}>
                    <Text style={[
                      tw`text-sm`,
                      { color: isToday ? colors.primary : isFuture ? colors.textMuted : colors.textPrimary },
                      isToday && tw`font-bold`,
                    ]}>
                      {day.format('D')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Day of week labels at bottom (like Google Fit) */}
      <View style={tw`flex-row justify-between mt-2`}>
        {DAYS_OF_WEEK.map((day, index) => {
          const isCurrentDayOfWeek = (index + 1) === todayDayOfWeek;
          return (
            <View key={day} style={{ width: cellSize, alignItems: 'center' }}>
              <Text style={[
                tw`text-xs`,
                { color: isCurrentDayOfWeek ? colors.textPrimary : colors.textMuted },
                isCurrentDayOfWeek && tw`font-bold`,
              ]}>
                {day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ─── Monthly Week Summary List (Google Fit style) ───────────────────────────────

const MonthWeekSummary = ({ referenceDate, stepsData, colors }) => {
  const startOfMonth = dayjs(referenceDate).startOf('month');
  const endOfMonth = dayjs(referenceDate).endOf('month');

  // Group by weeks
  const weeks = [];
  let weekStart = startOfMonth.startOf('isoWeek');

  while (weekStart.isBefore(endOfMonth) || weekStart.isSame(endOfMonth, 'day')) {
    const weekEnd = weekStart.add(6, 'day');
    let weekSteps = 0;

    for (let i = 0; i < 7; i++) {
      const d = weekStart.add(i, 'day');
      const dateStr = d.format('YYYY-MM-DD');
      weekSteps += stepsData[dateStr] || 0;
    }

    weeks.push({
      start: weekStart,
      end: weekEnd,
      steps: weekSteps,
    });

    weekStart = weekStart.add(7, 'day');
    if (weekStart.isAfter(endOfMonth.add(6, 'day'))) break;
  }

  return (
    <View style={[tw`mt-4 pt-4`, { borderTopWidth: 0.5, borderTopColor: colors.border || '#E0E0E0' }]}>
      {weeks.map((week, index) => (
        <View key={index} style={tw`mb-5`}>
          <Text style={[tw`text-sm`, { color: colors.textMuted }]}>
            {week.start.format('D MMMM')} – {week.end.format('D MMMM')}
          </Text>
          <Text style={[tw`text-xl font-bold mt-1`, { color: colors.textPrimary }]}>
            {week.steps.toLocaleString()} steps
          </Text>
        </View>
      ))}
    </View>
  );
};

// ─── Main StepHistoryScreen Component ───────────────────────────────────────────

const StepHistoryScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { todaySteps, goal, distance, calories } = useSteps();

  const [viewMode, setViewMode] = useState('Day');
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [referenceDate, setReferenceDate] = useState(dayjs());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stepsData, setStepsData] = useState({});
  const [hourlyData, setHourlyData] = useState([]);
  const [activitySessions, setActivitySessions] = useState([]);

  // ─── Computed Values ────────────────────────────────────────────────────

  const weekDates = useMemo(() => getWeekDates(referenceDate), [referenceDate]);

  const canGoNext = useMemo(() => {
    if (viewMode === 'Day') {
      return dayjs(selectedDate).isBefore(dayjs(), 'day');
    }
    if (viewMode === 'Week') {
      return referenceDate.endOf('isoWeek').isBefore(dayjs(), 'day');
    }
    return referenceDate.endOf('month').isBefore(dayjs(), 'day');
  }, [viewMode, selectedDate, referenceDate]);

  const dateLabel = useMemo(() => {
    if (viewMode === 'Day') {
      const d = dayjs(selectedDate);
      if (d.isSame(dayjs(), 'day')) return 'Today';
      if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
      return d.format('dddd, D MMMM');
    }
    if (viewMode === 'Week') {
      const start = referenceDate.startOf('isoWeek');
      const end = referenceDate.endOf('isoWeek');
      if (start.isSame(end, 'month')) {
        return `${start.format('D')} – ${end.format('D MMMM YYYY')}`;
      }
      return `${start.format('D MMM')} – ${end.format('D MMM YYYY')}`;
    }
    return referenceDate.format('MMMM YYYY');
  }, [viewMode, selectedDate, referenceDate]);

  // Steps data map for quick lookup
  const stepsMap = useMemo(() => {
    const map = {};
    Object.entries(stepsData).forEach(([date, data]) => {
      map[date] = data.steps || 0;
    });
    const today = dayjs().format('YYYY-MM-DD');
    map[today] = todaySteps;
    return map;
  }, [stepsData, todaySteps]);

  // Selected day data
  const selectedDayData = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    if (selectedDate === today) {
      return { steps: todaySteps, distance, calories };
    }
    const data = stepsData[selectedDate];
    return {
      steps: data?.steps || 0,
      distance: data?.distanceKm || 0,
      calories: data?.calories || 0,
    };
  }, [selectedDate, stepsData, todaySteps, distance, calories]);

  // Total steps for current view (for subtitle)
  const viewTotalSteps = useMemo(() => {
    if (viewMode === 'Day') {
      return selectedDayData.steps;
    }
    if (viewMode === 'Week') {
      let total = 0;
      weekDates.forEach(d => {
        total += stepsMap[d.format('YYYY-MM-DD')] || 0;
      });
      return total;
    }
    const monthDays = getMonthDays(referenceDate);
    let total = 0;
    monthDays.forEach(d => {
      total += stepsMap[d.format('YYYY-MM-DD')] || 0;
    });
    return total;
  }, [viewMode, selectedDayData, weekDates, stepsMap, referenceDate]);

  // ─── Fetch Hourly Data for Day View ─────────────────────────────────────

  const fetchDayHourlyData = useCallback(async (date) => {
    try {
      const localEntries = await StepEntryService.getLocalEntries(date);
      const localHourly = await StepEntryService.getLocalHourlyData(date);

      if (localEntries.length > 0) {
        setHourlyData(localHourly);
        setActivitySessions(groupEntriesIntoSessions(localEntries));
      } else {
        setHourlyData(Array.from({ length: 24 }, (_, i) => ({ hour: i, steps: 0 })));
        setActivitySessions([]);
      }

      try {
        const response = await getStepEntries({ date });
        if (response.data && response.data.entries && response.data.entries.length > 0) {
          if (response.data.entries.length >= localEntries.length) {
            setHourlyData(response.data.hourlyData || localHourly);
            setActivitySessions(groupEntriesIntoSessions(response.data.entries));
          }
        }
      } catch (apiError) {
        console.log('[StepHistory] Backend hourly fetch failed, using local data');
      }
    } catch (error) {
      console.error('[StepHistory] fetchDayHourlyData error:', error);
      setHourlyData(Array.from({ length: 24 }, (_, i) => ({ hour: i, steps: 0 })));
      setActivitySessions([]);
    }
  }, []);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchStepsHistory = useCallback(async () => {
    try {
      let startDate, endDate;

      if (viewMode === 'Day' || viewMode === 'Week') {
        startDate = referenceDate.startOf('isoWeek').format('YYYY-MM-DD');
        endDate = referenceDate.endOf('isoWeek').format('YYYY-MM-DD');
      } else {
        startDate = referenceDate.startOf('month').format('YYYY-MM-DD');
        endDate = referenceDate.endOf('month').format('YYYY-MM-DD');
      }

      const response = await getStepsTrends({ range: 'custom', startDate, endDate });

      if (response.data && Array.isArray(response.data)) {
        const dataMap = {};
        response.data.forEach((item) => {
          const dateStr = item.date || dayjs(item.createdAt).format('YYYY-MM-DD');
          dataMap[dateStr] = {
            steps: item.steps || 0,
            distanceKm: item.distanceKm || 0,
            calories: item.calories || 0,
          };
        });
        setStepsData(prev => ({ ...prev, ...dataMap }));
      }
    } catch (error) {
      console.error('[StepHistory] fetchStepsHistory error:', error);
    }
  }, [viewMode, referenceDate]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await fetchStepsHistory();
    if (viewMode === 'Day') {
      await fetchDayHourlyData(selectedDate);
    }
    setLoading(false);
  }, [fetchStepsHistory, fetchDayHourlyData, viewMode, selectedDate]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (viewMode === 'Day') {
      fetchDayHourlyData(selectedDate);
    }
  }, [selectedDate, viewMode, fetchDayHourlyData]);

  useEffect(() => {
    fetchStepsHistory();
  }, [fetchStepsHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStepsHistory();
    if (viewMode === 'Day') {
      await fetchDayHourlyData(selectedDate);
    }
    setRefreshing(false);
  };

  // ─── Navigation Handlers ────────────────────────────────────────────────

  const handlePrev = () => {
    if (viewMode === 'Day') {
      const prev = dayjs(selectedDate).subtract(1, 'day');
      setSelectedDate(prev.format('YYYY-MM-DD'));
      if (prev.isBefore(referenceDate.startOf('isoWeek'))) {
        setReferenceDate(prev);
      }
    } else if (viewMode === 'Week') {
      setReferenceDate(referenceDate.subtract(1, 'week'));
    } else {
      setReferenceDate(referenceDate.subtract(1, 'month'));
    }
  };

  const handleNext = () => {
    if (!canGoNext) return;
    if (viewMode === 'Day') {
      const next = dayjs(selectedDate).add(1, 'day');
      setSelectedDate(next.format('YYYY-MM-DD'));
      if (next.isAfter(referenceDate.endOf('isoWeek'))) {
        setReferenceDate(next);
      }
    } else if (viewMode === 'Week') {
      setReferenceDate(referenceDate.add(1, 'week'));
    } else {
      setReferenceDate(referenceDate.add(1, 'month'));
    }
  };

  const handleDaySelect = (dateStr) => {
    setSelectedDate(dateStr);
    setViewMode('Day');
  };

  // ─── Loading State ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
        <View style={{ backgroundColor: '#F3EAFF', paddingTop: 20, paddingBottom: 16, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
          <View style={tw`flex-row items-center justify-between px-5`}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#FFFFFF' }]}>
              <Icon name="arrow-back" size={24} color="#1A1D3F" />
            </TouchableOpacity>
            <Text style={[tw`text-lg font-bold`, { color: '#1A1D3F' }]}>Steps</Text>
            <View style={tw`w-10 h-10`} />
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <TrackerSkeleton />
        </ScrollView>
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={{ backgroundColor: '#F3EAFF', paddingTop: 20, paddingBottom: 16, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <View style={tw`flex-row items-center justify-between px-5`}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#FFFFFF' }]}>
            <Icon name="arrow-back" size={24} color="#1A1D3F" />
          </TouchableOpacity>
          <Text style={[tw`text-lg font-bold`, { color: '#1A1D3F' }]}>Steps</Text>
          <View style={tw`w-10 h-10`} />
        </View>
      </View>

      {/* View Mode Selector (tabs like Google Fit) */}
      <ViewModeSelector selected={viewMode} onSelect={setViewMode} colors={colors} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        contentContainerStyle={tw`px-5 pb-28`}
      >
        {/* Date Navigator */}
        <DateNavigator
          label={dateLabel}
          subtitle={viewTotalSteps > 0 ? `${viewTotalSteps.toLocaleString()} steps` : null}
          onPrev={handlePrev}
          onNext={handleNext}
          canGoNext={canGoNext}
          colors={colors}
        />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DAY VIEW - Hourly chart + Description + Activity Sessions */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {viewMode === 'Day' && (
          <>
            {/* Hourly Bar Chart (0-24 hours) */}
            <HourlyBarChart hourlyData={hourlyData} colors={colors} />

            {/* Description text (like Google Fit) */}
            <Text style={[tw`text-sm mt-4 mb-2 leading-5`, { color: colors.textMuted }]}>
              Steps are a useful measure of how much you're moving around, and can help you spot changes in your activity levels
            </Text>

            {/* Activity Sessions List (like Google Fit) */}
            {activitySessions.length > 0 ? (
              <View style={[tw`mt-3 pt-3`, { borderTopWidth: 0.5, borderTopColor: colors.border || '#E0E0E0' }]}>
                {activitySessions.map((session, index) => (
                  <ActivitySessionItem
                    key={`session-${session.startTime}-${index}`}
                    session={session}
                    colors={colors}
                  />
                ))}
              </View>
            ) : (
              <View style={tw`items-center py-8 mt-3`}>
                <Icon name="directions-walk" size={36} color={colors.textMuted} />
                <Text style={[tw`text-sm mt-3 font-medium`, { color: colors.textMuted }]}>
                  No activity sessions for this day
                </Text>
                <Text style={[tw`text-xs mt-1 text-center px-6`, { color: colors.textMuted }]}>
                  Activity sessions are recorded when the app is actively tracking your steps
                </Text>
              </View>
            )}

            {/* See Source Data Link (Google Fit style) */}
            <TouchableOpacity
              onPress={() => navigation.navigate('StepDayDetail', { date: selectedDate })}
              style={[tw`mt-4 pt-3`, { borderTopWidth: 0.5, borderTopColor: colors.border || '#E0E0E0' }]}
              activeOpacity={0.7}
            >
              <Text style={[tw`text-sm font-semibold`, { color: '#5B7FFF' }]}>
                See source data
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* WEEK VIEW - Bar chart + Description + Daily breakdown list */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {viewMode === 'Week' && (
          <>
            {/* Weekly Bar Chart */}
            <WeekBarChart
              weekDates={weekDates}
              stepsData={stepsMap}
              colors={colors}
            />

            {/* Description text (like Google Fit) */}
            <Text style={[tw`text-sm mt-4 mb-2 leading-5`, { color: colors.textMuted }]}>
              Steps are a useful measure of how much you're moving around, and can help you spot changes in your activity levels
            </Text>

            {/* Daily breakdown list (like Google Fit) */}
            <View style={[tw`mt-3 pt-3`, { borderTopWidth: 0.5, borderTopColor: colors.border || '#E0E0E0' }]}>
              {weekDates.map((date) => {
                const dateStr = date.format('YYYY-MM-DD');
                const steps = stepsMap[dateStr] || 0;
                return (
                  <WeekDayItem
                    key={dateStr}
                    date={date}
                    steps={steps}
                    onPress={handleDaySelect}
                    colors={colors}
                  />
                );
              })}
            </View>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* MONTH VIEW - Bubble calendar + Description + Weekly summaries */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {viewMode === 'Month' && (
          <>
            {/* Bubble Calendar (Google Fit style) */}
            <MonthBubbleCalendar
              referenceDate={referenceDate}
              stepsData={stepsMap}
              goal={goal}
              onSelectDate={handleDaySelect}
              colors={colors}
            />

            {/* Description text (like Google Fit) */}
            <Text style={[tw`text-sm mt-4 mb-2 leading-5`, { color: colors.textMuted }]}>
              Steps are a useful measure of how much you're moving around, and can help you spot changes in your activity levels
            </Text>

            {/* Weekly Summaries (like Google Fit) */}
            <MonthWeekSummary
              referenceDate={referenceDate}
              stepsData={stepsMap}
              colors={colors}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default StepHistoryScreen;