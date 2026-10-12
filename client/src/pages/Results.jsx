import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, download } from "../api.js";
import { level } from "../integrityLabels.js";

const heat = (v) => (v === null ? "#e6e9f0" : `hsl(${Math.round(v * 120)} 55% 65%)`); // red (0) to green (1), grey = blank

export default function Results() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { api(`/sessions/${code}/results`).then(setData).catch((e) => setError(e.message)); }, [code]);

  if (error) return <main className="page"><p className="error">{error}</p><Link to="/teacher">Back to dashboard</Link></main>;
  if (!data) return <p className="center">Loading results...</p>;

  const { summary, distribution, questions, topics, students } = data;
  const weak = topics.filter((t) => t.weak);

  // One click: build a request from the weak topics and the most-missed questions, then let the AI draft a quiz.
  function followUp() {
    const missed = questions.filter((q) => q.accuracy < 60).slice(0, 6).map((q) => `- ${q.text}`).join("\n");
    const instruction =
      `Create follow-up practice questions for students who struggled. Focus on these weak topics: ${weak.map((t) => `${t.topic} (class accuracy ${t.accuracy}%)`).join(", ")}.\n` +
      `The class missed these questions most often, so teach the same ideas with new wording and examples:\n${missed}\nUse a mix of easy and medium difficulty.`;
    navigate("/teacher/create", { state: { instruction, count: 5, title: "Follow-up: " + weak.map((t) => t.topic).join(", ").slice(0, 60), autoGenerate: true } });
  }

  return (
    <main className="page">
      <header className="top">
        <div><h1>{data.title}</h1><p className="muted">Session {data.code}, {data.status === "ENDED" ? "ended" : "still " + data.status.toLowerCase()}</p></div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="ghost" onClick={() => download(`/sessions/${code}/export.csv`, `results-${code}.csv`).catch((e) => setError(e.message))}>Export CSV</button>
          <Link to="/teacher">Back to dashboard</Link>
        </div>
      </header>

      <div className="grid">
        {[["Submitted", `${summary.submitted} of ${summary.joined}`], ["Class average", summary.average + "%"], ["Median", summary.median + "%"], ["Highest / lowest", `${summary.highest}% / ${summary.lowest}%`]].map(([k, v]) => (
          <div className="card stat" key={k}><p className="muted">{k}</p><div className="statnum">{v}</div></div>
        ))}
      </div>

      {summary.submitted === 0 ? <p className="muted" style={{ marginTop: 20 }}>No submissions yet, so there is nothing to chart.</p> : (<>
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Score distribution</h2>
          <p className="muted">How many students landed in each score range (percent).</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="range" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip />
              <Bar dataKey="count" name="Students" fill="#3f74c9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h2>Item accuracy heatmap</h2>
          <p className="muted">Green is correct, red is wrong, grey was left blank. Dark red columns show widespread misconceptions.</p>
          <div style={{ overflowX: "auto" }}>
            <table className="heat">
              <thead><tr><th />{questions.map((q) => <th key={q.id} title={`Q${q.number}: ${q.text}`}>Q{q.number}</th>)}</tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td className="name"><Link to={`/teacher/results/${code}/student/${s.id}`}>{s.name}</Link></td>
                    {questions.map((q) => <td key={q.id} style={{ background: heat(s.cells[q.id]) }} title={`${s.name}, Q${q.number}`} />)}
                  </tr>
                ))}
                <tr><td className="name"><b>Class accuracy</b></td>{questions.map((q) => <td key={q.id} className="acc">{q.accuracy}%</td>)}</tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h2>Topics</h2>
          {topics.map((t) => (
            <div className="topic" key={t.topic}>
              <span>{t.topic} <span className="muted">({t.questions} question{t.questions > 1 ? "s" : ""})</span></span>
              <div className="track"><i className={t.weak ? "bad" : "ok"} style={{ width: t.accuracy + "%" }} /></div>
              <b>{t.accuracy}%</b>
            </div>
          ))}
          {weak.length > 0 ? (
            <div style={{ marginTop: 14 }}>
              <p className="muted">Weak topics: {weak.map((t) => t.topic).join(", ")}</p>
              <button onClick={followUp}>Generate follow-up quiz</button>
            </div>
          ) : <p className="muted" style={{ marginTop: 10 }}>No weak topics. Every topic is at 60% or above.</p>}
        </div>

        <div className="card" style={{ marginTop: 16, overflowX: "auto" }}>
          <h2>Students</h2>
          <table className="table">
            <thead><tr><th>Student</th><th>Score</th><th>Percent</th><th>Integrity</th><th>Flags</th><th /></tr></thead>
            <tbody>
              {[...students].sort((a, b) => b.percent - a.percent).map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td><td>{Number(s.score).toFixed(1)} / {questions.length}</td><td>{s.percent}%</td>
                  <td><span className={`tag ${level(s.integrity)}`}>{s.integrity} / 100</span></td><td>{s.flags}</td>
                  <td><Link to={`/teacher/results/${code}/student/${s.id}`}>View details</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}
    </main>
  );
}
