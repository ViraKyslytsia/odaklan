import { useT } from '../i18n/LanguageContext';
import { formatHMS } from '../utils/date';

// Список предметов как в приложениях-таймерах: нажал на строку, и таймер пошёл для этого предмета
export default function SubjectList({ subjects, activeId, running, today, elapsed, onPlay, onManage }) {
    const { t } = useT();
    const totalToday = Object.values(today).reduce((sum, s) => sum + s, 0) + elapsed;

    return (
        <section className="card subject-list">
            <div className="subject-total">
                <span>{t('subjects.totalToday')}</span>
                <span className="subject-clock">{formatHMS(totalToday)}</span>
            </div>

            <ul className="subject-items">
                {subjects.map((s) => {
                    const isActive = s._id === activeId;
                    const playing = isActive && running;
                    const seconds = (today[s._id] || 0) + (isActive ? elapsed : 0);
                    return (
                        // кнопки стоят рядом, а не одна в другой: вложенные <button> недопустимы в HTML
                        <li
                            key={s._id}
                            className={`subject-entry${isActive ? ' active' : ''}`}
                            style={{ '--subject-color': s.color }}
                        >
                            <button
                                type="button"
                                className="subject-item"
                                aria-label={t(playing ? 'subjects.pause' : 'subjects.play', { name: s.name })}
                                onClick={() => onPlay(s._id)}
                            >
                                <span className="subject-play">
                                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        {playing ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
                                    </svg>
                                </span>
                                <span className="subject-label">{s.name}</span>
                                <span className="subject-clock">{formatHMS(seconds)}</span>
                            </button>
                            <button
                                type="button"
                                className="dots-btn"
                                onClick={onManage}
                                aria-label={t('subjects.edit')}
                                title={t('subjects.edit')}
                            >
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                                    <circle cx="12" cy="5" r="1.8" />
                                    <circle cx="12" cy="12" r="1.8" />
                                    <circle cx="12" cy="19" r="1.8" />
                                </svg>
                            </button>
                        </li>
                    );
                })}
            </ul>

            <button type="button" className="subject-add" onClick={onManage}>
                + {t('subjects.add')}
            </button>
        </section>
    );
}