import type { NextApiRequest, NextApiResponse } from "next";
import { createHmac, timingSafeEqual } from "crypto";
import { withPollLock } from "./store";

export type ApiResult = { status: number; body: Record<string, unknown> };

export function isValidPollId(pollId: unknown): pollId is string {
  return typeof pollId === "string" && /^[0-9a-f]{10}$/.test(pollId);
}

export function getIP(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

const ACCESS_SECRET = process.env.POLL_ACCESS_SECRET!

function hmac(data: string): string {
  return createHmac("sha256", ACCESS_SECRET).update(data).digest("hex")
}

/** Returns a signed access token for the given pollId. */
export function signAccessToken(pollId: string): string {
  const payload = `${pollId}:${Math.floor(Date.now() / 1000)}`
  return `${payload}.${hmac(payload)}`
}

/** Returns true if the token is a valid signature for this pollId. */
export function verifyAccessToken(pollId: string, token: unknown): boolean {
  if (typeof token !== "string") return false
  const dot = token.lastIndexOf(".")
  if (dot === -1) return false
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!payload.startsWith(`${pollId}:`)) return false
  try {
    const expected = hmac(payload)
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))
  } catch {
    return false
  }
}

export async function runWithLock(
  pollId: string,
  res: NextApiResponse,
  fn: () => Promise<ApiResult>,
): Promise<void> {
  const result = await withPollLock<ApiResult>(pollId, fn);
  if (result === null) {
    res.status(429).json({ error: "Too many concurrent requests, try again" });
    return;
  }
  res.status(result.status).json(result.body);
}
