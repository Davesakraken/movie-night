import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession, saveSession } from '../../lib/store'

function getIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = getIP(req)
  const { movieId } = req.body

  if (!movieId) return res.status(400).json({ error: 'movieId required' })

  const session = await getSession()

  if (!session.isOpen) {
    return res.status(403).json({ error: 'Voting is closed' })
  }

  const movie = session.movies.find(m => m.id === movieId)
  if (!movie) return res.status(404).json({ error: 'Movie not found' })

  if (movie.voters.includes(ip)) {
    // Toggle vote off
    movie.voters = movie.voters.filter(v => v !== ip)
    movie.votes = Math.max(0, movie.votes - 1)
  } else {
    // Remove vote from any other movie first (one vote per person)
    for (const m of session.movies) {
      if (m.voters.includes(ip)) {
        m.voters = m.voters.filter(v => v !== ip)
        m.votes = Math.max(0, m.votes - 1)
      }
    }
    movie.voters.push(ip)
    movie.votes += 1
  }

  await saveSession(session)
  res.json({ success: true, votes: movie.votes })
}
