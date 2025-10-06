const { DateTime, Interval } = require('luxon');

// returns next due DateTime in zone; also last due before now
function getDueDatetimes({ weekday, hour, minute, zone }) {
  const now = DateTime.now().setZone(zone);
  let next = now.set({ weekday, hour, minute, second: 59, millisecond: 0 });
  if (next <= now) next = next.plus({ weeks: 1 });
  let last = next.minus({ weeks: 1 });
  return { now, last, next };
}

function periodBounds({ lastDue, nextDue }) {
  // period is (lastDue, nextDue] — exclusive->inclusive
  return {
    period_start: lastDue.plus({ seconds: 1 }).toISO(), // ISO instant
    period_end: nextDue.toISO()
  };
}

function statusFor(now, nextDue, warnWindowHours) {
  const warnFrom = nextDue.minus({ hours: warnWindowHours });
  if (now >= nextDue) return 'late';
  if (now >= warnFrom) return 'approaching';
  return 'ok';
}

module.exports = { getDueDatetimes, periodBounds, statusFor };