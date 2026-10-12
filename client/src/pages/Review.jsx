import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import PracticeCard from "./PracticeCard.jsx";

// After a test ends: see every answer with the right one, then practise any question again.
export default function Review() {
  const { sessionId } = useParams();
  const [d, setD] = useState(null);
  const [open, setOpen] = useState({}); // questionId -> question to practise
  const [error, setError] = useState("");

  useEffect(() => { api(`/student/history/${sessionId}`).then(setD).catch((e) => setError(e.message)); }, [sessionId]);

  async function practise(id) {
    try { const q = await api(`/student/practice/question/${id}`); setOpen((o) => ({ ...o, [id]: q })); }
    catch (e) { setError(e.message); }
  }

  if (error && !d) return <main className="page"><p className="error">{error}</p><Link to="/student/history">Back to history</Link></main>;
  if (!d) return <p className="center">Loading...</p>;

  return (
    <main className="page">
      <header className="top">
        <div><h1>{d.title}</h1><p className="muted">You scored {Number(d.score).toFixed(1)} out of {d.total}</p></div>
        <Link to="/student/history">Back to history</Link>
      </header>
      {error && <p className="error">{error}</p>}
      {d.answers.map((a) => (
        <div key={a.id} style={{ marginBottom: 14 }}>
          <div className={`case ${a.isCorrect ? "pass" : "fail"}`} style={{ margin: 0, flexDirection: "column", gap: 6 }}>
            <b>Q{a.number}: {a.question}</b>
            <span>Your answer: {a.given}</span>
            <span>Correct answer: {a.correctAnswer}</span>
            {a.feedback && !["Correct", "Incorrect"].includes(a.feedback) && <span>Feedback: {a.feedback}</span>}
            {a.explanation && <span>Explanation: {a.explanation}</span>}
            {!open[a.id] && <button className="ghost" style={{ alignSelf: "flex-start" }} onClick={() => practise(a.id)}>Practise this question</button>}
          </div>
          {open[a.id] && <PracticeCard question={open[a.id]} />}
        </div>
      ))}
    </main>
  );
}
