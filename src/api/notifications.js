import client from './client';

const getNotifications = () => client.get('/notifications/notifications');
const markAsRead = (id) => client.put(`/notifications/${id}/read`);
const clearAllNotifications = () => client.delete('/notifications/clear-all');

export { getNotifications, markAsRead, clearAllNotifications };