export const mergeUniqueBy = (current, incoming, getId) => (
  [...new Map([...current, ...incoming].map((item) => [String(getId(item)), item])).values()]
);

export const isNearListEnd = ({ visibleLength, offset, contentLength }, threshold = 240) => (
  visibleLength + offset >= contentLength - threshold
);
