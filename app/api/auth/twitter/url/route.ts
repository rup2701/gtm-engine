import { NextResponse } from "next/server";

// app/api/auth/twitter/url/route.ts
export async function GET() {
  const authUrl = `https://twitter.com/i/oauth2/authorize?${new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TWITTER_CLIENT_ID!,
    redirect_uri: process.env.TWITTER_REDIRECT_URI!,
    scope: 'tweet.read tweet.write users.read offline.access',
    state: crypto.randomUUID(),
    code_challenge: 'challenge',
    code_challenge_method: 'plain'
  })}`;

  return NextResponse.json({ url: authUrl });
}