import type { NextApiRequest, NextApiResponse } from 'next'
import { getPoll, savePoll, addSubmission, getSubmissions, generateMovieId, DEFAULT_CONFIG } from '@/lib/store'
import { getIP, isValidPollId, runWithLock } from '@/lib/api'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = getIP(req)
  const { pollId, title, posterUrl } = req.body

  if (!isValidPollId(pollId)) return res.status(400).json({ error: 'Invalid pollId' })
  if (!title || typeof title !== 'string' || title.trim().length < 1) {
    return res.status(400).json({ error: 'Movie title is required' })
  }
  if (title.trim().length > 100) {
    return res.status(400).json({ error: 'Title too long' })
  }

  const safePosterUrl =
    typeof posterUrl === 'string' && /^https?:\/\//i.test(posterUrl)
      ? posterUrl
      : undefined

  await runWithLock(pollId, res, async () => {
    const [poll, submissions] = await Promise.all([getPoll(pollId), getSubmissions(pollId, ip)])
    if (!poll) return { status: 404, body: { error: 'Poll not found' } }
    if (poll.stage !== 'submissions') return { status: 403, body: { error: 'Submissions are closed' } }

    const config = poll.config ?? DEFAULT_CONFIG
    const max = config.maxSuggestionsPerUser
    if (max !== null && submissions.length >= max) {
      return {
        status: 409,
        body: {
          error: max === 1
            ? 'You have already submitted a movie this session'
            : `You have reached the maximum of ${max} suggestion${max === 1 ? '' : 's'}`,
        },
      }
    }

    const duplicate = poll.movies.find(
      m => m.title.toLowerCase() === title.trim().toLowerCase()
    )
    if (duplicate) return { status: 409, body: { error: 'This movie has already been suggested' } }

    const movie = {
      id: generateMovieId(),
      title: title.trim(),
      submittedBy: ip.slice(-4),
      votes: 0,
      voters: [],
      submittedAt: Date.now(),
      posterUrl: safePosterUrl,
    }

    poll.movies.push(movie)
    await Promise.all([savePoll(poll), addSubmission(pollId, ip, movie.id)])
    return { status: 200, body: { success: true, movie } }
  })
}
