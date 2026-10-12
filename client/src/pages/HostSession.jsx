import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { connectSocket } from "../socket.js";
import { LABELS, level } from "../integrityLabels.js";

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// Teacher control room: share the code, start the test, watch scores and integrity live.
export default function HostSession() {
  const { code } = useParams();
  const sock = useRef(null);
  const [info, setInfo] = useState({ title: "", status: "LOBBY" });
  const [names, setNames] = useState([]);
  const [roster, setRoster] = useState([]);
  const [minutes, setMinutes] = useState(10);
  const [endsAt, setEndsAt] = useState(null);
  const [left, setLeft] = useState(0);
  const [picked, setPicked] = useState(null); // student whose timeline is open
  const [timeline, setTimeline] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const s = connectSocket();
    sock.current = s;
    s.on("connect_error", (e) => setError(e.message));
    s.on("lobby:update", setNames);
    s.on("host:roster", setRoster);
    s.on("exam:end", () => setInfo((i) => ({ ...i, status: "ENDED" })));
    s.on("connect", () =>
      s.emit("host:join", { code }, (r) => {
        if (r.error) return setError(r.error);
        setInfo({ title: r.title, status: r.status }); setNames(r.names); setRoster(r.roster); setEndsAt(r.endsAt);
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

  const start = () => sock.current.emit("host:start", { code, minutes }, (r) => {
    if (r.error) return setError(r.error);
    setEndsAt(r.endsAt); setInfo((i) => ({ ...i, status: "LIVE" }));
  });
  const end = () => sock.current.emit("host:end", { code }, (r) => r.error && setError(r.error));
  const openStudent = (st) => {
    setPicked(st);
    sock.current.emit("host:timeline", { code, studentId: st.id }, (r) => setTimeline(r.events || []));
  };
  const submitted = roster.filter((r) => r.submitted).length;

  return (
    <main className="page">
      <header className="top">
        <h1>{info.title || "Live session"}</h1>
        <Link to="/teacher">Back to dashboard</Link>
      </header>
      {error && <p className="error">{error}</p>}

      <div className="card center-card">
        <p className="muted">Students join with this code</p>
        <div className="bigcode">{code}</div>
        <span className="badge">{info.status === "LOBBY" ? "Waiting in lobby" : info.status === "LIVE" ? `Test is live, ${fmt(left)} left` : "Test ended"}</span>
      </div>

      <div className="grid" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Students in the room ({names.length})</h2>
          {names.length === 0 ? <p className="muted">Nobody has joined yet.</p> : <div className="chips">{names.map((n, k) => <span className="chip" key={k}>{n}</span>)}</div>}
        </div>
        <div className="card">
          {info.status === "LOBBY" && (<>
            <h2>Start the test</h2>
            <label>Time limit (minutes)<input type="number" min={1} max={180} value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label>
            <button style={{ marginTop: 12 }} onClick={start}>Start for everyone</button>
          </>)}
          {info.status === "LIVE" && (<>
            <h2>{submitted} of {roster.length} submitted</h2>
            <p className="muted">The test ends automatically when time runs out.</p>
            <button className="ghost" onClick={end}>End test now</button>
          </>)}
          {info.status === "ENDED" && (<><h2>Test ended</h2><p className="muted">{submitted} submissions were graded.</p><Link to={"/teacher/results/" + code}>View full results</Link></>)}
        </div>
      </div>

      {roster.length > 0 && (
        <div className="card" style={{ marginTop: 16, overflowX: "auto" }}>
          <h2>Students</h2>
          <p className="muted">Click a student to see their integrity timeline.</p>
          <table className="table">
            <thead><tr><th>Student</th><th>Status</th><th>Score</th><th>Integrity</th><th>Flags</th></tr></thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => openStudent(r)}>
                  <td>{r.name}</td>
                  <td>{r.submitted ? "Submitted" : "In progress"}</td>
                  <td>{r.score === null ? "-" : Number(r.score).toFixed(1)}</td>
                  <td><span className={`tag ${level(r.integrity)}`}>{r.integrity} / 100</span></td>
                  <td>{r.flags}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {picked && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>{picked.name}: integrity timeline</h2>
          {timeline.length === 0 ? <p className="muted">No suspicious activity recorded.</p> : (
            <ul className="timeline">
              {timeline.map((e, k) => (
                <li key={k}><span className="mono">{new Date(e.t).toLocaleTimeString()}</span> {LABELS[e.type] || e.type}{e.detail ? ` (${e.detail})` : ""}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
