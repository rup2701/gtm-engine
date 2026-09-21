interface LinkedInUserInfo {
  sub?: string;
}

export async function publishToLinkedIn(
  content: string,
  accessToken: string,
  personId?: string,
) {
  let resolvedPersonId = personId;

  if (!resolvedPersonId) {
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
    resolvedPersonId = profile.sub;
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
      author: `urn:li:person:${resolvedPersonId}`,
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
    analytics: {
      postId: data.id,
      linkedinPersonId: resolvedPersonId
    },
  };
}

// Fetch engagement metrics for a published member post.
// Member-level analytics expose social actions (likes/comments) only;
// impressions require organization pages (w_organization_social).
export async function fetchLinkedInMetrics(
  postUrn: string,
  accessToken: string,
): Promise<{ likes: number; comments: number } | null> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'LinkedIn-Version': '202601',
    'X-Restli-Protocol-Version': '2.0.0',
  };

  const encodedUrn = encodeURIComponent(postUrn);

  const [likesRes, commentsRes] = await Promise.all([
    fetch(`https://api.linkedin.com/v2/socialActions/${encodedUrn}/likes?count=0`, { headers }),
    fetch(`https://api.linkedin.com/v2/socialActions/${encodedUrn}/comments?count=0`, { headers }),
  ]);

  if (!likesRes.ok || !commentsRes.ok) {
    return null;
  }

  const likesJson = await likesRes.json();
  const commentsJson = await commentsRes.json();

  return {
    likes: likesJson?.paging?.total ?? 0,
    comments: commentsJson?.paging?.total ?? 0,
  };
}