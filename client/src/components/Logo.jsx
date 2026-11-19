export default function Logo({ size = 56 }) {
    return (
        <div className="brand" style={{ '--logo-size': `${size}px` }}>
            <span className="brand-mark">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                        d="M12 1.5C12.9 7.5 16.5 11.1 22.5 12C16.5 12.9 12.9 16.5 12 22.5C11.1 16.5 7.5 12.9 1.5 12C7.5 11.1 11.1 7.5 12 1.5Z"
                        fill="currentColor"
                    />
                </svg>
            </span>
            <span className="brand-name">odaklan</span>
        </div>
    );
}