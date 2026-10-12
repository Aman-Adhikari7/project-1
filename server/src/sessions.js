import { Router } from "express";
import jwt from "jsonwebtoken";
import { requireAuth } from "./auth.js";
import { gradeAnswer } from "./graders.js";
import { WEIGHTS, integrityScore } from "./integrity.js";
import { buildAnalytics, studentDetail } from "./analytics.js";
import { publicQuestion } from "./publicQuestion.js";

const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export function sessionsRouter(prisma) {
  const r = Router();
  r.post("/", requireAuth("TEACHER"), async (req, res) => {
    const test = await prisma.test.findFirst({ where: { id: req.body.testId, teacherId: req.user.id } });
    if (!test) return res.status(404).json({ error: "Test not found." });
    let code = makeCode();
    while (await prisma.session.findUnique({ where: { code } })) code = makeCode();
    await prisma.session.create({ data: { code, testId: test.id } });
    res.json({ code });
  });

  // ----- Phase 8: teacher analytics -----
  const owned = async (code, user) => {
    const s = await prisma.session.findUnique({
      where: { code: String(code).toUpperCase() },
      include: { test: { include: { questions: { orderBy: { position: "asc" } } } } },
    });
    return s && s.test.teacherId === user.id ? s : null;
  };

  r.get("/", requireAuth("TEACHER"), async (req, res) => {
    const list = await prisma.session.findMany({
      where: { test: { teacherId: req.user.id } },
      orderBy: { createdAt: "desc" },
      include: { test: { select: { title: true } }, _count: { select: { submissions: true } } },
    });
    res.json(list.map((s) => ({ code: s.code, title: s.test.title, status: s.status, createdAt: s.createdAt, students: s._count.submissions })));
  });

  r.get("/:code/results", requireAuth("TEACHER"), async (req, res) => {
    const s = await owned(req.params.code, req.user);
    if (!s) return res.status(404).json({ error: "Session not found." });
    const submissions = await prisma.submission.findMany({ where: { sessionId: s.id }, include: { student: { select: { name: true } } } });
    res.json({ code: s.code, title: s.test.title, status: s.status, ...buildAnalytics({ questions: s.test.questions, submissions }) });
  });

  r.get("/:code/students/:studentId", requireAuth("TEACHER"), async (req, res) => {
    const s = await owned(req.params.code, req.user);
    if (!s) return res.status(404).json({ error: "Session not found." });
    const sub = await prisma.submission.findUnique({
      where: { sessionId_studentId: { sessionId: s.id, studentId: req.params.studentId } },
      include: { student: { select: { name: true } } },
    });
    if (!sub) return res.status(404).json({ error: "Student not found in this session." });
    res.json({
      name: sub.student.name, title: s.test.title, code: s.code, score: sub.score, total: s.test.questions.length,
      integrity: sub.integrity, submitted: !!sub.submittedAt, events: sub.events,
      answers: studentDetail({ questions: s.test.questions, submission: sub }),
    });
  });

  r.get("/:code/export.csv", requireAuth("TEACHER"), async (req, res) => {
    const s = await owned(req.params.code, req.user);
    if (!s) return res.status(404).json({ error: "Session not found." });
    const subs = await prisma.submission.findMany({ where: { sessionId: s.id }, include: { student: { select: { name: true, email: true } } } });
    const total = s.test.questions.length;
    const cell = (v) => { let t = String(v ?? ""); if (/^[=+\-@]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; }; // leading quote stops spreadsheet formula tricks
    const head = ["Name", "Email", "Status", "Score", "Total", "Percent", "Integrity", "Flags", ...s.test.questions.map((_, i) => "Q" + (i + 1))];
    const rows = subs.map((x) => [x.student.name, x.student.email, x.submittedAt ? "Submitted" : "In progress", x.score, total,
      total ? Math.round((x.score / total) * 100) : 0, x.integrity, x.events.length, ...s.test.questions.map((q) => x.results?.[q.id]?.score ?? "")]);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="results-${s.code}.csv"`);
    res.send([head, ...rows].map((row) => row.map(cell).join(",")).join("\n"));
  });

  return r;
}

export function attachSockets(io, prisma) {
  const lobby = new Map();  // code -> Map(studentId -> name)
  const timers = new Map(); // code -> timeout that ends the exam automatically

  io.use((socket, next) => {
    try { socket.user = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET); next(); }
    catch { next(new Error("Please log in again.")); }
  });

  const names = (code) => [...(lobby.get(code)?.values() || [])];
  const getSession = (code) =>
    prisma.session.findUnique({ where: { code: String(code || "").toUpperCase() }, include: { test: { include: { questions: { orderBy: { position: "asc" } } } } } });
  const key = (sessionId, studentId) => ({ sessionId_studentId: { sessionId, studentId } });
  const ensureSub = (s, studentId) =>
    prisma.submission.upsert({ where: key(s.id, studentId), update: {}, create: { sessionId: s.id, studentId } });
  const resultOf = (sub, s) => ({ score: sub.score, total: s.test.questions.length, results: sub.results });

  // Teacher's live table: one row per student with score and integrity.
  async function roster(s) {
    const subs = await prisma.submission.findMany({ where: { sessionId: s.id }, include: { student: { select: { name: true } } } });
    return subs.map((x) => ({
      id: x.studentId, name: x.student.name, submitted: !!x.submittedAt,
      score: x.submittedAt ? x.score : null, integrity: x.integrity, flags: x.events.length,
    }));
  }

  // Cheat events from one student are handled one at a time so none get lost.
  const chains = new Map();
  const enqueue = (id, fn) => {
    const next = (chains.get(id) || Promise.resolve()).then(fn).catch(() => {});
    chains.set(id, next);
    return next;
  };

  async function pushStats(s) {
    io.to("host:" + s.code).emit("host:roster", await roster(s));
    const submitted = await prisma.submission.count({ where: { sessionId: s.id, submittedAt: { not: null } } });
    io.to("host:" + s.code).emit("host:stats", { joined: lobby.get(s.code)?.size || 0, submitted });
  }

  // Grades every question with its plugin and stores the result. Safe to call twice.
  async function submitAnswers(s, studentId) {
    const sub = await ensureSub(s, studentId);
    if (sub.submittedAt) return sub;
    const graded = await Promise.all(s.test.questions.map(async (q) => [q.id, await gradeAnswer(q, sub.answers[q.id])]));
    return prisma.submission.update({
      where: { id: sub.id },
      data: { results: Object.fromEntries(graded), score: graded.reduce((sum, [, g]) => sum + g.score, 0), submittedAt: new Date() },
    });
  }

  async function endSession(code) {
    clearTimeout(timers.get(code)); timers.delete(code);
    const s = await getSession(code);
    if (!s || s.status === "ENDED") return;
    await prisma.session.update({ where: { id: s.id }, data: { status: "ENDED", endedAt: new Date() } });
    const open = await prisma.submission.findMany({ where: { sessionId: s.id, submittedAt: null } });
    for (const sub of open) await submitAnswers(s, sub.studentId);
    io.to("room:" + s.code).emit("exam:end");
    pushStats(s);
  }

  io.on("connection", (socket) => {
    const user = socket.user;

    socket.on("host:join", async ({ code }, ack) => {
      const s = await getSession(code);
      if (!s || user.role !== "TEACHER" || s.test.teacherId !== user.id) return ack?.({ error: "Session not found." });
      socket.join("room:" + s.code); socket.join("host:" + s.code);
      ack?.({ ok: true, title: s.test.title, status: s.status, endsAt: s.endsAt, names: names(s.code), roster: await roster(s) });
      pushStats(s);
    });

    socket.on("student:join", async ({ code }, ack) => {
      const s = await getSession(code);
      if (!s || user.role !== "STUDENT") return ack?.({ error: "That code is not valid." });
      if (s.status === "ENDED") return ack?.({ error: "This session has already ended." });
      const me = await prisma.user.findUnique({ where: { id: user.id } });
      if (!lobby.has(s.code)) lobby.set(s.code, new Map());
      lobby.get(s.code).set(user.id, me.name);
      socket.data.code = s.code; socket.data.studentId = user.id;
      socket.join("room:" + s.code);
      io.to("room:" + s.code).emit("lobby:update", names(s.code));
      pushStats(s);
      if (s.status !== "LIVE") return ack?.({ ok: true, title: s.test.title, status: s.status });
      // Joined late or refreshed the page: send the questions and any saved answers.
      const sub = await ensureSub(s, user.id);
      ack?.({ ok: true, title: s.test.title, status: "LIVE", endsAt: s.endsAt, questions: s.test.questions.map((q) => publicQuestion(q, user.id)),
        answers: sub.answers, submitted: !!sub.submittedAt, result: sub.submittedAt ? resultOf(sub, s) : null });
    });

    socket.on("host:start", async ({ code, minutes }, ack) => {
      const s = await getSession(code);
      if (!s || s.test.teacherId !== user.id || s.status !== "LOBBY") return ack?.({ error: "This session can't be started." });
      const mins = Math.min(Math.max(Number(minutes) || 10, 1), 180);
      const endsAt = new Date(Date.now() + mins * 60000);
      await prisma.session.update({ where: { id: s.id }, data: { status: "LIVE", startedAt: new Date(), endsAt } });
      for (const sid of lobby.get(s.code)?.keys() || []) await ensureSub(s, sid);
      // Each student gets their own option order, so neighbours see different screens.
      for (const sk of await io.in("room:" + s.code).fetchSockets())
        if (sk.data.studentId) sk.emit("exam:start", { questions: s.test.questions.map((q) => publicQuestion(q, sk.data.studentId)), endsAt });
      timers.set(s.code, setTimeout(() => endSession(s.code), mins * 60000));
      pushStats(s);
      ack?.({ ok: true, endsAt });
    });

    socket.on("host:end", async ({ code }, ack) => {
      const s = await getSession(code);
      if (!s || s.test.teacherId !== user.id) return ack?.({ error: "Session not found." });
      await endSession(s.code);
      ack?.({ ok: true });
    });

    // The client sends its full answers object each time, so the latest save always wins.
    socket.on("answer:save", async ({ code, answers }) => {
      const s = await getSession(code);
      if (!s || s.status !== "LIVE" || user.role !== "STUDENT") return;
      const sub = await ensureSub(s, user.id);
      if (!sub.submittedAt) await prisma.submission.update({ where: { id: sub.id }, data: { answers: answers || {} } });
    });

    socket.on("student:submit", async ({ code }, ack) => {
      const s = await getSession(code);
      if (!s || s.status !== "LIVE" || user.role !== "STUDENT") return ack?.({ error: "This session is not live." });
      const sub = await submitAnswers(s, user.id);
      pushStats(s);
      ack?.({ ok: true, result: resultOf(sub, s) });
    });

    socket.on("student:result", async ({ code }, ack) => {
      const s = await getSession(code);
      if (!s) return ack?.({ error: "Session not found." });
      const sub = await submitAnswers(s, user.id);
      ack?.({ ok: true, result: resultOf(sub, s) });
    });

    // Anti-cheat: the browser reports what happened, the server decides what it costs.
    socket.on("cheat:event", async ({ code, type, detail }) => {
      if (!WEIGHTS[type] || user.role !== "STUDENT") return;
      const s = await prisma.session.findUnique({ where: { code: String(code || "").toUpperCase() } });
      if (!s || s.status !== "LIVE") return;
      const sub = await ensureSub(s, user.id);
      await enqueue(sub.id, async () => {
        const fresh = await prisma.submission.findUnique({ where: { id: sub.id } });
        if (fresh.submittedAt) return;
        const events = [...fresh.events, { t: new Date().toISOString(), type, detail: String(detail || "").slice(0, 120) }].slice(-300);
        await prisma.submission.update({ where: { id: sub.id }, data: { events, integrity: integrityScore(events) } });
      });
      pushStats(s);
    });

    socket.on("host:timeline", async ({ code, studentId }, ack) => {
      const s = await getSession(code);
      if (!s || s.test.teacherId !== user.id) return ack?.({ error: "Session not found." });
      const sub = await prisma.submission.findUnique({ where: key(s.id, studentId) });
      ack?.({ events: sub?.events || [] });
    });

    socket.on("disconnect", () => {
      const { code, studentId } = socket.data;
      if (code && lobby.get(code)?.delete(studentId)) io.to("room:" + code).emit("lobby:update", names(code));
    });
  });
}
