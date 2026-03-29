import type { NextApiRequest, NextApiResponse } from 'next'
import { getPoll, savePoll, resetPoll, getHostToken } from '../../lib/store'

type AdminAction = 'reset' | 'toggle'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { pollId, hostToken } = req.body
  const action = req.body.action as AdminAction | undefined

  if (!pollId || typeof pollId !== 'string' || !/^[0-9a-f]{10}$/.test(pollId)) {
    return res.status(400).json({ error: 'Invalid pollId' })
  }
  if (!hostToken || typeof hostToken !== 'string') {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (action !== 'reset' && action !== 'toggle') {
    return res.status(400).json({ error: 'Unknown action' })
  }

  if (action === 'reset') {
    const storedToken = await getHostToken(pollId)
    if (!storedToken || storedToken !== hostToken) return res.status(401).json({ error: 'Unauthorized' })
    await resetPoll(pollId)
    return res.json({ success: true, message: 'Poll reset' })
  }

  if (action === 'toggle') {
    const [storedToken, poll] = await Promise.all([getHostToken(pollId), getPoll(pollId)])
    if (!storedToken || storedToken !== hostToken) return res.status(401).json({ error: 'Unauthorized' })
    if (!poll) return res.status(404).json({ error: 'Poll not found' })
    poll.isOpen = !poll.isOpen
    await savePoll(poll)
    return res.json({ success: true, isOpen: poll.isOpen })
  }
}
