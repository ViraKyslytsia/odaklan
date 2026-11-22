import { Link } from 'react-router-dom';
import { useT } from '../i18n/LanguageContext';
function nextExam(exams) {
    const now = Date.now();
    return exams
        .filter((e) => new Date(e.date).getTime() >= now)
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
}

export default function QuickCards({ exams }) {
    const { t, locale } = useT();
    const exam = nextExam(exams);

    return (
        <div className="quick-cards">
            <Link to="/music" className="mini-card">
                <span className="mini-label">{t('quick.music')}</span>
                <span className="mini-text">{t('quick.musicText')}</span>
            </Link>
            <Link to="/exams" className="mini-card">
                <span className="mini-label">{t('exams.next')}</span>
                <span className="mini-text">
                    {exam
                        ? `${exam.title} · ${new Date(exam.date).toLocaleDateString(locale, {
                            day: 'numeric',
                            month: 'long',
                        })}`
                        : t('quick.examAdd')}
                </span>
            </Link>
        </div>
    );
}