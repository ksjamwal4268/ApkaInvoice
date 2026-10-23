import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ForecastChart } from "../components/ForecastChart";
import { buildForecast } from "../utils/forecast";
import { formatInr, add, toPaise } from "../utils/money";
import { formatWeekLabel } from "../utils/date";
import { INVOICES } from "../data/sampleData";
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
  Percent,
} from "lucide-react";

export function Forecast({ lang: _lang }: { lang: Language }) {
  const openingBalance = toPaise(2500000); // ₹25,00,000 opening cash

  const forecast = useMemo(() => {
    return buildForecast({
      openingBalance,
      invoices: INVOICES,
    });
  }, []);

  const totalInflow = add(...forecast.weeks.map((w) => w.inflow));
  const totalOutflow = add(...forecast.weeks.map((w) => w.outflow));
  const netDelta = totalInflow - totalOutflow;
  const endingBalance = forecast.weeks[forecast.weeks.length - 1]?.closing || 0;
  const shortfallWeek =
    forecast.shortfallWeekIndex !== null
      ? forecast.weeks[forecast.shortfallWeekIndex]
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Cash Shortfall Forecast
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            8-week cash projection based on scheduled invoice receivables and fixed operating expenses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {shortfallWeek ? (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Shortfall in {shortfallWeek.weekLabel}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Full 8-Week Runway Intact</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <Wallet className="w-4 h-4 text-teal-600" />
            <span>Opening Liquidity</span>
          </div>
          <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
            {formatInr(openingBalance)}
          </p>
          <span className="text-[11px] text-slate-400">Cash in bank today</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Projected Inflow</span>
          </div>
          <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatInr(totalInflow)}
          </p>
          <span className="text-[11px] text-slate-400">From customer invoices</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1">
            <TrendingDown className="w-4 h-4" />
            <span>Committed Outflow</span>
          </div>
          <p className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
            -{formatInr(totalOutflow)}
          </p>
          <span className="text-[11px] text-slate-400">Payroll, Rent & Vendors</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>Ending Liquidity (Week 8)</span>
          </div>
          <p
            className={`text-xl font-bold tabular-nums ${
              endingBalance < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
            }`}
          >
            {formatInr(endingBalance)}
          </p>
          <span className={`text-[11px] font-semibold ${netDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {netDelta >= 0 ? `+${formatInr(netDelta)} net gain` : `${formatInr(netDelta)} net burn`}
          </span>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              8-Week Projected Balance Trajectory
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chart reflects cumulative cash balance after accounting for all verified weekly inflows and planned outflows.
            </p>
          </div>
        </div>

        <ForecastChart
          weeks={forecast.weeks}
          shortfallWeekIndex={forecast.shortfallWeekIndex}
          height={340}
        />
      </div>

      {/* Week-by-Week Flow Breakdown Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Weekly Cash Flow Breakdown
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Core invariant: closing[i] = opening[i] + inflow − outflow
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <th className="px-5 py-3.5">Week Period</th>
                <th className="px-5 py-3.5 text-right">Opening Balance</th>
                <th className="px-5 py-3.5 text-right">Expected Inflow</th>
                <th className="px-5 py-3.5 text-right">Planned Outflow</th>
                <th className="px-5 py-3.5 text-right">Closing Balance</th>
                <th className="px-5 py-3.5 text-right">Net Change</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {forecast.weeks.map((w, i) => {
                const isShortfall = i === forecast.shortfallWeekIndex;
                const netChange = w.inflow - w.outflow;

                return (
                  <tr
                    key={i}
                    className={`transition-colors ${
                      isShortfall
                        ? "bg-rose-50/60 dark:bg-rose-950/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-750/50"
                    }`}
                  >
                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                      Week {i + 1} ({w.weekLabel})
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
                        w.closing < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-slate-900 dark:text-white"
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

      {/* Cash Shortfall Action Plan */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-teal-600" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Recommended Action Plan to Prevent Deficits
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-xs">1</span>
                <span>Chase High-Risk Overdue Accounts</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Prioritize recovery of <strong>SP/24-25/007 (Gupta Traders)</strong> and <strong>SP/24-25/005</strong>. Recovering ₹28,000 immediately covers the projected deficit.
              </p>
            </div>
            <Link
              to="/reminders"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              <span>Send Reminders</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-xs">2</span>
                <span>Offer 2% Early Settlement Discount</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Incentivize Rao & Sons on invoice <strong>SP/24-25/008 (₹51,920)</strong> with a 2% discount if settled 10 days early.
              </p>
            </div>
            <Link
              to="/invoices"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              <span>Select Invoice</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-teal-700 dark:text-teal-400 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-xs">3</span>
                <span>Stagger Supplier Outflow by 7 Days</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Request a 1-week extension on the ₹25,000 raw material supplier bill to shift outflow past the shortfall window.
              </p>
            </div>
            <span className="mt-3 text-xs text-slate-400">
              Operational buffer
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
