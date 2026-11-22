import { useT } from '../i18n/LanguageContext';
import { formatExamDate, pad2, splitDiff } from '../utils/countdown';

// Большой живой отсчёт до ближайшего экзамена
export default function ExamHero({ exam, subject, now, onEdit }) {
    const { t, locale } = useT();
    const { days, hours, minutes, seconds } = splitDiff(new Date(exam.date).getTime() - now);
    const parts = [
        [days, 'exams.unitD'],
        [hours, 'exams.unitH'],
        [minutes, 'exams.unitM'],
        [seconds, 'exams.unitS'],
    ];

    return (
        <section className="card exam-hero" style={{ '--exam-color': exam.color }}>
            <div className="exam-hero-top">
                <div>
                    <span className="exam-hero-label">{t('exams.next')}</span>
                    <h2 className="exam-hero-title">{exam.title}</h2>
                    <p className="exam-hero-date">
                        {formatExamDate(exam.date, locale)}
                        {subject && <span className="exam-subject-tag"> · {subject.name}</span>}
                    </p>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit(exam)}>
                    {t('exams.edit')}
                </button>
            </div>

            <div className="countdown" role="timer" aria-label={exam.title}>
                {parts.map(([value, key]) => (
                    <div className="countdown-cell" key={key}>
                        <span className="countdown-num">{key === 'exams.unitD' ? value : pad2(value)}</span>
                        <span className="countdown-unit">{t(key)}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}
