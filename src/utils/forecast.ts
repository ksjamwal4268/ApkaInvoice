/**
 * Cash forecast engine for ApkaInvoice.
 *
 * Core invariant (must always hold): closing[i] = opening[i] + inflow[i] - outflow[i],
 * and opening[i+1] = closing[i]. The forecast ties out by construction.
 *
 * Disputed invoices are excluded from inflow.
 * What-if: a customer can be simulated to pay X days late, which shifts their
 * expected invoice payment into a later week.
 */

import { Paise, fromPaise, add, subtract } from "./money";
import { generateWeeks, formatWeekLabel, addDays } from "./date";

export type CustomerId = string;
export type InvoiceId = string;

export type { Invoice } from "../data/sampleData";
import type { Invoice } from "../data/sampleData";

export interface Customer {
  id: CustomerId;
  name: string;
  city: string;
  state: string;
}

export interface WeeklyFlow {
  weekStart: Date;
  weekLabel: string;
  opening: Paise;
  inflow: Paise;
  outflow: Paise;
  closing: Paise;
}

export interface ForecastResult {
  weeks: WeeklyFlow[];
  shortfallWeekIndex: number | null; // first week where closing < 0
  totalInflow: Paise;
  totalOutflow: Paise;
}

export interface WhatIfScenario {
  customerId: CustomerId;
  daysLate: number;
}

/** Default recurring weekly outflows for Sharma Packaging (Pune) */
export const DEFAULT_OUTFLOWS: Record<number, { label: string; amount: Paise }> = {
  0: { label: "Salary", amount: 18000000 }, // ₹1,80,000
  1: { label: "Weekly suppliers", amount: 8500000 }, // ₹85,000
  2: { label: "Rent", amount: 6000000 }, // ₹60,000
  3: { label: "Weekly suppliers", amount: 8500000 },
  4: { label: "Salary", amount: 18000000 },
  5: { label: "Weekly suppliers", amount: 8500000 },
  6: { label: "Rent", amount: 6000000 },
  7: { label: "Weekly suppliers", amount: 8500000 },
};

/**
 * Build the 8-week cash forecast.
 *
 * @param openingBalance - starting cash in paise
 * @param invoices - all invoices (disputed ones excluded from inflow)
 * @param outflows - optional override of weekly outflows (keyed by week index 0-7)
 * @param whatIf - optional what-if scenario (customer pays X days late)
 */
export function buildForecast({
  openingBalance,
  invoices,
  outflows = DEFAULT_OUTFLOWS,
  whatIf,
}: {
  openingBalance: Paise;
  invoices: Invoice[];
  outflows?: Record<number, { label: string; amount: Paise }>;
  whatIf?: WhatIfScenario;
}): ForecastResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weeks = generateWeeks(today, 8);

  // Build per-week inflows from invoices expected to be paid
  const weeklyInflow: Paise[] = new Array(8).fill(0);

  for (const inv of invoices) {
    // Skip disputed invoices entirely
    if (inv.status === "disputed") continue;
    // Skip already paid
    if (inv.status === "paid") continue;

    const outstanding = inv.outstanding;

    // Determine expected payment week based on due date
    let expectedDate = new Date(inv.dueDate);
    expectedDate.setHours(0, 0, 0, 0);

    // Apply what-if: this customer pays X days late
    if (whatIf && whatIf.customerId === inv.customerId && whatIf.daysLate > 0) {
      expectedDate = addDays(expectedDate, whatIf.daysLate);
    }

    // Only count if expected within the 8-week window
    const weekIndex = weeks.findIndex(
      (w) =>
        expectedDate >= w && expectedDate < addDays(w, 7)
    );

    if (weekIndex >= 0 && weekIndex < 8) {
      weeklyInflow[weekIndex] = add(weeklyInflow[weekIndex], outstanding);
    }
  }

  // Build per-week outflows
  const weeklyOutflow: Paise[] = new Array(8).fill(0);
  const outflowLabels: string[] = new Array(8).fill("");

  for (let i = 0; i < 8; i++) {
    const outflow = outflows[i];
    if (outflow) {
      weeklyOutflow[i] = outflow.amount;
      outflowLabels[i] = outflow.label;
    }
  }

  // Compute running balance with tie-out invariant
  const weeklyFlows: WeeklyFlow[] = [];
  let runningOpening = openingBalance;
  let shortfallWeekIndex: number | null = null;

  for (let i = 0; i < 8; i++) {
    const inflow = weeklyInflow[i];
    const outflow = weeklyOutflow[i];
    const closing = subtract(add(runningOpening, inflow), outflow);

    if (closing < 0 && shortfallWeekIndex === null) {
      shortfallWeekIndex = i;
    }

    weeklyFlows.push({
      weekStart: weeks[i],
      weekLabel: formatWeekLabel(weeks[i]),
      opening: runningOpening,
      inflow,
      outflow,
      closing,
    });

    // Tie-out: next week's opening = this week's closing
    runningOpening = closing;
  }

  const totalInflow = weeklyInflow.reduce((sum, v) => sum + v, 0);
  const totalOutflow = weeklyOutflow.reduce((sum, v) => sum + v, 0);

  return {
    weeks: weeklyFlows,
    shortfallWeekIndex,
    totalInflow,
    totalOutflow,
  };
}

/** Get a human-readable label for the shortfall week */
export function shortfallLabel(forecast: ForecastResult): string | null {
  if (forecast.shortfallWeekIndex === null) return null;
  const week = forecast.weeks[forecast.shortfallWeekIndex];
  return `Cash runs short in the week of ${week.weekLabel} (closing balance ${formatInr(week.closing)}).`;
}

function formatInr(paise: Paise): string {
  const rupees = Math.abs(fromPaise(paise));
  const sign = paise < 0 ? "-" : "";
  const formatted = formatIndianNumber(Math.floor(rupees));
  return `${sign}₹${formatted}`;
}

function formatIndianNumber(num: number): string {
  const n = Math.floor(num);
  if (n < 1000) return String(n);
  const last3 = n % 1000;
  const rest = Math.floor(n / 1000);
  const restStr = formatIndianLakhs(rest);
  return `${restStr},${String(last3).padStart(3, "0")}`;
}

function formatIndianLakhs(num: number): string {
  if (num < 100) return String(num);
  const last2 = num % 100;
  const rest = Math.floor(num / 100);
  return `${rest},${String(last2).padStart(2, "0")}`;
}