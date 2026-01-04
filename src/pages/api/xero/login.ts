import type { NextApiRequest, NextApiResponse } from "next";
import { xero } from "../../../lib/xero";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await xero.initialize();

  const { returnTo } = req.query;

  // 🔐 Encode return path
  const state = Buffer.from(
    JSON.stringify({
      returnTo: returnTo || "/Createcustomers",
    })
  ).toString("base64");

  // ✅ Inject state into OpenID client (THIS IS THE KEY)
  const consentUrl = xero.openIdClient.authorizationUrl({
    scope: xero.config.scopes.join(" "),
    state,
    redirect_uri: process.env.XERO_REDIRECT_URI!,
  });

  res.redirect(consentUrl);
}
