export const formatTimestamp = (value, emptyValue = '-') => {
    if (!value) {
        return emptyValue;
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
    }).format(new Date(value));
};

export const formatShortTimestamp = (value, emptyValue = '-') => {
    if (!value) {
        return emptyValue;
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).format(new Date(value));
};
