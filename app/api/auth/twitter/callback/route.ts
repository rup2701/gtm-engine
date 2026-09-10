import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const code = request.nextUrl.searchParams.get('code');
  const oauthError = request.nextUrl.searchParams.get('error');
  const settingsUrl = new URL('/settings', request.url);

  if (oauthError || !code) {
    settingsUrl.searchParams.set('twitter', 'error');
    return NextResponse.redirect(settingsUrl);
  }

  if (!userId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const redirectUri = process.env.TWITTER_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    settingsUrl.searchParams.set('twitter', 'config_error');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: 'challenge',
      }),
    });

    const data: { access_token?: string; error?: string } = await response.json();
    if (!response.ok || !data.access_token) {
      throw new Error(data.error || 'Twitter token exchange failed');
    }

    const [existingSettings] = await db.select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));

    if (existingSettings) {
      await db.update(userSettings)
        .set({
          twitterBearerToken: data.access_token,
          twitterAccessToken: data.access_token,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId));
    } else {
      await db.insert(userSettings).values({
        userId,
        twitterBearerToken: data.access_token,
        twitterAccessToken: data.access_token,
      });
    }

    settingsUrl.searchParams.set('twitter', 'connected');
  } catch (error) {
    console.error('Twitter callback error:', error);
    settingsUrl.searchParams.set('twitter', 'error');
  }

  return NextResponse.redirect(settingsUrl);
}