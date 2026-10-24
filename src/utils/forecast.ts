/**
 * Cash forecast engine for ApkaInvoice.
 *
 * Core invariant (must always hold): closing[i] = opening[i] + inflow[i] - outflow[i],
 * and opening[i+1] = closing[i]. The forecast ties out by construction.
 *
 * Disputed invoices are excluded from safe inflow.
 * Inflows dynamically sync from active unpaid invoices in dataStore.
 * Outflows sync from user-configured operating expenses (rent, payroll, vendors).
 */

import { Paise, add, subtract } from "./money";
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

export interface ForecastSettings {
  startingBalance: number; // In INR (default: 0 or user custom)
  monthlyRent: number; // In INR (default: 0)
  monthlyPayroll: number; // In INR (default: 0)
  weeklyVendors: number; // In INR (default: 0)
}

/** Default recurring weekly outflows - empty by default (no fake details) */
export const DEFAULT_OUTFLOWS: Record<number, { label: string; amount: Paise }> = {};

/**
 * Generate weekly outflows based on real user settings
 */
export function buildWeeklyOutflowsFromSettings(
  settings: ForecastSettings
): Record<number, { label: string; amount: Paise }> {
  const outflows: Record<number, { label: string; amount: Paise }> = {};
  const rentPaise = Math.round((settings.monthlyRent || 0) * 100);
  const payrollPaise = Math.round((settings.monthlyPayroll || 0) * 100);
  const vendorsPaise = Math.round((settings.weeklyVendors || 0) * 100);

  for (let i = 0; i < 8; i++) {
    let weekAmount = 0;
    const labels: string[] = [];

    // Monthly payroll distributed on week 0 and week 4
    if (payrollPaise > 0 && (i === 0 || i === 4)) {
      weekAmount += payrollPaise;
      labels.push("Payroll");
    }
    // Monthly rent distributed on week 1 and week 5
    if (rentPaise > 0 && (i === 1 || i === 5)) {
      weekAmount += rentPaise;
      labels.push("Rent");
    }
    // Weekly vendors/raw materials
    if (vendorsPaise > 0) {
      weekAmount += vendorsPaise;
      labels.push("Suppliers");
    }

    if (weekAmount > 0) {
      outflows[i] = {
        label: labels.join(" + "),
        amount: weekAmount,
      };
    }
  }

  return outflows;
}

/**
 * Build the 8-week cash forecast from real invoice dataset.
 *
 * @param openingBalance - starting cash in paise
 * @param invoices - all invoices (disputed ones excluded from inflow)
 * @param outflows - optional weekly outflows (keyed by week index 0-7)
 * @param whatIf - optional what-if scenario (customer pays X days late)
 */
export function buildForecast({
  openingBalance = 0,
  invoices,
  outflows = DEFAULT_OUTFLOWS,
  whatIf,
}: {
  openingBalance?: Paise;
  invoices: Invoice[];
  outflows?: Record<number, { label: string; amount: Paise }>;
  whatIf?: WhatIfScenario;
}): ForecastResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weeks = generateWeeks(today, 8);

  // Build per-week inflows from real invoices expected to be paid
  const weeklyInflow: Paise[] = new Array(8).fill(0);

  for (const inv of invoices) {
    // Skip disputed invoices
    if (inv.status === "disputed" || inv.isDisputed) continue;
    // Skip fully completed/paid invoices
    if (inv.status === "paid" || inv.outstanding <= 0) continue;

    const outstanding = inv.outstanding;

    // Determine expected payment week based on due date
    let expectedDate = new Date(inv.dueDate);
    expectedDate.setHours(0, 0, 0, 0);

    // Apply what-if simulation: this customer pays X days late
    if (whatIf && whatIf.customerId === inv.customerId && whatIf.daysLate > 0) {
      expectedDate = addDays(expectedDate, whatIf.daysLate);
    }

    // Determine week bucket
    let weekIndex = -1;
    if (expectedDate < weeks[0]) {
      // Overdue invoices are immediate collection targets in Week 0 (Current Week)
      weekIndex = 0;
    } else {
      weekIndex = weeks.findIndex(
        (w) => expectedDate >= w && expectedDate < addDays(w, 7)
      );
    }

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

    // Tie-out invariant: next week's opening = this week's closing
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
