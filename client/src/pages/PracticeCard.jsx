import { useState } from "react";
import { api } from "../api.js";
import { RENDERERS } from "../questionTypes.jsx";

// Practise one question: no timer, no anti-cheat. Check the answer, then ask "Why was I wrong?".
export default function PracticeCard({ question, onResult, allowRetry = true }) {
  const Render = RENDERERS[question.type];
  const [answer, setAnswer] = useState(undefined);
  const [res, setRes] = useState(null);
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(path, setter) {
    setBusy(true); setError("");
    try { return setter(await api(path, { method: "POST", body: { questionId: question.id, answer } })); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const check = () => call("/student/practice/grade", (r) => { setRes(r); onResult?.(r.correct); });
  const explain = () => call("/student/practice/explain", (r) => setWhy(r.explanation));

  return (
    <div className="card practice">
      <p className="prompt-text">{question.question}</p>
      <Render q={question} value={answer} onChange={setAnswer} />
      {error && <p className="error">{error}</p>}
      {!res && <div className="actions" style={{ margin: "12px 0 0" }}><button disabled={busy} onClick={check}>{busy ? "Checking..." : "Check answer"}</button></div>}
      {res && (
        <div className={`case ${res.correct ? "pass" : "fail"}`} style={{ margin: "12px 0 0", flexDirection: "column", gap: 6 }}>
          <b>{res.correct ? "Correct" : res.score > 0 ? "Partly correct" : "Not quite"}</b>
          {res.feedback && !["Correct", "Incorrect"].includes(res.feedback) && <span>{res.feedback}</span>}
          {!res.correct && <span>Correct answer: {res.correctAnswer}</span>}
          {res.explanation && <span>Explanation: {res.explanation}</span>}
          {why && <span>Hint: {why}</span>}
          <div className="actions" style={{ margin: 0, justifyContent: "flex-start" }}>
            {!res.correct && !why && <button className="ghost" disabled={busy} onClick={explain}>{busy ? "Thinking..." : "Why was I wrong?"}</button>}
            {allowRetry && <button className="ghost" onClick={() => { setRes(null); setWhy(""); }}>Try again</button>}
          </div>
        </div>
      )}
    </div>
  );
}
