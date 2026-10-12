import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { LABELS, level } from "../integrityLabels.js";

// Drill-down for one student: every answer next to the right answer, plus the integrity timeline.
export default function StudentDetail() {
  const { code, studentId } = useParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { api(`/sessions/${code}/students/${studentId}`).then(setD).catch((e) => setError(e.message)); }, [code, studentId]);

  if (error) return <main className="page"><p className="error">{error}</p><Link to={`/teacher/results/${code}`}>Back to results</Link></main>;
  if (!d) return <p className="center">Loading...</p>;

  return (
    <main className="page">
      <header className="top">
        <div><h1>{d.name}</h1><p className="muted">{d.title}</p></div>
        <Link to={`/teacher/results/${code}`}>Back to results</Link>
      </header>
      <div className="grid">
        <div className="card stat"><p className="muted">Score</p><div className="statnum">{Number(d.score).toFixed(1)} / {d.total}</div></div>
        <div className="card stat"><p className="muted">Integrity</p><div className="statnum"><span className={`tag ${level(d.integrity)}`}>{d.integrity} / 100</span></div></div>
        <div className="card stat"><p className="muted">Status</p><div className="statnum">{d.submitted ? "Submitted" : "In progress"}</div></div>
      </div>

      <h2 style={{ margin: "24px 0 12px" }}>Answers</h2>
      {d.answers.map((a) => (
        <div className={`case ${a.isCorrect ? "pass" : "fail"}`} key={a.number} style={{ margin: "0 0 10px", flexDirection: "column", gap: 6 }}>
          <b>Q{a.number} ({a.topic}): {a.question}</b>
          <span>Student answered: {a.given}</span>
          <span>Correct answer: {a.correctAnswer}</span>
          {a.feedback && a.feedback !== "Correct" && a.feedback !== "Incorrect" && <span>Feedback: {a.feedback}</span>}
        </div>
      ))}

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Integrity timeline</h2>
        {d.events.length === 0 ? <p className="muted">No suspicious activity recorded.</p> : (
          <ul className="timeline">
            {d.events.map((e, k) => <li key={k}><span className="mono">{new Date(e.t).toLocaleTimeString()}</span> {LABELS[e.type] || e.type}{e.detail ? ` (${e.detail})` : ""}</li>)}
          </ul>
        )}
      </div>
    </main>
  );
}
