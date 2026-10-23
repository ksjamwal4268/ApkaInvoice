import { useMemo } from "react";
import { Shell } from "../components/Shell";
import { Money } from "../components/Money";
import { ForecastChart } from "../components/ForecastChart";
import { buildForecast } from "../utils/forecast";
import { formatInr, add } from "../utils/money";
import { formatWeekLabel } from "../utils/date";
import { INVOICES } from "../data/sampleData";
import { Language } from "../data/i18n;

export function Forecast({ lang }: { lang: Language }): JSX.Element {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const forecast = useMemo(() => {
    return buildForecast({
      openingBalance: 250000000,
      invoices: INVOICES,
    });
  }, []);

  const totalInflow = add(...forecast.weeks.map((w) => w.inflow));
  const totalOutflow = add(...forecast.weeks.map((w) => w.outflow));

  return (
    <Shell lang={lang} onLangChange={() => {}} dark={false} onToggleDark={() => {}}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Cash forecast
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Week-by-week view of expected inflows, outflows, and closing balance.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-6">
            8-week cash forecast chart
          </h2>
          <ForecastChart
            weeks={forecast.weeks}
            shortfallWeekIndex={forecast.shortfallWeekIndex}
            height={400}
          />
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                    Week
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">
                    Opening
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">
                    Inflow
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">
                    Outflow
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">
                    Closing
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {forecast.weeks.map((w, i) => {
                  const isShortfall = i === forecast.shortfallWeekIndex;
                  const notes = isShortfall
                    ? "Cash shortfall expected"
                    : i === 0
                    ? "Opening balance"
                    : "";
                  return (
                    <tr
                      key={i}
                      className={isShortfall ? "bg-red-50 dark:bg-red-900/10" : ""}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {formatWeekLabel(w.weekStart)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900 dark:text-white">
                        {formatInr(w.opening)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-teal-600 dark:text-teal-400">
                        {formatInr(w.inflow)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                        {formatInr(w.outflow)}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-bold ${isShortfall ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
                        {formatInr(w.closing)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {notes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
            Action plan
          </h2>
          {forecast.shortfallWeekIndex !== null ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-red-600 dark:text-red-400">⚠</span>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Cash shortfall expected in week of{" "}
                    <span className="font-medium">
                      {forecast.weeks[forecast.shortfallWeekIndex].weekLabel}
                    </span>
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Consider chasing overdue invoices early or delaying a supplier payment to cover the gap.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-teal-600 dark:text-teal-400">💡</span>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Priority customers to chase
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Gupta Traders (chronically late) and Mehta Enterprises (disputed invoice on hold).
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <span className="text-teal-600 dark:text-teal-400">✓</span>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  No cash shortfall expected
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your projected closing balance stays positive for all 8 weeks.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}