import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { TOTAL_SETS } from '../config/timer';
import { useTimer } from '../hooks/useTimer';
import { useTimerSettings } from '../hooks/useTimerSettings';
import { useT } from '../i18n/LanguageContext';
import { formatTime, todayStr } from '../utils/date';
import { showNotification } from '../utils/notify';
import TimerSettingsModal from './TimerSettingsModal';
import SubjectList from './SubjectList';
import SubjectsModal from './SubjectsModal';

const RADIUS = 130;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Возвращает две колонки сетки: слева таймер, справа children (задачи, музыка, экзамены) и под ними предметы
export default function TimerCard({ subjects, onSubjectsChange, children }) {
    const { t } = useT();
    const [settings, saveSettings] = useTimerSettings();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [subjectId, setSubjectId] = useState('');
    const [subjectsOpen, setSubjectsOpen] = useState(false);
    // если выбранный предмет удалили, считаем, что предмет не выбран
    const activeId = subjects.some((s) => s._id === subjectId) ? subjectId : '';
    const [today, setToday] = useState({}); // { id предмета: секунды за сегодня }

    useEffect(() => {
        api.getDayStats(todayStr())
            .then((d) => {
                const bySubject = {};
                for (const s of d.sessions) {
                    const key = s.subject || 'none';
                    bySubject[key] = (bySubject[key] || 0) + s.seconds;
                }
                setToday(bySubject);
            })
            .catch(() => { });
    }, []);
    const [celebrating, setCelebrating] = useState(false);
    const [celebrateKey, setCelebrateKey] = useState(0);
    const [saveError, setSaveError] = useState('');
    const celebrateTimer = useRef(null);

    useEffect(() => () => clearTimeout(celebrateTimer.current), []);

    function celebrate() {
        setCelebrating(true);
        setCelebrateKey((k) => k + 1); // новый key = анимация звезды начинается заново
        clearTimeout(celebrateTimer.current);
        celebrateTimer.current = setTimeout(() => setCelebrating(false), 2600);
    }

    async function saveSession(seconds) {
        setSaveError('');
        const key = activeId || 'none';
        setToday((prev) => ({ ...prev, [key]: (prev[key] || 0) + seconds }));
        try {
            await api.saveSession({
                date: todayStr(),
                seconds,
                ...(activeId ? { subject: activeId } : {}),
            });
        } catch (err) {
            setToday((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) - seconds) }));
            setSaveError(t('timer.saveError', { message: err.message }));
        }
    }

    function openSettings() {
        timer.pause(); // на время настроек таймер ставим на паузу
        setSettingsOpen(true);
    }
    function playSubject(id) {
        if (timer.running && isFocus && activeId === id) {
            timer.pause(); // повторное нажатие на тот же предмет ставит паузу
            return;
        }
        setSubjectId(id);
        if (!isFocus) timer.startMode('focus'); // с перерыва сразу в фокус
        else if (!timer.running) timer.start();
    }

    function onPhaseComplete(finishedMode) {
        celebrate();
        if (settings.notify) {
            showNotification(
                finishedMode === 'focus' ? t('notif.focusDone') : t('notif.breakDone'),
                finishedMode === 'focus' ? t('notif.focusDoneBody') : t('notif.breakDoneBody')
            );
        }
    }

    const timer = useTimer({
        focusSeconds: Math.round(settings.focusMinutes * 60),
        breakSeconds: Math.round(settings.breakMinutes * 60),
        onFocusComplete: saveSession,
        onPhaseComplete,
    });

    const progress = 1 - timer.remaining / timer.total;
    const isFocus = timer.mode === 'focus';
    const elapsed = isFocus && timer.remaining < timer.total ? timer.total - timer.remaining : 0;

    return (
        <>
            <div className={`card timer-card${isFocus ? '' : ' is-break'}${celebrating ? ' celebrating' : ''}`}>
                <div className="segmented segmented-slide" style={{ '--seg': isFocus ? 0 : 1 }}>
                    <button
                        className={isFocus ? 'active' : ''}
                        onClick={() => timer.switchMode('focus')}
                    >
                        {t('timer.focus')}
                    </button>
                    <button
                        className={!isFocus ? 'active' : ''}
                        onClick={() => timer.switchMode('break')}
                    >
                        {t('timer.break')}
                    </button>
                </div>

                <div className="ring">
                    <svg viewBox="0 0 280 280" aria-hidden="true">
                        <defs>
                            <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" className="ring-stop-a" />
                                <stop offset="100%" className="ring-stop-b" />
                            </linearGradient>
                        </defs>
                        <circle className="ring-track" cx="140" cy="140" r={RADIUS} />
                        <circle
                            className={`ring-progress${timer.remaining === timer.total ? ' at-start' : ''}`}
                            cx="140"
                            cy="140"
                            r={RADIUS}
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                        />
                    </svg>
                    <div className="ring-content">
                        <span className="ring-label" key={`${timer.mode}-${timer.set}-${celebrating}`}>
                            {celebrating
                                ? t('timer.great')
                                : t(isFocus ? 'timer.labelFocus' : 'timer.labelBreak', { set: timer.set, total: TOTAL_SETS })}
                        </span>
                        <span className="ring-time" key={timer.mode}>{formatTime(timer.remaining)}</span>
                    </div>

                    {celebrating && (
                        <div className="star-overlay" key={celebrateKey} aria-hidden="true">
                            <svg className="star-big" viewBox="0 0 24 24">
                                <defs>
                                    <linearGradient id="star-gradient" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" style={{ stopColor: 'var(--primary-soft)' }} />
                                        <stop offset="100%" style={{ stopColor: 'var(--teal)' }} />
                                    </linearGradient>
                                </defs>
                                <path
                                    d="M12 1.5C12.9 7.5 16.5 11.1 22.5 12C16.5 12.9 12.9 16.5 12 22.5C11.1 16.5 7.5 12.9 1.5 12C7.5 11.1 11.1 7.5 12 1.5Z"
                                    fill="url(#star-gradient)"
                                />
                            </svg>
                        </div>
                    )}
                </div>

                <div className="timer-actions">
                    <button
                        className="btn btn-primary"
                        onClick={timer.running ? timer.pause : timer.start}
                    >
                        {timer.running ? t('timer.pause') : t('timer.start')}
                    </button>
                    <button className="btn btn-secondary" onClick={timer.skip}>
                        {t('timer.skip')}
                    </button>
                    <button className="btn btn-secondary" onClick={openSettings}>
                        {t('timer.settings')}
                    </button>
                </div>

                {saveError && <p className="form-error">{saveError}</p>}

                {settingsOpen && (
                    <TimerSettingsModal
                        settings={settings}
                        onSave={saveSettings}
                        onClose={() => setSettingsOpen(false)}
                    />
                )}
                {subjectsOpen && (
                    <SubjectsModal
                        subjects={subjects}
                        onChange={onSubjectsChange}
                        onClose={() => setSubjectsOpen(false)}
                    />
                )}
            </div>

            <div className="home-side">
                {children}
                <SubjectList
                    subjects={subjects}
                    activeId={activeId}
                    running={timer.running && isFocus}
                    today={today}
                    elapsed={elapsed}
                    onPlay={playSubject}
                    onManage={() => setSubjectsOpen(true)}
                />
            </div>
        </>
    );
}