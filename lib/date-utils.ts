// lib/date-utils.ts
// 
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { addDays, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';


export function getNextWeekDate(day: string): string {
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDayIndex = daysOfWeek.indexOf(day.toLowerCase());
  
  if (targetDayIndex === -1) throw new Error(`Invalid day: ${day}`);

  const now = new Date();
  const currentDayIndex = now.getDay();
  
  // Days until next occurrence of target day
  let daysUntil = targetDayIndex - currentDayIndex;
  if (daysUntil <= 0) daysUntil += 7; // Always get *next* week's date
  
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysUntil);
  
  // Return YYYY-MM-DD format
  return targetDate.toISOString().split('T')[0];
}

// (removed: getWeekIdentifier — superseded by getWeekKey)


export function getMondayDate(offset: number): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// ─── Single source of truth for week identity ────────────────────
// ISO-8601 week key for a week offset (0 = current week, 1 = next,
// -1 = previous). Anchored to the week's Monday and computed with
// UTC-noon math so DST transitions can't truncate the week number.
// Both content generation and calendar fetching MUST use this.
export function getWeekKey(offset: number): string {
  const monday = getMondayDate(offset);
  return getISOWeekKey(monday);
}

function getISOWeekKey(date: Date): string {
  // Work in UTC at noon to avoid DST edge cases.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
  // ISO week: week containing the year's first Thursday is week 1.
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // shift to Thursday of this week
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Default offset: weekends → next week, weekdays → current week
export function getDefaultOffset(): number {
  const today = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = today === 0 || today === 6;
  return isWeekend ? 1 : 0;
}

// Max forward offset: weekends → 1 (next week), weekdays → 0 (current)
export function getMaxForwardOffset(): number {
  const today = new Date().getDay();
  const isWeekend = today === 0 || today === 6;
  return isWeekend ? 1 : 0;
}

// Check if a week is in the past
export function isPastWeek(offset: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetMonday = getMondayDate(offset);
  return targetMonday < today;
}

// Check if a date is today
export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function calculateGlobalPostSchedule(
  targetDay: 'mon' | 'tue' | 'wed' | 'thu' | 'fri',
  timeSlotStr: string,       // e.g. "11:00"
  userTimeZone: string       // e.g. "America/Los_Angeles"
) {
  const now = new Date();
  const currentDayIndex = now.getDay();

  const targetDayOffsets = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5 };
  const targetOffset = targetDayOffsets[targetDay] || 1;

  let daysToAdd = 0;
  if (currentDayIndex === 0) {
    daysToAdd = targetOffset;
  } else {
    daysToAdd = targetOffset - currentDayIndex;
  }

  const targetDateObj = new Date(now);
  targetDateObj.setDate(now.getDate() + daysToAdd);

  const year = targetDateObj.getFullYear();
  const month = String(targetDateObj.getMonth() + 1).padStart(2, '0');
  const dayStr = String(targetDateObj.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${dayStr}`;

  // 1. Determine the exact timezone offset string dynamically (e.g., "-07:00" for SF PDT)
  // This removes any hidden environment variable gaps!
  let offsetStr = "-07:00"; 
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimeZone || 'America/Los_Angeles',
      timeZoneName: 'longOffset'
    });
    const parts = formatter.formatToParts(targetDateObj);
    const tzPart = parts.find(p => p.type === 'timeZoneName')?.value; // e.g., "GMT-7"
    if (tzPart) {
      const match = tzPart.match(/GMT([+-]\d+)(?::(\d+))?/);
      if (match) {
        const sign = match[1][0];
        const hours = match[1].slice(1).padStart(2, '0');
        const mins = match[2] || "00";
        offsetStr = `${sign}${hours}:${mins}`;
      }
    }
  } catch (e) {
    console.error("Failed parsing dynamic timezone string offset, falling back to -07:00", e);
  }

  // 2. 🎯 Assemble a fully qualified ISO 8601 literal string: "2026-09-18T11:00:00-07:00"
  const absoluteIsoString = `${dateString}T${timeSlotStr}:00${offsetStr}`;

  // 3. Instantiate native Date object directly from the explicit string anchor
  const scheduledAtUtc = new Date(absoluteIsoString);

  // 4. Formulate matching standard week key string
  const firstDayOfYear = new Date(targetDateObj.getFullYear(), 0, 1);
  const pastDaysOfYear = (targetDateObj.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNo = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  const weekKey = `${targetDateObj.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;

  return {
    scheduledAt: scheduledAtUtc, // Correctly shifts 11:00 AM SF time to 6:00 PM UTC!
    weekKey
  };
}


