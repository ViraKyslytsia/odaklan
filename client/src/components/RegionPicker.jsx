import { useEffect, useState } from 'react';
import { useT } from '../i18n/LanguageContext';

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';

// Регион пользователя: пока он выбран, показываем только его и кнопку «Изменить».
// Поиск города открывается, если региона ещё нет или нажали «Изменить».
// value    — текущий регион (settings.region)
// onSelect — вызывается с новым регионом, когда пользователь выбрал город
export default function RegionPicker({ value, onSelect }) {
    const { t, lang } = useT();
    const [editing, setEditing] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [doneFor, setDoneFor] = useState(''); // для какого запроса уже получен ответ

    const hasRegion = Boolean(value?.city);
    const searching = !hasRegion || editing;

    useEffect(() => {
        const q = query.trim();
        if (!searching || q.length < 2) {
            setResults([]);
            setFailed(false);
            setDoneFor('');
            return;
        }

        const controller = new AbortController();
        // ждём 400 мс после последней буквы, чтобы не слать запрос на каждую клавишу
        const timer = setTimeout(async () => {
            setLoading(true);
            setFailed(false);
            try {
                const url = `${GEO_URL}?name=${encodeURIComponent(q)}&count=6&language=${lang}&format=json`;
                const res = await fetch(url, { signal: controller.signal });
                if (!res.ok) throw new Error('geocoding failed');
                const data = await res.json();
                // без часового пояса или страны город нам не подходит
                setResults((data.results || []).filter((r) => r.timezone && r.country_code));
                setDoneFor(q);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setFailed(true);
                    setResults([]);
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 400);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, lang, searching]);

    function closeSearch() {
        setEditing(false);
        setQuery('');
        setResults([]);
        setDoneFor('');
    }

    function pick(item) {
        onSelect({
            countryCode: item.country_code,
            countryName: item.country || '',
            city: item.name,
            latitude: item.latitude,
            longitude: item.longitude,
            timezone: item.timezone,
        });
        closeSearch(); // поиск прячется, остаётся выбранный город
    }

    const showEmpty = !loading && !failed && results.length === 0 && doneFor && doneFor === query.trim();

    return (
        <div className="field region-picker">
            <label htmlFor="p-region">{t('profile.region')}</label>

            {hasRegion && !editing && (
                <div className="input profile-box profile-box-tall">
                    <span className="profile-row-value">
                        {`${value.city}, ${value.countryName}`}
                        <small>{value.timezone}</small>
                    </span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                        {t('profile.change')}
                    </button>
                </div>
            )}

            {searching && (
                <>
                    <div className="profile-row">
                        <input
                            id="p-region"
                            className="input"
                            value={query}
                            maxLength={60}
                            placeholder={t('profile.regionSearch')}
                            onChange={(e) => setQuery(e.target.value)}
                            autoComplete="off"
                            autoFocus={editing}
                        />
                        {hasRegion && (
                            <button type="button" className="btn btn-secondary btn-sm" onClick={closeSearch}>
                                {t('common.cancel')}
                            </button>
                        )}
                    </div>
                    {loading && <p className="region-hint">{t('profile.regionLoading')}</p>}
                    {failed && <p className="form-error">{t('profile.regionFailed')}</p>}
                    {showEmpty && <p className="region-hint">{t('profile.regionEmpty')}</p>}
                    {results.length > 0 && (
                        <ul className="region-results">
                            {results.map((r) => (
                                <li key={r.id}>
                                    <button type="button" onClick={() => pick(r)}>
                                        {r.name}
                                        <span>{[r.admin1, r.country].filter(Boolean).join(', ')}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}