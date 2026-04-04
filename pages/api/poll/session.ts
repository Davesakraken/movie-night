import type { NextApiRequest, NextApiResponse } from 'next'
import { getPoll, getSubmissions, getHostToken, DEFAULT_CONFIG } from '@/lib/store'
import { getIP, isValidPollId, verifyAccessToken } from '@/lib/api'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { pollId, hostToken } = req.query

  if (!isValidPollId(pollId)) {
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

  const { password, ...clientConfig } = poll.config ?? DEFAULT_CONFIG
  const passwordProtected = !!password

  // Gate: if password-protected and not the host, require a valid access token
  if (passwordProtected && !isHostResult) {
    const { accessToken } = req.query
    if (!verifyAccessToken(pollId, accessToken)) {
      return res.status(401).json({ passwordProtected: true, isHost: false, stage: poll.stage })
    }
  }

  const sortedAll = [...poll.movies].sort((a, b) => b.votes - a.votes)
  const visibleMovies = (poll.stage === 'submissions' && !isHostResult) ? [] : sortedAll
  const votedMovieIds = sortedAll.filter(m => m.voters?.includes(ip)).map(m => m.id)

  res.json({
    movies: visibleMovies,
    stage: poll.stage,
    config: clientConfig,
    passwordProtected,
    hasSubmitted: submittedMovieIds.length > 0,
    submittedMovieIds,
    submittedMovieId: submittedMovieIds[0] ?? null,
    votedMovieIds,
    isHost: isHostResult,
  })
}
