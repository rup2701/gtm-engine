// lib/publishers/twitter.ts
// import OAuth from 'oauth-1.0a';
// import crypto from 'crypto';

// lib/publishers/twitter.ts
export async function publishToTwitter(content: string, accessToken: string) {
  const response = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: content }),
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    try {
      const json = JSON.parse(text);
      errorMessage = json.detail || json.title || errorMessage;
    } catch {
      errorMessage = text || errorMessage;
    }
    throw new Error(`Twitter API error: ${errorMessage}`);
  }

  const data = await response.json();
  return {
    success: true,
    url: `https://twitter.com/i/web/status/${data.data.id}`,
    analytics: { tweetId: data.data.id },
  };
}

// Fetch engagement metrics for a published tweet.
// public_metrics works on Free tier; organic_metrics (impressions)
// requires the paid Basic tier with OAuth2 user context.
export async function fetchTwitterMetrics(
  tweetId: string,
  accessToken: string,
): Promise<{
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  bookmarks: number;
  impressions: number;
} | null> {
  const response = await fetch(
    `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics,organic_metrics`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    return null;
  }

  const json = await response.json();
  const pub = json?.data?.public_metrics ?? {};
  const org = json?.data?.organic_metrics ?? {};

  return {
    likes: pub.like_count ?? 0,
    retweets: pub.retweet_count ?? 0,
    replies: pub.reply_count ?? 0,
    quotes: pub.quote_count ?? 0,
    bookmarks: pub.bookmark_count ?? 0,
    impressions: org.impression_count ?? 0,
  };
}