import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthorizedXero } from "../../../lib/xeroAuthRedis";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { customerId } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: "customerId required" });
    }

    const { xero, tenantId } =
      await getAuthorizedXero();

    const response = await xero.accountingApi.getContacts(
      tenantId,
      undefined,
      `AccountNumber=="${customerId}"`
    );

    const contacts = response.body.contacts || [];

    return res.json({
      exists: contacts.length > 0,
      name: contacts[0]?.name,
      contactId: contacts[0]?.contactID,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
