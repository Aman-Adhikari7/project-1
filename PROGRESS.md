# CodePules: Progress and Handover

**If you are an AI assistant reading this: this file is your briefing. Read it fully, then read the code in the order given in section 9, then ask the user for their run status (section 11) before building anything new.**

Last updated after **Phase 10**. Phases 1 to 10 are built. What remains is the backlog and hardening in section 12.

---

## 1. What CodePules is

An AI-powered classroom assessment platform, "Wayground (Quizizz) plus LeetCode".

- **Teacher** gives a prompt, pasted text or a PDF. An LLM turns it into questions (MCQ, short answer, fill in the blank; coding is planned). The teacher reviews and edits them, then saves a test.
- **Teacher starts a live session.** A 6-letter code is generated. Students join the lobby with the code. The teacher sets a time limit and starts it. Questions are pushed to every student over WebSockets.
- **Students** answer inside a locked-down panel (fullscreen, paste blocked, tab switches logged). Answers are saved as they type. On submit (or when time ends) everything is auto-graded.
- **Teacher analytics:** score distribution chart, item-accuracy heatmap, weak-topic detection with a one-click "Generate follow-up quiz", per-student drill-down, and an integrity timeline.
- **Student history and practice** (the user specifically asked for this): after a round ends, students can reopen the past questions and practise them. Built in Phase 9: history, review, practice, "Why was I wrong?", adaptive practice.

Pitch line: *"The only platform where a teacher goes from a PDF to a proctored, auto-graded exam with MCQs and coding in under two minutes."*

## 2. About the user and how to work with them

- The user is a student building this as a project and **is learning**. They want to go **file by file**, with explanations, and to understand each part.
- Deliverable format they prefer: **one single zip file** containing the whole project. Keep file names stable and code readable with short "why" comments.
- They said they run all commands after a phase is built. **As of Phase 10, the AI who wrote this has never run the server against a real database or made a real LLM call.** What was verified is listed in section 11. Treat any run error the user reports as real and fix it.
- They gave a design reference: a NotebookLM-generated deck with a "precision" look (see section 8). Keep the UI in that style.
- Keep replies plain and concise. Offer the next step at the end.

## 3. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite 5, react-router-dom 6, socket.io-client, recharts. Plain CSS (no Tailwind). |
| Backend | Node 20+, Express 4, Socket.IO 4, ES modules (`"type": "module"`) |
| Database | PostgreSQL + Prisma 5. Question content lives in a flexible `Json` column. |
| Auth | JWT (7 days) + bcryptjs. Roles: `TEACHER`, `STUDENT`. Token kept in `localStorage`. |
| LLM | Anthropic Messages API called with plain `fetch` in `server/src/llm.js` (default model `claude-sonnet-5-5`, set by `LLM_MODEL`). Only that file knows the provider. |
| PDF | `pdf-parse` (imported from `pdf-parse/lib/pdf-parse.js`) + `multer` memory uploads |
| Code runner | Judge0 CE (self-hosted or RapidAPI), called from `server/src/judge0.js`. The code editor is a plain textarea with line numbers and Tab support; Monaco is an optional upgrade (paste blocking needs capture-phase handlers) |

Why SQL and not NoSQL: the data is highly relational (teacher, tests, questions, sessions, submissions, history). One JSON column handles the varying question shapes.

## 4. How to run

```
# terminal 1: backend
cd server
cp .env.example .env        # then fill in ANTHROPIC_API_KEY and DATABASE_URL
npm install
npx prisma generate
npx prisma db push          # re-run whenever schema.prisma changes
npm run dev                 # http://localhost:4000/api/health

# terminal 2: frontend
cd client
npm install
npm run dev                 # http://localhost:5173 (Vite proxies /api and /socket.io to :4000)
```

PostgreSQL quick start: `docker run -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=codepules -p 5432:5432 postgres`

Manual test script: create a teacher and a student account in two different browsers (each stores one login). Teacher: Create a test, Start live session. Student: enter the code. Teacher: Start. Student: answer and submit. Teacher: open results.

## 5. Project structure

