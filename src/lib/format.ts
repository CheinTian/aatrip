export function formatMoney(
  cents: number,
  currency = "CNY",
  options: {
    signed?: boolean;
    compact?: boolean;
    locale?: string;
  } = {}
) {
  const value = cents / 100;
  const formatted = new Intl.NumberFormat(options.locale ?? "zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    notation: options.compact ? "compact" : "standard"
  }).format(Math.abs(value));

  if (options.signed && cents > 0) return `+${formatted}`;
  if (cents < 0) return `-${formatted}`;
  return formatted;
}

export function formatDate(
  value: string,
  style: "short" | "long" = "short",
  locale = "zh-CN"
) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    month: style === "short" ? "numeric" : "long",
    day: "numeric",
    weekday: style === "long" ? "short" : undefined
  }).format(date);
}

export function formatDateRange(
  startDate: string,
  endDate: string,
  locale = "zh-CN",
  emptyLabel = "日期待定"
) {
  if (!startDate && !endDate) return emptyLabel;
  if (startDate && endDate) {
    return `${formatDate(startDate, "short", locale)} - ${formatDate(
      endDate,
      "short",
      locale
    )}`;
  }
  return formatDate(startDate || endDate, "long", locale);
}

export function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function parseMoneyToCents(value: string) {
  const normalized = value.replace(/[^\d.-]/g, "").trim();
  if (!normalized) return 0;
  return Math.round(Number(normalized) * 100);
}

export function initials(name: string) {
  return Array.from(name.trim()).slice(-2).join("").toUpperCase();
}
