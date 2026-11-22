import { Component } from 'react';

// Ловит ошибки отрисовки: вместо пустого экрана показывает, что именно сломалось
export default class ErrorBoundary extends Component {
    state = { error: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error(error, info.componentStack);
    }

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;
        return (
            <div style={{ maxWidth: 560, margin: '15vh auto', padding: 24, textAlign: 'center' }}>
                <h1 style={{ color: 'var(--text-strong)' }}>Something went wrong</h1>
                <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--danger)', fontFamily: 'inherit' }}>
                    {String(error.message || error)}
                </pre>
                <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
                    Reload
                </button>
            </div>
        );
    }
}