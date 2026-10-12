// Defines what the AI must return, and checks that it really did.
export const SYSTEM = `You write exam questions for teachers. Reply with ONLY valid JSON, no markdown, no commentary.
Format: {"questions":[ ... ]}. Each question has "type", "topic" (short), "difficulty" ("easy"|"medium"|"hard") plus:
- mcq: "question", "options" (exactly 4 strings), "answerIndex" (0-3), "explanation"
- short: "question", "sampleAnswer", "rubric" (what a correct answer must include)
- fill: "question" (use ___ for the blank), "answers" (array of accepted answers), "explanation"
- code: "question" (full problem with input and output format), "language" ("python"|"javascript"|"cpp"|"java"), "starterCode", "solution" (a correct reference solution), "testCases" (3 to 6 objects {"input": text for stdin, "expected": exact stdout, "hidden": boolean}; at least one visible and one hidden). Programs read stdin and print to stdout. For java the class must be named Main.
Questions must be accurate and based on the given material.`;

export function buildUserPrompt({ source, instruction, count, types }) {
  return `Teacher request: ${instruction || "Create questions from the material."}
Number of questions: ${count}
Allowed types: ${types.join(", ")}
${source ? `Material:\n"""\n${source.slice(0, 30000)}\n"""` : ""}`;
}

const LEVELS = ["easy", "medium", "hard"];
const LANGS = ["python", "javascript", "cpp", "java"];

function clean(q) {
  const base = {
    type: q?.type,
    topic: String(q?.topic || "General").slice(0, 60),
    difficulty: LEVELS.includes(q?.difficulty) ? q.difficulty : "medium",
  };
  if (!q?.question) return null;
  if (q.type === "mcq") {
    const ok = Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex <= 3;
    if (!ok) return null;
    return { ...base, data: { question: q.question, options: q.options.map(String), answerIndex: q.answerIndex, explanation: q.explanation || "" } };
  }
  if (q.type === "short")
    return { ...base, data: { question: q.question, sampleAnswer: q.sampleAnswer || "", rubric: q.rubric || "" } };
  if (q.type === "fill") {
    if (!Array.isArray(q.answers) || !q.answers.length) return null;
    return { ...base, data: { question: q.question, answers: q.answers.map(String), explanation: q.explanation || "" } };
  }
  if (q.type === "code") {
    const testCases = (Array.isArray(q.testCases) ? q.testCases : [])
      .filter((t) => t && t.expected !== undefined)
      .map((t) => ({ input: String(t.input ?? ""), expected: String(t.expected), hidden: !!t.hidden }));
    if (!testCases.length || !LANGS.includes(q.language)) return null;
    return { ...base, data: { question: q.question, language: q.language, starterCode: String(q.starterCode || ""), solution: String(q.solution || ""), testCases } };
  }
  return null;
}

// Turns the AI's raw text into safe questions. Bad ones are skipped, not crashed on.
export function parseQuestions(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI reply was not JSON. Try again.");
  const raw = JSON.parse(text.slice(start, end + 1)).questions || [];
  const questions = raw.map(clean).filter(Boolean);
  return { questions, skipped: raw.length - questions.length };
}
