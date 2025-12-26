import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const KEY = "xero:auth";

/**
 * Save Xero OAuth token data
 */
export async function saveXeroToken(data: {
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}) {
  await redis.set(KEY, data);
}

/**
 * Get Xero OAuth token data
 */
export async function getXeroToken() {
  return await redis.get<{
    tenantId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }>(KEY);
}
