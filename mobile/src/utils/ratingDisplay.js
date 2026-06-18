export const FIVE_STAR_SCALE = { max: 5, symbol: 'star' };
export const DEFAULT_COMMENT_SCORE = 2.5;
export const MIN_RATING_SCORE = 0.5;
export const MAX_RATING_SCORE = 5;
export const RATING_SCORE_STEP = 0.5;

export const formatScoreValue = (scoreValue, ratingScale = FIVE_STAR_SCALE) => {
  const score = Number(scoreValue);
  const max = Number(ratingScale?.max);
  const symbol = ratingScale?.symbol === 'star' ? 'stars' : ratingScale?.symbol;

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
  Number.isFinite(score) && score >= MIN_RATING_SCORE && score <= MAX_RATING_SCORE
);

export const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export const validateCreateRatingDraft = ({ body, selectedFile, score }) => {
  const numericScore = Number(score);

  if (!isFiveStarScoreInRange(numericScore)) {
    return 'Pick a score between 0.5 and 5.';
  }

  if (!selectedFile && !normalizeText(body)) {
    return 'Add text or upload a photo before posting.';
  }

  return null;
};

export const buildCreateRatingRequest = ({ body, reviewText, score, mediaObjectKey, mediaContentType }) => ({
  body: normalizeText(body),
  reviewText: normalizeText(reviewText),
  score: Number(score),
  mediaObjectKey: normalizeText(mediaObjectKey),
  mediaContentType: normalizeText(mediaContentType)
});
