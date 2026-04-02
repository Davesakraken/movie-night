import type { NextApiRequest, NextApiResponse } from 'next'
import { getPoll, savePoll, resetPoll, deletePoll, getHostToken, DEFAULT_CONFIG, PollConfig } from '@/lib/store'
import { isValidPollId, runWithLock } from '@/lib/api'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { pollId, hostToken } = req.body
  const action: unknown = req.body.action

  if (!isValidPollId(pollId)) return res.status(400).json({ error: 'Invalid pollId' })
  if (!hostToken || typeof hostToken !== 'string') return res.status(401).json({ error: 'Unauthorized' })

  const validActions = ['reset', 'toggle', 'close', 'updateConfig']
  if (!validActions.includes(action as string)) return res.status(400).json({ error: 'Unknown action' })

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

  if (action === 'toggle') {
    await runWithLock(pollId, res, async () => {
      const poll = await getPoll(pollId)
      if (!poll) return { status: 404, body: { error: 'Poll not found' } }
      poll.isOpen = !poll.isOpen
      await savePoll(poll)
      return { status: 200, body: { success: true, isOpen: poll.isOpen } }
    })
    return
  }

  // action === 'updateConfig'
  await runWithLock(pollId, res, async () => {
    const poll = await getPoll(pollId)
    if (!poll) return { status: 404, body: { error: 'Poll not found' } }

    const incoming = req.body.config
    if (!incoming || typeof incoming !== 'object') {
      return { status: 400, body: { error: 'config object required' } }
    }

    const current = poll.config ?? DEFAULT_CONFIG
    const updated: PollConfig = {
      maxVotesPerUser: parseLimit(incoming.maxVotesPerUser, current.maxVotesPerUser),
      maxSuggestionsPerUser: parseLimit(incoming.maxSuggestionsPerUser, current.maxSuggestionsPerUser),
      allowRemoval: typeof incoming.allowRemoval === 'boolean' ? incoming.allowRemoval : current.allowRemoval,
      removalWindowMinutes: parseLimit(incoming.removalWindowMinutes, current.removalWindowMinutes),
    }

    poll.config = updated
    await savePoll(poll)
    return { status: 200, body: { success: true, config: updated } }
  })
}

/** Accepts a positive integer or null (unlimited); falls back to `fallback` if invalid. */
function parseLimit(val: unknown, fallback: number | null): number | null {
  if (val === null) return null
  if (typeof val === 'number' && Number.isInteger(val) && val >= 1) return val
  return fallback
}
