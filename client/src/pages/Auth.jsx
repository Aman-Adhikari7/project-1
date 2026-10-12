import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

// One component handles both login and register, chosen by the "mode" prop.
export default function Auth({ mode }) {
  const isRegister = mode === "register";
  const { authenticate } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STUDENT" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await authenticate(mode, form);
      navigate(user.role === "TEACHER" ? "/teacher" : "/student");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <form className="card" onSubmit={submit}>
        <h1>CodePules</h1>
        <p className="muted">{isRegister ? "Create your account" : "Log in to continue"}</p>

        {isRegister && (
          <>
            <label>Name<input value={form.name} onChange={set("name")} required /></label>
            <label>I am a
              <select value={form.role} onChange={set("role")}>
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
              </select>
            </label>
          </>
        )}
        <label>Email<input type="email" value={form.email} onChange={set("email")} required /></label>
        <label>Password<input type="password" minLength={6} value={form.password} onChange={set("password")} required /></label>

        {error && <p className="error">{error}</p>}
        <button disabled={busy}>{busy ? "Please wait..." : isRegister ? "Create account" : "Log in"}</button>

        <p className="muted">
          {isRegister ? <>Already have an account? <Link to="/login">Log in</Link></> : <>New here? <Link to="/register">Create an account</Link></>}
        </p>
      </form>
    </main>
  );
}
