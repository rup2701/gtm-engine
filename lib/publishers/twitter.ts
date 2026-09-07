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