import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/LanguageContext';

// Код погоды Open-Meteo (WMO) → значок
function weatherIcon(code) {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌦️';
    if (code <= 86) return '❄️';
    return '⛈️';
}

// Погода в городе из настроек региона
export default function WeatherCard({ region }) {
    const { t } = useT();
    const [weather, setWeather] = useState(null);
    const [failed, setFailed] = useState(false);
    const lat = region?.latitude;
    const lon = region?.longitude;

    useEffect(() => {
        if (lat == null || lon == null) return;
        const controller = new AbortController();
        setFailed(false);
        const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            '&current=temperature_2m,weather_code';
        fetch(url, { signal: controller.signal })
            .then((res) => {
                if (!res.ok) throw new Error('weather failed');
                return res.json();
            })
            .then((data) =>
                setWeather({
                    temp: Math.round(data.current.temperature_2m),
                    code: data.current.weather_code,
                })
            )
            .catch((err) => {
                if (err.name !== 'AbortError') setFailed(true);
            });
        return () => controller.abort();
    }, [lat, lon]);

    // региона нет: карточка ведёт в настройки
    if (!region?.city) {
        return (
            <Link to="/profile" className="mini-card">
                <span className="mini-label">{t('quick.weather')}</span>
                <span className="mini-text">{t('quick.regionAdd')}</span>
            </Link>
        );
    }

    return (
        <div className="mini-card water-card">
            <span className="mini-label">
                {t('quick.weather')} · {region.city}
            </span>
            <span className="mini-text">
                {failed ? '—' : weather ? `${weatherIcon(weather.code)} ${weather.temp}°C` : '…'}
            </span>
        </div>
    );
}