import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import PeriodSelector from '../../trackers/components/PeriodSelector';
import tw from '../../../theme/tw';
import useTheme from '../../../hooks/useTheme';

const screenWidth = Dimensions.get('window').width;

const TrendSection = ({ title, type = 'line', data, labels, period, onPeriodChange, color, goalLine }) => {
  const { colors } = useTheme();

  if (!data || data.length === 0) {
    return (
      <View style={[tw`rounded-3xl p-5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
        <View style={tw`flex-row items-center justify-between mb-3`}>
          <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>{title}</Text>
          <PeriodSelector selected={period} onSelect={onPeriodChange} />
        </View>
        <View style={tw`items-center justify-center py-10`}>
          <Text style={[tw`text-sm`, { color: colors.textMuted }]}>No data available</Text>
        </View>
      </View>
    );
  }

  const chartWidth = screenWidth - 72;

  const chartData = {
    labels: labels || data.map((_, i) => `${i + 1}`),
    datasets: [
      {
        data: data,
        color: () => color || colors.primary,
        strokeWidth: 3,
      },
    ],
  };

  const ChartComponent = type === 'bar' ? BarChart : LineChart;

  return (
    <View style={[tw`rounded-3xl p-5`, { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 }]}>
      <View style={tw`flex-row items-center justify-between mb-4`}>
        <Text style={[tw`text-base font-bold`, { color: colors.textPrimary }]}>{title}</Text>
        <PeriodSelector selected={period} onSelect={onPeriodChange} />
      </View>
      <ChartComponent
        data={chartData}
        width={chartWidth}
        height={180}
        yAxisSuffix=""
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: colors.surface,
          backgroundGradientTo: colors.surface,
          decimalPlaces: 1,
          color: () => color || colors.primary,
          labelColor: () => colors.textMuted,
          propsForDots: { r: '4', strokeWidth: '2', stroke: color || colors.primary, fill: colors.surface },
          fillShadowGradient: color || colors.primary,
          fillShadowGradientOpacity: 0.15,
          propsForBackgroundLines: {
            strokeDasharray: '4 4',
            stroke: colors.border,
            strokeWidth: 0.8,
          },
        }}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={false}
        fromZero={type === 'bar'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  chart: {
    marginVertical: 4,
    borderRadius: 16,
  },
});

export default TrendSection;