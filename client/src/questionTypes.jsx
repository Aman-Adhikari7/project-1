import { useState } from "react";
import { api } from "./api.js";

// Coding question: editor, sample tests, and a Run button. Used in live exams and in practice.
function CodeQuestion({ q, value, onChange }) {
  const code = value ?? q.starterCode ?? "";
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const lines = code.split("\n").map((_, n) => n + 1).join("\n");

  function onKeyDown(e) { // Tab inserts spaces instead of leaving the editor
    if (e.key !== "Tab") return;
    e.preventDefault();
    const t = e.target, at = t.selectionStart;
    onChange(code.slice(0, at) + "    " + code.slice(t.selectionEnd));
    requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = at + 4; });
  }
  async function run() {
    setBusy(true);
    try { setOut(await api("/student/run", { method: "POST", body: { questionId: q.id, source: code } })); }
    catch (e) { setOut({ error: e.message }); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="panel-sub">Language: {q.language}. Read from standard input and print to standard output.</div>
      {q.samples?.map((s, n) => (
        <div className="sample" key={n}><b>Example {n + 1}</b><pre>Input:{"\n"}{s.input || "(none)"}</pre><pre>Expected output:{"\n"}{s.expected}</pre></div>
      ))}
      <div className="editor">
        <div className="gutter">{lines}</div>
        <textarea spellCheck="false" value={code} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} />
      </div>
      <div className="code-actions">
        <button onClick={run} disabled={busy}>{busy ? "Running..." : "Run sample tests"}</button>
        <span className="muted">Hidden tests run when you submit.</span>
      </div>
      {out && (
        <div className="console">
          {out.error ? <span className="bad">{out.error}</span> : out.cases.map((c, n) => (
            <div key={n} className={c.passed ? "ok" : "bad"}>
              Test {n + 1}: {c.passed ? "Passed" : "Failed"}
              {!c.passed && <div className="detail">{c.error ? c.error : `Expected: ${c.expected}\nGot: ${c.actual || "(nothing)"}`}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Question-type plugins on the student side. The server says which "type" a question is,
// and this registry picks the matching screen. A new type = one new entry here.
export const RENDERERS = {
  mcq: ({ q, value, onChange }) => {
    // Options may arrive in a per-student shuffled order. The answer sent back is always the ORIGINAL option number.
    const order = q.order || q.options.map((_, i) => i);
    return (
      <div className="qlist">
        {q.options.map((o, n) => (
          <button key={n} className={value === order[n] ? "on" : ""} onClick={() => onChange(order[n])}>{o}</button>
        ))}
      </div>
    );
  },
  fill: ({ value, onChange }) => (
    <div className="answer-box"><input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Type your answer" /></div>
  ),
  short: ({ value, onChange }) => (
    <div className="answer-box"><textarea rows={7} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Write your answer" /></div>
  ),
  code: CodeQuestion,
};
