import { useMemo, useRef } from 'react';

const STAR_FILLED = String.fromCharCode(9733);
const SIZE_STYLES = {
    sm: '1.05rem',
    md: '1.65rem',
    lg: '2.25rem'
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
    const gridRef = useRef(null);
    const interactionRef = useRef({
        isPointerDown: false,
        pointerId: null
    });
    const score = Number(value);
    const starCount = Number.isFinite(max) && max > 0 ? Math.round(max) : 5;
    const clampedScore = Number.isFinite(score) ? Math.max(0, Math.min(starCount, score)) : 0;
    const fontSize = SIZE_STYLES[size] || SIZE_STYLES.md;
    const gridTemplateColumns = `repeat(${starCount * 2}, 0.5em)`;

    const valueFromClientX = useMemo(() => {
        return (clientX) => {
            const gridElement = gridRef.current;

            if (!gridElement) {
                return null;
            }

            const rect = gridElement.getBoundingClientRect();
            if (rect.width <= 0) {
                return null;
            }

            const relative = Math.max(0, Math.min(rect.width, clientX - rect.left));
            const rawScore = (relative / rect.width) * starCount;
            const nextScore = Math.max(0.5, Math.min(starCount, Math.round(rawScore * 2) / 2));

            return nextScore;
        };
    }, [starCount]);

    const handlePointerUpdate = (event, shouldCommit) => {
        const nextValue = valueFromClientX(event.clientX);

        if (nextValue == null) {
            return;
        }

        onHoverChange?.(nextValue);

        if (shouldCommit) {
            onChange?.(nextValue);
        }
    };

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
                            backgroundImage: `linear-gradient(90deg, #1d9bf0 ${fill * 100}%, #cfd9de ${fill * 100}%)`
                        }}
                    >
                        {STAR_FILLED}
                    </span>
                );
            })}
            {interactive && typeof onChange === 'function' && (
                <div
                    ref={gridRef}
                    className="star-rating-hit-grid"
                    style={{ gridTemplateColumns }}
                    onPointerDown={(event) => {
                        if (event.pointerType === 'mouse' && event.button !== 0) {
                            return;
                        }

                        interactionRef.current.isPointerDown = true;
                        interactionRef.current.pointerId = event.pointerId;
                        event.currentTarget.setPointerCapture?.(event.pointerId);
                        handlePointerUpdate(event, true);
                    }}
                    onPointerMove={(event) => {
                        if (!interactionRef.current.isPointerDown || interactionRef.current.pointerId !== event.pointerId) {
                            return;
                        }

                        handlePointerUpdate(event, true);
                    }}
                    onPointerUp={(event) => {
                        if (interactionRef.current.pointerId === event.pointerId) {
                            interactionRef.current.isPointerDown = false;
                            interactionRef.current.pointerId = null;
                        }
                        onHoverChange?.(null);
                    }}
                    onPointerCancel={() => {
                        interactionRef.current.isPointerDown = false;
                        interactionRef.current.pointerId = null;
                        onHoverChange?.(null);
                    }}
                    onPointerLeave={(event) => {
                        if (event.pointerType === 'mouse') {
                            onHoverChange?.(null);
                        }
                    }}
                    onMouseLeave={() => onHoverChange?.(null)}
                    onFocusCapture={() => onHoverChange?.(Number(value) || 0.5)}
                >
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
