interface LinkedInUserInfo {
  sub?: string;
}

export async function publishToLinkedIn(content: string, accessToken: string) {
  const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'LinkedIn-Version': '202601',
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });

  if (!profileResponse.ok) {
    const error = await profileResponse.text();
    throw new Error(`LinkedIn profile API error: ${error}`);
  }

  const profile = (await profileResponse.json()) as LinkedInUserInfo;
  if (!profile.sub) {
    throw new Error('LinkedIn profile API error: missing member ID');
  }

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202601',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${profile.sub}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn API error: ${error}`);
  }

  const data = await response.json();
  return {
    success: true,
    url: `https://linkedin.com/feed/update/${data.id}`,
    analytics: { postId: data.id },
  };
}