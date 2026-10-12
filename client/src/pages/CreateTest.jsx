import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import QuestionEditor from "./QuestionEditor.jsx";

const TYPE_OPTIONS = [["mcq", "Multiple choice"], ["short", "Short answer"], ["fill", "Fill in the blank"], ["code", "Coding (graded by Judge0)"]];

export default function CreateTest() {
  const navigate = useNavigate();
  const { state } = useLocation(); // set when coming from "Generate follow-up quiz"
  const [instruction, setInstruction] = useState(state?.instruction || "");
  const [file, setFile] = useState(null);
  const [count, setCount] = useState(state?.count || 5);
  const [types, setTypes] = useState(["mcq"]);
  const [questions, setQuestions] = useState(null); // null = still on the input step
  const [title, setTitle] = useState(state?.title || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggleType = (t) => setTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t]);

  const auto = useRef(false);
  useEffect(() => {
    if (state?.autoGenerate && !auto.current) { auto.current = true; generate(); }
  }, []);

  async function generate(e) {
    e?.preventDefault();
    setError(""); setBusy(true);
    try {
      const form = new FormData();
      form.append("instruction", instruction);
      form.append("count", count);
      types.forEach((t) => form.append("types", t));
      if (file) form.append("file", file);
      const res = await api("/tests/generate", { method: "POST", body: form });
      setQuestions(res.questions);
      if (res.skipped) setError(`${res.skipped} question(s) were skipped because the AI formatted them wrongly.`);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function save() {
    setError(""); setBusy(true);
    try {
      await api("/tests", { method: "POST", body: { title, questions } });
      navigate("/teacher");
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <main className="page">
      <header className="top">
        <h1>{questions ? "Review your questions" : "Create a test"}</h1>
        <Link to="/teacher">Back to dashboard</Link>
      </header>

      {!questions ? (
        <form className="card form" onSubmit={generate}>
          <label>What should the questions cover?
            <textarea rows={4} value={instruction} onChange={(e) => setInstruction(e.target.value)}
              placeholder="Example: Make 5 questions on recursion for first-year students" />
          </label>
          <label>Or upload a PDF (optional)
            <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0] || null)} />
          </label>
          <div className="row">
            <label>Number of questions
              <input type="number" min={1} max={20} value={count} onChange={(e) => setCount(e.target.value)} />
            </label>
            <fieldset>
              <legend>Question types</legend>
              {TYPE_OPTIONS.map(([t, name]) => (
                <label key={t} className="check"><input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} /> {name}</label>
              ))}
            </fieldset>
          </div>
          {error && <p className="error">{error}</p>}
          <button disabled={busy || !types.length}>{busy ? "AI is writing questions..." : "Generate questions"}</button>
        </form>
      ) : (
        <>
          <div className="card form">
            <label>Test title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Example: Recursion quiz" /></label>
            {error && <p className="error">{error}</p>}
          </div>
          {questions.map((q, i) => (
            <QuestionEditor key={i} q={q} index={i}
              onChange={(nq) => setQuestions(questions.map((x, k) => (k === i ? nq : x)))}
              onDelete={() => setQuestions(questions.filter((_, k) => k !== i))} />
          ))}
          <div className="actions">
            <button className="ghost" onClick={() => setQuestions(null)}>Start over</button>
            <button disabled={busy || !title.trim() || !questions.length} onClick={save}>{busy ? "Saving..." : "Save test"}</button>
          </div>
        </>
      )}
    </main>
  );
}
