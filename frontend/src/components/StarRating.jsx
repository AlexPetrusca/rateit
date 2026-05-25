const STAR_FILLED = String.fromCharCode(9733);
const SIZE_STYLES = {
    sm: '0.95rem',
    md: '1.45rem',
    lg: '2rem'
};

const StarRating = ({
    value,
    label,
    max = 5,
    size = 'md',
    interactive = false,
    onChange,
    onHoverChange
}) => {
    const score = Number(value);
    const starCount = Number.isFinite(max) && max > 0 ? Math.round(max) : 5;
    const clampedScore = Number.isFinite(score) ? Math.max(0, Math.min(starCount, score)) : 0;
    const fontSize = SIZE_STYLES[size] || SIZE_STYLES.md;
    const gridTemplateColumns = `repeat(${starCount * 2}, 0.5em)`;

    return (
        <span
            className={interactive ? 'star-rating-picker' : 'star-rating-display'}
            role={interactive ? 'radiogroup' : undefined}
            aria-label={label}
            style={{
                fontSize,
                gridTemplateColumns
            }}
        >
            {Array.from({ length: starCount }, (_, index) => {
                const starValue = index + 1;
                const fill = Math.max(0, Math.min(1, clampedScore - index));

                return (
                    <span
                        key={starValue}
                        className="star-rating-star"
                        style={{
                            backgroundImage: `linear-gradient(90deg, #00e054 ${fill * 100}%, #cfd9de ${fill * 100}%)`
                        }}
                    >
                        {STAR_FILLED}
                    </span>
                );
            })}
            {interactive && typeof onChange === 'function' && (
                <div className="star-rating-hit-grid" style={{ gridTemplateColumns }}>
                    {Array.from({ length: starCount * 2 }, (_, index) => {
                        const valueForStep = (index + 1) / 2;
                        const isSelected = Number(value) === valueForStep;

                        return (
                            <button
                                key={valueForStep}
                                type="button"
                                className="star-rating-hit"
                                role="radio"
                                aria-checked={isSelected}
                                aria-label={`${valueForStep} out of ${starCount} stars`}
                                onMouseEnter={() => onHoverChange?.(valueForStep)}
                                onFocus={() => onHoverChange?.(valueForStep)}
                                onMouseLeave={() => onHoverChange?.(null)}
                                onBlur={() => onHoverChange?.(null)}
                                onClick={() => onChange(valueForStep)}
                            />
                        );
                    })}
                </div>
            )}
        </span>
    );
};

export default StarRating;
