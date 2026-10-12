/**
 * Input Sanitization Utilities
 * Prevents XSS and injection attacks from user inputs
 * on the React Native frontend.
 */

/**
 * Strip HTML tags from a string
 * @param {string} str - Input string
 * @returns {string} Sanitized string without HTML tags
 */
const stripHtml = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '');
};

/**
 * Escape special characters that could be used in XSS
 * @param {string} str - Input string
 * @returns {string} Escaped string
 */
const escapeHtml = (str) => {
  if (!str || typeof str !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return str.replace(/[&<>"']/g, (char) => map[char]);
};

/**
 * Sanitize user input - trim, strip HTML, limit length
 * @param {string} input - Raw user input
 * @param {number} maxLength - Maximum allowed length (default: 500)
 * @returns {string} Sanitized input
 */
const sanitizeInput = (input, maxLength = 500) => {
  if (!input || typeof input !== 'string') return '';
  return stripHtml(input.trim()).slice(0, maxLength);
};

/**
 * Sanitize email input
 * @param {string} email - Raw email input
 * @returns {string} Sanitized email (lowercase, trimmed)
 */
const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase().slice(0, 254); // RFC 5321 max length
};

/**
 * Sanitize notes/text area input
 * @param {string} text - Raw text input
 * @param {number} maxLength - Maximum allowed length (default: 2000)
 * @returns {string} Sanitized text
 */
const sanitizeText = (text, maxLength = 2000) => {
  if (!text || typeof text !== 'string') return '';
  // Allow newlines but strip HTML
  return stripHtml(text.trim()).slice(0, maxLength);
};

/**
 * Sanitize numeric input - ensure it's a valid number
 * @param {string|number} value - Raw numeric input
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number|null} Sanitized number or null if invalid
 */
const sanitizeNumber = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const num = Number(value);
  if (isNaN(num)) return null;
  if (num < min) return min;
  if (num > max) return max;
  return num;
};

export {
  stripHtml,
  escapeHtml,
  sanitizeInput,
  sanitizeEmail,
  sanitizeText,
  sanitizeNumber,
};