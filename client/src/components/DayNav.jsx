import { useT } from '../i18n/LanguageContext';
import { addDays, todayStr } from '../utils/date';
import DatePicker from './DatePicker';

// Переключатель дня: стрелки «вчера / завтра», календарь для прыжка на любую дату
// и кнопка «Вернуться к сегодня», которая появляется, только когда выбран не сегодняшний день
export default function DayNav({ date, onChange }) {
    const { t } = useT();

    return (
        <div className="daynav">
            <button type="button" className="daynav-arrow" aria-label={t('tasks.prevDay')} onClick={() => onChange(addDays(date, -1))}>
                <Chevron dir="left" />
            </button>

            <DatePicker className="daynav-date" value={date} onChange={(d) => d && onChange(d)} placeholder={t('calendar.pick')} />

            <button type="button" className="daynav-arrow" aria-label={t('tasks.nextDay')} onClick={() => onChange(addDays(date, 1))}>
                <Chevron dir="right" />
            </button>

            {date !== todayStr() && (
                <button type="button" className="btn btn-secondary btn-sm daynav-today" onClick={() => onChange(todayStr())}>
                    {t('tasks.backToToday')}
                </button>
            )}
        </div>
    );
}

function Chevron({ dir }) {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
        </svg>
    );
}
