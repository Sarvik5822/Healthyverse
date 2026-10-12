import client from './client';

const getGoals = () => client.get('/goals/goal');
const saveGoals = (data) => client.post('/goals/goal', data);

export { getGoals, saveGoals };