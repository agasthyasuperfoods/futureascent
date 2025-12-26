import type { NextApiRequest, NextApiResponse } from "next";
import { xero } from "../../../lib/xero";
import { saveXeroToken } from "../../../lib/xeroRedisStore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await xero.initialize();

  const tokenSet = await xero.apiCallback(req.url!);
  await xero.setTokenSet(tokenSet);

  const tenants = await xero.updateTenants();
  const tenantId = tenants[0].tenantId;

  const expiresAt =
    Date.now() + tokenSet.expires_in * 1000;

  await saveXeroToken({
    tenantId,
    accessToken: tokenSet.access_token!,
    refreshToken: tokenSet.refresh_token!,
    expiresAt,
  });

  res.json({
    message: "✅ Xero connected (Redis)",
    tenantId,
  });
}
