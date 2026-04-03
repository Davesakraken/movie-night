import { Redis } from "@upstash/redis";
import { randomBytes } from "crypto";
import type { PollConfig, Poll, StoredMovie } from "@/lib/types";

export type { PollConfig, Poll, StoredMovie };

const kv = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export const DEFAULT_CONFIG: PollConfig = {
  maxVotesPerUser: 1,
  maxSuggestionsPerUser: 1,
  allowRemoval: false,
  removalWindowMinutes: null,
  removalEnabledAt: null,
  password: null,
};

const TTL = 60 * 60 * 24; // 24 hours
const LOCK_TTL = 5; // seconds

const CAS_DELETE_SCRIPT = `if redis.call("get",KEYS[1])==ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end`;

function pollKey(pollId: string) {
  return `poll:${pollId}`;
}
function hostKey(pollId: string) {
  return `poll:${pollId}:host`;
}
function subKey(pollId: string, ip: string) {
  return `poll:${pollId}:sub:${ip}`;
}
function lockKey(pollId: string) {
  return `poll:${pollId}:lock`;
}

function generateToken(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

export function generatePollId(): string {
  return generateToken(5);
}
export function generateHostToken(): string {
  return generateToken(16);
}
export function generateMovieId(): string {
  return generateToken(6);
}

export async function withPollLock<T>(pollId: string, fn: () => Promise<T>): Promise<T | null> {
  const key = lockKey(pollId);
  const token = generateToken(8);
  const acquired = await kv.set(key, token, { nx: true, ex: LOCK_TTL });
  if (!acquired) return null;
  try {
    return await fn();
  } finally {
    await kv.eval(CAS_DELETE_SCRIPT, [key], [token]);
  }
}

export async function createPoll(): Promise<{ pollId: string; hostToken: string }> {
  const pollId = generatePollId();
  const hostToken = generateHostToken();
  const poll: Poll = {
    pollId,
    movies: [],
    isOpen: true,
    createdAt: Date.now(),
    config: { ...DEFAULT_CONFIG },
  };
  await Promise.all([
    kv.set(pollKey(pollId), poll, { ex: TTL }),
    kv.set(hostKey(pollId), hostToken, { ex: TTL }),
  ]);
  return { pollId, hostToken };
}

export async function getPoll(pollId: string): Promise<Poll | null> {
  return await kv.get<Poll>(pollKey(pollId));
}

export async function savePoll(poll: Poll): Promise<void> {
  await kv.set(pollKey(poll.pollId), poll, { ex: TTL });
}

export async function getHostToken(pollId: string): Promise<string | null> {
  return await kv.get<string>(hostKey(pollId));
}

/**
 * Returns the list of movieIds the given IP has submitted to this poll.
 * Handles both the legacy single-string format and the current array format.
 */
export async function getSubmissions(pollId: string, ip: string): Promise<string[]> {
  const val = await kv.get<string | string[]>(subKey(pollId, ip));
  if (!val) return [];
  if (typeof val === "string") return [val];
  return val;
}

export async function addSubmission(pollId: string, ip: string, movieId: string): Promise<void> {
  const existing = await getSubmissions(pollId, ip);
  await kv.set(subKey(pollId, ip), [...existing, movieId], { ex: TTL });
}

export async function removeSubmission(pollId: string, ip: string, movieId: string): Promise<void> {
  const existing = await getSubmissions(pollId, ip);
  const updated = existing.filter((id) => id !== movieId);
  if (updated.length === 0) {
    await kv.del(subKey(pollId, ip));
  } else {
    await kv.set(subKey(pollId, ip), updated, { ex: TTL });
  }
}

export async function deletePoll(pollId: string): Promise<void> {
  const subPattern = subKey(pollId, "*");
  let cursor = "0";
  do {
    const [next, keys] = await kv.scan(cursor, { match: subPattern, count: 100 });
    if (keys.length > 0) await kv.del(...keys);
    cursor = String(next);
  } while (cursor !== "0");
  await kv.del(pollKey(pollId), hostKey(pollId));
}

export async function resetPoll(pollId: string): Promise<void> {
  const existing = await getPoll(pollId);
  const poll: Poll = {
    pollId,
    movies: [],
    isOpen: true,
    createdAt: Date.now(),
    config: existing?.config ?? { ...DEFAULT_CONFIG },
  };
  const pattern = subKey(pollId, "*");
  let cursor = "0";
  do {
    const [next, keys] = await kv.scan(cursor, { match: pattern, count: 100 });
    if (keys.length > 0) await kv.del(...keys);
    cursor = String(next);
  } while (cursor !== "0");
  await kv.set(pollKey(pollId), poll, { ex: TTL });
}
