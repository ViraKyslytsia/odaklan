import { useEffect, useState } from 'react';
import { api } from './api';
import { SUBJECT_COLORS } from './theme/palette';

export default function App() {
  const [apiStatus, setApiStatus] = useState('проверяю...');

  useEffect(() => {
    api.health()
      .then(() => setApiStatus('сервер отвечает ✓'))
      .catch((err) => setApiStatus(`ошибка: ${err.message}`));
  }, []);

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 480 }}>
        <h1 style={{ marginTop: 0, fontSize: 'var(--fs-xl)' }}>odaklan</h1>
        <p style={{ color: 'var(--text-muted)' }}>API: {apiStatus}</p>

        <div style={{ display: 'flex', gap: 'var(--space-3)', margin: 'var(--space-5) 0' }}>
          <button className="btn btn-primary">Başlat</button>
          <button className="btn btn-secondary">Sıfırla</button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {SUBJECT_COLORS.map((color) => (
            <span
              key={color}
              style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-sm)',
                background: color,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}