type PlatformSchedule = Record<string, string>;

const REQUIRED_FIELDS = ['day', 'time', 'platform', 'category', 'content', 'hook'] as const;

export function validateGeneratedPosts(
  generatedPosts: unknown,
  platformSchedule: PlatformSchedule,
  categories: string[],
): string[] {
  if (!Array.isArray(generatedPosts)) {
    return ['The model response must be a JSON array.'];
  }

  const scheduleEntries = Object.entries(platformSchedule);
  const errors: string[] = [];
  const seenSlots = new Set<string>();

  if (generatedPosts.length !== scheduleEntries.length) {
    errors.push(`Expected ${scheduleEntries.length} posts, received ${generatedPosts.length}.`);
  }

  generatedPosts.forEach((candidate, index) => {
    const postLabel = `Post ${index + 1}`;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      errors.push(`${postLabel} must be an object.`);
      return;
    }

    const post = candidate as Record<string, unknown>;
    const missingFields = REQUIRED_FIELDS.filter(
      (field) => typeof post[field] !== 'string' || !post[field].trim(),
    );
    if (missingFields.length > 0) {
      errors.push(`${postLabel} is missing valid fields: ${missingFields.join(', ')}.`);
      return;
    }

    const day = post.day as string;
    const time = post.time as string;
    const platform = post.platform as string;
    const category = post.category as string;
    const content = post.content as string;
    const slotKey = `${day}:${time}`;
    const expectedPlatform = platformSchedule[slotKey];

    if (!expectedPlatform) {
      errors.push(`${postLabel} uses an unassigned schedule slot (${slotKey}).`);
      return;
    }
    if (seenSlots.has(slotKey)) {
      errors.push(`${postLabel} duplicates the schedule slot ${slotKey}.`);
      return;
    }
    seenSlots.add(slotKey);

    if (platform !== expectedPlatform) {
      errors.push(`${postLabel} assigns ${slotKey} to ${platform}; expected ${expectedPlatform}.`);
    }
    if (categories.length > 0 && !categories.includes(category)) {
      errors.push(`${postLabel} uses an unconfigured category (${category}).`);
    }

    if (expectedPlatform === 'twitter' && Array.from(content).length > 280) {
      errors.push(`${postLabel} for X is ${Array.from(content).length} characters; the maximum is 280.`);
    }

    if (expectedPlatform === 'linkedin') {
      const paragraphs = content.trim().split(/\r?\n[ \t]*\r?\n/).filter(Boolean);
      if (paragraphs.length < 2 || paragraphs.length > 4) {
        errors.push(`${postLabel} for LinkedIn must contain 2–4 paragraphs separated by blank lines.`);
      }
    }

    if (expectedPlatform === 'reddit' && !content.trim().endsWith('?')) {
      errors.push(`${postLabel} for Reddit must end with a question.`);
    }
  });

  for (const [slotKey] of scheduleEntries) {
    if (!seenSlots.has(slotKey)) {
      errors.push(`The required schedule slot ${slotKey} is missing.`);
    }
  }

  return errors;
}