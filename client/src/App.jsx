import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { GuestRoute, ProtectedRoute } from './components/RouteGuards';
import Exams from './pages/Exams';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Register from './pages/Register';
import Schedule from './pages/Schedule.jsx';
import Stats from './pages/Stats';
import Tasks from './pages/Tasks';
import Verify from './pages/Verify';
import Social from './pages/Social';
export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/verify" element={<GuestRoute><Verify /></GuestRoute>} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<Home />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/calendar" element={<Navigate to="/stats" replace />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/social" element={<Social />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}