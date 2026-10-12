# Deploying CodePules

Suggested free-tier setup: Postgres on Neon or Render, backend on Render, frontend on Vercel. Check each provider's current limits before relying on them.

## 1. Database
Create a PostgreSQL database and copy its connection string. You will use it as `DATABASE_URL`.

## 2. Backend (Render "Web Service")
- Root directory: `server`
- Build command: `npm install && npm run build`   (runs `prisma generate && prisma db push`)
- Start command: `npm start`
- Environment variables:
  - `DATABASE_URL` from step 1
  - `JWT_SECRET` a long random string (the server refuses to start without it)
  - `ANTHROPIC_API_KEY`, optionally `LLM_MODEL`
  - `CLIENT_ORIGIN` your frontend URL, no trailing slash (set it after step 3)
  - `JUDGE0_URL` and its auth variable (step 4)
- Free instances sleep when idle, so the first request after a pause is slow. Open the site a minute before a demo.
- Live-session timers live in server memory. If the server restarts mid-test, the teacher can still click "End test now".

## 3. Frontend (Vercel)
- Root directory: `client`; framework Vite; build `npm run build`; output `dist`
- Environment variable: `VITE_API_URL` = your backend URL (no trailing slash). Without it the site calls itself and every request fails.
- `client/vercel.json` makes page refreshes work on routes like `/teacher/results/ABC123`.

## 4. Code runner (Judge0), only needed for coding questions
Without it, MCQ, fill-in and short-answer all work; coding questions show "Code runner is not set up".
- **Local testing:** run Judge0 CE with Docker by following the official instructions at https://github.com/judge0/judge0. Some newer Linux setups need extra cgroup configuration, so follow their docs. Then set `JUDGE0_URL="http://localhost:2358"`.
- **Hosted:** Judge0 CE is also offered through RapidAPI. Set `JUDGE0_URL` to its base URL and `JUDGE0_RAPIDAPI_KEY` to your key. Check its current free-plan limits first, because every test case is one request.
- **Self-hosted server:** run Judge0 on a VPS and set `JUDGE0_AUTH_TOKEN` if you enabled authentication. Do not run it on the same host as your database.

## 5. Checklist before a demo
- `JWT_SECRET` is random and `.env` is not committed (`.gitignore` already covers it).
- Create one teacher and one student account, run a full session, and open the results page.
- Test one coding question end to end, including the hidden tests.
- Use HTTPS only (Render and Vercel do this by default).
