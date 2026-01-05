import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthorizedXero } from "../../../lib/xeroAuthRedis";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { accountId, name } = req.body;

    if (!accountId || !name) {
      return res.status(400).json({
        error: "accountId and name are required",
      });
    }

    const { xero, tenantId } = await getAuthorizedXero();

    /* ================================
       1️⃣ CHECK BY ACCOUNT NUMBER
       ================================ */
    const byAccount = await xero.accountingApi.getContacts(
      tenantId,
      undefined,
      `AccountNumber=="${accountId}"`
    );

    const accountMatches = byAccount.body.contacts || [];

    if (accountMatches.length > 0) {
      const c = accountMatches[0];
      return res.json({
        status: "EXACT_MATCH",
        accountId: c.accountNumber,
        name: c.name,
        contactId: c.contactID,
      });
    }

    /* ================================
       2️⃣ CHECK BY NAME (UNIQUE IN XERO)
       ================================ */
    const safeName = name.replace(/"/g, '\\"');

    const byName = await xero.accountingApi.getContacts(
      tenantId,
      undefined,
      `Name=="${safeName}"`
    );

    const nameMatches = byName.body.contacts || [];

    if (nameMatches.length > 0) {
      const c = nameMatches[0];
      return res.json({
        status: "NAME_CONFLICT",
        name: c.name,
        existingAccountId: c.accountNumber,
        incomingAccountId: accountId,
        contactId: c.contactID,
      });
    }

    /* ================================
       3️⃣ BRAND NEW CUSTOMER
       ================================ */
    return res.json({
      status: "NEW",
      accountId,
      name,
    });

  } catch (err: any) {
    console.error("check-customer error:", err);
    return res.status(500).json({
      error: "Failed to check customer in Xero",
    });
  }
}
