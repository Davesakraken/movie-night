# 🎬 Movie Night Voting

A live voting app for movie night. Each person gets one suggestion per session, and anyone can vote. The host can open/close voting and reset the session from the admin panel.

---

## Deploy to Vercel (5 minutes)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "movie night voting app"
gh repo create movie-night --public --push
# or push to an existing repo
```

### 2. Create Vercel KV Store

1. Go to [vercel.com](https://vercel.com) and create a new project from your repo
2. Before deploying, go to **Storage** → **Create KV Database**
3. Name it `movie-night` and click Create
4. Click **Connect to Project** and select your project

### 3. Set Environment Variables

In your Vercel project settings → Environment Variables, add:

| Key | Value |
|-----|-------|
| `ADMIN_KEY` | A secret password for the host panel (e.g. `popcorn2024`) |

The KV variables (`KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`) are added automatically when you connect the KV store.

### 4. Deploy

Click **Deploy**. That's it!

---

## Usage

- **Voting page**: `https://your-app.vercel.app/`
- **Admin panel**: `https://your-app.vercel.app/admin`

### Features
- One movie suggestion per IP per session
- One vote per person (click again to unvote)
- Live updates every 3 seconds
- Host can open/close voting and reset the session
- Leaderboard with vote progress bars

---

## Local Development

```bash
npm install
```

Set up a local `.env.local`:
```
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
ADMIN_KEY=anything
```

```bash
npm run dev
```
