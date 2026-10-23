/**
 * Date utilities for Cash Copilot.
 * Handles due dates from payment terms, week bucketing, and day differences.
 */

export type PaymentTerms = "Net 15" | "Net 30" | "Net 45";

export const TERMS_DAYS: Record<PaymentTerms, number> = {
  "Net 15": 15,
  "Net 30": 30,
  "Net 45": 45,
};

/** Add days to a Date and return a new Date at start of day */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() + days);
  return result;
}

/** Compute due date from invoice date and payment terms */
export function computeDueDate(invoiceDate: Date, terms: PaymentTerms): Date {
  return addDays(invoiceDate, TERMS_DAYS[terms]);
}

/** Days between two dates (can be negative) */
export function daysBetween(from: Date, to: Date): number {
  const fromStart = new Date(from);
  fromStart.setHours(0, 0, 0, 0);
  const toStart = new Date(to);
  toStart.setHours(0, 0, 0, 0);
  const diffMs = toStart.getTime() - fromStart.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Check if a date is overdue relative to today */
export function isOverdue(dueDate: Date, today: Date = new Date()): boolean {
  return daysBetween(dueDate, today) > 0;
}

/** Format date as DD MMM YYYY (e.g., 14 Oct 2024) */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format date as DD/MM/YYYY */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Get the Monday of the week containing the given date (start of week) */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d;
}

/** Format week label: "Oct 14–20" */
export function formatWeekLabel(start: Date): string {
  const end = addDays(start, 6);
  const startMonth = start.toLocaleDateString("en-IN", { month: "short" });
  const endMonth = end.toLocaleDateString("en-IN", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();
  if (startMonth === endMonth) {
    return `${startDay}–${endDay} ${startMonth}, ${year}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth}, ${year}`;
}

/** Generate 8 weekly buckets starting from a given date */
export function generateWeeks(startDate: Date, count: number = 8): Date[] {
  const weeks: Date[] = [];
  const start = startOfWeek(startDate);
  for (let i = 0; i < count; i++) {
    weeks.push(addDays(start, i * 7));
  }
  return weeks;
}