const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'odaklan_token';

export const getToken = () =>
    localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

export const setToken = (token, remember = true) => {
    clearToken();
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('odaklan_name');
};

export class ApiError extends Error {
    constructor(message, status, code) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

const TIMEOUT_MS = 75000; // сервер на бесплатном хостинге просыпается около минуты
const RETRY_STATUSES = [502, 503, 504];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

export async function request(path, { method = 'GET', body, auth = true } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const token = getToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    const options = {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    };
    // повторяем только чтение: повтор записи мог бы создать дубликат
    const attempts = method === 'GET' ? 3 : 1;
    let res;
    for (let i = 1; i <= attempts; i++) {
        try {
            res = await fetchWithTimeout(`${BASE}${path}`, options);
        } catch {
            if (i === attempts) throw new ApiError('Network error', 0);
            await wait(2000 * i);
            continue;
        }
        if (!RETRY_STATUSES.includes(res.status) || i === attempts) break;
        await wait(2000 * i);
    }
    
    const data = await res.json().catch(() => null);

    if (!res.ok) {
        // токен протух или недействителен: сообщаем приложению, что нужно выйти
        if (res.status === 401 && auth && token) {
            clearToken();
            window.dispatchEvent(new Event('auth:logout'));
        }
        // аккаунт заблокирован админом: выходим и запоминаем, чтобы показать сообщение на странице входа
        if (res.status === 403 && data?.code === 'blocked' && auth && token) {
            sessionStorage.setItem('odaklan_blocked', '1');
            clearToken();
            window.dispatchEvent(new Event('auth:logout'));
        }
        // если сервер не ответил JSON-ом (обычно он просто не запущен), показываем код ответа
        throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.code);
    }

    return data;
}