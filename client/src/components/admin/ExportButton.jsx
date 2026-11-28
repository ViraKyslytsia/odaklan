import { useState } from 'react';

function saveCsv(filename, csv) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// load: функция из api, которая возвращает { filename, csv }
export default function ExportButton({ load, label = 'Export CSV' }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function run() {
        setBusy(true);
        setError('');
        try {
            const { filename, csv } = await load();
            saveCsv(filename, csv);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <button className="btn btn-secondary" onClick={run} disabled={busy}>
                {busy ? 'Exporting…' : label}
            </button>
            {error && <span className="form-error">{error}</span>}
        </>
    );
}