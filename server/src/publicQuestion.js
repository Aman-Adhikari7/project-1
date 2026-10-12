// What a student is allowed to see. Answers, rubrics, explanations, solutions and hidden tests are removed.
function seeded(str) { // small deterministic random generator: same seed, same shuffle
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function shuffled(n, seed) {
  const order = [...Array(n).keys()], rand = seeded(seed);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return order;
}

export function publicQuestion(q, studentId) {
  const { answerIndex, answers, sampleAnswer, rubric, explanation, solution, testCases, ...safe } = q.data;
  const out = { id: q.id, type: q.type, topic: q.topic, ...safe };
  if (q.type === "code") out.samples = testCases.filter((t) => !t.hidden).map(({ input, expected }) => ({ input, expected }));
  if (q.type === "mcq" && studentId) {
    // The student still answers with the ORIGINAL option number, so grading is unchanged.
    out.order = shuffled(safe.options.length, studentId + q.id);
    out.options = out.order.map((i) => safe.options[i]);
  }
  return out;
}
