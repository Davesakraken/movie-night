import type { NextApiRequest, NextApiResponse } from 'next'
import { withPollLock } from './store'

export type ApiResult = { status: number; body: Record<string, unknown> }

export function getIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}

export async function runWithLock(
  pollId: string,
  res: NextApiResponse,
  fn: () => Promise<ApiResult>
): Promise<void> {
  const result = await withPollLock<ApiResult>(pollId, fn)
  if (result === null) {
    res.status(429).json({ error: 'Too many concurrent requests, try again' })
    return
  }
  res.status(result.status).json(result.body)
}
