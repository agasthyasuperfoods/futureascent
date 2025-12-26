import { TokenSet } from "xero-node";

let tokenSet: TokenSet | null = null;

export function saveToken(token: TokenSet) {
  console.log("✅ SAVING TOKEN");
  tokenSet = token;
}

export function getToken() {
  console.log("🔍 GET TOKEN:", tokenSet ? "FOUND" : "MISSING");
  return tokenSet;
}
