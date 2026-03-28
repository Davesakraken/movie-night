import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession, getSubmission } from '../../lib/store'

function getIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const ip = getIP(req)
  const session = await getSession()
  const hasSubmitted = await getSubmission(ip)

  // Sort movies by votes desc
  const sorted = [...session.movies].sort((a, b) => b.votes - a.votes)

  res.json({
    movies: sorted,
    isOpen: session.isOpen,
    hasSubmitted: !!hasSubmitted,
    submittedMovieId: hasSubmitted || null,
  })
}
