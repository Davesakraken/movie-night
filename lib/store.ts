import { kv } from '@vercel/kv'

export interface Movie {
  id: string
  title: string
  submittedBy: string
  votes: number
  voters: string[] // session IDs that voted
  submittedAt: number
  posterUrl?: string
}

export interface Session {
  movies: Movie[]
  isOpen: boolean
  createdAt: number
  sessionId: string
}

const SESSION_KEY = 'movie-night:session'
const SUBMISSION_KEY = 'movie-night:submissions' // sessionId:ip -> movieId

function newSessionId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export async function getSession(): Promise<Session> {
  const session = await kv.get<Session>(SESSION_KEY)
  if (!session) {
    return { movies: [], isOpen: true, createdAt: Date.now(), sessionId: newSessionId() }
  }
  if (!session.sessionId) session.sessionId = newSessionId()
  return session
}

export async function saveSession(session: Session): Promise<void> {
  await kv.set(SESSION_KEY, session)
}

export async function getSubmission(sessionId: string, ip: string): Promise<string | null> {
  return await kv.get<string>(`${SUBMISSION_KEY}:${sessionId}:${ip}`)
}

export async function setSubmission(sessionId: string, ip: string, movieId: string): Promise<void> {
  await kv.set(`${SUBMISSION_KEY}:${sessionId}:${ip}`, movieId, { ex: 60 * 60 * 24 }) // 24hr expiry
}

export async function resetSession(): Promise<void> {
  const session = await getSession()
  const keys = await kv.keys(`${SUBMISSION_KEY}:${session.sessionId}:*`)
  if (keys.length > 0) await kv.del(...keys)
  await kv.set(SESSION_KEY, { movies: [], isOpen: true, createdAt: Date.now(), sessionId: newSessionId() })
}
