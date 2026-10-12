/**
 * StepsScreen.js
 * 
 * Unified Google Fit-style Steps screen that combines:
 * - Live step tracking dashboard (compact header)
 * - Day/Week/Month history tabs
 * 
 * This replaces the previous separate StepsScreen + StepHistoryScreen.
 * 
 * Features:
 * - Compact live step count with progress ring
 * - Distance and calorie cards
 * - Sync status with countdown timer
 * - Day view: Hourly bar chart + activity sessions
 * - Week view: Daily bar chart + breakdown list
 * - Month view: Bubble calendar + weekly summaries
 * - "See source data" link (navigates to StepDayDetail)
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  Text,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
  AppState,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Svg, { Circle, Rect, Line, Text as SvgText } from 'react-native-svg';
import { TrackerSkeleton } from '../../../shared/feedback/SkeletonLoader';
import Toast from 'react-native-toast-message';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';
import useSteps from '../../../hooks/useSteps';
import { formatNumber } from '../../../utils/formatters';
import { getStepsTrends, getStepEntries } from '../../../api/trackerFactory';
import StepSyncService from '../../../services/StepSyncService';
import StepEntryService from '../../../services/StepEntryService';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

const screenWidth = Dimensions.get('window').width;

// ─── Constants ──────────────────────────────────────────────────────────────────

const SYNC_INTERVAL_SECONDS = 5 * 60; // 5 minutes
const VIEW_MODES = ['Day', 'Week', 'Month'];
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Helper Functions ───────────────────────────────────────────────────────────

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return null;
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const formatCountdown = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

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
 */
const groupEntriesIntoSessions = (entries) => {
  if (!entries || entries.length === 0) return [];

  const sessions = [];
  let currentSession = null;
  const GAP_THRESHOLD_MS = 5 * 60 * 1000;

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

// ─── Arc Progress Component ─────────────────────────────────────────────────────

const ArcProgress = ({ size = 70, strokeWidth = 7, progress = 0, color, bgColor }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const progressLength = (progress / 100) * arcLength;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={bgColor || '#F0F0F0'} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={`${arcLength} ${circumference - arcLength}`} strokeLinecap="round" rotation="135" origin={`${center}, ${center}`} />
        <Circle cx={center} cy={center} r={radius} stroke={color} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={`${progressLength} ${circumference - progressLength}`} strokeLinecap="round" rotation="135" origin={`${center}, ${center}`} />
      </Svg>
    </View>
  );
};

// ─── Permission Request Card ────────────────────────────────────────────────────

