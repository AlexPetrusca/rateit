import RichTextarea from './RichTextarea.jsx';
import StarRating from './StarRating.jsx';
import { FIVE_STAR_SCALE, formatScoreValue } from '../utils/ratingDisplay.js';

const CommentComposer = ({
    className = 'comment-composer',
    nested = false,
    title = 'Your rating',
    score,
    previewScore,
    onScoreChange,
    onHoverChange,
    text,
    onTextChange,
    placeholder,
    submitLabel = 'Reply',
    onSubmit,
    rows = 3
}) => {
    const displayScore = previewScore ?? score;
    const classes = [
        className,
        nested ? 'comment-composer-nested' : ''
    ].filter(Boolean).join(' ');

    return (
        <div className={classes}>
            <div className="comment-rating-control">
                <label>{title}</label>
                <output aria-live="polite">
                    {formatScoreValue(displayScore, FIVE_STAR_SCALE)}
                </output>
                <StarRating
                    value={displayScore}
                    label={`Selected rating: ${formatScoreValue(score, FIVE_STAR_SCALE)}`}
                    size="sm"
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

export default CommentComposer;
