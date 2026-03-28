import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession, saveSession, getSubmission, setSubmission } from '../../lib/store'
import { randomBytes } from 'crypto'

function getIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = getIP(req)
  const { title, posterUrl } = req.body

  if (!title || typeof title !== 'string' || title.trim().length < 1) {
    return res.status(400).json({ error: 'Movie title is required' })
  }

  if (title.trim().length > 100) {
    return res.status(400).json({ error: 'Title too long' })
  }

  const session = await getSession()

  if (!session.isOpen) {
    return res.status(403).json({ error: 'Voting is closed' })
  }

  const existing = await getSubmission(session.sessionId, ip)
  if (existing) {
    return res.status(409).json({ error: 'You have already submitted a movie this session' })
  }

  // Check for duplicate title (case-insensitive)
  const duplicate = session.movies.find(
    m => m.title.toLowerCase() === title.trim().toLowerCase()
  )
  if (duplicate) {
    return res.status(409).json({ error: 'This movie has already been suggested' })
  }

  const id = randomBytes(6).toString('hex')
  const movie = {
    id,
    title: title.trim(),
    submittedBy: ip.slice(-4), // just last 4 chars of IP for anonymity
    votes: 0,
    voters: [],
    submittedAt: Date.now(),
    posterUrl: typeof posterUrl === 'string' ? posterUrl : undefined,
  }

  session.movies.push(movie)
  await saveSession(session)
  await setSubmission(session.sessionId, ip, id)

  res.json({ success: true, movie })
}
