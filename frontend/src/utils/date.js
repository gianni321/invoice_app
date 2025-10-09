import { VALIDATION_RULES } from '../constants/index.js';

/**
 * Comprehensive date utility functions for the invoice application
 */

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} [format='short'] - Format type ('short', 'long', 'iso', 'time')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'short') {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const options = {
    short: { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    },
    long: { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    },
    iso: null, // Special case for ISO format
    time: { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    },
    datetime: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }
  };

  if (format === 'iso') {
    return dateObj.toISOString().split('T')[0];
  }

  return dateObj.toLocaleDateString('en-US', options[format] || options.short);
}

/**
 * Get relative time string (e.g., "2 days ago", "in 3 hours")
 * @param {Date|string} date - Date to compare
 * @param {Date} [relativeTo=new Date()] - Date to compare against
 * @returns {string} Relative time string
 */
export function getRelativeTime(date, relativeTo = new Date()) {
  const dateObj = date instanceof Date ? date : new Date(date);
  const relativeObj = relativeTo instanceof Date ? relativeTo : new Date(relativeTo);
  
  if (isNaN(dateObj.getTime()) || isNaN(relativeObj.getTime())) {
    return 'Invalid Date';
  }

  const diffMs = dateObj.getTime() - relativeObj.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  const isPast = diffMs < 0;
  const abs = Math.abs;

  if (abs(diffSeconds) < 60) {
    return isPast ? 'just now' : 'in a moment';
  } else if (abs(diffMinutes) < 60) {
    const minutes = abs(diffMinutes);
    return isPast 
      ? `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
      : `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (abs(diffHours) < 24) {
    const hours = abs(diffHours);
    return isPast 
      ? `${hours} hour${hours !== 1 ? 's' : ''} ago`
      : `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (abs(diffDays) < 7) {
    const days = abs(diffDays);
    return isPast 
      ? `${days} day${days !== 1 ? 's' : ''} ago`
      : `in ${days} day${days !== 1 ? 's' : ''}`;
  } else if (abs(diffWeeks) < 4) {
    const weeks = abs(diffWeeks);
    return isPast 
      ? `${weeks} week${weeks !== 1 ? 's' : ''} ago`
      : `in ${weeks} week${weeks !== 1 ? 's' : ''}`;
  } else {
    const months = abs(diffMonths);
    return isPast 
      ? `${months} month${months !== 1 ? 's' : ''} ago`
      : `in ${months} month${months !== 1 ? 's' : ''}`;
  }
}

/**
 * Get start of week (Monday)
 * @param {Date|string} [date=new Date()] - Date to get week start for
 * @returns {Date} Start of week
 */
export function getWeekStart(date = new Date()) {
  const dateObj = date instanceof Date ? new Date(date) : new Date(date);
  const day = dateObj.getDay();
  const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const weekStart = new Date(dateObj.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Get end of week (Sunday)
 * @param {Date|string} [date=new Date()] - Date to get week end for
 * @returns {Date} End of week
 */
export function getWeekEnd(date = new Date()) {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

/**
 * Get start of month
 * @param {Date|string} [date=new Date()] - Date to get month start for
 * @returns {Date} Start of month
 */
export function getMonthStart(date = new Date()) {
  const dateObj = date instanceof Date ? new Date(date) : new Date(date);
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
}

/**
 * Get end of month
 * @param {Date|string} [date=new Date()] - Date to get month end for
 * @returns {Date} End of month
 */
export function getMonthEnd(date = new Date()) {
  const dateObj = date instanceof Date ? new Date(date) : new Date(date);
  return new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Get week number for a given date
 * @param {Date|string} [date=new Date()] - Date to get week number for
 * @returns {number} Week number (1-53)
 */
export function getWeekNumber(date = new Date()) {
  const dateObj = date instanceof Date ? new Date(date) : new Date(date);
  const firstDayOfYear = new Date(dateObj.getFullYear(), 0, 1);
  const pastDaysOfYear = (dateObj - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Check if date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  const today = new Date();
  return dateObj.toDateString() === today.toDateString();
}

/**
 * Check if date is this week
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is this week
 */
export function isThisWeek(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();
  return dateObj >= weekStart && dateObj <= weekEnd;
}

/**
 * Check if date is this month
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is this month
 */
export function isThisMonth(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  const today = new Date();
  return dateObj.getMonth() === today.getMonth() && 
         dateObj.getFullYear() === today.getFullYear();
}

/**
 * Add days to a date
 * @param {Date|string} date - Base date
 * @param {number} days - Number of days to add
 * @returns {Date} New date
 */
export function addDays(date, days) {
  const dateObj = date instanceof Date ? new Date(date) : new Date(date);
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj;
}

/**
 * Add weeks to a date
 * @param {Date|string} date - Base date
 * @param {number} weeks - Number of weeks to add
 * @returns {Date} New date
 */
export function addWeeks(date, weeks) {
  return addDays(date, weeks * 7);
}

/**
 * Add months to a date
 * @param {Date|string} date - Base date
 * @param {number} months - Number of months to add
 * @returns {Date} New date
 */
export function addMonths(date, months) {
  const dateObj = date instanceof Date ? new Date(date) : new Date(date);
  dateObj.setMonth(dateObj.getMonth() + months);
  return dateObj;
}

/**
 * Get difference between two dates in days
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Difference in days
 */
export function getDaysDifference(date1, date2) {
  const dateObj1 = date1 instanceof Date ? date1 : new Date(date1);
  const dateObj2 = date2 instanceof Date ? date2 : new Date(date2);
  const timeDiff = dateObj2.getTime() - dateObj1.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

/**
 * Get business days between two dates (excluding weekends)
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Number of business days
 */
export function getBusinessDays(startDate, endDate) {
  const start = startDate instanceof Date ? new Date(startDate) : new Date(startDate);
  const end = endDate instanceof Date ? new Date(endDate) : new Date(endDate);
  
  let businessDays = 0;
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      businessDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return businessDays;
}

/**
 * Format date for HTML input[type="date"]
 * @param {Date|string} [date=new Date()] - Date to format
 * @returns {string} Date in YYYY-MM-DD format
 */
export function formatDateForInput(date = new Date()) {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toISOString().split('T')[0];
}

/**
 * Parse date from HTML input[type="date"]
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} Parsed date
 */
export function parseDateFromInput(dateString) {
  return new Date(dateString + 'T00:00:00');
}

/**
 * Check if date is valid
 * @param {Date|string} date - Date to validate
 * @returns {boolean} True if date is valid
 */
export function isValidDate(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
}

/**
 * Get current week's date range as formatted string
 * @returns {string} Formatted week range (e.g., "Mar 6 - Mar 12, 2024")
 */
export function getCurrentWeekRange() {
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();
  
  const startFormatted = formatDate(weekStart, 'short');
  const endFormatted = formatDate(weekEnd, 'short');
  
  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Get deadline status for invoices
 * @param {Date|string} submissionDeadline - Deadline date
 * @returns {Object} Status information
 */
export function getDeadlineStatus(submissionDeadline) {
  if (!submissionDeadline) {
    return {
      status: 'no-deadline',
      message: 'No deadline set',
      daysRemaining: null,
      isOverdue: false,
      isUrgent: false
    };
  }

  const deadline = submissionDeadline instanceof Date ? submissionDeadline : new Date(submissionDeadline);
  const now = new Date();
  const daysRemaining = getDaysDifference(now, deadline);

  if (daysRemaining < 0) {
    return {
      status: 'overdue',
      message: `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''}`,
      daysRemaining,
      isOverdue: true,
      isUrgent: true
    };
  } else if (daysRemaining === 0) {
    return {
      status: 'due-today',
      message: 'Due today',
      daysRemaining,
      isOverdue: false,
      isUrgent: true
    };
  } else if (daysRemaining <= 2) {
    return {
      status: 'urgent',
      message: `Due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
      daysRemaining,
      isOverdue: false,
      isUrgent: true
    };
  } else if (daysRemaining <= 7) {
    return {
      status: 'upcoming',
      message: `Due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
      daysRemaining,
      isOverdue: false,
      isUrgent: false
    };
  } else {
    return {
      status: 'normal',
      message: `Due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
      daysRemaining,
      isOverdue: false,
      isUrgent: false
    };
  }
}

/**
 * Date utilities object for easy importing
 */
export const DateUtils = {
  formatDate,
  getRelativeTime,
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  getWeekNumber,
  isToday,
  isThisWeek,
  isThisMonth,
  addDays,
  addWeeks,
  addMonths,
  getDaysDifference,
  getBusinessDays,
  formatDateForInput,
  parseDateFromInput,
  isValidDate,
  getCurrentWeekRange,
  getDeadlineStatus
};

export default DateUtils;