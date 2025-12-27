import { xero } from "../../../lib/xero";
import { getXeroToken } from "../../../lib/xeroRedisStore";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { accountId, name } = req.body;

    if (!accountId || !name) {
      return res.status(400).json({
        error: "accountId and name are required",
      });
    }

    // 🔐 Load token from Redis
    const auth = await getXeroToken();
    if (!auth || !auth.accessToken) {
      return res.status(401).json({ error: "Xero not authenticated" });
    }

    // ✅ Apply token to SDK
    xero.setTokenSet({
      access_token: auth.accessToken,
      refresh_token: auth.refreshToken,
      expires_at: auth.expiresAt,
    });

    const tenantId = auth.tenantId;

    // ✅ CORRECT PAYLOAD (THIS WAS THE ISSUE)
    const payload = {
      contacts: [
        {
          name,
          accountNumber: accountId,
          isCustomer: true,
        },
      ],
    };

    const response = await xero.accountingApi.createContacts(
      tenantId,
      payload
    );

    const created = response.body.contacts?.[0];

    return res.json({
      success: true,
      contactId: created.contactID,
      name: created.name,
      accountId: created.accountNumber,
    });
  } catch (err) {
    console.error("XERO CREATE ERROR:", err?.response?.body || err);

    return res.status(500).json({
      error: "Failed to create customer",
      details: err?.response?.body || err.message,
    });
  }
}
