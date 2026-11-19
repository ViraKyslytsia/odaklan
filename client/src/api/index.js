import { request } from './client';

const json = (method, body) => ({ method, body });

export const api = {
    health: () => request('/api/health', { auth: false }),

    // Auth (токен тут не нужен)
    register: (data) => request('/api/auth/register', { ...json('POST', data), auth: false }),
    verify: (data) => request('/api/auth/verify', { ...json('POST', data), auth: false }),
    resend: (data) => request('/api/auth/resend', { ...json('POST', data), auth: false }),
    login: (data) => request('/api/auth/login', { ...json('POST', data), auth: false }),

    // Профиль
    getProfile: () => request('/api/profile'),
    updateProfile: (data) => request('/api/profile', json('PUT', data)),

    // Предметы
    getSubjects: () => request('/api/subjects'),
    createSubject: (data) => request('/api/subjects', json('POST', data)),
    updateSubject: (id, data) => request(`/api/subjects/${id}`, json('PUT', data)),
    deleteSubject: (id) => request(`/api/subjects/${id}`, { method: 'DELETE' }),

    // Задачи
    getTasks: (date) => request(`/api/tasks${date ? `?date=${date}` : ''}`),
    createTask: (data) => request('/api/tasks', json('POST', data)),
    updateTask: (id, data) => request(`/api/tasks/${id}`, json('PUT', data)),
    toggleTask: (id) => request(`/api/tasks/${id}/toggle`, { method: 'PATCH' }),
    deleteTask: (id) => request(`/api/tasks/${id}`, { method: 'DELETE' }),

    // Экзамены
    getExams: () => request('/api/exams'),
    createExam: (data) => request('/api/exams', json('POST', data)),
    updateExam: (id, data) => request(`/api/exams/${id}`, json('PUT', data)),
    toggleSubtask: (examId, subId) =>
        request(`/api/exams/${examId}/subtasks/${subId}/toggle`, { method: 'PATCH' }),
    deleteExam: (id) => request(`/api/exams/${id}`, { method: 'DELETE' }),

    // Сессии и статистика
    saveSession: (data) => request('/api/sessions', json('POST', data)),
    getDayStats: (date) => request(`/api/stats/day?date=${date}`),
    getRangeStats: (from, to) => request(`/api/stats/range?from=${from}&to=${to}`),

    // Расписание
    getSchedule: (day) => request(`/api/schedule${day ? `?day=${day}` : ''}`),
    createScheduleItem: (data) => request('/api/schedule', json('POST', data)),
    updateScheduleItem: (id, data) => request(`/api/schedule/${id}`, json('PUT', data)),
    deleteScheduleItem: (id) => request(`/api/schedule/${id}`, { method: 'DELETE' }),
};