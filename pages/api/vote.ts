import type { NextApiRequest, NextApiResponse } from 'next'
import { getPoll, savePoll } from '../../lib/store'
import { getIP, isValidPollId, runWithLock } from '../../lib/api'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = getIP(req)
  const { pollId, movieId } = req.body

  if (!isValidPollId(pollId)) return res.status(400).json({ error: 'Invalid pollId' })
  if (!movieId) return res.status(400).json({ error: 'movieId required' })

  await runWithLock(pollId, res, async () => {
    const poll = await getPoll(pollId)
    if (!poll) return { status: 404, body: { error: 'Poll not found' } }
    if (!poll.isOpen) return { status: 403, body: { error: 'Voting is closed' } }

    const movie = poll.movies.find(m => m.id === movieId)
    if (!movie) return { status: 404, body: { error: 'Movie not found' } }

    if (movie.voters.includes(ip)) {
      movie.voters = movie.voters.filter(v => v !== ip)
    } else {
      for (const m of poll.movies) {
        if (m !== movie && m.voters.includes(ip)) {
          m.voters = m.voters.filter(v => v !== ip)
          m.votes = m.voters.length
        }
      }
      movie.voters.push(ip)
    }
    movie.votes = movie.voters.length

    await savePoll(poll)
    return { status: 200, body: { success: true, votes: movie.votes } }
  })
}
