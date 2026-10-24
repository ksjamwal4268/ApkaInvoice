/**
 * Date utilities for ApkaInvoice.
 * Handles due dates from payment terms, week bucketing, and day differences.
 */

export type PaymentTerms = "Net 15" | "Net 30" | "Net 45";

export const TERMS_DAYS: Record<PaymentTerms, number> = {
  "Net 15": 15,
  "Net 30": 30,
  "Net 45": 45,
};

/** Safely parse any date input (Date, string, number, or null/undefined) into a valid Date object */
export function parseSafeDate(input: any): Date {
  if (!input) return new Date();
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? new Date() : input;
  }
  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/** Convert any date input to YYYY-MM-DD safely */
export function toISODateString(input: any): string {
  const d = parseSafeDate(input);
  return d.toISOString().split("T")[0];
}

/** Add days to a Date and return a new Date at start of day */
export function addDays(date: any, days: number): Date {
  const result = new Date(parseSafeDate(date));
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() + (days || 0));
  return result;
}

/** Compute due date from invoice date and payment terms */
export function computeDueDate(invoiceDate: any, terms: PaymentTerms): Date {
  return addDays(invoiceDate, TERMS_DAYS[terms] || 30);
}

/** Days between two dates (can be negative) */
export function daysBetween(from: any, to: any): number {
  const fromStart = new Date(parseSafeDate(from));
  fromStart.setHours(0, 0, 0, 0);
  const toStart = new Date(parseSafeDate(to));
  toStart.setHours(0, 0, 0, 0);
  const diffMs = toStart.getTime() - fromStart.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Check if a date is overdue relative to today */
export function isOverdue(dueDate: any, today: any = new Date()): boolean {
  return daysBetween(dueDate, today) > 0;
}

/** Format date as DD MMM YYYY (e.g., 14 Oct 2024) */
export function formatDate(date: any): string {
  const d = parseSafeDate(date);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format date in Hindi: DD MMM YYYY (e.g., 14 oct 2024) */
export function formatHindiDate(date: any): string {
  const d = parseSafeDate(date);
  return d.toLocaleDateString("hi-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format date as DD/MM/YYYY */
export function formatDateShort(date: any): string {
  const d = parseSafeDate(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Get the Monday of the week containing the given date (start of week) */
export function startOfWeek(date: any): Date {
  const d = new Date(parseSafeDate(date));
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