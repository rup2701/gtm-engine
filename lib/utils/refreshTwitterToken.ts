export default async function refreshTwitterToken(refreshToken: string) {
  // Twitter requires Basic Auth credentials for confidential clients
  const credentials = Buffer.from(
    `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
  ).toString("base64");

  // https://api.twitter.com/oauth2/token (no /2/) is X's legacy v1.1
  // app-only bearer endpoint — it only accepts grant_type=client_credentials
  // and rejects refresh_token requests. The v2 OAuth2 endpoint below is the
  // one that actually understands refresh_token grants.
  const response = await fetch("https://api.x.com/2/oauth2/token", {
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
