import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On page load, if a token exists, ask the backend who we are.
  useEffect(() => {
    if (!localStorage.getItem("token")) return setLoading(false);
    api("/me").then(setUser).catch(() => localStorage.removeItem("token")).finally(() => setLoading(false));
  }, []);

  async function authenticate(mode, form) {
    const data = await api("/auth/" + mode, { method: "POST", body: form });
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, authenticate, logout }}>{children}</AuthContext.Provider>;
}
