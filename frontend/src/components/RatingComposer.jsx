import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import BackIconHD from '../assets/icons/hand_drawn/back.svg?react';
import CheckMarkHD from '../assets/icons/hand_drawn/check_mark.svg?react';
import RichTextarea from './RichTextarea.jsx';
import StarRating from './StarRating.jsx';
import { useIconPack } from '../contexts/IconPackContext.jsx';
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
    onClose,
    starSize = 'lg'
}) => {
    const { iconPack } = useIconPack();
    const hd = iconPack === 'hand_drawn';
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

export default RatingComposer;
