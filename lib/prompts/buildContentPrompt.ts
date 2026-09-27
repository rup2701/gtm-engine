export type ProductContext = {
  brandName: string;
  websiteContext: string;
  icp: string | null;
  tone: string | null;
  categories: string[];
  publishTimes: string[];
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
Generate exactly one post for each selected delivery time on each weekday (Monday through Friday).
That is ${ctx.publishTimes.length} posts per weekday, ${ctx.publishTimes.length * 5} posts total before past slots are filtered.
Use these delivery times in order each weekday: ${ctx.publishTimes.join(', ')}.

**Platforms:**
${ctx.platforms.join(', ')}

**Content Boundaries:**
- Never invent case studies, metrics, testimonials, or customer stories
- Never make claims about features that don't exist
- Anchor opinions in real experience
- Interpolate between ideas, but never invent facts
- Adapt tone and format per platform (LinkedIn = professional, Twitter/X = punchy, Reddit = conversational)

**Output Format:**
JSON array with exactly one item for every weekday/time combination, using each supplied time exactly once per weekday. Each item has: day, time, platform, category, content, hook.`;
}