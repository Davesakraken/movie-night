import type { NextApiRequest, NextApiResponse } from 'next'
import { getPoll, savePoll, getSubmissions, removeSubmission, DEFAULT_CONFIG } from '@/lib/store'
import { getIP, isValidPollId, runWithLock } from '@/lib/api'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = getIP(req)
  const { pollId, movieId } = req.body

  if (!isValidPollId(pollId)) return res.status(400).json({ error: 'Invalid pollId' })
  if (!movieId || typeof movieId !== 'string') return res.status(400).json({ error: 'movieId required' })

  await runWithLock(pollId, res, async () => {
    const [poll, submissions] = await Promise.all([getPoll(pollId), getSubmissions(pollId, ip)])

    if (!poll) return { status: 404, body: { error: 'Poll not found' } }

    const config = poll.config ?? DEFAULT_CONFIG

    if (!config.allowRemoval) {
      return { status: 403, body: { error: 'Removal is not enabled for this poll' } }
    }

    if (!submissions.includes(movieId)) {
      return { status: 403, body: { error: 'You did not submit this movie' } }
    }

    const movie = poll.movies.find(m => m.id === movieId)
    if (!movie) return { status: 404, body: { error: 'Movie not found' } }

    if (config.removalWindowMinutes !== null) {
      const windowMs = config.removalWindowMinutes * 60 * 1000
      const windowStart = Math.max(movie.submittedAt, config.removalEnabledAt ?? 0)
      if (Date.now() - windowStart > windowMs) {
        return { status: 403, body: { error: 'Removal window has expired' } }
      }
    }

    poll.movies = poll.movies.filter(m => m.id !== movieId)
    await Promise.all([savePoll(poll), removeSubmission(pollId, ip, movieId)])

    return { status: 200, body: { success: true } }
  })
}
