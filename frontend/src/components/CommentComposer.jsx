import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import BackIconHD from '../assets/icons/hand_drawn/back.svg?react';
import CheckMarkHD from '../assets/icons/hand_drawn/check_mark.svg?react';
import RichTextarea from './RichTextarea.jsx';
import StarRating from './StarRating.jsx';
import { useIconPack } from '../contexts/IconPackContext.jsx';
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
    onClose,
    rows = 3
}) => {
    const { iconPack } = useIconPack();
    const hd = iconPack === 'hand_drawn';
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
                {onClose && (
                    <button type="button" className="composer-icon-btn" onClick={onClose} aria-label="Close" title="Close">
                        {hd ? <BackIconHD /> : <ArrowBackIcon />}
                    </button>
                )}
                <button type="button" className="composer-icon-btn" onClick={onSubmit} aria-label={submitLabel} title={submitLabel}>
                    {hd ? <CheckMarkHD /> : <CheckIcon />}
                </button>
            </div>
        </div>
    );
};

export default CommentComposer;
