// src/pages/api/xero/status.js
import { redis } from "../../../lib/xeroRedisStore";

export default async function handler(req, res) {
  try {
    const accessToken = await redis.get("xero:access_token");
    const tenantId = await redis.get("xero:tenant_id");
    const expiresAt = await redis.get("xero:expires_at");

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
