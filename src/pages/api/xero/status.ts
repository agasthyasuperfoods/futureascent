// src/pages/api/xero/status.js
import { getXeroToken } from "../../../lib/xeroRedisStore";

export default async function handler(req, res) {
  try {
    const auth = await getXeroToken();
    const accessToken = auth?.accessToken;
    const tenantId = auth?.tenantId;
    const expiresAt = auth?.expiresAt;

    // ❌ Missing data
    if (!accessToken || !tenantId || !expiresAt) {
      return res.json({ connected: false });
    }

    // ❌ Token expired
    if (Date.now() > Number(expiresAt)) {
      return res.json({ connected: false });
    }

    // ✅ Token valid
    return res.json({ connected: true });

  } catch (error) {
    console.error("Xero status error:", error);
    return res.json({ connected: false });
  }
}
