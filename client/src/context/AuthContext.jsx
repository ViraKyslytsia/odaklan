import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { clearToken, getToken, setToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setTokenState] = useState(getToken());

    const signIn = useCallback((newToken, remember = true) => {
        setToken(newToken, remember);
        setTokenState(newToken);
    }, []);

    const signOut = useCallback(() => {
        clearToken();
        setTokenState(null);
    }, []);

    // api/client.js шлёт это событие, когда сервер ответил 401 (токен недействителен)
    useEffect(() => {
        const onLogout = () => setTokenState(null);
        window.addEventListener('auth:logout', onLogout);
        return () => window.removeEventListener('auth:logout', onLogout);
    }, []);

    return (
        <AuthContext.Provider value={{ isAuth: Boolean(token), signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);