```
codepules/
├── PROGRESS.md                  this file
├── README.md                    short run instructions
├── DEPLOY.md                    Render + Vercel + Judge0 deployment steps
├── server/
│   ├── .env.example             DATABASE_URL, JWT_SECRET, CLIENT_ORIGIN, PORT, ANTHROPIC_API_KEY, LLM_MODEL
│   ├── package.json
│   ├── prisma/schema.prisma     all tables (section 6)
│   └── src/
│       ├── index.js             Express app, mounts routers, creates Socket.IO server
│       ├── auth.js              signToken(), requireAuth(...roles) middleware
│       ├── llm.js               askLLM(system, user): the ONLY file that talks to the AI provider
│       ├── questions.js         SYSTEM prompt, buildUserPrompt(), parseQuestions() (validates AI JSON)
│       ├── tests.js             /api/tests: generate (PDF/prompt -> draft), save, list
│       ├── graders.js           grading plugins: gradeMcq, gradeFill, gradeShort + gradeAnswer() router
│       ├── sessions.js          REST (/api/sessions) + ALL live Socket.IO logic + results routes
│       ├── integrity.js         anti-cheat WEIGHTS and integrityScore(events)
│       ├── analytics.js         buildAnalytics(), studentDetail(): pure functions, no DB
│       ├── publicQuestion.js    strips answers/solutions/hidden tests for students; per-student MCQ shuffle (seeded)
│       ├── judge0.js            runTests(language, source, cases) via Judge0; normalizeOutput()
│       ├── adaptive.js          pickNext(pool, level, seen) for adaptive practice
│       └── student.js           /api/student: history, review, practice grade/explain/next, run code
└── client/
    ├── index.html               loads Inter + JetBrains Mono fonts
    ├── vite.config.js           proxy /api and /socket.io (ws) to localhost:4000
    └── src/
        ├── main.jsx             Router + AuthProvider
        ├── App.jsx              all routes, Protected({role}) guard
        ├── api.js               api(path, {method, body}): adds JWT, supports FormData
        ├── AuthContext.jsx      user state, login/register/logout
        ├── socket.js            connectSocket(): Socket.IO client with JWT
        ├── questionTypes.jsx    RENDERERS: student-side plugin per question type (mcq, fill, short)
        ├── useAntiCheat.js      hook: fullscreen/tab/blur/resize/paste/copy/typing detection
        ├── integrityLabels.js   LABELS for event types + level() colour helper
        ├── styles.css           the whole design system (section 8)
        └── pages/
            ├── Auth.jsx             login and register (one component, mode prop)
            ├── TeacherDashboard.jsx tests list, start session, sessions and results table
            ├── CreateTest.jsx       prompt/PDF form -> review step -> save. Accepts router state for auto-generate
            ├── QuestionEditor.jsx   edit one AI question before saving
            ├── HostSession.jsx      teacher live room: code, lobby, start/end, live roster, integrity timeline
            ├── LiveExam.jsx         student journey: lobby, exam (anti-cheat), result
            ├── Results.jsx          teacher analytics: stats, distribution chart, heatmap, topics, follow-up
            ├── StudentDetail.jsx    one student's answers vs correct answers + integrity timeline
            ├── History.jsx          student's finished tests
            ├── Review.jsx           answers vs correct answers after a test; practise any question
            ├── PracticeCard.jsx     practise one question: check, explanation, "Why was I wrong?"
            ├── AdaptivePractice.jsx adaptive difficulty practice across all finished tests
            ├── StudentDashboard.jsx join-by-code box, links
            └── StudentExam.jsx      STATIC UI PREVIEW of the coding exam screen (design reference for Phase 10; fake data)
```

## 6. Database schema (`server/prisma/schema.prisma`)

- **User**: id, name, email (unique), password (bcrypt), role (`TEACHER`|`STUDENT`), createdAt
- **Test**: id, title, teacherId -> User, createdAt. Has many Questions and Sessions.
- **Question**: id, testId, `type` (`mcq`|`short`|`fill`; `code` planned), topic, difficulty (`easy`|`medium`|`hard`), `data` Json, `position` Int (order in the test; always `orderBy position`)
- **Session**: id, `code` (unique, 6 chars), testId, status (`LOBBY`|`LIVE`|`ENDED`), startedAt, endedAt, endsAt, createdAt
- **Submission**: id, sessionId, studentId, `answers` Json ({questionId: answer}), `results` Json ({questionId: {score, correct, feedback}}), score Float, integrity Int (0 to 100), `events` Json (array of {t, type, detail}), submittedAt. Unique on (sessionId, studentId).

### Question `data` shapes (the "plugin contract")
- mcq: `{question, options[4], answerIndex, explanation}`. Student answer = selected index (number).
- fill: `{question (blank written as ___), answers[], explanation}`. Student answer = string.
- short: `{question, sampleAnswer, rubric}`. Student answer = string. Graded by the LLM against the rubric.
- code: `{question, language ("python"|"javascript"|"cpp"|"java"), starterCode, solution, testCases:[{input, expected, hidden}]}`. Student answer = source code string. Graded by running every test case in Judge0; score = fraction passed. Java classes must be named `Main`.

