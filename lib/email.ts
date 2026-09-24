// Thin wrapper around Resend so email sending has one place to configure.
// Fails soft (logs, doesn't throw) so a missing/misconfigured email service
// never blocks signup, claim, or waitlist flows — those DB writes must
// always succeed even if notification email fails.
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.RESEND_FROM_EMAIL || 'DispatchOS <onboarding@resend.dev>';

export async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[email] Resend not configured — skipped "${subject}" to ${to}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error);
  }
}

// Notifies the founder inbox of product events — signups, EARLY20 claims,
// waitlist joins — so nobody has to poll the database manually.
export async function notifyFounder(subject: string, html: string) {
  const to = process.env.FOUNDER_NOTIFICATION_EMAIL;
  if (!to) {
    console.log(`[email] FOUNDER_NOTIFICATION_EMAIL not set — skipped "${subject}"`);
    return;
  }
  await sendEmail(to, subject, html);
}
