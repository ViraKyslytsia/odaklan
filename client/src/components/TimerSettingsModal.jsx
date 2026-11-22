import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BREAK_LIMITS, BREAK_RANGE, FOCUS_LIMITS, FOCUS_RANGE } from '../config/timer';
import { useT } from '../i18n/LanguageContext';
import { ensureNotificationPermission } from '../utils/notify';

function MinutesSetting({ id, label, value, range, limits, onChange }) {
    const { t } = useT();
    const [text, setText] = useState(String(value));

    // ползунок изменил значение: обновляем поле
    useEffect(() => {
        setText(String(value));
    }, [value]);

    function onType(e) {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
        setText(digits);
        const n = Number(digits);
        if (digits && n >= limits.min && n <= limits.max) onChange(n);
    }

    // при выходе из поля приводим значение к допустимому
    function commit() {
        const n = parseInt(text, 10);
        if (Number.isNaN(n)) {
            setText(String(value));
            return;
        }
        const clamped = Math.min(limits.max, Math.max(limits.min, n));
        onChange(clamped);
        setText(String(clamped));
    }

    return (
        <div className="setting-row">
            <label htmlFor={id}>
                {label}
                <span className="setting-hint"> ({limits.min}–{limits.max} {t('settings.min')})</span>
            </label>
            <div className="range-line">
                <input
                    type="range"
                    className="range"
                    aria-label={label}
                    min={range.min}
                    max={range.max}
                    step={range.step}
                    value={Math.min(range.max, Math.max(range.min, value))}
                    onChange={(e) => onChange(Number(e.target.value))}
                />
                <div className="range-input">
                    <input
                        id={id}
                        inputMode="numeric"
                        value={text}
                        onChange={onType}
                        onBlur={commit}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    />
                    <span>{t('settings.min')}</span>
                </div>
            </div>
        </div>
    );
}

export default function TimerSettingsModal({ settings, onSave, onClose }) {
    const { t } = useT();
    const [draft, setDraft] = useState(settings);
    const [hint, setHint] = useState('');

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    async function toggleNotify() {
        setHint('');
        if (draft.notify) {
            setDraft({ ...draft, notify: false });
            return;
        }
        const permission = await ensureNotificationPermission();
        if (permission === 'granted') {
            setDraft({ ...draft, notify: true });
        } else if (permission === 'unsupported') {
            setHint(t('settings.unsupported'));
        } else {
            setHint(t('settings.denied'));
        }
    }

    function save() {
        onSave(draft);
        onClose();
    }

    return createPortal(
        <div
            className="modal-backdrop"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="timer-settings-title">
                <h2 id="timer-settings-title" className="modal-title">{t('settings.title')}</h2>

                <MinutesSetting
                    id="focus-minutes"
                    label={t('settings.focus')}
                    value={draft.focusMinutes}
                    range={FOCUS_RANGE}
                    limits={FOCUS_LIMITS}
                    onChange={(v) => setDraft((d) => ({ ...d, focusMinutes: v }))}
                />
                <MinutesSetting
                    id="break-minutes"
                    label={t('settings.break')}
                    value={draft.breakMinutes}
                    range={BREAK_RANGE}
                    limits={BREAK_LIMITS}
                    onChange={(v) => setDraft((d) => ({ ...d, breakMinutes: v }))}
                />

                <div className="setting-row switch-row">
                    <div>
                        <span className="switch-title">{t('settings.notify')}</span>
                        <span className="switch-note">{t('settings.notifyNote')}</span>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={draft.notify}
                        aria-label={t('settings.notify')}
                        className={`switch${draft.notify ? ' on' : ''}`}
                        onClick={toggleNotify}
                    >
                        <span />
                    </button>
                </div>
                {hint && <p className="form-error">{hint}</p>}

                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
                    <button className="btn btn-primary" onClick={save}>{t('common.save')}</button>
                </div>
            </div>
        </div>,
        document.body
    );
}