## 7. API and socket reference

### REST (all under `/api`, JWT in `Authorization: Bearer`)
| Method and path | Role | Purpose |
|---|---|---|
| GET `/health` | any | health check |
| POST `/auth/register`, `/auth/login` | any | returns `{token, user}` |
| GET `/me` | any | current user |
| POST `/tests/generate` | teacher | multipart: `instruction`, `count`, `types[]`, optional `file` (PDF). Returns `{questions, skipped}`. Saves nothing. |
| POST `/tests` | teacher | `{title, questions[]}` saves test |
| GET `/tests` | teacher | own tests with question counts |
| POST `/sessions` | teacher | `{testId}` returns `{code}` |
| GET `/sessions` | teacher | own sessions (title, code, status, createdAt, students) |
| GET `/sessions/:code/results` | teacher | analytics: summary, distribution, questions, topics, students (with heatmap `cells`) |
| GET `/sessions/:code/students/:studentId` | teacher | drill-down: answers vs correct, integrity, events |
| GET `/sessions/:code/export.csv` | teacher | results as CSV (formula-injection safe) |
| GET `/student/history`, `/student/history/:sessionId` | student | finished tests; review with correct answers (only after the session ENDED) |
| GET `/student/practice/question/:id` | student | public version of a question, only if the student finished its test |
| POST `/student/practice/grade` | student | `{questionId, answer}` -> grade + correct answer + explanation |
| POST `/student/practice/explain` | student | AI hint-style "Why was I wrong?" (cached in memory) |
| GET `/student/practice/next?level=&seen=` | student | adaptive practice: next unseen question near the level |
| POST `/student/run` | student | `{questionId, source}` runs VISIBLE test cases only; 2-second cooldown |

### Socket.IO events (JWT sent in `handshake.auth.token`)
Rooms: `room:CODE` (everyone), `host:CODE` (teacher only).

Client to server:
- `host:join {code}` (ack: title, status, endsAt, names, roster)
- `host:start {code, minutes}`, `host:end {code}`, `host:timeline {code, studentId}` (ack: events)
- `student:join {code}` (ack: title, status; if LIVE also questions, saved answers, submitted, result)
- `answer:save {code, answers}` (full answers object; latest wins)
- `student:submit {code}` (ack: result), `student:result {code}` (ack: result; grades if not yet submitted)
- `cheat:event {code, type, detail}` (types in `integrity.js` WEIGHTS)

Server to client:
- `lobby:update (names[])`, `exam:start {questions, endsAt}`, `exam:end`, `host:roster (rows[])`

### Security rules already followed (keep them)
- Students never receive answers: `publicQuestion()` in `sessions.js` strips `answerIndex`, `answers`, `sampleAnswer`, `rubric`, `explanation`.
- The result screen shows only correct/incorrect (and AI feedback for short answers), never the right answer, while a session may still be live.
- The server computes integrity scores and grades. The browser only reports events.
- Student text sent to the grading LLM is wrapped in `<student_answer>` tags and the prompt says to treat it as data.
- Cheat events are serialised per submission (`enqueue`) so none are lost.
- Code questions: `solution` and hidden test cases never leave the server during a test; grading results store only pass/fail per hidden case. Student code only ever runs in Judge0.
- MCQ options are shuffled per student (seeded by studentId + questionId, stable across refresh). The answer is still the ORIGINAL option number, so grading is unchanged.
- Answers are revealed to a student only for sessions with status ENDED (history, practice).

## 8. Design system (`client/src/styles.css`)

Look: "precision pipeline" silver-blue, taken from the user's NotebookLM deck. Background `#f3f5f9` with a faint grid; panels are white-to-light-grey gradients with a small **notch tab** on top (`.card`, `.panel`); Inter for text, JetBrains Mono for code, codes and timers; accent blue `#3f74c9`, green for pass, red for flags; sentence case, no all-caps labels. Reusable classes: `.card .panel .grid .pill .badge .chip .tag(.ok/.warn/.bad) .table .heat .lock .case(.pass/.fail) .bigcode .qlist .exam .exam-body`.

## 9. Suggested reading order for a new AI

