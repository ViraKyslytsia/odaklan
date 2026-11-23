import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import ScheduleModal from '../components/ScheduleModal';
import { useNow } from '../hooks/useNow';
import { useT } from '../i18n/LanguageContext';
import PageArt from '../components/PageArt';
import { LOCALES } from '../i18n/translations';
import { layoutDay, toHHMM, toMin, weekdayNames } from '../utils/schedule';

// высота одного часа в сетке считается динамически (см. hourPx) и передаётся в CSS как --hour-h
const MIN_HOUR_PX = 56;
const MAX_HOUR_PX = 120;
const MIN_BLOCK_PX = 64; // минимальная высота блока, в которую влезают название и время
const DEFAULT_COLOR = '#A78BFA';

export default function Schedule() {
    const { t, lang } = useT();
    const now = useNow(30000);
    const [items, setItems] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modal, setModal] = useState(null); // null | { item } | { preset }
    const [toDelete, setToDelete] = useState(null);
    const [weekendOn, setWeekendOn] = useState(false);

    useEffect(() => {
        Promise.all([api.getSchedule(), api.getSubjects()])
            .then(([sch, subs]) => {
                setItems(sch);
                setSubjects(subs);
            })
            .catch((err) => setError(t('schedule.error', { message: err.message })))
            .finally(() => setLoading(false));
        // язык не должен перезагружать данные
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const subjectById = useMemo(() => Object.fromEntries(subjects.map((s) => [s._id, s])), [subjects]);
    const names = weekdayNames(LOCALES[lang], 'short');

    // выходные показываем, если включили вручную или если на них уже есть занятия
    const hasWeekendItems = items.some((i) => i.dayOfWeek > 5);
    const showWeekend = weekendOn || hasWeekendItems;
    const dayNumbers = showWeekend ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];

    // видимый диапазон часов: минимум 8–17, а если занятия выходят за него, расширяем
    const { startHour, endHour } = useMemo(() => {
        const starts = items.map((i) => Number(i.startTime.slice(0, 2)));
        const ends = items.map((i) => Math.ceil((Number(i.endTime.slice(0, 2)) * 60 + Number(i.endTime.slice(3))) / 60));
        return {
            startHour: Math.min(8, ...starts),
            endHour: Math.max(17, ...ends),
        };
    }, [items]);
    const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

    // высота часа подбирается под самое короткое занятие, чтобы его блок вмещал весь текст
    const hourPx = useMemo(() => {
        const durations = items.map((i) => toMin(i.endTime) - toMin(i.startTime)).filter((m) => m > 0);
        if (!durations.length) return MIN_HOUR_PX;
        const shortest = Math.min(...durations);
        return Math.min(MAX_HOUR_PX, Math.max(MIN_HOUR_PX, Math.ceil((MIN_BLOCK_PX * 60) / shortest)));
    }, [items]);

    const byDay = useMemo(() => {
        const map = {};
        for (const d of dayNumbers) map[d] = layoutDay(items.filter((i) => i.dayOfWeek === d));
        return map;
    }, [items, dayNumbers]);

    // «сейчас»: JS считает воскресенье нулём, у нас воскресенье = 7
    const nowDate = new Date(now);
    const todayDow = nowDate.getDay() || 7;
    const nowHours = nowDate.getHours() + nowDate.getMinutes() / 60;
    const nowVisible = nowHours >= startHour && nowHours <= endHour;

    // days — выбранные дни недели: при создании по занятию на каждый день, при редактировании день один
    async function save(data, days) {
        if (modal?.item) {
            const updated = await api.updateScheduleItem(modal.item._id, { ...data, dayOfWeek: days[0] });
            setItems((list) => list.map((i) => (i._id === updated._id ? updated : i)));
            setModal(null);
            return;
        }

        const created = [];
        try {
            for (const d of days) {
                created.push(await api.createScheduleItem({ ...data, dayOfWeek: d }));
            }
        } catch (err) {
            if (created.length === 0) throw err; // ничего не создалось: ошибку покажет окно
            // часть дней уже сохранилась: показываем их и сообщаем об ошибке на странице
            setItems((list) => [...list, ...created]);
            setModal(null);
            setError(t('schedule.error', { message: err.message }));
            return;
        }
        setItems((list) => [...list, ...created]);
        setModal(null);
    }

    async function confirmDelete() {
        const item = toDelete;
        setToDelete(null);
        setError('');
        try {
            await api.deleteScheduleItem(item._id);
            setItems((list) => list.filter((i) => i._id !== item._id));
            setModal(null);
        } catch (err) {
            setError(t('schedule.error', { message: err.message }));
        }
    }

    // клик по пустому месту колонки: новое занятие в этот день и на этот час
    function onColumnClick(e, dow) {
        if (e.target !== e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const hour = Math.min(22, startHour + Math.floor((e.clientY - rect.top) / hourPx));
        setModal({ preset: { dayOfWeek: dow, startTime: toHHMM(hour * 60), endTime: toHHMM((hour + 1) * 60) } });
    }

    return (
        <>
            <div className="page-head">
                <h1 className="page-title"><PageArt name="schedule" size={56} /><span>{t('nav.schedule')}</span></h1>
                {items.length > 0 && (
                    <button type="button" className="btn btn-primary" onClick={() => setModal({})}>
                        + {t('schedule.add')}
                    </button>
                )}
            </div>

            {error && <p className="form-error">{error}</p>}

            {!loading && items.length === 0 && (
                <div className="card exam-empty">
                    <h2>{t('schedule.emptyTitle')}</h2>
                    <p>{t('schedule.emptyText')}</p>
                    <button type="button" className="btn btn-primary" onClick={() => setModal({})}>
                        + {t('schedule.add')}
                    </button>
                </div>
            )}

            {items.length > 0 && (
                <>
                    <div className="schedule-scroll">
                        <div
                            className="schedule"
                            style={{ '--days': dayNumbers.length, '--hours': hours.length, '--hour-h': `${hourPx}px` }}
                        >
                            <div />
                            {dayNumbers.map((d) => (
                                <div key={d} className={`schedule-head${d === todayDow ? ' today' : ''}`}>
                                    {names[d - 1]}
                                </div>
                            ))}

                            <div className="schedule-hours">
                                {hours.map((h, i) => (
                                    <span key={h} className="schedule-hour" style={{ '--i': i }}>
                                        {toHHMM(h * 60)}
                                    </span>
                                ))}
                            </div>

                            {dayNumbers.map((d) => (
                                <div
                                    key={d}
                                    className={`schedule-col${d === todayDow ? ' today' : ''}`}
                                    onClick={(e) => onColumnClick(e, d)}
                                >
                                    {hours.slice(1).map((h, i) => (
                                        <div key={h} className="schedule-line" style={{ '--i': i + 1 }} />
                                    ))}

                                    {byDay[d].map((it) => {
                                        const color = subjectById[it.subject]?.color || DEFAULT_COLOR;
                                        return (
                                            <button
                                                key={it._id}
                                                type="button"
                                                className="schedule-block"
                                                style={{
                                                    '--c': color,
                                                    '--top': it.start / 60 - startHour,
                                                    '--h': (it.end - it.start) / 60,
                                                    '--lane': it.lane,
                                                    '--lanes': it.lanes,
                                                }}
                                                onClick={() => setModal({ item: it })}
                                            >
                                                <span className="schedule-block-title">{it.title}</span>
                                                <span className="schedule-block-meta">
                                                    {it.startTime}–{it.endTime}
                                                    {it.place ? ` · ${it.place}` : ''}
                                                </span>
                                            </button>
                                        );
                                    })}

                                    {d === todayDow && nowVisible && (
                                        <div className="schedule-now" style={{ '--top': nowHours - startHour }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {!hasWeekendItems && (
                        <div className="schedule-foot">
                            <button type="button" className="link-button" onClick={() => setWeekendOn((v) => !v)}>
                                {t(weekendOn ? 'schedule.hideWeekend' : 'schedule.showWeekend')}
                            </button>
                        </div>
                    )}
                </>
            )}

            {modal && (
                <ScheduleModal
                    item={modal.item}
                    preset={modal.preset}
                    subjects={subjects}
                    onSave={save}
                    onDelete={setToDelete}
                    onClose={() => setModal(null)}
                />
            )}
            {toDelete && (
                <ConfirmDialog
                    title={t('schedule.delete')}
                    text={t('schedule.deleteConfirm', { name: toDelete.title })}
                    hint={t('schedule.deleteWarning')}
                    confirmLabel={t('common.delete')}
                    onConfirm={confirmDelete}
                    onCancel={() => setToDelete(null)}
                />
            )}
        </>
    );
}
