// lib/publishers/twitter.ts
export async function publishToTwitter(content: string, accessToken: string) {
  const response = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: content })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Twitter API error: ${error.detail || 'Unknown'}`);
  }

  const data = await response.json();
  return {
    success: true,
    url: `https://twitter.com/i/web/status/${data.data.id}`,
    analytics: { tweetId: data.data.id }
  };
}
