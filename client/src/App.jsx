import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { GuestRoute, ProtectedRoute } from './components/RouteGuards';
import Home from './pages/Home';
import Login from './pages/Login';
import Placeholder from './pages/Placeholder';
import Profile from './pages/Profile';
import Register from './pages/Register';
import Verify from './pages/Verify';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/verify" element={<GuestRoute><Verify /></GuestRoute>} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Home />} />
        <Route path="/tasks" element={<Placeholder title="Görevler" />} />
        <Route path="/calendar" element={<Placeholder title="Takvim" />} />
        <Route path="/stats" element={<Placeholder title="İstatistik" />} />
        <Route path="/exams" element={<Placeholder title="Sınavlar" />} />
        <Route path="/music" element={<Placeholder title="Müzik" />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}