export const MIN_RATING_SCORE = 0.5;
export const MAX_RATING_SCORE = 5;
export const RATING_SCORE_STEP = 0.5;

export const normalizeText = (value) => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
};

export const validateCreateRatingDraft = ({ body, selectedFile, score }) => {
    const numericScore = Number(score);

    if (!Number.isFinite(numericScore) || numericScore < MIN_RATING_SCORE || numericScore > MAX_RATING_SCORE) {
        return 'Pick a score between 0.5 and 5.';
    }

    if (!selectedFile && !normalizeText(body)) {
        return 'Add text or upload a photo before posting.';
    }

    return null;
};

export const buildCreateRatingRequest = ({ body, reviewText, score, mediaObjectKey, mediaContentType }) => {
    return {
        body: normalizeText(body),
        reviewText: normalizeText(reviewText),
        score: Number(score),
        mediaObjectKey: normalizeText(mediaObjectKey),
        mediaContentType: normalizeText(mediaContentType)
    };
};
