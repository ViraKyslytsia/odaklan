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
    checkNickname: (nickname) => request(`/api/profile/nickname-check?nickname=${encodeURIComponent(nickname)}`),
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
    addSubtask: (examId, data) => request(`/api/exams/${examId}/subtasks`, json('POST', data)),
    updateSubtask: (examId, subId, data) =>
        request(`/api/exams/${examId}/subtasks/${subId}`, json('PATCH', data)),
    deleteSubtask: (examId, subId) =>
        request(`/api/exams/${examId}/subtasks/${subId}`, { method: 'DELETE' }),
    // Сессии и статистика
    saveSession: (data) => request('/api/sessions', json('POST', data)),
    getDayStats: (date) => request(`/api/stats/day?date=${date}`),
    getRangeStats: (from, to) => request(`/api/stats/range?from=${from}&to=${to}`),
    getSeries: (period, date, subjectIds) =>
        request(
            `/api/stats/series?period=${period}&date=${date}&tz=${new Date().getTimezoneOffset()}` +
            `&subjects=${subjectIds.join(',')}`
        ),
    // Расписание
    getSchedule: (day) => request(`/api/schedule${day ? `?day=${day}` : ''}`),
    createScheduleItem: (data) => request('/api/schedule', json('POST', data)),
    updateScheduleItem: (id, data) => request(`/api/schedule/${id}`, json('PUT', data)),
    deleteScheduleItem: (id) => request(`/api/schedule/${id}`, { method: 'DELETE' }),

    // Социальное: друзья, блокировки, группы, рейтинг
    sendPresence: (studying) => request('/api/social/presence', json('POST', { studying })),
    getSocial: () => request('/api/social/overview'),
    searchUsers: (q) => request(`/api/social/search?q=${encodeURIComponent(q)}`),
    sendFriendRequest: (userId) => request('/api/social/requests', json('POST', { userId })),
    acceptFriendRequest: (userId) => request(`/api/social/requests/${userId}/accept`, { method: 'POST' }),
    cancelFriendRequest: (userId) => request(`/api/social/requests/${userId}`, { method: 'DELETE' }),
    removeFriend: (userId) => request(`/api/social/friends/${userId}`, { method: 'DELETE' }),
    blockUser: (userId) => request('/api/social/blocks', json('POST', { userId })),
    unblockUser: (userId) => request(`/api/social/blocks/${userId}`, { method: 'DELETE' }),
    createGroup: (name) => request('/api/social/groups', json('POST', { name })),
    joinGroup: (code) => request('/api/social/groups/join', json('POST', { code })),
    leaveGroup: (id) => request(`/api/social/groups/${id}/leave`, { method: 'POST' }),
    deleteGroup: (id) => request(`/api/social/groups/${id}`, { method: 'DELETE' }),
    getLeaderboard: (date, groupId) =>
        request(
            `/api/social/leaderboard?date=${date}` +
            (groupId ? `&scope=group&group=${groupId}` : '&scope=friends')
        ),
    getUserMonth: (userId, month) => request(`/api/social/users/${userId}/month?month=${month}`),
};