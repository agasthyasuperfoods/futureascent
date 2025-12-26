import { xero } from "./xero";
import { getXeroToken, saveXeroToken } from "./xeroRedisStore";

export async function getAuthorizedXero() {
  await xero.initialize();

  const data = await getXeroToken();
  if (!data) {
    throw new Error("Xero not connected");
  }

  const now = Date.now();

  // 🔄 Refresh token if expired
  if (data.expiresAt <= now) {
    const newToken = await xero.refreshToken();

    const expiresAt =
      Date.now() + newToken.expires_in * 1000;

    await saveXeroToken({
      tenantId: data.tenantId,
      accessToken: newToken.access_token!,
      refreshToken: newToken.refresh_token!,
      expiresAt,
    });

    await xero.setTokenSet(newToken);

    return {
      xero,
      tenantId: data.tenantId,
    };
  }

  // Token still valid
  await xero.setTokenSet({
    access_token: data.accessToken,
    refresh_token: data.refreshToken,
    token_type: "Bearer",
    expires_in: 0,
  } as any);

  return {
    xero,
    tenantId: data.tenantId,
  };
}
