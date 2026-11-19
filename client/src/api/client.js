const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'odaklan_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

export async function request(path, { method = 'GET', body, auth = true } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const token = getToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
        res = await fetch(`${BASE}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new ApiError('Sunucuya ulaşılamıyor', 0);
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        // токен протух или недействителен: сообщаем приложению, что нужно выйти
        if (res.status === 401 && auth && token) {
            clearToken();
            window.dispatchEvent(new Event('auth:logout'));
        }
        throw new ApiError(data?.error || 'Request failed', res.status);
    }

    return data;
}