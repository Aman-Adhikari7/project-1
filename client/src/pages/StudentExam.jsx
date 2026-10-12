import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// UI preview of the live exam screen. Real questions arrive over WebSockets in Phase 5/6.
const QUESTIONS = [
  { id: 1, type: "mcq", text: "Which data structure uses FIFO ordering?", options: ["Stack", "Queue", "Tree", "Graph"] },
  { id: 2, type: "mcq", text: "What is the time complexity of binary search?", options: ["O(n)", "O(n log n)", "O(log n)", "O(1)"] },
  { id: 3, type: "code", text: "Write a function sum(a, b) that returns the sum of two numbers.", starter: "def sum(a, b):\n    # your code here\n    pass\n" },
];

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function StudentExam() {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState({});
  const [code, setCode] = useState(QUESTIONS[2].starter);
  const [output, setOutput] = useState("Run your code to see output here.");
  const [cases, setCases] = useState(["idle", "idle", "hidden"]);
  const [sectionLeft, setSectionLeft] = useState(15 * 60);
  const [totalLeft, setTotalLeft] = useState(60 * 60);

  useEffect(() => {
    const t = setInterval(() => { setSectionLeft((s) => Math.max(0, s - 1)); setTotalLeft((s) => Math.max(0, s - 1)); }, 1000);
    return () => clearInterval(t);
  }, []);

  const q = QUESTIONS[i];
  const answered = QUESTIONS.filter((x) => answers[x.id] !== undefined).length;
  const lines = code.split("\n").map((_, n) => n + 1).join("\n");

  function run() {
    // Phase 10 replaces this fake result with a real Judge0 sandbox run.
    const passed = /return\s+a\s*\+\s*b/.test(code);
    setCases([passed ? "pass" : "fail", passed ? "pass" : "fail", "hidden"]);
    setOutput(passed ? "Sample Test Case Output: Passed (2/2)" : "Sample Test Case Output: Failed (0/2)");
    if (passed) setAnswers({ ...answers, [q.id]: code });
  }

  return (
    <div className="exam">
      <div className="exam-bar">
        <Link to="/student">Exit preview</Link>
        <span className="spacer" />
        <span className="pill">Section Timer: <b>{fmt(sectionLeft)}</b></span>
        <span className="pill">Overall Time: <b>{fmt(totalLeft)}</b></span>
      </div>

      <div className="exam-body">
        <section className="panel">
          <div className="panel-title">Progress</div>
          <div className="progress"><i style={{ width: `${(answered / QUESTIONS.length) * 100}%` }} /></div>
          <div className="qlist">
            {QUESTIONS.map((x, n) => (
              <button key={x.id} className={`${n === i ? "on" : ""} ${answers[x.id] !== undefined ? "done" : ""}`} onClick={() => setI(n)}>Q{x.id}</button>
            ))}
          </div>
        </section>

        <div className="stack">
          <section className="panel" style={{ flex: 1 }}>
            <div className="panel-title">{q.type === "code" ? "Coding IDE" : "Question " + q.id}</div>
            <div className="prompt">{q.text}</div>
            {q.type === "mcq" ? (
              <div className="qlist">
                {q.options.map((o) => (
                  <button key={o} className={answers[q.id] === o ? "on" : ""} onClick={() => setAnswers({ ...answers, [q.id]: o })}>{o}</button>
                ))}
              </div>
            ) : (
              <div className="editor">
                <div className="gutter">{lines}</div>
                <textarea spellCheck="false" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
            )}
          </section>
          {q.type === "code" && (
            <section className="panel">
              <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                Editor Console <button onClick={run} style={{ padding: "4px 14px" }}>Run</button>
              </div>
              <div className={`console ${output.includes("Passed") ? "ok" : output.includes("Failed") ? "bad" : ""}`}>{output}</div>
            </section>
          )}
        </div>

        <section className="panel">
          <div className="panel-title">Test Cases</div>
          <div style={{ paddingTop: 6 }}>
            {q.type === "code" ? cases.map((c, n) => (
              <div key={n} className={`case ${c}`}>
                <span>Case {n + 1}</span>
                <span>{c === "pass" ? "Passed" : c === "fail" ? "Failed" : c === "hidden" ? "Hidden" : "Not run"}</span>
              </div>
            )) : <p className="muted" style={{ padding: "6px 16px" }}>Test cases appear on coding questions.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
