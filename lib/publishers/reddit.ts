
interface RedditCredentials {
  accessToken: string;
  subreddit: string;
  userAgent?: string;
}

interface RedditSubmitResponse {
  json?: {
    data?: {
      id?: string;
      url?: string;
      errors?: Array<[string, string, string]>;
    };
  };
}

function getTitle(content: string) {
  const firstLine = content.split(/\r?\n/, 1)[0].trim();
  return (firstLine || 'New post').slice(0, 300);
}

export async function publishToReddit(
  content: string,
  credentials: RedditCredentials,
) {
  if (!content.trim()) {
    throw new Error('Reddit post content cannot be empty');
  }

  if (!credentials?.accessToken || !credentials.subreddit) {
    throw new Error('Reddit requires an access token and subreddit');
  }

  const response = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': credentials.userAgent || 'gtm-engine/1.0',
    },
    body: new URLSearchParams({
      api_type: 'json',
      kind: 'self',
      resubmit: 'true',
      sr: credentials.subreddit,
      title: getTitle(content),
      text: content,
    }),
  });

  let data: RedditSubmitResponse = {};
  try {
    data = await response.json();
  } catch {
    throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
  }

  const errors = data.json?.data?.errors;
  if (!response.ok || errors?.length) {
    const message = errors?.map(([, reason, detail]) => `${reason}: ${detail}`).join('; ');
    throw new Error(`Reddit API error: ${message || `${response.status} ${response.statusText}`}`);
  }

  const postId = data.json?.data?.id;
  const url = data.json?.data?.url;
  if (!postId || !url) {
    throw new Error('Reddit API error: response did not include the submitted post');
  }

  return {
    success: true,
    url,
    analytics: { postId },
  };
}