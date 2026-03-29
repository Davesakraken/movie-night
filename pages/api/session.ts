import type { NextApiRequest, NextApiResponse } from 'next'
import { getPoll, getSubmission, getHostToken } from '../../lib/store'

function getIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { pollId, hostToken } = req.query

  if (!pollId || typeof pollId !== 'string') {
    return res.status(400).json({ error: 'pollId is required' })
  }

  const poll = await getPoll(pollId)
  if (!poll) return res.status(404).json({ error: 'Poll not found' })

  const ip = getIP(req)
  const hasSubmitted = await getSubmission(pollId, ip)

  let isHost = false
  if (hostToken && typeof hostToken === 'string') {
    const storedToken = await getHostToken(pollId)
    isHost = storedToken === hostToken
  }

  const sorted = [...poll.movies].sort((a, b) => b.votes - a.votes)

  res.json({
    movies: sorted,
    isOpen: poll.isOpen,
    hasSubmitted: !!hasSubmitted,
    submittedMovieId: hasSubmitted || null,
    isHost,
  })
}
