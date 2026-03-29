import type { NextApiRequest, NextApiResponse } from 'next'
import { getPoll, savePoll, resetPoll, getHostToken } from '../../lib/store'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { action, pollId, hostToken } = req.body

  if (!pollId || typeof pollId !== 'string') {
    return res.status(400).json({ error: 'pollId is required' })
  }

  if (!hostToken || typeof hostToken !== 'string') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const storedToken = await getHostToken(pollId)
  if (!storedToken || storedToken !== hostToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (action === 'reset') {
    await resetPoll(pollId)
    return res.json({ success: true, message: 'Poll reset' })
  }

  if (action === 'toggle') {
    const poll = await getPoll(pollId)
    if (!poll) return res.status(404).json({ error: 'Poll not found' })
    poll.isOpen = !poll.isOpen
    await savePoll(poll)
    return res.json({ success: true, isOpen: poll.isOpen })
  }

  res.status(400).json({ error: 'Unknown action' })
}
