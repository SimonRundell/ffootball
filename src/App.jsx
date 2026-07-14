import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Header from './components/Header.jsx';
import RequireRole from './components/RequireRole.jsx';
import Login from './pages/Login.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import Workbench from './pages/Workbench.jsx';
import Students from './pages/Students.jsx';
import Admin from './pages/Admin.jsx';
import './App.css';

/**
 * Redirects "/" to the workbench once logged in, or to login otherwise.
 * RequireRole on the /workbench route itself handles the not-logged-in
 * and must-change-password cases.
 */
function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="loading-notice">Loading...</p>;
  }

  return <Navigate to={user ? '/workbench' : '/login'} replace />;
}

/** Top-level app: routing, auth provider, header. */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route
              path="/workbench"
              element={
                <RequireRole minRole="student">
                  <Workbench />
                </RequireRole>
              }
            />
            <Route
              path="/students"
              element={
                <RequireRole minRole="teacher">
                  <Students />
                </RequireRole>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireRole minRole="admin">
                  <Admin />
                </RequireRole>
              }
            />
          </Routes>
        </main>
      </AuthProvider>
    </BrowserRouter>
  );
}
