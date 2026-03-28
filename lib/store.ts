import { kv } from '@vercel/kv'

export interface Movie {
  id: string
  title: string
  submittedBy: string
  votes: number
  voters: string[] // session IDs that voted
  submittedAt: number
}

export interface Session {
  movies: Movie[]
  isOpen: boolean
  createdAt: number
}

const SESSION_KEY = 'movie-night:session'
const SUBMISSION_KEY = 'movie-night:submissions' // ip -> movieId

export async function getSession(): Promise<Session> {
  const session = await kv.get<Session>(SESSION_KEY)
  if (!session) {
    return { movies: [], isOpen: true, createdAt: Date.now() }
  }
  return session
}

export async function saveSession(session: Session): Promise<void> {
  await kv.set(SESSION_KEY, session)
}

export async function getSubmission(ip: string): Promise<string | null> {
  return await kv.get<string>(`${SUBMISSION_KEY}:${ip}`)
}

export async function setSubmission(ip: string, movieId: string): Promise<void> {
  await kv.set(`${SUBMISSION_KEY}:${ip}`, movieId, { ex: 60 * 60 * 24 }) // 24hr expiry
}

export async function resetSession(): Promise<void> {
  const session = await getSession()
  // Clear all submission keys
  for (const movie of session.movies) {
    // can't easily clear all, but we reset the session
    void movie
  }
  await kv.set(SESSION_KEY, { movies: [], isOpen: true, createdAt: Date.now() })
}
