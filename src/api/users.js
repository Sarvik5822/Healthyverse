import client from './client';

const getUserHealthProfile = (userId) => client.get(`/users/${userId}/health-profile`);
const deactivateAccount = () => client.put('/users/deactivate');

export { getUserHealthProfile, deactivateAccount };