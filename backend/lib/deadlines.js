const { DateTime } = require('luxon');

const ZONE = 'America/Denver';

/**
 * Get the current work week period (Monday 12:01 AM → Sunday 11:59 PM Denver)
 * @param {DateTime} now - Current time (defaults to now in Denver)
 * @returns {Object} { start, end } - Period boundaries
 */
function currentPeriod(now = DateTime.now().setZone(ZONE)) {
  // Work week starts Monday 00:01, ends Sunday 23:59:59
  const start = now.startOf('week').plus({ minutes: 1 }); // Monday 00:01
  const end = start.plus({ days: 6, hours: 23, minutes: 58, seconds: 59 }); // Sunday 23:59:59
  return { start, end };
}

/**
 * Calculate the due date for a given period end (Tuesday 11:59 PM after the Sunday)
 * @param {DateTime} periodEnd - The Sunday end of the work week
 * @returns {DateTime} - Due date (Tuesday 11:59 PM)
 */
function dueForPeriod(periodEnd) {
  // Next Tuesday 23:59:59 AFTER the Sunday period end
  let tuesday = periodEnd.set({ weekday: 2, hour: 23, minute: 59, second: 59, millisecond: 0 });
  if (tuesday <= periodEnd) {
    tuesday = tuesday.plus({ weeks: 1 });
  }
  return tuesday;
}

/**
 * Determine warning status relative to due date
 * @param {DateTime} now - Current time
 * @param {DateTime} due - Due date
 * @param {number} warnHours - Warning window in hours (default 24)
 * @returns {string} - 'ok', 'approaching', or 'late'
 */
function statusFor(now, due, warnHours = 24) {
  const warnFrom = due.minus({ hours: warnHours });
  if (now >= due) return 'late';
  if (now >= warnFrom) return 'approaching';
  return 'ok';
}

/**
 * Legacy compatibility function for existing invoice submission code
 * @param {Object} settings - Invoice settings (weekday, hour, minute, zone)
 * @returns {Object} - { now, last, next } for period calculation
 */
function getDueDatetimes({ weekday, hour, minute, zone }) {
  // For backward compatibility, map to new system
  const now = DateTime.now().setZone(ZONE);
  const period = currentPeriod(now);
  const due = dueForPeriod(period.end);
  
  // Map to old format where "next" is the due date
  return {
    now,
    last: due.minus({ weeks: 1 }), // Previous week's due date
    next: due // This week's due date
  };
}

/**
 * Legacy compatibility function for period bounds
 * @param {Object} param - { lastDue, nextDue }
 * @returns {Object} - { period_start, period_end }
 */
function periodBounds({ lastDue, nextDue }) {
  // Calculate the actual work week period for the current time
  const now = DateTime.now().setZone(ZONE);
  const period = currentPeriod(now);
  
  return {
    period_start: period.start.toISO(),
    period_end: period.end.toISO()
  };
}

/**
 * Calculate period bounds for a specific date (work week containing the date)
 * @param {string|DateTime} date - ISO date string or DateTime object
 * @returns {Object} - { period_start, period_end } in ISO format
 */
function periodBoundsForDate(date) {
  const targetDate = typeof date === 'string' ? DateTime.fromISO(date).setZone(ZONE) : date.setZone(ZONE);
  const period = currentPeriod(targetDate);
  
  return {
    period_start: period.start.toISO(),
    period_end: period.end.toISO()
  };
}

module.exports = { 
  getDueDatetimes, 
  periodBounds, 
  periodBoundsForDate,
  statusFor,
  currentPeriod,
  dueForPeriod,
  ZONE
};