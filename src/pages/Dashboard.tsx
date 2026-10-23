import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { KpiCard } from "../components/KpiCard";
import { ForecastChart } from "../components/ForecastChart";
import { EmptyState } from "../components/EmptyState";
import { formatInr, toPaise, add } from "../utils/money";
import { buildForecast, DEFAULT_OUTFLOWS } from "../utils/forecast";
import { daysBetween } from "../utils/date";
import { Language } from "../data/i18n";
import { useDataStore } from "../hooks/useDataStore";
import { InvoiceCameraModal } from "../components/InvoiceCameraModal";
import {
  Wallet,
  Clock,
  TrendingUp,
  Calendar,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  Plus,
  Sliders,
  Percent,
  Banknote,
  Users,
  Camera,
  Sparkles,
} from "lucide-react";

export function Dashboard({ lang: _lang }: { lang: Language }) {
  const navigate = useNavigate();
  const { invoices, customers, businessProfile } = useDataStore();
  const [whatIfCustomer, setWhatIfCustomer] = useState<string | null>(null);
  const [daysLate, setDaysLate] = useState(0);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const moneyOwed = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      if (inv.status === "disputed") return sum;
      return sum + inv.outstanding;
    }, 0);
  }, [invoices]);

  const overdueAmount = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      if (inv.status === "disputed" || inv.status === "paid") return sum;
      if (new Date(inv.dueDate) < today && inv.outstanding > 0) {
        return sum + inv.outstanding;
      }
      return sum;
    }, 0);
  }, [invoices, today]);

  const fourWeeksFromNow = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 28);
    return d;
  }, [today]);

  const expected4Weeks = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      if (inv.status === "disputed" || inv.status === "paid") return sum;
      const d = new Date(inv.dueDate);
      if (d <= fourWeeksFromNow && d >= today && inv.outstanding > 0) {
        return add(sum, inv.outstanding);
      }
      return sum;
    }, 0);
  }, [invoices, today, fourWeeksFromNow]);

  const bills4Weeks = Object.values(DEFAULT_OUTFLOWS).reduce(
    (sum, o) => add(sum, o.amount),
    0
  );

  const whatIf = useMemo(() => {
    return whatIfCustomer && daysLate > 0
      ? { customerId: whatIfCustomer, daysLate }
      : undefined;
  }, [whatIfCustomer, daysLate]);

  const forecast = useMemo(() => {
    return buildForecast({
      openingBalance: toPaise(2500000), // ₹25,00,000 opening liquidity
      invoices,
      whatIf,
    });
  }, [invoices, whatIf]);

  const chaseList = useMemo(() => {
    return invoices.filter(
      (inv) => inv.status === "overdue" && inv.outstanding > 0 && !inv.isDisputed
    ).map((inv) => {
      const customer = customers.find((c) => c.id === inv.customerId);
      const dLate = daysBetween(new Date(inv.dueDate), today);
      const isChronic = customer?.isChronicallyLate || false;
      const score = inv.outstanding * dLate * (isChronic ? 2 : 1);
      return { inv, customer, daysLate: dLate, isChronic, score };
    }).sort((a, b) => b.score - a.score);
  }, [invoices, customers, today]);

  const ageingBuckets = useMemo(() => {
    const current = invoices.filter(
      (inv) => inv.status === "due" && inv.outstanding > 0 && !inv.isDisputed
    ).reduce((sum, inv) => add(sum, inv.outstanding), 0);

    const overdue1_30 = invoices.filter(
      (inv) => inv.status === "overdue" && inv.outstanding > 0 && !inv.isDisputed
    ).reduce((sum, inv) => {
      const d = daysBetween(new Date(inv.dueDate), today);
      if (d <= 30) return add(sum, inv.outstanding);
      return sum;
    }, 0);

    const overdue31_60 = invoices.filter(
      (inv) => inv.status === "overdue" && inv.outstanding > 0 && !inv.isDisputed
    ).reduce((sum, inv) => {
      const d = daysBetween(new Date(inv.dueDate), today);
      if (d > 30 && d <= 60) return add(sum, inv.outstanding);
      return sum;
    }, 0);

    const overdue60plus = invoices.filter(
      (inv) => inv.status === "overdue" && inv.outstanding > 0 && !inv.isDisputed
    ).reduce((sum, inv) => {
      const d = daysBetween(new Date(inv.dueDate), today);
      if (d > 60) return add(sum, inv.outstanding);
      return sum;
    }, 0);

    return [
      { label: "Current (Not due)", amount: current, bg: "bg-teal-600", color: "text-teal-600 text-teal-400" },
      { label: "1–30 days overdue", amount: overdue1_30, bg: "bg-amber-500", color: "text-amber-500 text-amber-400" },
      { label: "31–60 days overdue", amount: overdue31_60, bg: "bg-orange-500", color: "text-orange-500 text-orange-400" },
      { label: "60+ days overdue", amount: overdue60plus, bg: "bg-rose-600", color: "text-rose-600 text-rose-400" },
    ];
  }, [invoices, today]);

  const totalAgeing = useMemo(
    () => add(...ageingBuckets.map((b) => b.amount)),
    [ageingBuckets]
  );

  const shortfallWeek = forecast.shortfallWeekIndex !== null
    ? forecast.weeks[forecast.shortfallWeekIndex]
    : null;

  return (
    <div className="space-y-6">
      {/* Business Header & Cash Health Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-teal-900 via-teal-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-700/80 text-teal-200 border border-teal-600/50">
                {businessProfile.city}, {businessProfile.state}
              </span>
              {shortfallWeek ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
                  Shortfall in {shortfallWeek.weekLabel}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Healthy Runway (8+ Weeks)
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {businessProfile.name}
            </h1>
            <p className="text-sm text-teal-100/90 max-w-xl leading-relaxed">
              {invoices.length === 0 ? (
                <span>Welcome to your live operational workspace. Scan physical bills via camera or add your real invoices to start forecasting.</span>
              ) : (
                <>
                  You have <strong className="text-white underline decoration-teal-400 underline-offset-2">{chaseList.length} overdue invoices</strong> totaling{" "}
                  <strong className="text-white font-bold">{formatInr(overdueAmount)}</strong>. Chase high-priority accounts today to secure your cash flow.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/invoices/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-teal-900 text-sm font-bold shadow-md hover:bg-teal-50 transition-all hover:scale-[1.02] tap-target"
            >
              <Plus className="w-4 h-4 text-teal-700" />
              <span>Create Invoice</span>
            </Link>
            <Link
              to="/reminders"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700/60 hover:bg-teal-700 text-white text-sm font-semibold border border-teal-500/40 backdrop-blur-xs transition-colors tap-target"
            >
              <MessageSquare className="w-4 h-4 text-teal-200" />
              <span>Chase Invoices</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Premium Metric KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Money Owed"
          value={formatInr(moneyOwed)}
          icon={Wallet}
          subtitle="Across all open customer invoices"
          highlight={overdueAmount > 0}
        />
        <KpiCard
          label="Overdue Receivables"
          value={formatInr(overdueAmount)}
          icon={Clock}
          change={overdueAmount > 0 ? `${chaseList.length} accounts overdue` : "All paid"}
          changeType="negative"
          subtitle="Action needed today"
        />
        <KpiCard
          label="Expected Inflow (4W)"
          value={formatInr(expected4Weeks)}
          icon={TrendingUp}
          change="Due next 28 days"
          changeType="positive"
          subtitle="Expected from compliant clients"
        />
        <KpiCard
          label="Committed Outflow (4W)"
          value={formatInr(bills4Weeks)}
          icon={Calendar}
          change="Rent, Salary & Suppliers"
          changeType="neutral"
          subtitle="Fixed obligations"
        />
      </div>

      {/* Real Data Onboarding Card (Shown when user has 0 invoices) */}
      {invoices.length === 0 && (
        <div className="p-6 rounded-2xl border border-teal-200 border-teal-800 bg-linear-to-r from-teal-50/80 via-emerald-50/50 to-white from-teal-950/40 via-slate-850 to-slate-800 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 text-teal-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Real Operational Ledger Active
              </span>
              <h2 className="text-lg font-bold text-slate-900 text-slate-900">
                Start Tracking Your Real Invoices & Cash Runway
              </h2>
              <p className="text-xs text-slate-600 text-slate-500 max-w-2xl leading-relaxed">
                Demo data has been cleared. Point your phone/webcam camera at any physical paper bill to auto-extract line items via n8n OCR, or manually record your real customer invoices.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all tap-target cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Upload / Scan Bill (PDF & Camera)</span>
              </button>
              <Link
                to="/customers"
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 border-slate-600 bg-white bg-slate-50 text-xs font-semibold text-slate-700 text-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Users className="w-4 h-4 text-teal-600" />
                <span>Add Real Buyers</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Middle Grid: Cash Forecast Chart + What-If Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Forecast Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 border-slate-200/80 bg-white bg-slate-50 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 text-slate-900 flex items-center gap-2">
                  <span>8-Week Cash Position Forecast</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 bg-teal-50 text-teal-300">
                    Live Model
                  </span>
                </h2>
                <p className="text-xs text-slate-500 text-slate-500 mt-0.5">
                  Ties out closing balance weekly: Inflow minus rent, payroll, and raw material vendor bills.
                </p>
              </div>

              {shortfallWeek ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 bg-rose-50 border border-rose-200 border-rose-800 text-rose-700 text-rose-300 text-xs font-semibold shrink-0">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Deficit: {formatInr(shortfallWeek.closing)} in {shortfallWeek.weekLabel}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 bg-emerald-950/40 border border-emerald-200 border-emerald-800 text-emerald-700 text-emerald-300 text-xs font-semibold shrink-0">
                  <span>No deficit projected in 8 weeks</span>
                </div>
              )}
            </div>

            <ForecastChart
              weeks={forecast.weeks}
              shortfallWeekIndex={forecast.shortfallWeekIndex}
              height={300}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 border-slate-200/60 flex items-center justify-between text-xs text-slate-500 text-slate-500">
            <span>Baseline liquidity: <strong>₹25,00,000</strong></span>
            <Link
              to="/forecast"
              className="inline-flex items-center gap-1 font-semibold text-teal-600 text-teal-400 hover:underline"
            >
              <span>View full weekly table</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Interactive "What If They Pay Late?" Card */}
        <div className="rounded-2xl border border-slate-200/80 border-slate-200/80 bg-white bg-slate-50 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 border-slate-200">
              <div className="p-2 rounded-lg bg-amber-50 bg-amber-950/40 text-amber-600 text-amber-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 text-slate-900">
                  What If They Pay Late?
                </h2>
                <p className="text-xs text-slate-500 text-slate-500">
                  Simulate delayed payment impact on cash
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 text-slate-500 mb-1.5">
                Simulate Customer
              </label>
              <select
                value={whatIfCustomer || ""}
                onChange={(e) => setWhatIfCustomer(e.target.value || null)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 border-slate-200 bg-slate-50 bg-slate-900 text-slate-900 text-slate-900 focus:ring-2 focus:ring-teal-600 focus:border-transparent tap-target"
              >
                <option value="">Select customer to test...</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city}) — Grade {c.grade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 text-slate-500 mb-1.5">
                <span>Simulated Delay</span>
                <span className="tabular-nums font-bold text-teal-600 text-teal-400">
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
                    className={`px-2 py-1 text-[11px] rounded font-medium transition-colors ${
                      daysLate === d
                        ? "bg-teal-600 text-white font-bold"
                        : "bg-slate-100 bg-slate-700 text-slate-600 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    +{d}d
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 bg-slate-900/60 border border-slate-200/70 border-slate-200/70 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 text-slate-500">
                <span>Shortfall status:</span>
                <span className="font-bold text-slate-900 text-slate-900">
                  {forecast.shortfallWeekIndex !== null
                    ? `Week of ${forecast.weeks[forecast.shortfallWeekIndex].weekLabel}`
                    : "None (Runway stable)"}
                </span>
              </div>
              {whatIfCustomer && daysLate > 0 && (
                <p className="text-[11px] text-amber-700 text-amber-400 pt-1 border-t border-slate-200 border-slate-200">
                  Shifting invoice payments by {daysLate} days shifts liquidity into later weeks.
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
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 hover:text-slate-200 transition-colors"
            >
              Reset simulation
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Chase These Today + Ageing Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chase List */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 border-slate-200/80 bg-white bg-slate-50 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 text-slate-900 flex items-center gap-2">
                <span>Chase These Today</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 bg-rose-50 text-rose-300 font-bold">
                  {chaseList.length} Critical
                </span>
              </h2>
              <p className="text-xs text-slate-500 text-slate-500 mt-0.5">
                Ranked by risk score: Outstanding balance × Days overdue × Chronic delay penalty.
              </p>
            </div>
            <Link
              to="/reminders"
              className="text-xs font-semibold text-teal-600 text-teal-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Batch Remind</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {chaseList.length === 0 ? (
            <EmptyState title="No overdue invoices" message="All payments are current or up to date." />
          ) : (
            <div className="space-y-3">
              {chaseList.slice(0, 5).map(({ inv, customer, daysLate: dLate, isChronic }, index) => {
                const phoneClean = customer?.phone?.replace(/\D/g, "") || "919876543210";
                const waMessage = `Hello ${customer?.name || "Customer"}, gentle reminder that payment of ${formatInr(inv.outstanding)} for invoice ${inv.invoiceNumber} is overdue by ${dLate} days. Please clear today. - ${businessProfile.name}`;
                const waUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(waMessage)}`;

                return (
                  <div
                    key={inv.id}
                    className="p-4 rounded-xl border border-slate-200 border-slate-200/80 bg-slate-50/60 bg-slate-50/60 hover:bg-white hover:bg-slate-750 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 bg-rose-950/50 text-rose-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/invoices/${inv.id}`}
                            className="font-bold text-sm text-slate-900 text-slate-900 hover:text-teal-600 hover:text-teal-600"
                          >
                            {inv.invoiceNumber}
                          </Link>
                          <span className="text-slate-400">•</span>
                          <Link
                            to={`/customers/${inv.customerId}`}
                            className="text-xs font-medium text-slate-700 text-slate-500 hover:underline"
                          >
                            {customer?.name}
                          </Link>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              customer?.grade === "A"
                                ? "bg-teal-100 text-teal-800"
                                : customer?.grade === "B"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            Grade {customer?.grade}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 text-slate-500">
                          <span className="font-semibold text-rose-600 text-rose-400">
                            {dLate} days overdue
                          </span>
                          {isChronic && (
                            <span className="text-[10px] font-bold uppercase bg-rose-50 text-rose-700 px-1.5 rounded border border-rose-200">
                              Chronic Late
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 border-slate-200">
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-500 text-slate-500 block">Balance</span>
                        <span className="text-base font-bold tabular-nums text-slate-900 text-slate-900">
                          {formatInr(inv.outstanding)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-[#25D366] text-white hover:opacity-90 shadow-2xs tap-target"
                          title="Quick WhatsApp message"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          className="px-3 py-2 rounded-lg border border-slate-200 border-slate-200 text-xs font-semibold text-slate-700 text-slate-500 hover:bg-slate-100 hover:bg-slate-50 tap-target"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Unified Stacked Ageing Breakdown */}
        <div className="rounded-2xl border border-slate-200/80 border-slate-200/80 bg-white bg-slate-50 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900 text-slate-900">
                  Invoice Ageing Profile
                </h2>
                <p className="text-xs text-slate-500 text-slate-500">
                  Total exposure: <strong>{formatInr(totalAgeing)}</strong>
                </p>
              </div>
            </div>

            {/* Stacked Multi-Color Progress Bar */}
            <div className="space-y-2">
              <div className="h-4 w-full rounded-full bg-slate-100 bg-slate-700 flex overflow-hidden shadow-inner">
                {ageingBuckets.map((b) => {
                  const pct = totalAgeing > 0 ? (b.amount / totalAgeing) * 100 : 0;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={b.label}
                      style={{ width: `${pct}%` }}
                      className={`${b.bg} transition-all duration-500 hover:opacity-90`}
                      title={`${b.label}: ${pct.toFixed(1)}%`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Ageing Legend Table */}
            <div className="space-y-2.5 pt-2">
              {ageingBuckets.map((bucket) => {
                const pct = totalAgeing > 0 ? (bucket.amount / totalAgeing) * 100 : 0;
                return (
                  <div
                    key={bucket.label}
                    className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-slate-50 hover:bg-slate-50/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${bucket.bg} shrink-0`} />
                      <span className="font-medium text-slate-700 text-slate-500">
                        {bucket.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold tabular-nums text-slate-900 text-slate-900">
                        {formatInr(bucket.amount)}
                      </span>
                      <span className="text-slate-400 text-[11px] ml-1.5">
                        ({pct.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 border-slate-200">
            <Link
              to="/invoices?filter=overdue"
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-teal-600 text-teal-400 hover:underline"
            >
              <span>Filter overdue ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate("/invoices/create")}
          className="p-4 rounded-xl border border-slate-200 border-slate-200 bg-white bg-slate-50 hover:border-teal-500 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 bg-teal-50 text-teal-600 text-teal-400 group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 text-slate-900">New GST Invoice</p>
              <p className="text-xs text-slate-500 text-slate-500">Intra/Inter state routing</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate("/payments")}
          className="p-4 rounded-xl border border-slate-200 border-slate-200 bg-white bg-slate-50 hover:border-teal-500 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 bg-sky-950/40 text-sky-600 text-sky-400 group-hover:scale-105 transition-transform">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 text-slate-900">Match Bank CSV</p>
              <p className="text-xs text-slate-500 text-slate-500">UPI, NEFT & TDS reconciliation</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate("/customers")}
          className="p-4 rounded-xl border border-slate-200 border-slate-200 bg-white bg-slate-50 hover:border-teal-500 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 bg-purple-950/40 text-purple-600 text-purple-400 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 text-slate-900">Customer Discipline</p>
              <p className="text-xs text-slate-500 text-slate-500">Credit grades & late scores</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate("/reminders")}
          className="p-4 rounded-xl border border-slate-200 border-slate-200 bg-white bg-slate-50 hover:border-teal-500 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 bg-amber-950/40 text-amber-600 text-amber-400 group-hover:scale-105 transition-transform">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 text-slate-900">Early Discount Offer</p>
              <p className="text-xs text-slate-500 text-slate-500">2% instant settlement</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Camera & PDF OCR Modal */}
      <InvoiceCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
      />
    </div>
  );
}
