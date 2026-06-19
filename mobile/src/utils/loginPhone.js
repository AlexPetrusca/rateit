export const sanitizePhoneDigits = (value) => String(value || '').replace(/\D/g, '').slice(0, 10);

export const parsePhoneDigits = (value) => {
  const rawValue = String(value || '').trim();
  const digits = rawValue.replace(/\D/g, '');
  if (rawValue.startsWith('+1') || (digits.length === 11 && digits.startsWith('1'))) {
    return digits.slice(1, 11);
  }
  return digits.slice(0, 10);
};

export const formatPhoneNumber = (value) => {
  const digits = sanitizePhoneDigits(value);
  const area = digits.slice(0, 3).padEnd(3, ' ');
  const prefix = digits.slice(3, 6).padEnd(3, ' ');
  const line = digits.slice(6, 10).padEnd(4, ' ');
  return `(${area}) ${prefix}-${line}`;
};

export const normalizePhoneNumber = (countryCode, value) => {
  const digits = sanitizePhoneDigits(value);
  return digits.length === 10 ? `${countryCode}${digits}` : '';
};
