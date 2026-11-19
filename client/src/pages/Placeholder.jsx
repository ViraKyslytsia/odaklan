export default function Placeholder({ title }) {
    return (
        <div className="card">
            <h1 style={{ marginTop: 0, fontSize: 'var(--fs-xl)' }}>{title}</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>Yakında...</p>
        </div>
    );
}