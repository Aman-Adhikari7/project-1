const LABELS = { mcq: "Multiple choice", short: "Short answer", fill: "Fill in the blank", code: "Coding" };

// Lets the teacher fix any AI mistake before the test is saved.
export default function QuestionEditor({ q, index, onChange, onDelete }) {
  const d = q.data;
  const setData = (patch) => onChange({ ...q, data: { ...d, ...patch } });
  const setTop = (patch) => onChange({ ...q, ...patch });

  return (
    <div className="card qedit">
      <div className="qhead">
        <b>Q{index + 1}: {LABELS[q.type]}</b>
        <span className="spacer" />
        <select value={q.difficulty} onChange={(e) => setTop({ difficulty: e.target.value })}>
          <option>easy</option><option>medium</option><option>hard</option>
        </select>
        <button className="ghost" onClick={onDelete}>Delete</button>
      </div>

      <label>Question
        <textarea rows={2} value={d.question} onChange={(e) => setData({ question: e.target.value })} />
      </label>

      {q.type === "mcq" && (
        <div className="opts">
          <span className="muted">Select the correct option</span>
          {d.options.map((o, n) => (
            <div className="opt" key={n}>
              <input type="radio" checked={d.answerIndex === n} onChange={() => setData({ answerIndex: n })} />
              <input value={o} onChange={(e) => setData({ options: d.options.map((x, k) => (k === n ? e.target.value : x)) })} />
            </div>
          ))}
        </div>
      )}

      {q.type === "short" && (
        <>
          <label>Sample answer<textarea rows={2} value={d.sampleAnswer} onChange={(e) => setData({ sampleAnswer: e.target.value })} /></label>
          <label>Grading rubric<textarea rows={2} value={d.rubric} onChange={(e) => setData({ rubric: e.target.value })} /></label>
        </>
      )}

      {q.type === "fill" && (
        <label>Accepted answers (separate with commas)
          <input value={d.answers.join(", ")} onChange={(e) => setData({ answers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
        </label>
      )}

      {q.type === "code" && (
        <>
          <label>Language
            <select value={d.language} onChange={(e) => setData({ language: e.target.value })}>
              {["python", "javascript", "cpp", "java"].map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
          <label>Starter code<textarea className="mono" rows={4} value={d.starterCode} onChange={(e) => setData({ starterCode: e.target.value })} /></label>
          <label>Reference solution (teacher only)<textarea className="mono" rows={5} value={d.solution} onChange={(e) => setData({ solution: e.target.value })} /></label>
          <div className="opts">
            <span className="muted">Test cases. Hidden ones are never shown to students. Check the expected outputs carefully.</span>
            {d.testCases.map((t, n) => {
              const setCase = (patch) => setData({ testCases: d.testCases.map((x, k) => (k === n ? { ...x, ...patch } : x)) });
              return (
                <div className="tc" key={n}>
                  <textarea className="mono" rows={2} placeholder="Input (stdin)" value={t.input} onChange={(e) => setCase({ input: e.target.value })} />
                  <textarea className="mono" rows={2} placeholder="Expected output" value={t.expected} onChange={(e) => setCase({ expected: e.target.value })} />
                  <label className="check"><input type="checkbox" checked={t.hidden} onChange={(e) => setCase({ hidden: e.target.checked })} /> Hidden</label>
                  <button className="ghost" onClick={() => setData({ testCases: d.testCases.filter((_, k) => k !== n) })}>Remove</button>
                </div>
              );
            })}
            <button className="ghost" style={{ alignSelf: "flex-start" }} onClick={() => setData({ testCases: [...d.testCases, { input: "", expected: "", hidden: false }] })}>Add test case</button>
          </div>
        </>
      )}

      {(q.type === "mcq" || q.type === "fill") && (
        <label>Explanation shown to students later
          <input value={d.explanation} onChange={(e) => setData({ explanation: e.target.value })} />
        </label>
      )}
      <span className="badge">Topic: {q.topic}</span>
    </div>
  );
}
