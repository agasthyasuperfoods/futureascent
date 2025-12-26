// src/lib/xero.ts
import { XeroClient } from "xero-node";

export const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID!,
  clientSecret: process.env.XERO_CLIENT_SECRET!,
  redirectUris: [process.env.XERO_REDIRECT_URI!],
  scopes: [
    "openid",
    "profile",
    "email",
    "accounting.contacts.read",
    "accounting.settings.read", // 🔑 REQUIRED (IMPORTANT)
    "offline_access",
  ],
});
