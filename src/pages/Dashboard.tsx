import { useState, useMemo } from "react";
import { Shell } from "../components/Shell";
import { KpiCard } from "../components/KpiCard";
import { StatusBadge } from "../components/StatusBadge";
import { Money } from "../components/Money";
import { ForecastChart } from "../components/ForecastChart";
import { EmptyState } from "../components/EmptyState";
import { formatInr, toPaise, fromPaise, add } from "../utils/money";
import { buildForecast, DEFAULT_OUTFLOWS } from "../utils/forecast";
import { formatDate, daysBetween } from "../utils/date";
import { INVOICES, CUSTOMERS, getCustomer, totalOutstanding, totalOverdue } from "../data/sampleData";
import { t, Language } from "../data/i18n";

export function Dashboard({ lang }: { lang: Language }) {
  const [whatIfCustomer, setWhatIfCustomer] = useState<string | null>(null);
  const [daysLate, setDaysLate] = useState(0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const moneyOwed = totalOutstanding();
  const overdueAmount = totalOverdue(today);

  const fourWeeksFromNow = new Date(today);
  fourWeeksFromNow.setDate(fourWeeksFromNow.getDate() + 28);
  const expected4Weeks = INVOICES.reduce((sum, inv) => {
    if (inv.status === "disputed" || inv.status === "paid") return sum;
    if (inv.dueDate <= fourWeeksFromNow && inv.dueDate >= today && inv.outstanding > 0) {
      return add(sum, inv.outstanding);
    }
    return sum;
  }, 0);

  const bills4Weeks = Object.values(DEFAULT_OUTFLOWS).reduce(
    (sum, o) => add(sum, o.amount),
    0
  );

  const whatIf = whatIfCustomer && daysLate > 0
    ? { customerId: whatIfCustomer, daysLate }
    : undefined;

  const forecast = useMemo(() => {
    return buildForecast({
      openingBalance: toPaise(2500000),
      invoices: INVOICES,
      whatIf,
    });
  }, [whatIfCustomer, daysLate]);

  const chaseList = useMemo(() => {
    return INVOICES.filter(
      (inv) => inv.status === "overdue" && inv.outstanding > 0 && !inv.isDisputed
    ).map((inv) => {
      const customer = getCustomer(inv.customerId);
      const dLate = daysBetween(inv.dueDate, today);
      const isChronic = customer?.isChronicallyLate || false;
      const score = inv.outstanding * dLate * (isChronic ? 2 : 1);
      return { inv, daysLate: dLate, isChronic, score };
    }).sort((a, b) => b.score - a.score);
  }, []);

  const ageingBuckets = useMemo(() => {
    const current = INVOICES.filter(
      (inv) => inv.status === "due" && inv.outstanding > 0 && !inv.isDisputed
    ).reduce((sum, inv) => add(sum, inv.outstanding), 0);
    const overdue1_30 = INVOICES.filter(
      (inv) => inv.status === "overdue" && inv.outstanding > 0 && !inv.isDisputed
    ).reduce((sum, inv) => {
      const d = daysBetween(inv.dueDate, today);
      if (d <= 30) return add(sum, inv.outstanding);
      return sum;
    }, 0);
    const overdue31_60 = INVOICES.filter(
      (inv) => inv.status === "overdue" && inv.outstanding > 0 && !inv.isDisputed
    ).reduce((sum, inv) => {
      const d = daysBetween(inv.dueDate, today);
      if (d > 30 && d <= 60) return add(sum, inv.outstanding);
      return sum;
    }, 0);
    const overdue60plus = INVOICES.filter(
      (inv) => inv.status === "overdue" && inv.outstanding > 0 && !inv.isDisputed
    ).reduce((sum, inv) => {
      const d = daysBetween(inv.dueDate, today);
      if (d > 60) return add(sum, inv.outstanding);
      return sum;
    }, 0);
    return [
      { label: "Current", amount: current, color: "text-teal-600 dark:text-teal-400" },
      { label: "1–30 days", amount: overdue1_30, color: "text-amber-500 dark:text-amber-400" },
      { label: "31–60 days", amount: overdue31_60, color: "text-orange-500 dark:text-orange-400" },
      { label: "60+ days", amount: overdue60plus, color: "text-red-500 dark:text-red-400" },
    ];
  }, []);

  const shortfallWeek = forecast.shortfallWeekIndex !== null
    ? forecast.weeks[forecast.shortfallWeekIndex]
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          Dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track invoices and see cash shortages coming.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Money owed"
          value={formatInr(moneyOwed)}
          changeType="negative"
          highlight={overdueAmount > 0}
        />
        <KpiCard
          label="Overdue"
          value={formatInr(overdueAmount)}
          changeType="negative"
        />
        <KpiCard
          label="Expected in 4 weeks"
          value={formatInr(expected4Weeks)}
          changeType="positive"
        />
        <KpiCard
          label="Bills due in 4 weeks"
          value={formatInr(bills4Weeks)}
          changeType="negative"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-slate-900 dark:text-white">
              Cash forecast (8 weeks)
            </h2>
            {shortfallWeek && (
              <div className="flex items-center gap-2 px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                <span className="text-xs font-medium text-red-700 dark:text-red-400">
                  Shortfall: {formatInr(shortfallWeek.closing)}
                </span>
              </div>
            )}
          </div>
          <ForecastChart
            weeks={forecast.weeks}
            shortfallWeekIndex={forecast.shortfallWeekIndex}
            height={320}
          />
          <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {shortfallWeek ? (
              <>
                <span className="font-medium text-slate-900 dark:text-white">
                  Week of {shortfallWeek.weekLabel}:
                </span>{" "}
                closing balance dips below zero.
              </>
            ) : (
              "No cash shortfall expected in the next 8 weeks."
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm flex flex-col">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
            What if they pay late?
          </h2>
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Select a customer
              </label>
              <select
                value={whatIfCustomer || ""}
                onChange={(e) => setWhatIfCustomer(e.target.value || null)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              >
                <option value="">Select a customer</option>
                {CUSTOMERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Days late
              </label>
              <input
                type="number"
                value={daysLate}
                onChange={(e) => setDaysLate(parseInt(e.target.value) || 0)}
                min={0}
                max={90}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                See how late payments shift the shortfall week.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Projected shortfall:
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {forecast.shortfallWeekIndex !== null
                    ? `Week of ${forecast.weeks[forecast.shortfallWeekIndex].weekLabel}`
                    : "None"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50"
            onClick={() => window.location.href = "/invoices?filter=overdue"}
          >
            <span className="w-5 h-5 rounded bg-teal-600/10 text-teal-600 flex items-center justify-center">
              ↷
            </span>
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                Chase an invoice
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Go to overdue invoices
              </div>
            </div>
          </button>
          <button
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50"
            onClick={() => window.location.href = "/reminders"}
          >
            <span className="w-5 h-5 rounded bg-amber-600/10 text-amber-600 flex items-center justify-center">
              $
            </span>
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                Offer early-payment discount
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                2% discount if paid in 7 days
              </div>
            </div>
          </button>
          <button
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50"
            onClick={() => window.location.href = "/payments"}
          >
            <span className="w-5 h-5 rounded bg-slate-600/10 text-slate-600 dark:text-slate-400 flex items-center justify-center">
              ↺
            </span>
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                Delay a supplier payment
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Delay by 7 days to preserve cash
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white">
            Chase these today
          </h2>
        </div>
        {chaseList.length === 0 ? (
          <EmptyState title="No invoices to chase" message="All invoices are paid or not yet due." />
        ) : (
          <div className="space-y-3">
            {chaseList.slice(0, 5).map(({ inv, daysLate, isChronic }) => {
              const customer = getCustomer(inv.customerId);
              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {inv.invoiceNumber}
                      </span>
                      {isChronic && (
                        <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-1.5 py-0.5 rounded">
                          Chronic late
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {customer?.name || ""}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        • {daysLate} days overdue
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium tabular-nums text-slate-900 dark:text-white">
                      {formatInr(inv.outstanding)}
                    </div>
                    <button
                      onClick={() => (window.location.href = `/invoices/${inv.id}`)}
                      className="mt-1 text-xs text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white">
            Ageing
          </h2>
          <span className="text-sm font-medium tabular-nums text-slate-900 dark:text-white">
            {formatInr(add(...ageingBuckets.map((b) => b.amount)))}
          </span>
        </div>
        <div className="space-y-3">
          {ageingBuckets.map((bucket) => {
            const total = add(...ageingBuckets.map((b) => b.amount));
            const pct = total > 0 ? (Number(fromPaise(bucket.amount)) / Number(fromPaise(total))) * 100 : 0;
            return (
              <div key={bucket.label} className="space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {bucket.label}
                  </span>
                  <span className="text-xs tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                    {formatInr(bucket.amount)}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${bucket.color} transition-all duration-500`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}