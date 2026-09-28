export type ContentPlatform = 'linkedin' | 'twitter' | 'reddit' | 'bluesky';

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;

/**
 * Builds a balanced channel rotation for the weekly calendar.
 * Reddit is manual-only and receives three weekly slots; all remaining
 * slots are distributed across the other selected platforms.
 */
export function buildPlatformSchedule(
  publishTimes: string[],
  platforms: string[],
  weekKey: string,
): Record<string, ContentPlatform> {
  const available = platforms.filter((platform): platform is ContentPlatform =>
    ['linkedin', 'twitter', 'reddit', 'bluesky'].includes(platform),
  );
  const fallback = available[0] ?? 'linkedin';
  const schedule: Record<string, ContentPlatform> = {};
  const weekSeed = [...weekKey].reduce((sum, character) => sum + character.charCodeAt(0), 0);

  if (available.length === 0) return schedule;

  const professional = available.filter((platform) => platform !== 'reddit');
  const redditEnabled = available.includes('reddit');
  const remainingSlots: Array<{ day: string; time: string; dayIndex: number; slotIndex: number }> = [];

  WEEKDAYS.forEach((day, dayIndex) => {
    publishTimes.forEach((time, slotIndex) => {
      const key = `${day}:${time}`;
      const isRedditSlot = redditEnabled
        && (day === 'mon' || day === 'wed' || day === 'fri')
        && slotIndex === dayIndex % publishTimes.length;

      if (isRedditSlot) {
        schedule[key] = 'reddit';
      } else {
        remainingSlots.push({ day, time, dayIndex, slotIndex });
      }
    });
  });

  const rotation = professional;
  if (rotation.length === 0) return schedule;
  remainingSlots.forEach(({ day, time, dayIndex, slotIndex }) => {
    const key = `${day}:${time}`;
    const platformIndex = (weekSeed + dayIndex + slotIndex) % rotation.length;
    schedule[key] = rotation[platformIndex] ?? fallback;
  });

  return schedule;
}
