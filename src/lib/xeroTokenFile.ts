import fs from "fs";
import path from "path";

const TOKEN_PATH = path.join(process.cwd(), ".xero-token.json");

export function saveToken(token: any) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
  console.log("💾 TOKEN SAVED TO FILE");
}

export function getToken() {
  if (!fs.existsSync(TOKEN_PATH)) {
    console.log("❌ TOKEN FILE NOT FOUND");
    return null;
  }

  console.log("📂 TOKEN LOADED FROM FILE");
  return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
}