const PermissionCard = ({ onRequest, colors }) => (
  <View style={[tw`rounded-3xl p-6 mt-4`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
    <View style={tw`items-center`}>
      <View style={[tw`w-16 h-16 rounded-full items-center justify-center mb-4`, { backgroundColor: '#F3EAFF' }]}>
        <Icon name="directions-walk" size={32} color="#7C4DFF" />
      </View>
      <Text style={[tw`text-lg font-bold text-center mb-2`, { color: colors.textPrimary }]}>
        Enable Step Tracking
      </Text>
      <Text style={[tw`text-sm text-center mb-5`, { color: colors.textSecondary }]}>
        Allow HealthyVerse to access your physical activity to automatically count your steps throughout the day.
      </Text>
      <TouchableOpacity
        onPress={onRequest}
        style={[tw`px-8 py-3 rounded-full`, { backgroundColor: '#7C4DFF' }]}
        activeOpacity={0.8}
      >
        <Text style={tw`text-white text-base font-bold`}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Sensor Unavailable Card ────────────────────────────────────────────────────

const SensorUnavailableCard = ({ colors }) => (
  <View style={[tw`rounded-3xl p-6 mt-4`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
    <View style={tw`items-center`}>
      <View style={[tw`w-16 h-16 rounded-full items-center justify-center mb-4`, { backgroundColor: '#FFF0E6' }]}>
        <Icon name="sensors-off" size={32} color="#FF8C42" />
      </View>
      <Text style={[tw`text-lg font-bold text-center mb-2`, { color: colors.textPrimary }]}>
        Sensor Not Available
      </Text>
      <Text style={[tw`text-sm text-center`, { color: colors.textSecondary }]}>
        Your device does not have a step counter sensor. Automatic step tracking is not available on this device.
      </Text>
    </View>
  </View>
);

// ─── Compact Live Steps Header Card ─────────────────────────────────────────────

const LiveStepsCard = ({ todaySteps, goal, distance, calories, progress, isTracking, goalReached, remaining, onToggleTracking, colors }) => (
  <View style={[tw`rounded-2xl p-4 mt-3`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3 }]}>
    <View style={tw`flex-row items-center justify-between`}>
      {/* Left: Steps info */}
      <View style={tw`flex-1`}>
        <View style={tw`flex-row items-center`}>
          <View style={[tw`px-2 py-0.5 rounded-full mr-2`, { backgroundColor: isTracking ? '#E8F5E9' : '#FFF3E0' }]}>
            <Text style={[tw`text-[9px] font-semibold`, { color: isTracking ? '#4CAF50' : '#FF9800' }]}>
              {isTracking ? '● LIVE' : '● PAUSED'}
            </Text>
          </View>
          <TouchableOpacity onPress={onToggleTracking} activeOpacity={0.7}>
            <Text style={[tw`text-[10px] font-semibold`, { color: colors.primary }]}>
              {isTracking ? 'Pause' : 'Resume'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={tw`flex-row items-baseline mt-2`}>
          <Text style={[tw`text-3xl font-bold`, { color: colors.textPrimary }]}>{todaySteps.toLocaleString()}</Text>
          <Text style={[tw`text-sm ml-1`, { color: colors.textMuted }]}>/{goal.toLocaleString()}</Text>
        </View>
        {/* Metrics row */}
        <View style={tw`flex-row items-center mt-2`}>
          <Icon name="straighten" size={12} color="#4DA6FF" />
          <Text style={[tw`text-xs ml-1 mr-3`, { color: colors.textMuted }]}>{formatNumber(distance)} km</Text>
          <Icon name="local-fire-department" size={12} color="#FF8C42" />
          <Text style={[tw`text-xs ml-1`, { color: colors.textMuted }]}>{calories} kcal</Text>
        </View>
        {/* Goal status */}
        {goalReached ? (
          <Text style={[tw`text-[10px] mt-2 font-medium`, { color: '#4CAF50' }]}>🎉 Goal Reached!</Text>
        ) : remaining > 0 ? (
          <Text style={[tw`text-[10px] mt-2`, { color: colors.textMuted }]}>{remaining.toLocaleString()} steps to go</Text>
        ) : null}
      </View>

      {/* Right: Progress ring */}
      <View style={{ position: 'relative' }}>
        <ArcProgress size={70} strokeWidth={7} progress={progress} color="#7C4DFF" bgColor="#EDEDED" />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="directions-walk" size={18} color="#7C4DFF" />
        </View>
      </View>
    </View>
  </View>
);

// ─── Compact Sync Status ────────────────────────────────────────────────────────

const CompactSyncStatus = ({ countdown, lastSyncTimestamp, isSyncing, onSync, colors }) => {
  const lastSyncText = formatTimeAgo(lastSyncTimestamp);
  const progressPercent = ((SYNC_INTERVAL_SECONDS - countdown) / SYNC_INTERVAL_SECONDS) * 100;

  return (
    <View style={[tw`rounded-xl px-3 py-2.5 mt-3 flex-row items-center justify-between`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 1 }]}>
      <View style={tw`flex-row items-center flex-1`}>
        <Icon name="cloud-upload" size={14} color="#4DA6FF" />
        <Text style={[tw`text-[10px] ml-1.5`, { color: colors.textMuted }]}>
          {isSyncing ? 'Syncing...' : lastSyncText ? `Synced ${lastSyncText}` : 'Not synced'}
        </Text>
        <View style={[tw`mx-2 h-1.5 flex-1 rounded-full overflow-hidden`, { backgroundColor: '#F0F0F0' }]}>
          <View style={[tw`h-full rounded-full`, { width: `${Math.min(progressPercent, 100)}%`, backgroundColor: '#7C4DFF' }]} />
        </View>
        <Text style={[tw`text-[10px] font-bold`, { color: '#7C4DFF' }]}>{formatCountdown(countdown)}</Text>
      </View>
      <TouchableOpacity onPress={onSync} disabled={isSyncing} activeOpacity={0.7} style={tw`ml-2`}>
        <Icon name="sync" size={16} color={isSyncing ? colors.textMuted : '#7C4DFF'} />
      </TouchableOpacity>
    </View>
  );
};

// ─── View Mode Selector (Google Fit style tabs) ─────────────────────────────────

const ViewModeSelector = ({ selected, onSelect, colors }) => (
  <View style={[tw`flex-row justify-around mt-3`, { borderBottomWidth: 1, borderBottomColor: colors.border || '#E0E0E0' }]}>
    {VIEW_MODES.map((mode) => (
      <TouchableOpacity
        key={mode}
        style={[
          tw`py-2.5 px-6`,
          selected === mode && { borderBottomWidth: 2, borderBottomColor: '#7C4DFF' },
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

// ─── Date Navigator ─────────────────────────────────────────────────────────────

const DateNavigator = ({ label, subtitle, onPrev, onNext, canGoNext, colors }) => (
  <View style={tw`items-center mt-4 mb-3`}>
    <View style={tw`flex-row items-center justify-between w-full`}>
      <TouchableOpacity onPress={onPrev} style={tw`w-9 h-9 items-center justify-center`}>
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

// ─── Hourly Bar Chart (Day view) ────────────────────────────────────────────────

const HourlyBarChart = ({ hourlyData, colors }) => {
  const chartWidth = screenWidth - 64;
  const chartHeight = 130;
  const barWidth = (chartWidth - 40) / 24;
  const maxSteps = Math.max(...hourlyData.map(d => d.steps), 1) * 1.2;

  return (
    <View style={tw`mt-2`}>
      <Svg width={chartWidth} height={chartHeight + 25}>
        <SvgText x={chartWidth - 5} y={12} fontSize={9} fill={colors.textMuted} textAnchor="end">
          {Math.round(maxSteps).toLocaleString()}
        </SvgText>
        <SvgText x={chartWidth - 5} y={chartHeight / 2 + 4} fontSize={9} fill={colors.textMuted} textAnchor="end">
          {Math.round(maxSteps / 2).toLocaleString()}
        </SvgText>
        <Line x1={10} y1={chartHeight / 2} x2={chartWidth - 30} y2={chartHeight / 2} stroke={colors.border || '#E0E0E0'} strokeWidth={0.5} opacity={0.3} strokeDasharray="3 3" />
        {hourlyData.map((item, index) => {
          const barHeight = maxSteps > 0 ? (item.steps / maxSteps) * chartHeight : 0;
          const x = 10 + index * barWidth + barWidth * 0.15;
          const y = chartHeight - barHeight;
          return (
            <React.Fragment key={index}>
              <Rect x={x} y={Math.max(y, 1)} width={barWidth * 0.7} height={Math.max(barHeight, item.steps > 0 ? 2 : 0)} rx={2} fill={item.steps > 0 ? '#5B7FFF' : 'transparent'} opacity={0.85} />
              {index % 4 === 0 && (
                <SvgText x={x + barWidth * 0.35} y={chartHeight + 14} fontSize={9} fill={colors.textMuted} textAnchor="middle">
                  {index}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
        <SvgText x={10 + 24 * barWidth} y={chartHeight + 14} fontSize={9} fill={colors.textMuted} textAnchor="middle">
          24
        </SvgText>
        <Line x1={10} y1={chartHeight} x2={chartWidth - 30} y2={chartHeight} stroke={colors.border || '#333'} strokeWidth={1} opacity={0.3} />
      </Svg>
    </View>
  );
};

// ─── Weekly Bar Chart ────────────────────────────────────────────────────────────

const WeekBarChart = ({ weekDates, stepsData, colors }) => {
  const chartWidth = screenWidth - 64;
  const chartHeight = 150;
  const barWidth = (chartWidth - 20) / 7;
  const maxSteps = Math.max(...weekDates.map(d => stepsData[d.format('YYYY-MM-DD')] || 0), 1) * 1.2;
  const today = dayjs().format('YYYY-MM-DD');

  return (
    <View style={tw`mt-2`}>
      <Svg width={chartWidth} height={chartHeight + 30}>
        <Line x1={10} y1={chartHeight / 2} x2={chartWidth - 10} y2={chartHeight / 2} stroke={colors.border || '#E0E0E0'} strokeWidth={0.5} opacity={0.3} strokeDasharray="3 3" />
        <SvgText x={chartWidth - 5} y={12} fontSize={9} fill={colors.textMuted} textAnchor="end">
          {Math.round(maxSteps).toLocaleString()}
        </SvgText>
        <SvgText x={chartWidth - 5} y={chartHeight / 2 + 4} fontSize={9} fill={colors.textMuted} textAnchor="end">
          {Math.round(maxSteps / 2).toLocaleString()}
        </SvgText>
        {weekDates.map((date, index) => {
          const dateStr = date.format('YYYY-MM-DD');
          const steps = stepsData[dateStr] || 0;
          const barHeight = maxSteps > 0 ? (steps / maxSteps) * chartHeight : 0;
          const x = 10 + index * barWidth + barWidth * 0.2;
          const y = chartHeight - barHeight;
          const isToday = dateStr === today;
          return (
            <React.Fragment key={dateStr}>
              <Rect x={x} y={Math.max(y, 1)} width={barWidth * 0.6} height={Math.max(barHeight, steps > 0 ? 2 : 0)} rx={3} fill="#5B7FFF" opacity={0.85} />
              <SvgText x={x + barWidth * 0.3} y={chartHeight + 16} fontSize={10} fill={isToday ? colors.textPrimary : colors.textMuted} textAnchor="middle" fontWeight={isToday ? 'bold' : 'normal'}>
                {DAYS_OF_WEEK[index]}
              </SvgText>
            </React.Fragment>
          );
        })}
        <Line x1={10} y1={chartHeight} x2={chartWidth - 10} y2={chartHeight} stroke={colors.border || '#333'} strokeWidth={1} opacity={0.3} />
      </Svg>
    </View>
  );
};

// ─── Activity Session Item ──────────────────────────────────────────────────────

const ActivitySessionItem = ({ session, colors }) => (
  <View style={[tw`py-4`, { borderBottomWidth: 0.5, borderBottomColor: colors.border || '#E0E0E0' }]}>
    <View style={tw`flex-row items-center mb-1`}>
      <Icon name="directions-walk" size={14} color={colors.textMuted} />
      <Text style={[tw`text-xs ml-1`, { color: colors.textMuted }]}>{session.timeLabel}</Text>
    </View>
    <Text style={[tw`text-base font-bold mb-1`, { color: colors.textPrimary }]}>{session.label}</Text>
    <View style={tw`flex-row items-center`}>
      <Text style={[tw`text-xs`, { color: colors.textMuted }]}>{session.duration}</Text>
      <Text style={[tw`text-xs mx-2`, { color: colors.textMuted }]}>·</Text>
      <Icon name="directions-walk" size={12} color="#5B7FFF" />
      <Text style={[tw`text-xs ml-1`, { color: colors.textMuted }]}>{session.steps.toLocaleString()} steps</Text>
    </View>
  </View>
);

// ─── Week Day Item ──────────────────────────────────────────────────────────────

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

// ─── Monthly Bubble Calendar ────────────────────────────────────────────────────

const MonthBubbleCalendar = ({ referenceDate, stepsData, goal, onSelectDate, colors }) => {
  const monthDays = getMonthDays(referenceDate);
  const today = dayjs().format('YYYY-MM-DD');
  const todayDayOfWeek = dayjs().isoWeekday();
  const firstDayOfMonth = dayjs(referenceDate).startOf('month');
  const startOffset = firstDayOfMonth.isoWeekday() - 1;

  const allSteps = monthDays.map(d => stepsData[d.format('YYYY-MM-DD')] || 0);
  const maxSteps = Math.max(...allSteps, goal, 1);

  const gridCells = [];
  for (let i = 0; i < startOffset; i++) {
    gridCells.push(null);
  }
  monthDays.forEach(d => gridCells.push(d));

  const weeks = [];
  for (let i = 0; i < gridCells.length; i += 7) {
    weeks.push(gridCells.slice(i, i + 7));
  }

  const cellSize = (screenWidth - 80) / 7;
  const maxBubbleSize = cellSize * 0.9;
  const minBubbleSize = cellSize * 0.4;

  return (
    <View style={tw`mt-3`}>
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
            const ratio = steps > 0 ? Math.min(steps / maxSteps, 1) : 0;
            const bubbleSize = steps > 0 ? minBubbleSize + (maxBubbleSize - minBubbleSize) * ratio : 0;
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
                style={[{ width: cellSize, height: cellSize, alignItems: 'center', justifyContent: 'center' }, { opacity: isFuture ? 0.4 : 1 }]}
                activeOpacity={0.7}
              >
                {steps > 0 ? (
                  <View style={{ width: bubbleSize, height: bubbleSize, borderRadius: bubbleSize / 2, backgroundColor: bubbleColor, opacity: bubbleOpacity, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[tw`text-xs font-bold`, { color: '#FFFFFF' }]}>{day.format('D')}</Text>
                  </View>
                ) : (
                  <View style={tw`items-center justify-center`}>
                    <Text style={[tw`text-sm`, { color: isToday ? colors.primary : isFuture ? colors.textMuted : colors.textPrimary }, isToday && tw`font-bold`]}>
                      {day.format('D')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      {/* Day of week labels */}
      <View style={tw`flex-row justify-between mt-2`}>
        {DAYS_OF_WEEK.map((day, index) => {
          const isCurrentDayOfWeek = (index + 1) === todayDayOfWeek;
          return (
            <View key={day} style={{ width: cellSize, alignItems: 'center' }}>
              <Text style={[tw`text-xs`, { color: isCurrentDayOfWeek ? colors.textPrimary : colors.textMuted }, isCurrentDayOfWeek && tw`font-bold`]}>
                {day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ─── Monthly Week Summary ───────────────────────────────────────────────────────

const MonthWeekSummary = ({ referenceDate, stepsData, colors }) => {
  const endOfMonth = dayjs(referenceDate).endOf('month');
  const weeks = [];
  let weekStart = dayjs(referenceDate).startOf('month').startOf('isoWeek');

  while (weekStart.isBefore(endOfMonth) || weekStart.isSame(endOfMonth, 'day')) {
    const weekEnd = weekStart.add(6, 'day');
    let weekSteps = 0;
    for (let i = 0; i < 7; i++) {
      const d = weekStart.add(i, 'day');
      weekSteps += stepsData[d.format('YYYY-MM-DD')] || 0;
    }
    weeks.push({ start: weekStart, end: weekEnd, steps: weekSteps });
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

// ═══════════════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════

const StepsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const {
    todaySteps,
    goal,
    distance,
    calories,
    permissionGranted,
    isSensorAvailable,
    isTracking,
    isInitialized,
    progress: stepsProgress,
    remaining,
    goalReached,
    startTracking,
    stopTracking,
    getCurrentStepData,
  } = useSteps();

  // ─── Sync State ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(null);
  const [countdown, setCountdown] = useState(SYNC_INTERVAL_SECONDS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [timerReady, setTimerReady] = useState(false);

  // ─── History State ──────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState('Day');
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [referenceDate, setReferenceDate] = useState(dayjs());
  const [stepsData, setStepsData] = useState({});
  const [hourlyData, setHourlyData] = useState([]);
  const [activitySessions, setActivitySessions] = useState([]);

  // Refs
  const countdownRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const lastSyncRef = useRef(null);

  // ─── Computed Values ────────────────────────────────────────────────────

  const weekDates = useMemo(() => getWeekDates(referenceDate), [referenceDate]);

  const canGoNext = useMemo(() => {
    if (viewMode === 'Day') return dayjs(selectedDate).isBefore(dayjs(), 'day');
    if (viewMode === 'Week') return referenceDate.endOf('isoWeek').isBefore(dayjs(), 'day');
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
      if (start.isSame(end, 'month')) return `${start.format('D')} – ${end.format('D MMMM YYYY')}`;
      return `${start.format('D MMM')} – ${end.format('D MMM YYYY')}`;
    }
    return referenceDate.format('MMMM YYYY');
  }, [viewMode, selectedDate, referenceDate]);

  const stepsMap = useMemo(() => {
    const map = {};
    Object.entries(stepsData).forEach(([date, data]) => {
      map[date] = data.steps || 0;
    });
    const today = dayjs().format('YYYY-MM-DD');
    map[today] = todaySteps;
    return map;
  }, [stepsData, todaySteps]);

  const viewTotalSteps = useMemo(() => {
    if (viewMode === 'Day') {
      const today = dayjs().format('YYYY-MM-DD');
      if (selectedDate === today) return todaySteps;
      return stepsData[selectedDate]?.steps || 0;
    }
    if (viewMode === 'Week') {
      let total = 0;
      weekDates.forEach(d => { total += stepsMap[d.format('YYYY-MM-DD')] || 0; });
      return total;
    }
    const monthDays = getMonthDays(referenceDate);
    let total = 0;
    monthDays.forEach(d => { total += stepsMap[d.format('YYYY-MM-DD')] || 0; });
    return total;
  }, [viewMode, selectedDate, todaySteps, stepsData, weekDates, stepsMap, referenceDate]);

  // ─── Sync Logic ─────────────────────────────────────────────────────────

  const resetCountdown = useCallback(() => {
    setCountdown(SYNC_INTERVAL_SECONDS);
    lastSyncRef.current = Date.now();
  }, []);

  const performSync = useCallback(async (showToast = true) => {
    const stepData = getCurrentStepData();
    if (!stepData || stepData.totalSteps === 0) {
      if (showToast) Toast.show({ type: 'info', text1: 'No steps to sync yet' });
      return false;
    }
    setIsSyncing(true);
    try {
      const success = await StepSyncService.syncStepsToBackend(stepData);
      if (success) {
        const now = Date.now();
        setLastSyncTimestamp(now);
        lastSyncRef.current = now;
        resetCountdown();

        // Also sync granular step entries to backend (for "See source data" feature)
        const today = dayjs().format('YYYY-MM-DD');
        await StepEntryService.syncEntriesToBackend(today);

        if (showToast) Toast.show({ type: 'success', text1: 'Steps synced!', text2: 'Data saved to server' });
        return true;
      } else {
        if (showToast) Toast.show({ type: 'error', text1: 'Sync failed', text2: 'Will retry on next auto-sync' });
        return false;
      }
    } catch (error) {
      if (showToast) Toast.show({ type: 'error', text1: 'Sync failed', text2: 'Check your connection' });
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [getCurrentStepData, resetCountdown]);

  // Load last sync timestamp
  useEffect(() => {
    const loadLastSync = async () => {
      const syncInfo = await StepSyncService.getLastSyncInfo();
      if (syncInfo && syncInfo.timestamp) {
        setLastSyncTimestamp(syncInfo.timestamp);
        lastSyncRef.current = syncInfo.timestamp;
        const elapsed = Math.floor((Date.now() - syncInfo.timestamp) / 1000);
        const remainingTime = SYNC_INTERVAL_SECONDS - elapsed;
        setCountdown(remainingTime > 0 ? remainingTime : 0);
      }
      setTimerReady(true);
    };
    loadLastSync();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!timerReady) return;
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          performSync(false);
          return SYNC_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [timerReady, performSync]);

  // App state listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        const syncInfo = await StepSyncService.getLastSyncInfo();
        if (syncInfo && syncInfo.timestamp) {
          const elapsed = Math.floor((Date.now() - syncInfo.timestamp) / 1000);
          const remainingTime = SYNC_INTERVAL_SECONDS - elapsed;
          if (remainingTime > 0) {
            setCountdown(remainingTime);
          } else {
            await performSync(false);
          }
          setLastSyncTimestamp(syncInfo.timestamp);
        } else {
          await performSync(false);
        }
      }
      appStateRef.current = nextAppState;
    });
    return () => { subscription.remove(); };
  }, [performSync]);

  // ─── History Data Fetching ──────────────────────────────────────────────

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
        // Use local data
      }
    } catch (error) {
      setHourlyData(Array.from({ length: 24 }, (_, i) => ({ hour: i, steps: 0 })));
      setActivitySessions([]);
    }
  }, []);

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
          dataMap[dateStr] = { steps: item.steps || 0, distanceKm: item.distanceKm || 0, calories: item.calories || 0 };
        });
        setStepsData(prev => ({ ...prev, ...dataMap }));
      }
    } catch (error) {
      console.error('[StepsScreen] fetchStepsHistory error:', error);
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
    if (isInitialized) fetchAllData();
  }, [isInitialized, fetchAllData]);

  useEffect(() => {
    if (viewMode === 'Day' && isInitialized) fetchDayHourlyData(selectedDate);
  }, [selectedDate, viewMode, fetchDayHourlyData, isInitialized]);

  useEffect(() => {
    if (isInitialized) fetchStepsHistory();
  }, [fetchStepsHistory, isInitialized]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStepsHistory();
    if (viewMode === 'Day') await fetchDayHourlyData(selectedDate);
    await performSync(true);
    setRefreshing(false);
  };

  // ─── Navigation Handlers ────────────────────────────────────────────────

  const handlePrev = () => {
    if (viewMode === 'Day') {
      const prev = dayjs(selectedDate).subtract(1, 'day');
      setSelectedDate(prev.format('YYYY-MM-DD'));
      if (prev.isBefore(referenceDate.startOf('isoWeek'))) setReferenceDate(prev);
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
      if (next.isAfter(referenceDate.endOf('isoWeek'))) setReferenceDate(next);
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

  // ─── Permission Handling ────────────────────────────────────────────────

  const handleRequestPermission = async () => {
    const success = await startTracking();
    if (success) {
      Toast.show({ type: 'success', text1: 'Step tracking started!' });
    } else {
      Alert.alert(
        'Permission Required',
        'HealthyVerse needs activity recognition permission to count your steps. Please enable it in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  const handleToggleTracking = async () => {
    if (isTracking) {
      await stopTracking();
      Toast.show({ type: 'info', text1: 'Step tracking paused' });
    } else {
      const success = await startTracking();
      if (success) Toast.show({ type: 'success', text1: 'Step tracking resumed!' });
    }
  };

  // ─── Loading State ─────────────────────────────────────────────────────

  if (!isInitialized || loading) {
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
          <TouchableOpacity onPress={() => performSync(true)} style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#FFFFFF' }]}>
            <Icon name="sync" size={20} color="#1A1D3F" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        contentContainerStyle={tw`px-5 pb-28`}
      >
        {/* Sensor Unavailable State */}
        {!isSensorAvailable && <SensorUnavailableCard colors={colors} />}

        {/* Permission Request State */}
        {isSensorAvailable && !permissionGranted && (
          <PermissionCard onRequest={handleRequestPermission} colors={colors} />
        )}

        {/* Main Content - shown when sensor is available and permission granted */}
        {isSensorAvailable && permissionGranted && (
          <>
            {/* Compact Live Steps Card */}
            <LiveStepsCard
              todaySteps={todaySteps}
              goal={goal}
              distance={distance}
              calories={calories}
              progress={stepsProgress}
              isTracking={isTracking}
              goalReached={goalReached}
              remaining={remaining}
              onToggleTracking={handleToggleTracking}
              colors={colors}
            />

            {/* Compact Sync Status */}
            <CompactSyncStatus
              countdown={countdown}
              lastSyncTimestamp={lastSyncTimestamp}
              isSyncing={isSyncing}
              onSync={() => performSync(true)}
              colors={colors}
            />

            {/* View Mode Tabs (Day / Week / Month) */}
            <ViewModeSelector selected={viewMode} onSelect={setViewMode} colors={colors} />

            {/* Date Navigator */}
            <DateNavigator
              label={dateLabel}
              subtitle={viewTotalSteps > 0 ? `${viewTotalSteps.toLocaleString()} steps` : null}
              onPrev={handlePrev}
              onNext={handleNext}
              canGoNext={canGoNext}
              colors={colors}
            />

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* DAY VIEW */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {viewMode === 'Day' && (
              <>
                <HourlyBarChart hourlyData={hourlyData} colors={colors} />

                <Text style={[tw`text-sm mt-4 mb-2 leading-5`, { color: colors.textMuted }]}>
                  Steps are a useful measure of how much you're moving around, and can help you spot changes in your activity levels
                </Text>

                {activitySessions.length > 0 ? (
                  <View style={[tw`mt-3 pt-3`, { borderTopWidth: 0.5, borderTopColor: colors.border || '#E0E0E0' }]}>
                    {activitySessions.map((session, index) => (
                      <ActivitySessionItem key={`session-${session.startTime}-${index}`} session={session} colors={colors} />
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

                {/* See Source Data Link */}
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

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* WEEK VIEW */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {viewMode === 'Week' && (
              <>
                <WeekBarChart weekDates={weekDates} stepsData={stepsMap} colors={colors} />

                <Text style={[tw`text-sm mt-4 mb-2 leading-5`, { color: colors.textMuted }]}>
                  Steps are a useful measure of how much you're moving around, and can help you spot changes in your activity levels
                </Text>

                <View style={[tw`mt-3 pt-3`, { borderTopWidth: 0.5, borderTopColor: colors.border || '#E0E0E0' }]}>
                  {weekDates.map((date) => {
                    const dateStr = date.format('YYYY-MM-DD');
                    const steps = stepsMap[dateStr] || 0;
                    return (
                      <WeekDayItem key={dateStr} date={date} steps={steps} onPress={handleDaySelect} colors={colors} />
                    );
                  })}
                </View>
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* MONTH VIEW */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {viewMode === 'Month' && (
              <>
                <MonthBubbleCalendar
                  referenceDate={referenceDate}
                  stepsData={stepsMap}
                  goal={goal}
                  onSelectDate={handleDaySelect}
                  colors={colors}
                />

                <Text style={[tw`text-sm mt-4 mb-2 leading-5`, { color: colors.textMuted }]}>
                  Steps are a useful measure of how much you're moving around, and can help you spot changes in your activity levels
                </Text>

                <MonthWeekSummary referenceDate={referenceDate} stepsData={stepsMap} colors={colors} />
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default StepsScreen;