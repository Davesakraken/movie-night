import type { NextApiRequest, NextApiResponse } from 'next'
import { getPoll, savePoll, getSubmission, setSubmission, generateMovieId } from '../../lib/store'
import { getIP, isValidPollId, runWithLock } from '../../lib/api'

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
    const [poll, existing] = await Promise.all([getPoll(pollId), getSubmission(pollId, ip)])
    if (!poll) return { status: 404, body: { error: 'Poll not found' } }
    if (!poll.isOpen) return { status: 403, body: { error: 'Voting is closed' } }
    if (existing) return { status: 409, body: { error: 'You have already submitted a movie this session' } }

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
    await Promise.all([savePoll(poll), setSubmission(pollId, ip, movie.id)])
    return { status: 200, body: { success: true, movie } }
  })
}