1. `server/prisma/schema.prisma`
2. `server/src/index.js`, `auth.js`
3. `server/src/questions.js`, `llm.js`, `tests.js`
4. `server/src/graders.js`, `integrity.js`, `analytics.js`
5. `server/src/sessions.js` (largest file, the heart of the live system)
6. `client/src/App.jsx`, `api.js`, `AuthContext.jsx`, `socket.js`
7. `client/src/pages/CreateTest.jsx`, `HostSession.jsx`, `LiveExam.jsx`, `useAntiCheat.js`, `Results.jsx`

## 10. Phase status

| # | Phase | Status |
|---|---|---|
| 1 | Foundation: server, schema, auth | Done |
| 2 | Frontend shell, roles, premium styling, static exam preview | Done |
| 3 | AI question generator | Done |
| 4 | Question plugins and graders | Done |
| 5 | Live sessions over Socket.IO | Done |
| 6 | Student panel polish, teacher live roster | Done |
| 7 | Anti-cheat and integrity score | Done |
| 8 | Teacher analytics | Done |
| 9 | Student history, review, practice, "Why was I wrong?", adaptive practice | Done |
| 10 | Coding questions (Judge0), MCQ shuffling, CSV export, deploy config | Done (adaptive difficulty is practice-only; see below) |

### What Phase 9 added
History list, review page (correct answers revealed only after the session ENDED), per-question practice with no timer or anti-cheat, AI "Why was I wrong?" hints that avoid stating the answer, and adaptive practice (two correct in a row moves up a level, one wrong moves down; questions come from every test the student finished). Practice reuses `gradeAnswer()` and the RENDERERS plugins.

### What Phase 10 added
- Coding questions end to end: AI generation (`questions.js`), teacher editing of tests/solution (`QuestionEditor.jsx`), student editor with sample tests and Run button (`questionTypes.jsx`), grading through Judge0 (`graders.js`, `judge0.js`).
- Per-student MCQ option shuffling, CSV export of results, `VITE_API_URL` support, `DEPLOY.md`, `vercel.json`, a startup check for `JWT_SECRET`, and a global `unhandledRejection` logger.
- **Design decision:** adaptive difficulty exists only in practice mode. Doing it inside a graded live exam changes scoring fairness (students would answer different questions), so it was left out on purpose. It could be added as an optional session mode.

## 11. Verification status and known limitations

**Verified by the previous AI (sandbox, no database, no API key, no Judge0):** all server files pass `node --check` and import cleanly; unit checks for graders (including code grading against a FAKE Judge0), integrity, analytics, adaptive picking, shuffling (stable, valid permutation, differs per student), public-question leak checks (no solution, hidden tests or answerIndex), code-question parsing, and CSV cell escaping; the client builds with `vite build`.

**NOT verified (needs a real machine):** Prisma queries, the Socket.IO flow, real LLM calls, PDF upload, anti-cheat in a browser, charts' appearance, and **every call to a real Judge0** (language ids 71/63/54/62 and the `wait=true` request are from memory of Judge0 CE; confirm against its docs if code runs fail). Expect small bugs and fix them with the user.

**Known limitations**
- The whole live test is pushed at once with one timer. No per-section timers.
- Auto-end timers and lobby presence are in server memory; a restart loses them.
- Browser anti-cheat is deterrence plus evidence. The keystroke check runs in the browser. iOS Safari has no fullscreen API. Code answers are exempt from the keystroke check (starter code would cause false flags).
- Hosted Judge0 plans may rate-limit: each code submission runs one request per test case. Test-case expected outputs written by the AI can be wrong, so teachers must review them (the reference solution is shown to help).
- The "Why was I wrong?" cache is in memory only.
- No password reset, no rate limiting on login, JWT in `localStorage`.
- The code editor is a textarea (no syntax highlighting).
- Layout is tuned for laptops.
- Schema changes since Phase 5 (`position`, `createdAt`, `endsAt`, `results`, `submittedAt`) need `npx prisma db push`.

## 12. Backlog (not built)
In rough value order: write-and-verify test cases by running the AI's reference solution through Judge0 before saving; AI-generated per-student question variants; section timers and mixed-format flows; reusable tagged question bank UI; class arena or leaderboard mode; code similarity detection (compare submissions; do not claim to detect AI-written code); adaptive mode inside live sessions; Monaco editor with capture-phase paste blocking; automated tests (Vitest/Jest) and a Prisma migration workflow instead of `db push`; login rate limiting and password reset; persist the "Why was I wrong?" cache and practice attempts in the database.

## 13. First message the next AI should send the user
1. Confirm it has read this file and the code.
2. Ask: "Did Phases 1 to 10 run on your machine? Paste any error you saw, and tell me whether Judge0 is running."
3. Fix reported errors first. Then offer items from section 12, explaining each new file as you add it.
