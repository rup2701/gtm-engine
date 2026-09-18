export default async function refreshTwitterToken(refreshToken: string) {
  // Twitter requires Basic Auth credentials for confidential clients
  const credentials = Buffer.from(
    `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch("https://api.twitter.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      client_id: process.env.TWITTER_CLIENT_ID!,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to refresh Twitter token: ${errorData}`);
  }

  return response.json(); // Returns: { access_token, refresh_token, expires_in, scope }
}
