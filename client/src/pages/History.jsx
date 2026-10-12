import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

// Every finished test the student has taken.
export default function History() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api("/student/history").then(setRows).catch((e) => setError(e.message)); }, []);

  return (
    <main className="page">
      <header className="top"><h1>My history</h1><Link to="/student">Back to dashboard</Link></header>
      {error && <p className="error">{error}</p>}
      {rows === null ? <p className="muted">Loading...</p> : rows.length === 0 ? (
        <p className="muted">Finished tests appear here once your teacher ends the session.</p>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead><tr><th>Test</th><th>Date</th><th>Score</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sessionId}>
                  <td>{r.title}</td><td>{new Date(r.date).toLocaleDateString()}</td>
                  <td>{Number(r.score).toFixed(1)} / {r.total}</td>
                  <td><Link to={"/student/history/" + r.sessionId}>Review and practise</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted" style={{ marginTop: 16 }}>Want mixed practice across all your tests? <Link to="/student/practice">Try adaptive practice</Link>.</p>
    </main>
  );
}
