
// lib/publishers/linkedin.ts
export async function publishToLinkedIn(content: string, accessToken: string) {
  // First get the user's person ID
  const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const profile = await profileRes.json();

  // Then publish
  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      author: `urn:li:person:${profile.sub}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    })
  });

  if (!response.ok) {
    throw new Error('LinkedIn API error');
  }

  const data = await response.json();
  return {
    success: true,
    url: `https://linkedin.com/feed/update/${data.id}`,
    analytics: { postId: data.id }
  };
}
