/**
 * Frontend Input Validation Utilities
 * Validates user input before sending to the backend.
 * This provides immediate feedback and reduces unnecessary API calls.
 */

/**
 * Quick boolean check - is email valid?
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (!email || !email.trim()) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.trim().length <= 254;
};

/**
 * Quick boolean check - is password valid?
 * @param {string} password
 * @returns {boolean}
 */
export const isValidPassword = (password) => {
  if (!password) return false;
  return password.length >= 8 && password.length <= 128;
};

/**
 * Validate email format
 * @param {string} email
 * @returns {string|null} Error message or null if valid
 */
export const validateEmail = (email) => {
  if (!email || !email.trim()) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) return 'Please enter a valid email address';
  if (email.trim().length > 254) return 'Email is too long';
  return null;
};

/**
 * Validate password strength
 * @param {string} password
 * @returns {string|null} Error message or null if valid
 */
export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password is too long';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character';
  return null;
};

/**
 * Validate full name
 * @param {string} name
 * @returns {string|null} Error message or null if valid
 */
export const validateFullName = (name) => {
  if (!name || !name.trim()) return 'Full name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  if (name.trim().length > 100) return 'Name must not exceed 100 characters';
  // Prevent script injection in names
  if (/<script|javascript:|on\w+=/i.test(name)) return 'Invalid characters in name';
  return null;
};

/**
 * Validate phone number
 * @param {string} phone
 * @returns {string|null} Error message or null if valid
 */
export const validatePhone = (phone) => {
  if (!phone) return null; // Phone is optional
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.length > 0 && (cleaned.length < 7 || cleaned.length > 15)) {
    return 'Please enter a valid phone number';
  }
  if (!/^[+]?[0-9\s\-()]+$/.test(phone)) return 'Phone number contains invalid characters';
  return null;
};

/**
 * Validate OTP
 * @param {string} otp
 * @returns {string|null} Error message or null if valid
 */
export const validateOTP = (otp) => {
  if (!otp) return 'OTP is required';
  if (!/^\d{6}$/.test(otp)) return 'OTP must be exactly 6 digits';
  return null;
};

/**
 * Validate numeric input (height, weight, etc.)
 * @param {string|number} value
 * @param {string} fieldName
 * @param {object} options - { min, max, required }
 * @returns {string|null} Error message or null if valid
 */
export const validateNumeric = (value, fieldName, options = {}) => {
  const { min = 0, max = Infinity, required = true } = options;
  if (required && (value === undefined || value === null || value === '')) {
    return `${fieldName} is required`;
  }
  const num = Number(value);
  if (isNaN(num)) return `${fieldName} must be a number`;
  if (num < min) return `${fieldName} must be at least ${min}`;
  if (num > max) return `${fieldName} must not exceed ${max}`;
  return null;
};

/**
 * Sanitize text input - remove potential XSS vectors
 * @param {string} input
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
};

/**
 * Validate registration form
 * @param {object} formData
 * @returns {object} { isValid: boolean, errors: object }
 */
export const validateRegistrationForm = (formData) => {
  const errors = {};

  const nameErr = validateFullName(formData.fullName);
  if (nameErr) errors.fullName = nameErr;

  const emailErr = validateEmail(formData.email);
  if (emailErr) errors.email = emailErr;

  const passErr = validatePassword(formData.password);
  if (passErr) errors.password = passErr;

  if (formData.confirmPassword !== formData.password) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (!formData.dob) errors.dob = 'Date of birth is required';
  if (!formData.gender) errors.gender = 'Gender is required';

  const heightErr = validateNumeric(formData.height, 'Height', { min: 1, max: 300 });
  if (heightErr) errors.height = heightErr;

  const weightErr = validateNumeric(formData.weight, 'Weight', { min: 1, max: 700 });
  if (weightErr) errors.weight = weightErr;

  const phoneErr = validatePhone(formData.phone);
  if (phoneErr) errors.phone = phoneErr;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};