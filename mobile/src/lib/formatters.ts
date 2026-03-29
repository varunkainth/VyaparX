const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrDecimalFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number) {
  return inrFormatter.format(Number(amount) || 0);
}

export function formatCurrencyWithDecimals(amount: number) {
  return inrDecimalFormatter.format(Number(amount) || 0);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(Number(value) || 0);
}

export function formatMonthLabel(value: string) {
  const [year, month] = value.split('-').map((part) => Number(part));
  if (!year || !month) {
    return value;
  }

  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}

export function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatPercent(value: number) {
  const numeric = Number(value) || 0;
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(1)}%`;
}
