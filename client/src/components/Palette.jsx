import { SUBJECT_COLORS } from '../theme/palette';

// Ряд цветных кружков (тот же, что в окне предметов)
export default function Palette({ value, onPick, label }) {
    const current = (value || '').toLowerCase();
    return (
        <div className="palette" role="radiogroup" aria-label={label}>
            {SUBJECT_COLORS.map((color) => {
                const selected = color.toLowerCase() === current;
                return (
                    <button
                        key={color}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`swatch${selected ? ' selected' : ''}`}
                        style={{ '--swatch': color }}
                        onClick={() => onPick(color)}
                    />
                );
            })}
        </div>
    );
}
