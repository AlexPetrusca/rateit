export const wrapSelection = (value, selection, marker) => {
  const start = selection?.start ?? value.length;
  const end = selection?.end ?? start;
  const selected = value.slice(start, end);
  return {
    value: `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`,
    cursor: selected ? end + marker.length : start + marker.length
  };
};

export const insertLink = (value, selection) => {
  const start = selection?.start ?? value.length;
  const end = selection?.end ?? start;
  const label = value.slice(start, end) || 'link text';
  return {
    value: `${value.slice(0, start)}[${label}]()${value.slice(end)}`,
    cursor: start + label.length + 3
  };
};
