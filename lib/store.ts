import { kv } from '@vercel/kv'
import { randomBytes } from 'crypto'

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

function pollKey(pollId: string) { return `poll:${pollId}` }
function hostKey(pollId: string) { return `poll:${pollId}:host` }
function subKey(pollId: string, ip: string) { return `poll:${pollId}:sub:${ip}` }

export function generatePollId(): string {
  return randomBytes(5).toString('hex')
}

export function generateHostToken(): string {
  return randomBytes(16).toString('hex')
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

export async function resetPoll(pollId: string): Promise<void> {
  const poll: Poll = { pollId, movies: [], isOpen: true, createdAt: Date.now() }
  // Delete all submission keys for this poll
  const keys = await kv.keys(`poll:${pollId}:sub:*`)
  if (keys.length > 0) await kv.del(...keys)
  await kv.set(pollKey(pollId), poll, { ex: TTL })
}
