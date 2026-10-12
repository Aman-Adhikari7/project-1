# CodePules

AI-powered classroom assessment platform: prompt or PDF in, proctored auto-graded exam out.

## Folder map
- `server/`  Express + Socket.IO + Prisma (Phase 1)
- `client/`  React + Vite (Phase 2)

## Run the backend
1. Install Node 20+ and PostgreSQL (or `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`).
2. `cd server && cp .env.example .env`
3. `npm install && npx prisma generate && npm run db:push && npm run dev`
4. Check http://localhost:4000/api/health

## Run the frontend (second terminal)
1. `cd client && npm install && npm run dev`
2. Open http://localhost:5173, create a teacher account and a student account, log in with each.
