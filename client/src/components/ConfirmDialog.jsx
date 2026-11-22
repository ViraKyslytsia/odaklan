import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n/LanguageContext';

// Окно подтверждения в стиле сайта (вместо системного window.confirm)
export default function ConfirmDialog({ title, text, hint, confirmLabel, onConfirm, onCancel }) {
    const { t } = useT();
    const cancelRef = useRef(null);

    useEffect(() => {
        // фокус на «Отмена»: случайный Enter ничего не удалит
        cancelRef.current?.focus();
        // capture + stopPropagation: Esc закрывает только это окно, а не то, что открыто под ним
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            onCancel();
        };
        document.addEventListener('keydown', onKey, true);
        return () => document.removeEventListener('keydown', onKey, true);
    }, [onCancel]);

    return createPortal(
        <div
            className="modal-backdrop"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div className="modal confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
                <span className="confirm-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />
                    </svg>
                </span>
                <h2 id="confirm-title" className="confirm-title">{title}</h2>
                <p className="confirm-text">{text}</p>
                {hint && <p className="confirm-hint">{hint}</p>}
                <div className="modal-actions">
                    <button ref={cancelRef} type="button" className="btn btn-secondary" onClick={onCancel}>
                        {t('common.cancel')}
                    </button>
                    <button type="button" className="btn btn-danger" onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
