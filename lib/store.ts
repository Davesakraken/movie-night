import { Redis } from '@upstash/redis'
import { randomBytes } from 'crypto'

const kv = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export interface Movie {
  id: string
  title: string
  submittedBy: string
  votes: number
  voters: string[]
  submittedAt: number
  posterUrl?: string
}

export interface Poll {
  pollId: string
  movies: Movie[]
  isOpen: boolean
  createdAt: number
}

const TTL = 60 * 60 * 24 // 24 hours
const LOCK_TTL = 5 // seconds

const CAS_DELETE_SCRIPT =
  `if redis.call("get",KEYS[1])==ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end`

function pollKey(pollId: string) { return `poll:${pollId}` }
function hostKey(pollId: string) { return `poll:${pollId}:host` }
function subKey(pollId: string, ip: string) { return `poll:${pollId}:sub:${ip}` }
function lockKey(pollId: string) { return `poll:${pollId}:lock` }

function generateToken(bytes: number): string {
  return randomBytes(bytes).toString('hex')
}

export function generatePollId(): string { return generateToken(5) }
export function generateHostToken(): string { return generateToken(16) }
export function generateMovieId(): string { return generateToken(6) }

export async function withPollLock<T>(pollId: string, fn: () => Promise<T>): Promise<T | null> {
  const key = lockKey(pollId)
  const token = generateToken(8)
  const acquired = await kv.set(key, token, { nx: true, ex: LOCK_TTL })
  if (!acquired) return null
  try {
    return await fn()
  } finally {
    await kv.eval(CAS_DELETE_SCRIPT, [key], [token])
  }
}

export async function createPoll(): Promise<{ pollId: string; hostToken: string }> {
  const pollId = generatePollId()
  const hostToken = generateHostToken()
  const poll: Poll = { pollId, movies: [], isOpen: true, createdAt: Date.now() }
  await Promise.all([
    kv.set(pollKey(pollId), poll, { ex: TTL }),
    kv.set(hostKey(pollId), hostToken, { ex: TTL }),
  ])
  return { pollId, hostToken }
}

export async function getPoll(pollId: string): Promise<Poll | null> {
  return await kv.get<Poll>(pollKey(pollId))
}

export async function savePoll(poll: Poll): Promise<void> {
  await kv.set(pollKey(poll.pollId), poll, { ex: TTL })
}

export async function getHostToken(pollId: string): Promise<string | null> {
  return await kv.get<string>(hostKey(pollId))
}

export async function getSubmission(pollId: string, ip: string): Promise<string | null> {
  return await kv.get<string>(subKey(pollId, ip))
}

export async function setSubmission(pollId: string, ip: string, movieId: string): Promise<void> {
  await kv.set(subKey(pollId, ip), movieId, { ex: TTL })
}

export async function deletePoll(pollId: string): Promise<void> {
  const subPattern = subKey(pollId, '*')
  let cursor = '0'
  do {
    const [next, keys] = await kv.scan(cursor, { match: subPattern, count: 100 })
    if (keys.length > 0) await kv.del(...keys)
    cursor = String(next)
  } while (cursor !== '0')
  await kv.del(pollKey(pollId), hostKey(pollId))
}

export async function resetPoll(pollId: string): Promise<void> {
  const poll: Poll = { pollId, movies: [], isOpen: true, createdAt: Date.now() }
  const pattern = subKey(pollId, '*')
  let cursor = '0'
  do {
    const [next, keys] = await kv.scan(cursor, { match: pattern, count: 100 })
    if (keys.length > 0) await kv.del(...keys)
    cursor = String(next)
  } while (cursor !== '0')
  await kv.set(pollKey(pollId), poll, { ex: TTL })
}
