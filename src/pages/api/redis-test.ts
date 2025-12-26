import type { NextApiRequest, NextApiResponse } from "next";
import { redis } from "../../lib/xeroRedisStore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await redis.set("healthcheck", "ok");
  const value = await redis.get("healthcheck");
  res.json({ redis: value });
}
