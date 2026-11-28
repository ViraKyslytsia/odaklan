export default function Pager({ page, pages, total, onChange }) {
    return (
        <div className="admin-pager">
            <button className="btn btn-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
                Back
            </button>
            <span>Page {page} of {pages} · {total} total</span>
            <button className="btn btn-secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
                Next
            </button>
        </div>
    );
}