import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession, saveSession, resetSession } from '../../lib/store'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { action, adminKey } = req.body

  // Simple admin key check — set ADMIN_KEY in your Vercel env vars
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (action === 'reset') {
    await resetSession()
    return res.json({ success: true, message: 'Session reset' })
  }

  if (action === 'toggle') {
    const session = await getSession()
    session.isOpen = !session.isOpen
    await saveSession(session)
    return res.json({ success: true, isOpen: session.isOpen })
  }

  res.status(400).json({ error: 'Unknown action' })
}
