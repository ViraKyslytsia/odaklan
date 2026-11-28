export default function Tile({ label, value }) {
    return (
        <div className="admin-tile">
            <span className="admin-tile-label">{label}</span>
            <span className="admin-tile-value">{value}</span>
        </div>
    );
}