import type { NextApiRequest, NextApiResponse } from 'next'
import { getPoll, savePoll, resetPoll, deletePoll, getHostToken } from '../../lib/store'
import { isValidPollId, runWithLock } from '../../lib/api'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { pollId, hostToken } = req.body
  const action: unknown = req.body.action

  if (!isValidPollId(pollId)) return res.status(400).json({ error: 'Invalid pollId' })
  if (!hostToken || typeof hostToken !== 'string') return res.status(401).json({ error: 'Unauthorized' })
  if (action !== 'reset' && action !== 'toggle' && action !== 'close') return res.status(400).json({ error: 'Unknown action' })

  const storedToken = await getHostToken(pollId)
  if (!storedToken || storedToken !== hostToken) return res.status(401).json({ error: 'Unauthorized' })

  if (action === 'close') {
    await deletePoll(pollId)
    return res.status(200).json({ success: true, closed: true })
  }

  if (action === 'reset') {
    await runWithLock(pollId, res, async () => {
      await resetPoll(pollId)
      return { status: 200, body: { success: true, message: 'Poll reset' } }
    })
    return
  }

  // action === 'toggle'
  await runWithLock(pollId, res, async () => {
    const poll = await getPoll(pollId)
    if (!poll) return { status: 404, body: { error: 'Poll not found' } }
    poll.isOpen = !poll.isOpen
    await savePoll(poll)
    return { status: 200, body: { success: true, isOpen: poll.isOpen } }
  })
}
