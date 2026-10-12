import client from './client';

const login = (email, password) => client.post('/auth/login', { email, password });

const register = (formData) =>
  client.post('/auth/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

const forgotPassword = (email) => client.post('/auth/forgot-password', { email });

const verifyOTP = (email, otp, otpToken) =>
  client.post('/auth/verify-otp', { email, otp, otpToken });

const resetPassword = (resetToken, password, confirmPassword) =>
  client.post(`/auth/reset-password/${resetToken}`, { password, confirmPassword });

const changePassword = (currentPassword, newPassword, confirmPassword) =>
  client.put('/auth/change-password', { currentPassword, newPassword, confirmPassword });

export { login, register, forgotPassword, verifyOTP, resetPassword, changePassword };