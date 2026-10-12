import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  function join(e) {
    e.preventDefault();
    if (code.trim()) navigate("/student/live/" + code.trim().toUpperCase());
  }

  return (
    <main className="page">
      <header className="top">
        <h1>Hi, {user.name}</h1>
        <button className="ghost" onClick={logout}>Log out</button>
      </header>
      <div className="grid">
        <form className="card" onSubmit={join} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2>Join a test</h2>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter the code" maxLength={6} style={{ textTransform: "uppercase" }} />
          <button>Join</button>
        </form>
        <Link to="/student/exam-demo" className="card link"><h2>Preview the exam screen</h2><p className="muted">See how a coding test will look.</p><span className="badge">UI preview</span></Link>
        <Link to="/student/history" className="card link"><h2>My history</h2><p className="muted">Review past tests and practise their questions.</p><span className="badge">Open</span></Link>
        <Link to="/student/practice" className="card link"><h2>Adaptive practice</h2><p className="muted">Questions that get harder as you improve.</p><span className="badge">Start</span></Link>
      </div>
    </main>
  );
}
