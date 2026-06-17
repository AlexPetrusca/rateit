import RichTextarea from './RichTextarea.jsx';
import StarRating from './StarRating.jsx';
import { formatFiveStarScore } from '../utils/ratingDisplay.js';

const RatingComposer = ({
    className = 'feed-composer',
    label = 'Your rating',
    showLabel = true,
    score,
    previewScore,
    onScoreChange,
    onHoverChange,
    text,
    onTextChange,
    placeholder,
    rows = 3,
    submitLabel,
    onSubmit,
    starSize = 'lg'
}) => {
    const displayScore = previewScore ?? score;
    const scoreLabel = formatFiveStarScore(displayScore);

    return (
        <div className={className}>
            {showLabel && <label>{label}</label>}
            <div className="score-row">
                <output className="score-value">{scoreLabel}</output>
                <StarRating
                    value={Number.isFinite(Number(displayScore)) ? Number(displayScore) : 0}
                    label={`Selected rating: ${scoreLabel}`}
                    size={starSize}
                    interactive
                    onChange={(nextScore) => onScoreChange?.(nextScore)}
                    onHoverChange={onHoverChange}
                />
            </div>
            <RichTextarea
                value={text}
                onChange={onTextChange}
                placeholder={placeholder}
                rows={rows}
            />
            <div className="composer-actions">
                <button type="button" onClick={onSubmit}>
                    {submitLabel}
                </button>
            </div>
        </div>
    );
};

export default RatingComposer;
