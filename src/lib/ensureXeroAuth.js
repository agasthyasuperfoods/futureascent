    // src/lib/ensureXeroAuth.js
import { xero } from "./xero";
import { getXeroToken, saveXeroToken } from "./xeroRedisStore";

export async function ensureXeroAuth() {
  const data = await getXeroToken();
  const accessToken = data?.accessToken;
  const refreshToken = data?.refreshToken;
  const expiresAt = data?.expiresAt;
  const tenantId = data?.tenantId;

  // ❌ Never connected
  if (!accessToken || !refreshToken || !tenantId) {
    throw new Error("Xero not connected");
  }

  // ⏳ Token expired → refresh silently
  if (expiresAt && Date.now() > Number(expiresAt)) {
    const newTokenSet = await xero.refreshToken(refreshToken);

    const newExpiresAt = Date.now() + newTokenSet.expires_in * 1000;
    await saveXeroToken({
      tenantId,
      accessToken: newTokenSet.access_token,
      refreshToken: newTokenSet.refresh_token,
      expiresAt: newExpiresAt,
    });

    await xero.setTokenSet(newTokenSet);
    return;
  }

  // ✅ Token still valid
  await xero.setTokenSet({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(Number(expiresAt) / 1000),
    token_type: "Bearer",
  });
}
