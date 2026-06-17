export const truncateText = (value, maxLength = 140) => {
    if (typeof value !== 'string') {
        return '—';
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return '—';
    }

    return trimmed.length > maxLength
        ? `${trimmed.slice(0, maxLength - 1)}…`
        : trimmed;
};
