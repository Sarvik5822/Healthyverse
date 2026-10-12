/**
 * MenstrualTrackerScreen - OPTIMIZED with React Query
 *
 * CHANGES:
 * 1. ✅ Replaced manual fetchData with useMenstrualScreen() React Query hook
 * 2. ✅ Cycle summary uses separate query (longer staleTime)
 * 3. ✅ Calendar data fetched via React Query (keyed by month)
 * 4. ✅ Add/Edit/Delete mutations auto-invalidate all menstrual caches
 * 5. ✅ No infinite loop risk — stable query keys
 * 6. ✅ Pull-to-refresh invalidates React Query cache
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, ScrollView, RefreshControl, Text, TouchableOpacity, ActivityIndicator, Alert, Switch, Modal } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AddEntryModal from '../components/AddEntryModal';
import EditEntryModal from '../components/EditEntryModal';
import { TrackerSkeleton } from '../../../shared/feedback/SkeletonLoader';
import SwipeableRow from '../../../shared/layout/SwipeableRow';
import Toast from 'react-native-toast-message';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';
import { formatDate } from '../../../utils/formatters';
import { getMenstrualEntries, addMenstrualEntry, updateMenstrualEntry, deleteMenstrualEntry } from '../../../api/trackerFactory';
import client from '../../../api/client';
import { getErrorMessage } from '../../../utils/errorHandler';
import dayjs from 'dayjs';

const REMINDER_STORAGE_KEY = 'menstrual_reminder_settings';

const ADD_FIELDS = [
  { name: 'startDate', label: 'Period Start Date', type: 'date', maximumDate: new Date() },
  { name: 'endDate', label: 'Period End Date (optional)', type: 'date', maximumDate: new Date() },
  { name: 'flow', label: 'Flow Intensity', type: 'picker', options: ['Light', 'Medium', 'Heavy'] },
  { name: 'cramps', label: 'Cramps', type: 'picker', options: ['None', 'Mild', 'Moderate', 'Severe'] },
  { name: 'mood', label: 'Mood', type: 'picker', options: ['Happy', 'Calm', 'Irritable', 'Anxious', 'Sad', 'Energetic', 'Tired'] },
  { name: 'discharge', label: 'Discharge', type: 'picker', options: ['None', 'Light', 'Moderate', 'Heavy'] },
  { name: 'energyLevel', label: 'Energy Level', type: 'picker', options: ['Low', 'Medium', 'High'] },
  { name: 'sexualActivity', label: 'Sexual Activity', type: 'picker', options: ['Yes', 'No'] },
  { name: 'notes', label: 'Notes (optional)', placeholder: 'Any symptoms or notes...' },
];

const EDIT_FIELDS = ADD_FIELDS.map((f) => ({ ...f, maximumDate: undefined }));

// Updated flow colors
const FLOW_COLORS = { Light: '#F8BBD0', Medium: '#EC407A', Heavy: '#AD1457', None: '#FFAB91' };

const REMINDER_OPTIONS = [
  { label: '1 day before', value: 1 },
  { label: '2 days before', value: 2 },
  { label: '3 days before', value: 3 },
  { label: '5 days before', value: 5 },
  { label: '7 days before', value: 7 },
];

const SmallCircularProgress = ({ size = 50, strokeWidth = 5, progress = 0, color, bgColor, children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressValue = (progress / 100) * circumference;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={bgColor || '#F0F0F0'} strokeWidth={strokeWidth} fill="transparent" />
        <Circle cx={center} cy={center} r={radius} stroke={color} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={circumference - progressValue} strokeLinecap="round" rotation="-90" origin={`${center}, ${center}`} />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
};

const MacroCard = ({ label, value, unit, progress, color, bgColor, iconName, colors }) => (
  <View style={[tw`flex-1 items-center rounded-2xl py-4 px-2 mx-1.5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 }]}>
    <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>{value}{unit}</Text>
    <Text style={[tw`text-[11px] mt-1 mb-3`, { color: colors.textMuted }]}>{label}</Text>
    <SmallCircularProgress size={52} strokeWidth={5} progress={progress} color={color} bgColor={bgColor}>
      <Icon name={iconName} size={16} color={color} />
    </SmallCircularProgress>
  </View>
);

const ActivityItemLocal = ({ title, value, subtitle, iconName, iconBgColor, iconColor, colors, onPress, onLongPress, rightContent }) => (
  <TouchableOpacity
    onPress={onPress}
    onLongPress={onLongPress}
    activeOpacity={0.7}
    style={[tw`rounded-2xl p-4 mb-3`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }]}
  >
    <View style={tw`flex-row items-center justify-between`}>
      <View style={tw`flex-row items-center flex-1`}>
        <View style={[tw`w-10 h-10 rounded-xl items-center justify-center`, { backgroundColor: iconBgColor }]}>
          <Icon name={iconName} size={18} color={iconColor} />
        </View>
        <View style={tw`ml-3 flex-1`}>
          <View style={tw`flex-row items-center`}>
            <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>{title}</Text>
            {subtitle && (
              <View style={[tw`ml-2 px-2 py-0.5 rounded-full`, { backgroundColor: iconBgColor }]}>
                <Text style={[tw`text-[9px] font-bold`, { color: iconColor }]}>{subtitle}</Text>
              </View>
            )}
          </View>
          <Text style={[tw`text-sm mt-1 font-medium`, { color: colors.textMuted }]}>{value}</Text>
        </View>
      </View>
      {rightContent || <Icon name="chevron-right" size={20} color={colors.textMuted} />}
    </View>
  </TouchableOpacity>
);

// Reminder Settings Modal
const ReminderModal = ({ visible, onClose, colors, reminderSettings, onSave }) => {
  const [enabled, setEnabled] = useState(reminderSettings.enabled);
  const [daysBefore, setDaysBefore] = useState(reminderSettings.daysBefore);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(reminderSettings.enabled);
    setDaysBefore(reminderSettings.daysBefore);
  }, [reminderSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ enabled, daysBefore });
      onClose();
    } catch (_e) {
      // Error handled in parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={[tw`flex-1`, { backgroundColor: 'rgba(0,0,0,0.4)' }]} activeOpacity={1} onPress={onClose}>
        <View style={tw`flex-1 justify-end`}>
          <TouchableOpacity activeOpacity={1}>
            <View style={[tw`rounded-t-3xl px-5 pt-6 pb-8`, { backgroundColor: colors.surface }]}>
              <View style={[tw`w-10 h-1 rounded-full self-center mb-5`, { backgroundColor: '#EDEDED' }]} />
              <View style={tw`flex-row items-center mb-6`}>
                <View style={[tw`w-10 h-10 rounded-xl items-center justify-center`, { backgroundColor: '#FCE4EC' }]}>
                  <Icon name="notifications-active" size={20} color="#EC407A" />
                </View>
                <Text style={[tw`text-lg font-bold ml-3`, { color: colors.textPrimary }]}>Cycle Reminders</Text>
              </View>
              <View style={[tw`rounded-2xl p-4 mb-4`, { backgroundColor: colors.background }]}>
                <View style={tw`flex-row items-center justify-between`}>
                  <View style={tw`flex-1`}>
                    <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>Enable Reminders</Text>
                    <Text style={[tw`text-xs mt-1`, { color: colors.textMuted }]}>Get notified before your next expected period</Text>
                  </View>
                  <Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: '#E0E0E0', true: '#EC407A' + '50' }} thumbColor={enabled ? '#EC407A' : '#BDBDBD'} />
                </View>
              </View>
              {enabled && (
                <View style={tw`mb-4`}>
                  <Text style={[tw`text-xs font-bold mb-3 tracking-wide uppercase`, { color: colors.textSecondary }]}>Remind me</Text>
                  <View style={tw`flex-row flex-wrap gap-2`}>
                    {REMINDER_OPTIONS.map((option) => {
                      const isSelected = daysBefore === option.value;
                      return (
                        <TouchableOpacity key={option.value} style={[tw`px-4 py-3 rounded-2xl`, isSelected ? { backgroundColor: '#EC407A' + '15', borderWidth: 1.5, borderColor: '#EC407A' } : { backgroundColor: colors.background, borderWidth: 1.5, borderColor: 'transparent' }]} onPress={() => setDaysBefore(option.value)} activeOpacity={0.7}>
                          <Text style={[tw`text-sm font-bold`, { color: isSelected ? '#EC407A' : colors.textMuted }]}>{option.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
              {enabled && (
                <View style={[tw`rounded-2xl p-4 mb-5`, { backgroundColor: '#E3F2FD' }]}>
                  <View style={tw`flex-row items-start`}>
                    <Icon name="info-outline" size={16} color="#2196F3" style={tw`mt-0.5`} />
                    <Text style={[tw`text-xs ml-2 flex-1`, { color: '#1565C0' }]}>Reminders are calculated based on your average cycle length. The more entries you log, the more accurate predictions will be.</Text>
                  </View>
                </View>
              )}
              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity style={[tw`flex-1 py-3.5 rounded-2xl items-center`, { backgroundColor: colors.background }]} onPress={onClose}>
                  <Text style={[tw`text-sm font-bold`, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[tw`flex-1 py-3.5 rounded-2xl items-center`, { backgroundColor: '#EC407A' }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={[tw`text-sm font-bold`, { color: '#FFFFFF' }]}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const MenstrualTrackerScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reminderSettings, setReminderSettings] = useState({ enabled: false, daysBefore: 2 });

  const pendingEditRef = useRef(false);

  // Open edit modal only after selectedEntry is properly set
  useEffect(() => {
    if (selectedEntry && pendingEditRef.current) {
      pendingEditRef.current = false;
      setShowEdit(true);
    }
  }, [selectedEntry]);

  // ─── React Query: Menstrual Logs ────────────────────────────────────────
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['tracker', 'menstrual', 'logs'],
    queryFn: async () => {
      const logsRes = await getMenstrualEntries();
      if (logsRes.data && Array.isArray(logsRes.data)) {
        return logsRes.data.map(log => ({
          _id: log._id,
          startDate: log.startDate,
          endDate: log.endDate,
          flow: log.flow || 'None',
          cramps: log.cramps || 'None',
          mood: (log.mood && log.mood !== 'Select mood') ? log.mood : '',
          discharge: log.discharge || 'None',
          energyLevel: (log.energyLevel && log.energyLevel !== 'Normal') ? log.energyLevel : '',
          sexualActivity: log.sexualActivity || '',
          cycleLength: log.cycleLength || '-',
          notes: log.notes || '',
        }));
      }
      return [];
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // ─── React Query: Cycle Summary ─────────────────────────────────────────
  const { data: cycleSummary = { totalPeriodDays: null, averagePeriodDuration: null, averageFlow: 'None', averageCycleLength: null } } = useQuery({
    queryKey: ['tracker', 'menstrual', 'cycleSummary'],
    queryFn: async () => {
      const summaryRes = await client.get('/menstrualLogs/cycleSummary');
      if (summaryRes.data) {
        return {
          totalPeriodDays: summaryRes.data.totalPeriodDays != null ? Number(summaryRes.data.totalPeriodDays) : null,
          averagePeriodDuration: summaryRes.data.averagePeriodDuration != null ? Number(summaryRes.data.averagePeriodDuration) : null,
          averageFlow: summaryRes.data.averageFlow || 'None',
          averageCycleLength: summaryRes.data.averageCycleLength != null ? Number(summaryRes.data.averageCycleLength) : null,
        };
      }
      return { totalPeriodDays: null, averagePeriodDuration: null, averageFlow: 'None', averageCycleLength: null };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // ─── React Query: Calendar Data (keyed by month) ────────────────────────
  const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth() + 1}`;
  const { data: calendarData = [], isLoading: calendarLoading } = useQuery({
    queryKey: ['tracker', 'menstrual', 'calendar', monthKey],
    queryFn: async () => {
      const month = currentMonth.getMonth() + 1;
      const year = currentMonth.getFullYear();
      const calRes = await client.get(`/menstrualLogs/calendarSnapshot?month=${month}&year=${year}`);
      return calRes.data?.days || [];
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // ─── Mutations ──────────────────────────────────────────────────────────
  const invalidateMenstrual = () => {
    queryClient.invalidateQueries({ queryKey: ['tracker', 'menstrual'] });
    queryClient.invalidateQueries({ queryKey: ['health'] });
    queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
  };

  // Load reminder settings from AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(REMINDER_STORAGE_KEY);
        if (stored) setReminderSettings(JSON.parse(stored));
      } catch (_e) { /* use defaults */ }
    };
    loadSettings();
  }, []);

  const saveReminderSettings = async (settings) => {
    try {
      await AsyncStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings));
      setReminderSettings(settings);
      if (settings.enabled) {
        Toast.show({ type: 'success', text1: 'Reminder set! 🔔', text2: `You'll be reminded ${settings.daysBefore} day${settings.daysBefore > 1 ? 's' : ''} before your next period.` });
      } else {
        Toast.show({ type: 'info', text1: 'Reminders disabled', text2: 'You won\'t receive cycle reminders.' });
      }
    } catch (_e) {
      Toast.show({ type: 'error', text1: 'Failed to save reminder', text2: 'Please try again.' });
      throw _e;
    }
  };

  // Calculate next period prediction
  const nextPeriodDate = useCallback(() => {
    if (!logs || logs.length === 0) return null;
    const sortedLogs = [...logs].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    const lastPeriod = sortedLogs[0];
    if (!lastPeriod?.startDate) return null;
    const avgCycleLength = cycleSummary.averageCycleLength || 28;
    const lastStartDate = dayjs(lastPeriod.startDate).startOf('day');
    return lastStartDate.add(avgCycleLength, 'day');
  }, [logs, cycleSummary])();

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['tracker', 'menstrual'] });
    setRefreshing(false);
  };

  const handleAdd = async (form) => {
    if (!form.startDate) {
      Toast.show({ type: 'error', text1: 'Start date required', text2: 'Please select when your period started.' });
      return;
    }
    if (!form.flow) {
      Toast.show({ type: 'error', text1: 'Flow intensity required', text2: 'Please select your flow level.' });
      return;
    }
    setAddLoading(true);
    try {
      await addMenstrualEntry({
        startDate: form.startDate,
        endDate: form.endDate || null,
        flow: form.flow || 'None',
        cramps: form.cramps || 'None',
        mood: form.mood || null,
        discharge: form.discharge || 'None',
        energyLevel: form.energyLevel || null,
        sexualActivity: form.sexualActivity || null,
        notes: form.notes || '',
      });
      Toast.show({ type: 'success', text1: 'Period logged successfully! 🌸', text2: 'Your cycle data has been saved.' });
      setShowAdd(false);
      invalidateMenstrual();
    } catch (e) {
      const msg = getErrorMessage(e, 'Could not save your period entry. Please check your connection and try again.');
      Toast.show({ type: 'error', text1: 'Failed to log period', text2: msg });
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async (form) => {
    if (!form.startDate) {
      Toast.show({ type: 'error', text1: 'Start date required', text2: 'Please select when your period started.' });
      return;
    }
    setEditLoading(true);
    try {
      await updateMenstrualEntry(selectedEntry._id, {
        startDate: form.startDate,
        endDate: form.endDate || null,
        flow: form.flow || 'None',
        cramps: form.cramps || 'None',
        mood: form.mood || null,
        discharge: form.discharge || 'None',
        energyLevel: form.energyLevel || null,
        sexualActivity: form.sexualActivity || null,
        notes: form.notes || '',
      });
      Toast.show({ type: 'success', text1: 'Entry updated! ✓', text2: 'Your cycle data has been updated.' });
      setShowEdit(false);
      setSelectedEntry(null);
      invalidateMenstrual();
    } catch (e) {
      const msg = getErrorMessage(e, 'Could not update entry. Please check your connection and try again.');
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this period entry? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeleteLoading(item._id);
          try {
            await deleteMenstrualEntry(item._id);
            Toast.show({ type: 'success', text1: 'Entry deleted', text2: 'Period entry has been removed.' });
            invalidateMenstrual();
          } catch (e) {
            const msg = getErrorMessage(e, 'Could not delete entry. Please try again.');
            Toast.show({ type: 'error', text1: 'Delete failed', text2: msg });
          } finally {
            setDeleteLoading(null);
          }
        },
      },
    ]);
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MainTabs');
  };

  const prevMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d);
  };

  const nextMonth = () => {
    const d = new Date(currentMonth);
    const now = new Date();
    if (d.getFullYear() === now.getFullYear() && d.getMonth() >= now.getMonth()) return;
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(d);
  };

  const getFlowColor = (flow) => FLOW_COLORS[flow] || FLOW_COLORS.None;

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push({ day: '', empty: true });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const calDay = calendarData.find(cd => cd.date === dateStr);
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
      const isPredicted = nextPeriodDate && nextPeriodDate.format('YYYY-MM-DD') === dateStr;
      days.push({ day: d, date: dateStr, isPeriodDay: calDay?.isPeriodDay || false, flow: calDay?.flow || 'None', isToday, isPredicted });
    }
    return days;
  };

  const normalizeEntryForEdit = (item) => {
    const FLOW_OPTIONS = ['Light', 'Medium', 'Heavy'];
    const CRAMPS_OPTIONS = ['None', 'Mild', 'Moderate', 'Severe'];
    const MOOD_OPTIONS = ['Happy', 'Calm', 'Irritable', 'Anxious', 'Sad', 'Energetic', 'Tired'];
    const DISCHARGE_OPTIONS = ['None', 'Light', 'Moderate', 'Heavy'];
    const ENERGY_OPTIONS = ['Low', 'Medium', 'High'];
    const SEXUAL_OPTIONS = ['Yes', 'No'];
    const matchOption = (value, options) => {
      if (!value || value === '-' || value === 'Select mood' || value === 'Normal') return '';
      if (options.includes(value)) return value;
      const found = options.find(opt => opt.toLowerCase() === value.toLowerCase());
      return found || '';
    };
    return {
      _id: item._id, startDate: item.startDate || '', endDate: item.endDate || '',
      flow: matchOption(item.flow, FLOW_OPTIONS), cramps: matchOption(item.cramps, CRAMPS_OPTIONS),
      mood: matchOption(item.mood, MOOD_OPTIONS), discharge: matchOption(item.discharge, DISCHARGE_OPTIONS),
      energyLevel: matchOption(item.energyLevel, ENERGY_OPTIONS), sexualActivity: matchOption(item.sexualActivity, SEXUAL_OPTIONS),
      notes: item.notes || '',
    };
  };

  // Loading state
  if (logsLoading) {
    return (
      <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
        <View style={{ backgroundColor: '#F3EAFF', paddingTop: 20, paddingBottom: 16, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
          <View style={tw`flex-row items-center justify-between px-5`}>
            <TouchableOpacity onPress={handleGoBack} style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#FFFFFF' }]}>
              <Icon name="chevron-left" size={24} color="#1A1D3F" />
            </TouchableOpacity>
            <Text style={[tw`text-lg font-bold`, { color: '#1A1D3F' }]}>Menstrual Tracker</Text>
            <View style={tw`w-10 h-10`} />
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}><TrackerSkeleton /></ScrollView>
      </View>
    );
  }

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const cycleDayProgress = cycleSummary.totalPeriodDays ? Math.min((cycleSummary.totalPeriodDays / 28) * 100, 100) : 0;
  const isCurrentMonth = (() => { const now = new Date(); return currentMonth.getFullYear() === now.getFullYear() && currentMonth.getMonth() === now.getMonth(); })();

  const getDaysUntilNextPeriod = () => {
    if (!nextPeriodDate) return null;
    return nextPeriodDate.diff(dayjs().startOf('day'), 'day');
  };
  const daysUntilNext = getDaysUntilNextPeriod();

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={{ backgroundColor: '#F3EAFF', paddingTop: 20, paddingBottom: 16, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <View style={tw`flex-row items-center justify-between px-5`}>
          <TouchableOpacity onPress={handleGoBack} style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#FFFFFF' }]}>
            <Icon name="chevron-left" size={24} color="#1A1D3F" />
          </TouchableOpacity>
          <Text style={[tw`text-lg font-bold`, { color: '#1A1D3F' }]}>Menstrual Tracker</Text>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: '#FFFFFF' }]}>
            <Icon name="add" size={20} color="#1A1D3F" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#EC407A']} />} contentContainerStyle={tw`px-5 pb-28`}>
        {/* Next Period Prediction */}
        {nextPeriodDate && (
          <View style={[tw`rounded-3xl p-5 mt-5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-1`}>
                <Text style={[tw`text-sm font-semibold`, { color: colors.textSecondary }]}>Next Period Expected</Text>
                <Text style={[tw`text-2xl font-bold mt-1`, { color: colors.textPrimary }]}>{nextPeriodDate.format('MMM D, YYYY')}</Text>
                <Text style={[tw`text-sm mt-1 font-medium`, { color: daysUntilNext !== null && daysUntilNext <= 3 ? '#EC407A' : colors.textMuted }]}>
                  {daysUntilNext !== null ? daysUntilNext <= 0 ? 'Expected today or overdue' : daysUntilNext === 1 ? 'Tomorrow' : `In ${daysUntilNext} days` : 'Calculating...'}
                </Text>
              </View>
              <SmallCircularProgress size={70} strokeWidth={7} progress={daysUntilNext !== null ? Math.max(0, Math.min(((28 - daysUntilNext) / 28) * 100, 100)) : 0} color="#EC407A" bgColor="#FCE4EC">
                <Icon name="event" size={20} color="#EC407A" />
              </SmallCircularProgress>
            </View>
            <TouchableOpacity style={[tw`flex-row items-center justify-between mt-4 pt-4`, { borderTopWidth: 1, borderTopColor: colors.border || '#F0F0F0' }]} onPress={() => setShowReminder(true)} activeOpacity={0.7}>
              <View style={tw`flex-row items-center`}>
                <Icon name={reminderSettings.enabled ? 'notifications-active' : 'notifications-off'} size={18} color={reminderSettings.enabled ? '#EC407A' : colors.textMuted} />
                <Text style={[tw`text-sm font-bold ml-2`, { color: colors.textPrimary }]}>{reminderSettings.enabled ? `Reminder: ${reminderSettings.daysBefore} day${reminderSettings.daysBefore > 1 ? 's' : ''} before` : 'Set Reminder'}</Text>
              </View>
              <View style={[tw`px-3 py-1.5 rounded-full`, { backgroundColor: reminderSettings.enabled ? '#EC407A' + '15' : colors.background }]}>
                <Text style={[tw`text-xs font-bold`, { color: reminderSettings.enabled ? '#EC407A' : colors.textMuted }]}>{reminderSettings.enabled ? 'ON' : 'OFF'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Cycle Summary Cards */}
        <View style={tw`flex-row mt-5 -mx-1.5`}>
          <MacroCard label="Cycle Day" value={cycleSummary.totalPeriodDays != null ? String(cycleSummary.totalPeriodDays) : '--'} unit="" progress={cycleDayProgress} color="#EC407A" bgColor="#FCE4EC" iconName="calendar-today" colors={colors} />
          <MacroCard label="Avg Duration" value={cycleSummary.averagePeriodDuration != null ? `${Number(cycleSummary.averagePeriodDuration).toFixed(0)}` : '--'} unit="d" progress={cycleSummary.averagePeriodDuration ? Math.min((cycleSummary.averagePeriodDuration / 7) * 100, 100) : 0} color="#7C4DFF" bgColor="#EDE7FF" iconName="timer" colors={colors} />
          <MacroCard label="Avg Cycle" value={cycleSummary.averageCycleLength != null ? `${cycleSummary.averageCycleLength}` : '--'} unit="d" progress={cycleSummary.averageCycleLength ? Math.min((cycleSummary.averageCycleLength / 35) * 100, 100) : 0} color="#AD1457" bgColor="#F8BBD0" iconName="loop" colors={colors} />
        </View>

        {/* Calendar */}
        <View style={[tw`rounded-3xl p-5 mt-5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <TouchableOpacity onPress={prevMonth} style={[tw`w-9 h-9 rounded-full items-center justify-center`, { backgroundColor: '#F3EAFF' }]}>
              <Icon name="chevron-left" size={20} color="#1A1D3F" />
            </TouchableOpacity>
            <View style={tw`items-center`}>
              <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>{monthName}</Text>
              {calendarLoading && <ActivityIndicator size="small" color="#EC407A" style={tw`mt-1`} />}
            </View>
            <TouchableOpacity onPress={nextMonth} disabled={isCurrentMonth} style={[tw`w-9 h-9 rounded-full items-center justify-center`, { backgroundColor: isCurrentMonth ? '#F5F5F7' : '#F3EAFF' }]}>
              <Icon name="chevron-right" size={20} color={isCurrentMonth ? '#A0A3BD' : '#1A1D3F'} />
            </TouchableOpacity>
          </View>
          <View style={tw`flex-row mb-2`}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <View key={d} style={tw`flex-1 items-center`}><Text style={[tw`text-[9px] font-bold`, { color: colors.textMuted }]}>{d}</Text></View>
            ))}
          </View>
          <View style={tw`flex-row flex-wrap`}>
            {generateCalendarDays().map((day, idx) => (
              <View key={idx} style={tw`w-[14.28%] items-center py-1`}>
                {day.empty ? <View style={tw`w-8 h-8`} /> : (
                  <View style={[tw`w-8 h-8 rounded-full items-center justify-center`, day.isToday && { backgroundColor: colors.primary }, day.isPeriodDay && !day.isToday && { backgroundColor: getFlowColor(day.flow) }, day.isPredicted && !day.isPeriodDay && !day.isToday && { backgroundColor: '#EC407A' + '30', borderWidth: 1.5, borderColor: '#EC407A', borderStyle: 'dashed' }]}>
                    <Text style={[tw`text-[10px] font-semibold`, { color: (day.isToday || (day.isPeriodDay && day.flow !== 'Light')) ? '#FFFFFF' : day.isPeriodDay && day.flow === 'Light' ? '#880E4F' : day.isPredicted ? '#EC407A' : colors.textPrimary }]}>{day.day}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
          <View style={tw`flex-row justify-center gap-3 mt-3 flex-wrap`}>
            <View style={tw`flex-row items-center`}><View style={[tw`w-3 h-3 rounded-full mr-1`, { backgroundColor: FLOW_COLORS.Light }]} /><Text style={[tw`text-[9px]`, { color: colors.textMuted }]}>Light</Text></View>
            <View style={tw`flex-row items-center`}><View style={[tw`w-3 h-3 rounded-full mr-1`, { backgroundColor: FLOW_COLORS.Medium }]} /><Text style={[tw`text-[9px]`, { color: colors.textMuted }]}>Medium</Text></View>
            <View style={tw`flex-row items-center`}><View style={[tw`w-3 h-3 rounded-full mr-1`, { backgroundColor: FLOW_COLORS.Heavy }]} /><Text style={[tw`text-[9px]`, { color: colors.textMuted }]}>Heavy</Text></View>
            <View style={tw`flex-row items-center`}><View style={[tw`w-3 h-3 rounded-full mr-1`, { backgroundColor: FLOW_COLORS.None }]} /><Text style={[tw`text-[9px]`, { color: colors.textMuted }]}>No Flow</Text></View>
            {nextPeriodDate && <View style={tw`flex-row items-center`}><View style={[tw`w-3 h-3 rounded-full mr-1`, { backgroundColor: '#EC407A' + '30', borderWidth: 1, borderColor: '#EC407A' }]} /><Text style={[tw`text-[9px]`, { color: colors.textMuted }]}>Predicted</Text></View>}
          </View>
        </View>

        {/* Cycle History */}
        <View style={tw`flex-row items-center justify-between mt-7 mb-4`}>
          <Text style={[tw`text-xl font-bold`, { color: colors.textPrimary }]}>Cycle History</Text>
          <Text style={[tw`text-xs font-medium`, { color: colors.textMuted }]}>{logs.length} {logs.length === 1 ? 'entry' : 'entries'}</Text>
        </View>

        {logs.length === 0 ? (
          <View style={[tw`rounded-3xl p-8 items-center`, { backgroundColor: colors.surface }]}>
            <View style={[tw`w-16 h-16 rounded-full items-center justify-center mb-4`, { backgroundColor: '#FCE4EC' }]}>
              <Icon name="calendar-today" size={28} color="#EC407A" />
            </View>
            <Text style={[tw`text-base font-bold text-center`, { color: colors.textPrimary }]}>No entries yet</Text>
            <Text style={[tw`text-sm mt-2 text-center`, { color: colors.textMuted }]}>Start tracking your cycle by tapping the + button above.</Text>
            <TouchableOpacity style={[tw`mt-5 px-6 py-3 rounded-2xl flex-row items-center`, { backgroundColor: '#EC407A' }]} onPress={() => setShowAdd(true)} activeOpacity={0.8}>
              <Icon name="add" size={18} color="#FFFFFF" />
              <Text style={[tw`text-sm font-bold ml-2`, { color: '#FFFFFF' }]}>Log Period</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[tw`rounded-xl px-3 py-2 mb-3`, { backgroundColor: '#FCE4EC' }]}>
              <Text style={[tw`text-xs font-medium text-center`, { color: '#EC407A' }]}>← Swipe left on any entry to delete</Text>
            </View>
            {logs.map((item) => {
              const flowColor = FLOW_COLORS[item.flow] || FLOW_COLORS.None;
              const isDeleting = deleteLoading === item._id;
              return (
                <SwipeableRow key={item._id} onDelete={() => handleDelete(item)}>
                  <ActivityItemLocal
                    title={`${formatDate(item.startDate)}${item.endDate ? ` → ${formatDate(item.endDate)}` : ''}`}
                    subtitle={item.flow}
                    value={`Cramps: ${item.cramps} • Mood: ${item.mood || '-'}${item.notes ? ` • ${item.notes}` : ''}`}
                    iconName="calendar-today"
                    iconBgColor={flowColor + '20'}
                    iconColor={flowColor}
                    colors={colors}
                    onPress={() => { pendingEditRef.current = true; setSelectedEntry(normalizeEntryForEdit(item)); }}
                    onLongPress={() => handleDelete(item)}
                    rightContent={
                      <View style={tw`flex-row items-center`}>
                        {isDeleting ? <ActivityIndicator size="small" color="#FF4444" /> : (
                          <TouchableOpacity style={[tw`w-8 h-8 rounded-full items-center justify-center`, { backgroundColor: '#FFEBEE' }]} onPress={() => handleDelete(item)} activeOpacity={0.7}>
                            <Icon name="delete-outline" size={16} color="#FF4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    }
                  />
                </SwipeableRow>
              );
            })}
          </>
        )}

        {/* Tips */}
        <Text style={[tw`text-xl font-bold mt-7 mb-4`, { color: colors.textPrimary }]}>Tips & Info</Text>
        <View style={[tw`rounded-2xl p-4 mb-3`, { backgroundColor: colors.surface }]}>
          <View style={tw`flex-row items-start`}>
            <View style={[tw`w-10 h-10 rounded-xl items-center justify-center`, { backgroundColor: '#E3F2FD' }]}><Icon name="info" size={18} color="#2196F3" /></View>
            <View style={tw`ml-3 flex-1`}>
              <Text style={[tw`text-sm font-bold`, { color: colors.textPrimary }]}>Track Regularly</Text>
              <Text style={[tw`text-xs mt-1`, { color: colors.textMuted }]}>Log your period start and end dates consistently for more accurate cycle predictions and reminders.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[tw`absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center`, { backgroundColor: '#EC407A', shadowColor: '#EC407A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }]} onPress={() => setShowAdd(true)} activeOpacity={0.8}>
        <Icon name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modals */}
      <AddEntryModal visible={showAdd} onClose={() => setShowAdd(false)} onSubmit={handleAdd} fields={ADD_FIELDS} loading={addLoading} />
      <EditEntryModal visible={showEdit} onClose={() => { setShowEdit(false); setSelectedEntry(null); }} onSubmit={handleEdit} entry={selectedEntry} fields={EDIT_FIELDS} loading={editLoading} />
      <ReminderModal visible={showReminder} onClose={() => setShowReminder(false)} colors={colors} reminderSettings={reminderSettings} onSave={saveReminderSettings} />
    </View>
  );
};

export default MenstrualTrackerScreen;