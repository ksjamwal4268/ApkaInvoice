import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ForecastChart } from "../components/ForecastChart";
import { buildForecast, buildWeeklyOutflowsFromSettings, WhatIfScenario } from "../utils/forecast";
import { formatInr, add, toPaise } from "../utils/money";
import { addDays } from "../utils/date";
import { Language } from "../data/i18n";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Wallet,
  ArrowRight,
  ShieldCheck,
  Settings,
  X,
  FileText,
  Sliders,
  DollarSign,
  Building2,
  Clock,
  Sparkles,
} from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";

export function Forecast({ lang: _lang }: { lang: Language }) {
  const { invoices, customers, businessProfile, forecastSettings, saveForecastSettings } = useDataStore();

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    startingBalance: forecastSettings?.startingBalance || 0,
    monthlyRent: forecastSettings?.monthlyRent || 0,
    monthlyPayroll: forecastSettings?.monthlyPayroll || 0,
    weeklyVendors: forecastSettings?.weeklyVendors || 0,
  });

  // What-If Simulation
  const [whatIfCustomer, setWhatIfCustomer] = useState<string | null>(null);
  const [daysLate, setDaysLate] = useState(0);

  const whatIf = useMemo((): WhatIfScenario | undefined => {
    return whatIfCustomer && daysLate > 0
      ? { customerId: whatIfCustomer, daysLate }
      : undefined;
  }, [whatIfCustomer, daysLate]);

  // Dynamic Opening Liquidity: User's starting bank balance + real payments collected from invoices
  const totalCollectedPaise = useMemo(
    () => invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0),
    [invoices]
  );

  const openingBalancePaise = useMemo(
    () => toPaise(forecastSettings?.startingBalance || 0) + totalCollectedPaise,
    [forecastSettings?.startingBalance, totalCollectedPaise]
  );

  // Dynamic Outflows: Built from user's configured expenses (no fake data)
  const outflows = useMemo(
    () =>
      buildWeeklyOutflowsFromSettings(
        forecastSettings || { startingBalance: 0, monthlyRent: 0, monthlyPayroll: 0, weeklyVendors: 0 }
      ),
    [forecastSettings]
  );

  // Build the 8-week dynamic forecast
  const forecast = useMemo(() => {
    return buildForecast({
      openingBalance: openingBalancePaise,
      invoices,
      outflows,
      whatIf,
    });
  }, [openingBalancePaise, invoices, outflows, whatIf]);

  const totalInflow = add(...forecast.weeks.map((w) => w.inflow));
  const totalOutflow = add(...forecast.weeks.map((w) => w.outflow));
  const netDelta = totalInflow - totalOutflow;
  const endingBalance = forecast.weeks[forecast.weeks.length - 1]?.closing || 0;
  const shortfallWeek =
    forecast.shortfallWeekIndex !== null
      ? forecast.weeks[forecast.shortfallWeekIndex]
      : null;

  // Real Contributing Invoices per Week
  const weeklyInvoiceMap = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const map: Record<number, typeof invoices> = {};
    for (let i = 0; i < 8; i++) map[i] = [];

    for (const inv of invoices) {
      if ((inv.status ?? "").toLowerCase() === "disputed" || inv.isDisputed) continue;
      if ((inv.status ?? "").toLowerCase() === "paid" || (inv.outstanding || 0) <= 0) continue;

      const parsed = inv.dueDate ? new Date(inv.dueDate) : new Date();
      let expectedDate = isNaN(parsed.getTime()) ? new Date() : parsed;
      expectedDate.setHours(0, 0, 0, 0);

      if (whatIf && whatIf.customerId === inv.customerId && whatIf.daysLate > 0) {
        expectedDate = addDays(expectedDate, whatIf.daysLate);
      }

      const weekStarts = forecast.weeks.map((w) => new Date(w.weekStart));
      const weekIdx =
        expectedDate < weekStarts[0]
          ? 0 // Overdue belongs to current week
          : weekStarts.findIndex((ws) => expectedDate >= ws && expectedDate < addDays(ws, 7));

      if (weekIdx >= 0 && weekIdx < 8) {
        map[weekIdx].push(inv);
      }
    }
    return map;
  }, [invoices, forecast.weeks, whatIf]);

  // Real Dynamic Recommendations based on actual dataset
  const overdueInvoices = useMemo(
    () =>
      invoices
        .filter((inv) => (inv.status ?? "").toLowerCase() === "overdue" && (inv.outstanding || 0) > 0 && !inv.isDisputed)
        .sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0)),
    [invoices]
  );
  const topOverdue = overdueInvoices[0] || null;

  const upcomingInvoices = useMemo(
    () =>
      invoices
        .filter((inv) => (inv.status ?? "").toLowerCase() === "due" && (inv.outstanding || 0) > 0 && !inv.isDisputed)
        .sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0)),
    [invoices]
  );
  const topUpcoming = upcomingInvoices[0] || null;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveForecastSettings(configForm);
    setIsConfigModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Cash Flow Forecast
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300">
              Live Invariant Model
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            8-week cash projection dynamically synchronized with active customer invoices and operating expenses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {shortfallWeek ? (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Deficit projected in {shortfallWeek.weekLabel}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Full 8-Week Runway Intact</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setConfigForm({
                startingBalance: forecastSettings?.startingBalance || 0,
                monthlyRent: forecastSettings?.monthlyRent || 0,
                monthlyPayroll: forecastSettings?.monthlyPayroll || 0,
                weeklyVendors: forecastSettings?.weeklyVendors || 0,
              });
              setIsConfigModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
          >
            <Settings className="w-4 h-4 text-teal-600" />
            <span>Configure Expenses</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Opening Liquidity */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Wallet className="w-4 h-4 text-teal-600" />
              <span>Starting Liquidity</span>
            </div>
          </div>
          <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
            {formatInr(openingBalancePaise)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {totalCollectedPaise > 0
              ? `₹${forecastSettings?.startingBalance?.toLocaleString() || 0} base + ${formatInr(totalCollectedPaise)} collected`
              : "Bank balance & collected funds"}
          </p>
        </div>

        {/* Projected Inflows */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <span>Scheduled Inflow</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Invoices
            </span>
          </div>
          <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            +{formatInr(totalInflow)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {invoices.filter((i) => i.status !== "paid" && i.outstanding > 0).length} pending receivables
          </p>
        </div>

        {/* Operating Outflow */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
              <span>Committed Outflow</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              8 Weeks
            </span>
          </div>
          <p className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-1">
            -{formatInr(totalOutflow)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {totalOutflow === 0 ? "No fixed expenses set" : "Payroll, rent & suppliers"}
          </p>
        </div>

        {/* Ending Liquidity */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>Week 8 Closing</span>
            </div>
          </div>
          <p
            className={`text-xl font-bold tabular-nums mt-1 ${
              endingBalance < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
            }`}
          >
            {formatInr(endingBalance)}
          </p>
          <p
            className={`text-[11px] font-semibold mt-0.5 ${
              netDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {netDelta >= 0 ? `+${formatInr(netDelta)} net surplus` : `${formatInr(netDelta)} net deficit`}
          </p>
        </div>
      </div>

      {/* Main Grid: Forecast Chart & What-If Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 8-Week Projected Balance Trajectory */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  8-Week Cash Trajectory
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Cumulative closing balance week-by-week: Opening + Inflow (real invoices) − Outflows.
                </p>
              </div>

              {shortfallWeek ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Deficit: {formatInr(Math.abs(shortfallWeek.closing))} ({shortfallWeek.weekLabel})</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Positive balance maintained</span>
                </div>
              )}
            </div>

            <ForecastChart
              weeks={forecast.weeks}
              shortfallWeekIndex={forecast.shortfallWeekIndex}
              height={320}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500">
            <span>
              Base Liquidity: <strong>{formatInr(openingBalancePaise)}</strong>
            </span>
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="text-teal-600 dark:text-teal-400 font-semibold hover:underline"
            >
              Adjust Base Liquidity →
            </button>
          </div>
        </div>

        {/* Interactive "What-If" Simulation Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  What-If Simulation
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Simulate delayed payment impact on cash
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Simulate Delayed Buyer
              </label>
              <select
                value={whatIfCustomer || ""}
                onChange={(e) => setWhatIfCustomer(e.target.value || null)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select buyer to test delay...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Simulated Delay</span>
                <span className="tabular-nums font-bold text-teal-600 dark:text-teal-400">
                  +{daysLate} Days Late
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={daysLate}
                onChange={(e) => setDaysLate(parseInt(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <div className="flex justify-between gap-1 mt-2">
                {[0, 7, 15, 30, 45].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDaysLate(d)}
                    className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors ${
                      daysLate === d
                        ? "bg-teal-600 text-white font-bold"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    +{d}d
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/70 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Runway Status:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {forecast.shortfallWeekIndex !== null
                    ? `Deficit in ${forecast.weeks[forecast.shortfallWeekIndex].weekLabel}`
                    : "Stable (No Deficit)"}
                </span>
              </div>
              {whatIfCustomer && daysLate > 0 && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                  Delaying this buyer by {daysLate} days shifts their receivables into later weeks.
                </p>
              )}
            </div>
          </div>

          <div className="pt-3">
            <button
              onClick={() => {
                setWhatIfCustomer(null);
                setDaysLate(0);
              }}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Reset simulation
            </button>
          </div>
        </div>
      </div>

      {/* Week-by-Week Flow Breakdown Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Weekly Cash Flow Breakdown
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Strict invariant holds: Closing = Opening + Inflows − Outflows
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            8-Week Horizon
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <th className="px-5 py-3.5">Week Period</th>
                <th className="px-5 py-3.5 text-right">Opening Balance</th>
                <th className="px-5 py-3.5 text-right">Expected Inflow</th>
                <th className="px-5 py-3.5 text-right">Committed Outflow</th>
                <th className="px-5 py-3.5 text-right">Closing Balance</th>
                <th className="px-5 py-3.5 text-right">Net Change</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {forecast.weeks.map((w, i) => {
                const isShortfall = i === forecast.shortfallWeekIndex;
                const netChange = w.inflow - w.outflow;
                const contributing = weeklyInvoiceMap[i] || [];

                return (
                  <tr
                    key={i}
                    className={`transition-colors ${
                      isShortfall
                        ? "bg-rose-50/60 dark:bg-rose-950/20"
                        : "hover:bg-slate-50/70 dark:hover:bg-slate-750/50"
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        Week {i + 1} ({w.weekLabel})
                      </div>
                      {contributing.length > 0 && (
                        <div className="text-[11px] text-teal-600 dark:text-teal-400 mt-0.5 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>
                            {contributing.length} {contributing.length === 1 ? "invoice" : "invoices"} due
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {formatInr(w.opening)}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {w.inflow > 0 ? `+${formatInr(w.inflow)}` : "—"}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                      {w.outflow > 0 ? `-${formatInr(w.outflow)}` : "—"}
                    </td>
                    <td
                      className={`px-5 py-4 text-right tabular-nums font-bold ${
                        w.closing < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {formatInr(w.closing)}
                    </td>
                    <td
                      className={`px-5 py-4 text-right tabular-nums text-xs font-semibold ${
                        netChange >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {netChange >= 0 ? `+${formatInr(netChange)}` : formatInr(netChange)}
                    </td>
                    <td className="px-5 py-4">
                      {isShortfall ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                          <AlertTriangle className="w-3 h-3" /> Deficit Week
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {i === 0 ? "Current Week" : "Covered"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Action Plan - Generated from Real Invoices (No Fake Details) */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-teal-600" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Dynamic Cash Action Plan
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Chase Overdue Accounts */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-xs">
                  1
                </span>
                <span>Chase High-Priority Overdue Bills</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {topOverdue ? (
                  <>
                    Prioritize collection on <strong>{topOverdue.invoiceNumber}</strong> (
                    {topOverdue.customerName}). Recovering <strong>{formatInr(topOverdue.outstanding)}</strong> immediately protects opening liquidity.
                  </>
                ) : (
                  <>All customer accounts are current. 0 overdue invoices across the 8-week horizon.</>
                )}
              </p>
            </div>
            <Link
              to="/reminders"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              <span>{topOverdue ? "Dispatch Reminders" : "View Reminders"}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Card 2: Accelerate Upcoming Receivables */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-xs">
                  2
                </span>
                <span>Early Settlement Incentive</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {topUpcoming ? (
                  <>
                    Offer <strong>{topUpcoming.customerName}</strong> a 2% early cash settlement discount on invoice{" "}
                    <strong>{topUpcoming.invoiceNumber}</strong> ({formatInr(topUpcoming.outstanding)}) to accelerate funds into Week 1.
                  </>
                ) : (
                  <>No upcoming invoices pending. Create or upload invoices to project future cash receipts.</>
                )}
              </p>
            </div>
            <Link
              to="/invoices"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              <span>View Invoices Dataset</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Card 3: Runway Status */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-teal-700 dark:text-teal-400 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-xs">
                  3
                </span>
                <span>Operating Runway Status</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {shortfallWeek ? (
                  <>
                    Projected deficit of <strong>{formatInr(Math.abs(shortfallWeek.closing))}</strong> in{" "}
                    <strong>{shortfallWeek.weekLabel}</strong>. Recovering overdue bills or deferring non-critical expenses resolves this gap.
                  </>
                ) : (
                  <>
                    Full 8-week liquidity runway intact with projected closing balance of{" "}
                    <strong>{formatInr(endingBalance)}</strong>.
                  </>
                )}
              </p>
            </div>
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline text-left"
            >
              <span>Update Operating Expenses</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Configure Expenses & Starting Balance Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-750">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Configure Expenses & Liquidity
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Set your real starting cash and recurring operating outflows (0 if none)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Starting Cash / Bank Balance (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={configForm.startingBalance}
                    onChange={(e) => setConfigForm({ ...configForm, startingBalance: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 50000"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Your baseline liquid funds. Collected invoice payments ({formatInr(totalCollectedPaise)}) are added automatically.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Rent (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={configForm.monthlyRent}
                    onChange={(e) => setConfigForm({ ...configForm, monthlyRent: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Payroll / Salaries (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={configForm.monthlyPayroll}
                    onChange={(e) => setConfigForm({ ...configForm, monthlyPayroll: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Weekly Raw Material & Vendor Bills (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={configForm.weeklyVendors}
                  onChange={(e) => setConfigForm({ ...configForm, weeklyVendors: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Committed weekly supply orders or operating costs.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
