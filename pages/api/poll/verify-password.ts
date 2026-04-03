import type { NextApiRequest, NextApiResponse } from 'next'
import { getPoll } from '@/lib/store'
import { isValidPollId, signAccessToken } from '@/lib/api'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { pollId, password } = req.body

  if (!isValidPollId(pollId)) return res.status(400).json({ error: 'Invalid pollId' })
  if (!password || typeof password !== 'string') return res.status(400).json({ error: 'Password required' })

  const poll = await getPoll(pollId)
  if (!poll) return res.status(404).json({ error: 'Poll not found' })

  const stored = poll.config?.password
  if (!stored) return res.status(200).json({ success: true })

  if (password.trim() === stored) {
    const accessToken = signAccessToken(pollId)
    return res.status(200).json({ success: true, accessToken })
  }

  return res.status(401).json({ error: 'Incorrect password' })
}
