import type { NextApiRequest, NextApiResponse } from 'next'
import { getPoll, getSubmissions, getHostToken, DEFAULT_CONFIG } from '@/lib/store'

function getIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { pollId, hostToken } = req.query

  if (!pollId || typeof pollId !== 'string' || !/^[0-9a-f]{10}$/.test(pollId)) {
    return res.status(400).json({ error: 'Invalid pollId' })
  }

  const poll = await getPoll(pollId)
  if (!poll) return res.status(404).json({ error: 'Poll not found' })

  const ip = getIP(req)
  const [submittedMovieIds, isHostResult] = await Promise.all([
    getSubmissions(pollId, ip),
    (async () => {
      if (!hostToken || typeof hostToken !== 'string') return false
      const storedToken = await getHostToken(pollId)
      return storedToken === hostToken
    })(),
  ])

  const sorted = [...poll.movies].sort((a, b) => b.votes - a.votes)
  const votedMovieIds = sorted.filter(m => m.voters?.includes(ip)).map(m => m.id)
  const config = poll.config ?? DEFAULT_CONFIG

  res.json({
    movies: sorted,
    isOpen: poll.isOpen,
    config,
    hasSubmitted: submittedMovieIds.length > 0,
    submittedMovieIds,
    submittedMovieId: submittedMovieIds[0] ?? null,
    votedMovieIds,
    isHost: isHostResult,
  })
}
