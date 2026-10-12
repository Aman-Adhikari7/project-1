// Turns raw submissions into the numbers behind the teacher's charts.
// Pure functions: no database calls here, so they are easy to test.
const pct = (x) => Math.round(x * 100);
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const hasAnswer = (v) => v !== undefined && v !== null && v !== "";

export function buildAnalytics({ questions, submissions }) {
  const done = submissions.filter((s) => s.submittedAt);
  const total = questions.length;

  // One row per student. cells[questionId] is 0..1, or null if they left it blank (grey in the heatmap).
  const students = done.map((s) => ({
    id: s.studentId, name: s.student.name, score: s.score, percent: total ? pct(s.score / total) : 0,
    integrity: s.integrity, flags: s.events.length,
    cells: Object.fromEntries(questions.map((q) => [q.id, hasAnswer(s.answers?.[q.id]) ? s.results?.[q.id]?.score ?? 0 : null])),
  }));

  const percents = students.map((s) => s.percent);
  const summary = {
    joined: submissions.length, submitted: done.length, average: Math.round(mean(percents)),
    median: Math.round(median(percents)), highest: percents.length ? Math.max(...percents) : 0, lowest: percents.length ? Math.min(...percents) : 0,
  };

  const distribution = Array.from({ length: 10 }, (_, i) => ({ range: i === 9 ? "90-100" : `${i * 10}-${i * 10 + 9}`, count: 0 }));
  percents.forEach((p) => distribution[Math.min(9, Math.floor(p / 10))].count++);

  const qStats = questions.map((q, i) => ({
    id: q.id, number: i + 1, text: String(q.data.question).slice(0, 90), type: q.type, topic: q.topic || "General", difficulty: q.difficulty,
    accuracy: pct(mean(done.map((s) => s.results?.[q.id]?.score ?? 0))),
    answeredRate: done.length ? pct(done.filter((s) => hasAnswer(s.answers?.[q.id])).length / done.length) : 0,
  }));

  // A topic is "weak" when the class averages under 60% on its questions.
  const byTopic = {};
  qStats.forEach((q) => (byTopic[q.topic] ||= []).push(q.accuracy));
  const topics = Object.entries(byTopic)
    .map(([topic, accs]) => ({ topic, accuracy: Math.round(mean(accs)), questions: accs.length, weak: done.length > 0 && mean(accs) < 60 }))
    .sort((a, b) => a.accuracy - b.accuracy);

  return { summary, distribution, questions: qStats, topics, students };
}

// One student's answers next to the correct answers, for the drill-down page.
export function studentDetail({ questions, submission }) {
  return questions.map((q, i) => {
    const d = q.data, a = submission.answers?.[q.id];
    const r = submission.results?.[q.id] || { score: 0, correct: false, feedback: "Not graded yet" };
    let given = "No answer", correctAnswer = "";
    if (q.type === "mcq") { if (d.options[a] !== undefined) given = d.options[a]; correctAnswer = d.options[d.answerIndex]; }
    else if (q.type === "fill") { if (hasAnswer(a)) given = String(a); correctAnswer = d.answers.join(" / "); }
    else if (q.type === "code") { if (hasAnswer(a)) given = String(a); correctAnswer = d.solution || "(see the test cases)"; }
    else { if (hasAnswer(a)) given = String(a); correctAnswer = d.sampleAnswer; }
    return { id: q.id, explanation: d.explanation || "", number: i + 1, question: d.question, type: q.type, topic: q.topic, given, correctAnswer, score: r.score, isCorrect: r.correct, feedback: r.feedback };
  });
}
