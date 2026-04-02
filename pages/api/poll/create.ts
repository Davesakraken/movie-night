import type { NextApiRequest, NextApiResponse } from 'next'
import { createPoll } from '@/lib/store'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { pollId, hostToken } = await createPoll()
  res.json({ pollId, hostToken })
}
