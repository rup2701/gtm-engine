// lib/date-utils.ts

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

// lib/date-utils.ts
export function getWeekIdentifier(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}