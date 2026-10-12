import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { connectSocket } from "../socket.js";
import { RENDERERS } from "../questionTypes.jsx";
import { useAntiCheat } from "../useAntiCheat.js";

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const hasAnswer = (v) => v !== undefined && v !== null && v !== "";

// The student's whole journey: lobby, live test (with anti-cheat), result.
export default function LiveExam() {
  const { code } = useParams();
  const sock = useRef(null);
  const [phase, setPhase] = useState("connecting"); // connecting | lobby | live | done | error
  const [title, setTitle] = useState("");
  const [names, setNames] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [i, setI] = useState(0);
  const [endsAt, setEndsAt] = useState(null);
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const q = questions[i];
  const anti = useAntiCheat({ sock, code, active: phase === "live", currentId: q?.id });

  useEffect(() => {
    const s = connectSocket();
    sock.current = s;
    const fail = (m) => { setError(m); setPhase("error"); };
    s.on("connect_error", (e) => fail(e.message));
    s.on("lobby:update", setNames);
    s.on("exam:start", (d) => { setQuestions(d.questions); setEndsAt(d.endsAt); setPhase("live"); });
    s.on("exam:end", () => s.emit("student:result", { code }, (r) => { setResult(r.result); setPhase("done"); }));
    // Runs on first connect and after any network drop, so students never lose their place.
    s.on("connect", () =>
      s.emit("student:join", { code }, (r) => {
        if (r.error) return fail(r.error);
        setTitle(r.title);
        if (r.status !== "LIVE") return setPhase("lobby");
        setQuestions(r.questions); setAnswers(r.answers || {}); setEndsAt(r.endsAt);
        if (r.submitted) { setResult(r.result); setPhase("done"); } else setPhase("live");
      }));
    return () => s.disconnect();
  }, [code]);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setLeft(Math.max(0, Math.round((new Date(endsAt) - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  useEffect(() => {
    if (phase === "done" && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, [phase]);

  function setAnswer(qid, value) {
    const cur = questions.find((x) => x.id === qid);
    anti.checkInsert(answers[qid] ?? (cur?.type === "code" ? cur.starterCode : undefined), value);
    const next = { ...answers, [qid]: value };
    setAnswers(next);
    sock.current.emit("answer:save", { code, answers: next });
  }
  const go = (n) => {
    if (q.type !== "code") anti.checkTyping(q.id, answers[q.id]);
    setI(Math.max(0, Math.min(questions.length - 1, n)));
  };
  function submit() {
    setConfirming(false);
    questions.forEach((x) => x.type !== "code" && anti.checkTyping(x.id, answers[x.id]));
    // Short pause so any last integrity report reaches the server before grading.
    setTimeout(() => sock.current.emit("student:submit", { code }, (r) => {
      if (r.error) return setError(r.error);
      setResult(r.result); setPhase("done");
    }), 400);
  }

  if (phase === "connecting") return <p className="center">Connecting...</p>;
  if (phase === "error") return <main className="auth"><div className="card"><h2>Can't join</h2><p className="error">{error}</p><Link to="/student">Back to dashboard</Link></div></main>;
  if (phase === "lobby") return (
    <main className="auth"><div className="card" style={{ textAlign: "center" }}>
      <h2>{title}</h2><p className="muted">Waiting for your teacher to start the test.</p>
      <p className="muted">This test needs fullscreen. Leaving the page, switching tabs, or pasting is recorded.</p>
      <div className="chips" style={{ justifyContent: "center", marginTop: 12 }}>{names.map((n, k) => <span className="chip" key={k}>{n}</span>)}</div>
    </div></main>
  );
  if (phase === "done") {
    const pct = result?.total ? Math.round((result.score / result.total) * 100) : 0;
    return (
      <main className="page">
        <div className="card center-card">
          <p className="muted">{title}</p>
          <div className="bigcode">{Number(result?.score || 0).toFixed(1)} / {result?.total}</div>
          <p className="muted">{pct}% correct</p>
          <Link to="/student">Back to dashboard</Link>
        </div>
        <div className="grid" style={{ marginTop: 16 }}>
          {questions.map((x, n) => {
            const r = result?.results?.[x.id];
            return (
              <div className={`case ${r?.correct ? "pass" : "fail"}`} key={x.id} style={{ margin: 0, flexDirection: "column", gap: 4 }}>
                <b>Q{n + 1}: {r?.correct ? "Correct" : r?.score > 0 ? "Partly correct" : "Incorrect"}</b>
                {r?.feedback && r.feedback !== "Correct" && r.feedback !== "Incorrect" && <span>{r.feedback}</span>}
              </div>
            );
          })}
        </div>
      </main>
    );
  }

  const Render = RENDERERS[q.type];
  const answered = questions.filter((x) => hasAnswer(answers[x.id])).length;
  const unanswered = questions.length - answered;
  return (
    <div className="exam">
      {anti.supported && !anti.inFullscreen && (
        <div className="lock"><div className="card center-card">
          <h2>Fullscreen is required</h2>
          <p className="muted">Your teacher needs this test in fullscreen. Leaving it is recorded.</p>
          <button onClick={anti.enterFullscreen}>Enter fullscreen</button>
        </div></div>
      )}
      {confirming && (
        <div className="lock"><div className="card center-card">
          <h2>Submit your test?</h2>
          <p className="muted">{unanswered ? `${unanswered} question(s) are unanswered.` : "All questions are answered."} You can't change answers after submitting.</p>
          <div className="actions" style={{ justifyContent: "center" }}>
            <button className="ghost" onClick={() => setConfirming(false)}>Keep working</button>
            <button onClick={submit}>Submit now</button>
          </div>
        </div></div>
      )}
      <div className="exam-bar">
        <b>{title}</b><span className="spacer" />
        {anti.warnings > 0 && <span className="pill warnpill">{anti.warnings} integrity warning{anti.warnings > 1 ? "s" : ""} recorded</span>}
        <span className="pill">Time left: <b>{fmt(left)}</b></span>
        <button onClick={() => setConfirming(true)}>Submit test</button>
      </div>
      <div className="exam-body" style={{ gridTemplateColumns: "170px 1fr" }}>
        <section className="panel">
          <div className="panel-title">Progress</div>
          <div className="progress"><i style={{ width: `${(answered / questions.length) * 100}%` }} /></div>
          <div className="qlist">
            {questions.map((x, n) => (
              <button key={x.id} className={`${n === i ? "on" : ""} ${hasAnswer(answers[x.id]) ? "done" : ""}`} onClick={() => go(n)}>Q{n + 1}</button>
            ))}
          </div>
        </section>
        <section className="panel" style={{ overflowY: "auto" }}>
          <div className="panel-title">Question {i + 1} of {questions.length}</div>
          <div className="prompt">{q.question}</div>
          <Render q={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
          <div className="actions" style={{ margin: 16, justifyContent: "space-between" }}>
            <button className="ghost" disabled={i === 0} onClick={() => go(i - 1)}>Previous</button>
            <button className="ghost" disabled={i === questions.length - 1} onClick={() => go(i + 1)}>Next</button>
          </div>
        </section>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
