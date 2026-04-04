import type { NextApiRequest, NextApiResponse } from 'next'
import { getPoll, savePoll, DEFAULT_CONFIG } from '@/lib/store'
import { getIP, isValidPollId, runWithLock } from '@/lib/api'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = getIP(req)
  const { pollId, movieId } = req.body

  if (!isValidPollId(pollId)) return res.status(400).json({ error: 'Invalid pollId' })
  if (!movieId) return res.status(400).json({ error: 'movieId required' })

  await runWithLock(pollId, res, async () => {
    const poll = await getPoll(pollId)
    if (!poll) return { status: 404, body: { error: 'Poll not found' } }
    if (poll.stage !== 'voting') return { status: 403, body: { error: 'Voting is not open' } }

    const movie = poll.movies.find(m => m.id === movieId)
    if (!movie) return { status: 404, body: { error: 'Movie not found' } }

    const config = poll.config ?? DEFAULT_CONFIG
    const maxVotes = config.maxVotesPerUser

    if (movie.voters.includes(ip)) {
      // Toggle off — always allowed
      movie.voters = movie.voters.filter(v => v !== ip)
    } else {
      const currentCount = poll.movies.filter(m => m.voters.includes(ip)).length

      if (maxVotes !== null && currentCount >= maxVotes) {
        if (maxVotes === 1) {
          // Single-vote mode: move the vote instead of rejecting
          for (const m of poll.movies) {
            if (m !== movie && m.voters.includes(ip)) {
              m.voters = m.voters.filter(v => v !== ip)
              m.votes = m.voters.length
            }
          }
        } else {
          return {
            status: 409,
            body: { error: `You can only vote for ${maxVotes} film${maxVotes === 1 ? '' : 's'}` },
          }
        }
      }

      movie.voters.push(ip)
    }
    movie.votes = movie.voters.length

    await savePoll(poll)
    return { status: 200, body: { success: true, votes: movie.votes } }
  })
}
