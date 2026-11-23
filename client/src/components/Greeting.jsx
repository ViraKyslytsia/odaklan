import { useT } from '../i18n/LanguageContext';

// Часть суток по часам: от неё зависит, какое приветствие показать
function dayPart(hour) {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'day';
    if (hour >= 18 && hour < 23) return 'evening';
    return 'night';
}

// Именное приветствие над таймером и задачами
export default function Greeting({ name, timeZone }) {
    const { t, locale } = useT();
    const firstName = (name || '').trim().split(/\s+/)[0]; // из «Вира Кислиця» берём «Вира»
    const now = new Date();
    const tz = timeZone || undefined; // без региона берём время устройства
    const hour = Number(
        new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(now)
    );
    const date = now.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: tz,
    });

    return (
        <header className="greeting">
            {/* key перезапускает анимацию, когда имя подгрузилось с сервера */}
            <h1 className="greeting-title" key={firstName}>
                {firstName ? t(`greet.${dayPart(hour)}`, { name: firstName }) : '\u00A0'}
            </h1>
            <p className="greeting-date">{date}</p>
        </header>
    );
}
