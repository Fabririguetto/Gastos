import type { Card, CardClosingOverride } from "@/types/database";

export const WEEKDAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Algoritmo de Sakamoto — sin Date/toISOString, evita corrimientos por timezone.
export function dayOfWeek(year: number, month: number, day: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = year;
  if (month < 3) y -= 1;
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[month - 1] + day) % 7;
}

export function lastWeekdayOfMonth(year: number, month: number, weekday: number): string {
  const last = daysInMonth(year, month);
  const lastDow = dayOfWeek(year, month, last);
  const diff = (lastDow - weekday + 7) % 7;
  const day = last - diff;
  return `${year}-${pad(month)}-${pad(day)}`;
}

type ClosingCardInfo = Pick<Card, "id" | "closing_rule" | "closing_day" | "closing_weekday">;

export function getEffectiveClosingDate(
  card: ClosingCardInfo,
  year: number,
  month: number,
  overrides: CardClosingOverride[],
): string | null {
  const override = overrides.find(
    (o) => o.card_id === card.id && o.period_year === year && o.period_month === month,
  );
  if (override) return override.closing_date;

  if (card.closing_rule === "fixed_day" && card.closing_day) {
    const day = Math.min(card.closing_day, daysInMonth(year, month));
    return `${year}-${pad(month)}-${pad(day)}`;
  }
  if (card.closing_rule === "last_weekday" && card.closing_weekday != null) {
    return lastWeekdayOfMonth(year, month, card.closing_weekday);
  }
  return null;
}

export function formatClosingDate(card: ClosingCardInfo, year: number, month: number, overrides: CardClosingOverride[]): string | null {
  const override = overrides.find(
    (o) => o.card_id === card.id && o.period_year === year && o.period_month === month,
  );
  if (override) {
    const [, , d] = override.closing_date.split("-");
    return `${d}/${pad(month)} (manual)`;
  }
  if (card.closing_rule === "fixed_day" && card.closing_day) return `Día ${card.closing_day}`;
  if (card.closing_rule === "last_weekday" && card.closing_weekday != null) return `Último ${WEEKDAY_NAMES[card.closing_weekday].toLowerCase()}`;
  return null;
}

// Suma `months` meses a (year, month) y devuelve el 1° de ese mes.
function firstOfMonthPlus(year: number, month: number, months: number): string {
  const total = year * 12 + (month - 1) + months;
  const y2 = Math.floor(total / 12);
  const m2 = (total % 12) + 1;
  return `${y2}-${pad(m2)}-01`;
}

export function suggestFirstInstallmentDate(
  card: ClosingCardInfo,
  todayYear: number,
  todayMonth: number,
  todayDay: number,
  overrides: CardClosingOverride[],
): string {
  const closing = getEffectiveClosingDate(card, todayYear, todayMonth, overrides);
  const todayStr = `${todayYear}-${pad(todayMonth)}-${pad(todayDay)}`;
  const monthsAhead = closing && todayStr > closing ? 2 : 1;
  return firstOfMonthPlus(todayYear, todayMonth, monthsAhead);
}
