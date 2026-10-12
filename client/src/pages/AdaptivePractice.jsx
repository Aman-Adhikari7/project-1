import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import PracticeCard from "./PracticeCard.jsx";

const LEVELS = ["easy", "medium", "hard"];

// Adaptive practice: two right in a row moves you up a level, a wrong answer moves you down.
export default function AdaptivePractice() {
  const [level, setLevel] = useState("medium");
  const [seen, setSeen] = useState([]);
  const [question, setQuestion] = useState(null);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ answered: 0, correct: 0 });
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function load(lv, seenList) {
    try {
      const r = await api(`/student/practice/next?level=${lv}&seen=${seenList.join(",")}`);
      if (r.done) setDone(true); else { setQuestion(r.question); setChecked(false); }
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load("medium", []); }, []);

  function onResult(correct) {
    setChecked(true);
    setStats((s) => ({ answered: s.answered + 1, correct: s.correct + (correct ? 1 : 0) }));
    const at = LEVELS.indexOf(level);
    if (!correct) { setLevel(LEVELS[Math.max(0, at - 1)]); setStreak(0); }
    else if (streak + 1 >= 2) { setLevel(LEVELS[Math.min(2, at + 1)]); setStreak(0); }
    else setStreak(streak + 1);
  }
  function next() {
    const list = [...seen, question.id];
    setSeen(list); setQuestion(null); load(level, list);
  }

  return (
    <main className="page">
      <header className="top"><h1>Adaptive practice</h1><Link to="/student">Back to dashboard</Link></header>
      <div className="grid" style={{ marginBottom: 16 }}>
        <div className="card stat"><p className="muted">Current level</p><div className="statnum">{level}</div></div>
        <div className="card stat"><p className="muted">Correct so far</p><div className="statnum">{stats.correct} of {stats.answered}</div></div>
      </div>
      {error && <p className="error">{error}</p>}
      {done ? (
        <div className="card center-card"><h2>You have practised every question</h2><p className="muted">Finish more tests to unlock new questions.</p></div>
      ) : question ? (
        <>
          <PracticeCard key={question.id} question={question} onResult={onResult} allowRetry={false} />
          {checked && <div className="actions"><button onClick={next}>Next question</button></div>}
        </>
      ) : !error && <p className="muted">Finding your next question...</p>}
      {!done && !question && error === "" && stats.answered === 0 && <p className="muted">You need at least one finished test to practise.</p>}
    </main>
  );
}
