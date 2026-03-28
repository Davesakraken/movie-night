import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { title } = req.query
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'title required' })
  }

  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    return res.json({ poster: null, title: null, year: null })
  }

  const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&api_key=${apiKey}&include_adult=false`
  const response = await fetch(url)
  const data = await response.json()

  const movie = data.results?.[0]
  if (!movie) {
    return res.json({ poster: null, title: null, year: null })
  }

  return res.json({
    poster: movie.poster_path
      ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
      : null,
    title: movie.title || null,
    year: movie.release_date ? movie.release_date.slice(0, 4) : null,
  })
}
