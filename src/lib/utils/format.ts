export function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-PK")}`;
}

export function formatDuration(days: number): string {
  if (days === 1) return "1 day";
  if (days === 30) return "1 month";
  if (days === 90) return "3 months";
  if (days === 180) return "6 months";
  if (days === 365) return "1 year";
  return `${days} days`;
}

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  const monthIdx = parseInt(month, 10) - 1;
  const monthName = MONTH_NAMES_SHORT[monthIdx] || month;
  return `${parseInt(day, 10)} ${monthName} ${year}`;
}

export function formatPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
  separator: string = "to",
): string {
  if (!start && !end) return "—";
  if (!start) return formatDate(end);
  if (!end) return formatDate(start);
  return `${formatDate(start)} ${separator} ${formatDate(end)}`;
}
