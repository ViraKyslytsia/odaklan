import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
    const { isAuth } = useAuth();
    return isAuth ? children : <Navigate to="/login" replace />;
}

export function GuestRoute({ children }) {
    const { isAuth } = useAuth();
    return isAuth ? <Navigate to="/" replace /> : children;
}