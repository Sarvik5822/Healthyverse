import dayjs from 'dayjs';

const formatDate = (date) => {
  if (!date) return '';
  return dayjs(date).format('MMM D, YYYY');
};

const formatDateTime = (date) => {
  if (!date) return '';
  return dayjs(date).format('MMM D, YYYY h:mm A');
};

const formatTime = (date) => {
  if (!date) return '';
  return dayjs(date).format('h:mm A');
};

const formatNumber = (num, decimals = 1) => {
  if (num === null || num === undefined) return '0';
  return Number(num).toFixed(decimals);
};

const formatShortDate = (date) => {
  if (!date) return '';
  return dayjs(date).format('MMM D');
};

const getMonthName = (month) => dayjs().month(month - 1).format('MMMM');
const getDayName = (day) => dayjs().day(day).format('ddd');

export { formatDate, formatDateTime, formatTime, formatNumber, formatShortDate, getMonthName, getDayName };