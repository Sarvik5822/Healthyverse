import Toast from 'react-native-toast-message';

/**
 * Maps API errors to user-friendly messages
 */
const ERROR_MESSAGES = {
  // Network errors
  'Network Error': 'Unable to connect. Please check your internet connection and try again.',
  'ECONNABORTED': 'Request timed out. Please try again.',
  'ERR_NETWORK': 'No internet connection. Please check your network settings.',

  // Auth errors
  401: 'Your session has expired. Please log in again.',
  403: 'You don\'t have permission to access this feature.',

  // Server errors
  500: 'Something went wrong on our end. Please try again later.',
  502: 'Server is temporarily unavailable. Please try again in a moment.',
  503: 'Service is under maintenance. Please try again later.',

  // Not found
  404: 'The requested data was not found.',

  // Validation
  400: 'Invalid request. Please check your input and try again.',
  422: 'Please check your input and try again.',
};

/**
 * Get a user-friendly error message from an API error
 * @param {Error} error - The error object (usually AxiosError)
 * @param {string} fallbackMessage - Fallback message if no specific message found
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error, fallbackMessage = 'Something went wrong. Please try again.') => {
  if (!error) return fallbackMessage;

  // Check for server-provided message first
  const serverMessage = error.response?.data?.message;
  if (serverMessage && typeof serverMessage === 'string' && serverMessage.length < 100) {
    return serverMessage;
  }

  // Check for network errors
  if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
    return ERROR_MESSAGES['Network Error'];
  }

  if (error.code === 'ECONNABORTED') {
    return ERROR_MESSAGES.ECONNABORTED;
  }

  // Check for HTTP status code
  const status = error.response?.status;
  if (status && ERROR_MESSAGES[status]) {
    return ERROR_MESSAGES[status];
  }

  return fallbackMessage;
};

/**
 * Show an error toast with user-friendly message
 * @param {Error} error - The error object
 * @param {string} context - Context of what was being done (e.g., "loading steps data")
 */
export const showErrorToast = (error, context = '') => {
  const message = getErrorMessage(error);
  const title = context ? `Failed to ${context}` : 'Something went wrong';

  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    visibilityTime: 4000,
    position: 'bottom',
  });
};

/**
 * Show a success toast
 * @param {string} message - Success message
 */
export const showSuccessToast = (message) => {
  Toast.show({
    type: 'success',
    text1: message,
    visibilityTime: 2500,
    position: 'bottom',
  });
};

/**
 * Show an info toast
 * @param {string} title - Title
 * @param {string} message - Info message
 */
export const showInfoToast = (title, message = '') => {
  Toast.show({
    type: 'info',
    text1: title,
    text2: message,
    visibilityTime: 3000,
    position: 'bottom',
  });
};

export default { getErrorMessage, showErrorToast, showSuccessToast, showInfoToast };