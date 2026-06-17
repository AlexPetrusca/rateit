export const FIVE_STAR_SCALE = { max: 5, symbol: 'star' };
export const DEFAULT_COMMENT_SCORE = 2.5;

export const formatScoreValue = (scoreValue, ratingScale = FIVE_STAR_SCALE) => {
    const score = Number(scoreValue);
    const max = Number(ratingScale?.max);
    const symbol = ratingScale?.symbol === 'star'
        ? 'stars'
        : ratingScale?.symbol;

    if (!Number.isFinite(score)) {
        return '';
    }

    const displayScore = Number.isInteger(score) ? score.toString() : score.toFixed(1);
    const displayMax = Number.isFinite(max)
        ? (Number.isInteger(max) ? max.toString() : max.toFixed(1))
        : '';

    return `${displayScore}${Number.isFinite(max) ? ` / ${displayMax}` : ''}${symbol ? ` ${symbol}` : ''}`;
};

export const formatFiveStarScore = (scoreValue) => {
    const score = Number(scoreValue);
    return Number.isFinite(score) ? `${score.toFixed(1)} / 5` : '0.0 / 5';
};

export const isFiveStarScoreInRange = (score) => (
    Number.isFinite(score) && score >= 0.5 && score <= 5
);
