import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/tests").then(setTests).catch(() => {});
    api("/sessions").then(setSessions).catch(() => {});
  }, []);

  async function startSession(testId) {
    try {
      const { code } = await api("/sessions", { method: "POST", body: { testId } });
      navigate("/teacher/host/" + code);
    } catch (err) { setError(err.message); }
  }

  return (
    <main className="page">
      <header className="top">
        <h1>Welcome, {user.name}</h1>
        <button className="ghost" onClick={logout}>Log out</button>
      </header>
      <Link to="/teacher/create" className="card link"><h2>Create a test</h2><p className="muted">Write a prompt or upload a PDF and let AI write the questions.</p><span className="badge">Open</span></Link>

      <h2 style={{ margin: "28px 0 12px" }}>Your tests</h2>
      {error && <p className="error">{error}</p>}
      {tests.length === 0 ? <p className="muted">No tests yet. Create your first one above.</p> : (
        <div className="grid">
          {tests.map((t) => (
            <div className="card" key={t.id}>
              <h2>{t.title}</h2><p className="muted">{t._count.questions} questions</p>
              <button style={{ marginTop: 10 }} onClick={() => startSession(t.id)}>Start live session</button>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ margin: "28px 0 12px" }}>Sessions and results</h2>
      {sessions.length === 0 ? <p className="muted">Sessions you run will appear here.</p> : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead><tr><th>Test</th><th>Code</th><th>Status</th><th>Students</th><th>Date</th><th /></tr></thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.code}>
                  <td>{s.title}</td><td className="mono">{s.code}</td><td>{s.status}</td><td>{s.students}</td>
                  <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td>{s.status === "ENDED" ? <Link to={"/teacher/results/" + s.code}>View results</Link> : <Link to={"/teacher/host/" + s.code}>Open</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
