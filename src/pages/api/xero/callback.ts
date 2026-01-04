import type { NextApiRequest, NextApiResponse } from "next";
import { xero } from "../../../lib/xero";
import { saveXeroToken } from "../../../lib/xeroRedisStore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await xero.initialize();

    // 1️⃣ Extract callback params safely
    const params = xero.openIdClient.callbackParams(req);

    // 2️⃣ Decode state manually
    let redirectTo = "/Createcustomers";
    let stateValue: string | undefined;

    if (params.state) {
      stateValue = params.state as string;
      const decoded = JSON.parse(
        Buffer.from(stateValue, "base64").toString("utf-8")
      );
      redirectTo = decoded.returnTo || redirectTo;
    }

    // 3️⃣ Complete OAuth flow (THIS FIXES THE ERROR)
    const tokenSet = await xero.openIdClient.callback(
      process.env.XERO_REDIRECT_URI!,
      params,
      { state: stateValue }
    );

    await xero.setTokenSet(tokenSet);

    // 4️⃣ Load tenant
    const tenants = await xero.updateTenants();
    if (!tenants || tenants.length === 0) {
      throw new Error("No Xero tenants found");
    }

    const tenantId = tenants[0].tenantId;

    // 5️⃣ Save tokens
    await saveXeroToken({
      tenantId,
      accessToken: tokenSet.access_token!,
      refreshToken: tokenSet.refresh_token!,
      expiresAt: Date.now() + tokenSet.expires_in * 1000,
    });

    // ✅ FINAL REDIRECT
    res.redirect(redirectTo);

  } catch (error) {
    console.error("❌ Xero callback error:", error);
    res.redirect("/Createcustomers?xero=error");
  }
}
