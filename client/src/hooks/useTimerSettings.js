import { useState } from 'react';
import { BREAK_MINUTES, FOCUS_MINUTES } from '../config/timer';

const KEY = 'odaklan_timer_settings';
const DEFAULTS = { focusMinutes: FOCUS_MINUTES, breakMinutes: BREAK_MINUTES, notify: false };

function load() {
    try {
        return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) };
    } catch {
        return DEFAULTS;
    }
}

export function useTimerSettings() {
    const [settings, setSettings] = useState(load);

    function save(next) {
        setSettings(next);
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
            // хранилище недоступно: настройки будут действовать до перезагрузки
        }
    }

    return [settings, save];
}