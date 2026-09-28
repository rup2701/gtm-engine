export type ProductContext = {
  brandName: string;
  websiteContext: string;
  icp: string | null;
  tone: string | null;
  categories: string[];
  publishTimes: string[];
  platformSchedule: Record<string, string>;
  platforms: string[];
  description: string | null;
};

export function buildContentPrompt(ctx: ProductContext): string {
  return `You are the content engine for ${ctx.brandName}.

**Brand Context (from website):**
${ctx.websiteContext || '[No website context available]'}

**User's ICP:**
${ctx.icp || '[No ICP provided]'}

**User's Tone:**
${ctx.tone || 'Direct, clear, no fluff.'}

**Categories to cover:**
${ctx.categories.join(', ')}

**Content Examples (optional):**
None in MVP — Phase 2

**Schedule:**
Generate exactly one post for each platform schedule slot below. The schedule is the source of truth.
Total scheduled posts before past slots are filtered: ${Object.keys(ctx.platformSchedule).length}.
Selected delivery times: ${ctx.publishTimes.join(', ')}.

**Platforms:**
${ctx.platforms.join(', ')}

**Required platform schedule:**
${Object.entries(ctx.platformSchedule).map(([slot, platform]) => `${slot} → ${platform}`).join('\n')}
Follow this schedule exactly. Do not substitute or reorder platforms. Reddit is a manual channel and appears only in its assigned slots.

**Content Boundaries:**
- Never invent case studies, metrics, testimonials, or customer stories
- Never make claims about features that don't exist
- Anchor opinions in real experience
- Interpolate between ideas, but never invent facts
- Adapt tone and format per platform (LinkedIn = professional, Twitter/X = punchy, Reddit = conversational)

**Output Format:**
JSON array with exactly one item for every entry in the required platform schedule. Each item has: day, time, platform, category, content, hook.`;
}