// src/pages/api/xero/login.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { xero } from "../../../lib/xero";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await xero.initialize();
  const consentUrl = await xero.buildConsentUrl();
  res.redirect(consentUrl);
}
