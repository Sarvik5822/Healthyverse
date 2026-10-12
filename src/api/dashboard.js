import client from './client';

const getWeightAndBMIStats = () => client.get('/dashboard/getWeightAndBMIStats');
const getWaterIntakeStats = () => client.get('/dashboard/getWaterIntakeStats');
const getWaterIntakeGoalAchievedDates = (month, year) =>
  client.get('/dashboard/getWaterIntakeGoalAchievedDates', { params: { month, year } });

export { getWeightAndBMIStats, getWaterIntakeStats, getWaterIntakeGoalAchievedDates };