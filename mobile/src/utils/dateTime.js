const format = (value, options, emptyValue) => {
  if (!value) {
    return emptyValue;
  }

  return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
};

export const formatTimestamp = (value, emptyValue = '-') => format(value, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit'
}, emptyValue);

export const formatShortTimestamp = (value, emptyValue = '-') => format(value, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
}, emptyValue);
