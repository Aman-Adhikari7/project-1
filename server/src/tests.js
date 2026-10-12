import { Router } from "express";
import multer from "multer";
import pdf from "pdf-parse/lib/pdf-parse.js";
import { requireAuth } from "./auth.js";
import { askLLM } from "./llm.js";
import { SYSTEM, buildUserPrompt, parseQuestions } from "./questions.js";

const TYPES = ["mcq", "short", "fill", "code"];

export default function testsRouter(prisma) {
  const r = Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
  r.use(requireAuth("TEACHER"));

  // Step 1: prompt and/or PDF in, draft questions out. Nothing is saved yet.
  r.post("/generate", upload.single("file"), async (req, res) => {
    try {
      const instruction = (req.body.instruction || "").trim();
      const count = Math.min(Math.max(Number(req.body.count) || 5, 1), 20);
      const types = [].concat(req.body.types || "mcq").filter((t) => TYPES.includes(t));
      const source = req.file ? (await pdf(req.file.buffer)).text : "";
      if (!source.trim() && !instruction) return res.status(400).json({ error: "Add a prompt or upload a PDF." });

      const reply = await askLLM(SYSTEM, buildUserPrompt({ source, instruction, count, types: types.length ? types : ["mcq"] }));
      const result = parseQuestions(reply);
      if (!result.questions.length) return res.status(502).json({ error: "AI returned no usable questions. Try again." });
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Step 2: after the teacher reviews and edits, save the final test.
  r.post("/", async (req, res) => {
    const { title, questions } = req.body || {};
    if (!title?.trim() || !Array.isArray(questions) || !questions.length || questions.some((q) => !TYPES.includes(q.type)))
      return res.status(400).json({ error: "Add a title and at least one valid question." });
    const test = await prisma.test.create({
      data: {
        title: title.trim(),
        teacherId: req.user.id,
        questions: { create: questions.map((q, i) => ({ position: i, type: q.type, topic: q.topic, difficulty: q.difficulty, data: q.data })) },
      },
      include: { _count: { select: { questions: true } } },
    });
    res.json(test);
  });

  r.get("/", async (req, res) => {
    res.json(await prisma.test.findMany({
      where: { teacherId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { questions: true } } },
    }));
  });

  return r;
}
