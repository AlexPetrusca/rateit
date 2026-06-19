export const chooseCyclingRows = (rowCount, random = Math.random) => {
  const rows = Array.from({ length: rowCount }, (_, index) => index);
  for (let index = rows.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [rows[index], rows[swapIndex]] = [rows[swapIndex], rows[index]];
  }
  return rows.slice(0, 3 + Math.floor(random() * 2));
};

