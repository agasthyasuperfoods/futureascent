    // src/lib/ensureXeroAuth.js
import { xero } from "./xero";
import { redis } from "./xeroRedisStore";

export async function ensureXeroAuth() {
  const accessToken = await redis.get("xero:access_token");
  const refreshToken = await redis.get("xero:refresh_token");
  const expiresAt = await redis.get("xero:expires_at");

  // ❌ Never connected
  if (!accessToken || !refreshToken) {
    throw new Error("Xero not connected");
  }

  // ⏳ Token expired → refresh silently
  if (expiresAt && Date.now() > Number(expiresAt)) {
    const newTokenSet = await xero.refreshToken(refreshToken);

    await redis.set("xero:access_token", newTokenSet.access_token);
    await redis.set("xero:refresh_token", newTokenSet.refresh_token);
    await redis.set(
      "xero:expires_at",
      Date.now() + newTokenSet.expires_in * 1000
    );

    await xero.setTokenSet(newTokenSet);
    return;
  }

  // ✅ Token still valid
  await xero.setTokenSet({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Number(expiresAt),
  });
}
