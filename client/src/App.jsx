import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import Auth from "./pages/Auth.jsx";
import TeacherDashboard from "./pages/TeacherDashboard.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import StudentExam from "./pages/StudentExam.jsx";
import CreateTest from "./pages/CreateTest.jsx";
import HostSession from "./pages/HostSession.jsx";
import LiveExam from "./pages/LiveExam.jsx";
import Results from "./pages/Results.jsx";
import StudentDetail from "./pages/StudentDetail.jsx";
import History from "./pages/History.jsx";
import Review from "./pages/Review.jsx";
import AdaptivePractice from "./pages/AdaptivePractice.jsx";

const home = (user) => (user.role === "TEACHER" ? "/teacher" : "/student");

// Only lets the right role into a page. Everyone else is sent elsewhere.
function Protected({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={home(user)} replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading...</p>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home(user)} /> : <Auth mode="login" />} />
      <Route path="/register" element={user ? <Navigate to={home(user)} /> : <Auth mode="register" />} />
      <Route path="/teacher" element={<Protected role="TEACHER"><TeacherDashboard /></Protected>} />
      <Route path="/teacher/create" element={<Protected role="TEACHER"><CreateTest /></Protected>} />
      <Route path="/teacher/host/:code" element={<Protected role="TEACHER"><HostSession /></Protected>} />
      <Route path="/student/live/:code" element={<Protected role="STUDENT"><LiveExam /></Protected>} />
      <Route path="/teacher/results/:code" element={<Protected role="TEACHER"><Results /></Protected>} />
      <Route path="/teacher/results/:code/student/:studentId" element={<Protected role="TEACHER"><StudentDetail /></Protected>} />
      <Route path="/student/history" element={<Protected role="STUDENT"><History /></Protected>} />
      <Route path="/student/history/:sessionId" element={<Protected role="STUDENT"><Review /></Protected>} />
      <Route path="/student/practice" element={<Protected role="STUDENT"><AdaptivePractice /></Protected>} />
      <Route path="/student" element={<Protected role="STUDENT"><StudentDashboard /></Protected>} />
      <Route path="/student/exam-demo" element={<Protected role="STUDENT"><StudentExam /></Protected>} />
      <Route path="*" element={<Navigate to={user ? home(user) : "/login"} replace />} />
    </Routes>
  );
}
