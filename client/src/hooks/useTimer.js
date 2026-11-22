import { useCallback, useEffect, useRef, useState } from 'react';
import { TOTAL_SETS } from '../config/timer';

export function useTimer({ focusSeconds, breakSeconds, onFocusComplete, onPhaseComplete }) {
    const [mode, setMode] = useState('focus');
    const [set, setSet] = useState(1);
    const [running, setRunning] = useState(false);
    const [remaining, setRemaining] = useState(focusSeconds);

    const endAtRef = useRef(null);
    const callbacksRef = useRef({});
    callbacksRef.current = { onFocusComplete, onPhaseComplete };

    const total = mode === 'focus' ? focusSeconds : breakSeconds;

    // Переход к следующему этапу: фокус -> перерыв, перерыв -> фокус следующего сета
    const advance = useCallback(() => {
        if (mode === 'focus') {
            setMode('break');
            setRemaining(breakSeconds);
        } else {
            setSet(set >= TOTAL_SETS ? 1 : set + 1);
            setMode('focus');
            setRemaining(focusSeconds);
        }
    }, [mode, set, focusSeconds, breakSeconds]);

    // Если сменилась длительность (настройки) или режим, а таймер стоит, показываем полное время
    useEffect(() => {
        if (!running) setRemaining(total);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [total]);

    useEffect(() => {
        if (!running) return;

        const id = setInterval(() => {
            const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
            setRemaining(left);
            if (left > 0) return;

            clearInterval(id);
            if (mode === 'focus') callbacksRef.current.onFocusComplete?.(focusSeconds);

            const cycleDone = mode === 'break' && set >= TOTAL_SETS; // закончился последний перерыв 4-го сета
            const nextSeconds = mode === 'focus' ? breakSeconds : focusSeconds;

            advance();
            if (cycleDone) {
                setRunning(false); // весь цикл из 4 сетов пройден, дальше сама
            } else {
                endAtRef.current = Date.now() + nextSeconds * 1000;
                setRunning(true); // следующий этап идёт сразу
            }
            callbacksRef.current.onPhaseComplete?.(mode);
        }, 250);

        return () => clearInterval(id);
    }, [running, mode, set, focusSeconds, breakSeconds, advance]);

    function start() {
        endAtRef.current = Date.now() + remaining * 1000;
        setRunning(true);
    }

    function pause() {
        setRunning(false);
    }

    function skip() {
        const nextSeconds = mode === 'focus' ? breakSeconds : focusSeconds;
        advance();
        endAtRef.current = Date.now() + nextSeconds * 1000;
        setRunning(true);
    }
    // начать этап с нуля сразу (например, нажали на предмет во время перерыва)
    function startMode(next) {
        const seconds = next === 'focus' ? focusSeconds : breakSeconds;
        setMode(next);
        setRemaining(seconds);
        endAtRef.current = Date.now() + seconds * 1000;
        setRunning(true);
    }
    function switchMode(next) {
        if (next === mode) return;
        setRunning(false);
        setMode(next);
        setRemaining(next === 'focus' ? focusSeconds : breakSeconds);
    }

    return {
        mode,
        set,
        running,
        remaining,
        total,
        isIdle: !running && remaining === total,
        start,
        pause,
        skip,
        startMode,
        switchMode
    };
}