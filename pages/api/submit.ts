import type { NextApiRequest, NextApiResponse } from 'next'
import { getPoll, savePoll, getSubmission, setSubmission } from '../../lib/store'
import { randomBytes } from 'crypto'

function getIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = getIP(req)
  const { pollId, title, posterUrl } = req.body

  if (!pollId || typeof pollId !== 'string') {
    return res.status(400).json({ error: 'pollId is required' })
  }

  if (!title || typeof title !== 'string' || title.trim().length < 1) {
    return res.status(400).json({ error: 'Movie title is required' })
  }

  if (title.trim().length > 100) {
    return res.status(400).json({ error: 'Title too long' })
  }

  const poll = await getPoll(pollId)
  if (!poll) return res.status(404).json({ error: 'Poll not found' })

  if (!poll.isOpen) {
    return res.status(403).json({ error: 'Voting is closed' })
  }

  const existing = await getSubmission(pollId, ip)
  if (existing) {
    return res.status(409).json({ error: 'You have already submitted a movie this session' })
  }

  const duplicate = poll.movies.find(
    m => m.title.toLowerCase() === title.trim().toLowerCase()
  )
  if (duplicate) {
    return res.status(409).json({ error: 'This movie has already been suggested' })
  }

  const id = randomBytes(6).toString('hex')
  const movie = {
    id,
    title: title.trim(),
    submittedBy: ip.slice(-4),
    votes: 0,
    voters: [],
    submittedAt: Date.now(),
    posterUrl: typeof posterUrl === 'string' ? posterUrl : undefined,
  }

  poll.movies.push(movie)
  await savePoll(poll)
  await setSubmission(pollId, ip, id)

  res.json({ success: true, movie })
}
