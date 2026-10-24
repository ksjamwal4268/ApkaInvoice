import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { KpiCard } from "../components/KpiCard";
import { EmptyState } from "../components/EmptyState";
import { formatInr, add } from "../utils/money";
import { daysBetween } from "../utils/date";
import { Language } from "../data/i18n";
import { useDataStore } from "../hooks/useDataStore";
import { InvoiceCameraModal } from "../components/InvoiceCameraModal";
import {
  Wallet,
  Clock,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  Plus,
  Users,
  Camera,
  Sparkles,
  Download,
  CheckCircle2,
  Upload,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function Dashboard({ lang: _lang }: { lang: Language }) {
  const navigate = useNavigate();
  const { invoices, customers, businessProfile, refresh } = useDataStore();
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [scanSuccessBanner, setScanSuccessBanner] = useState<string | null>(null);

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

  const totalPaid = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      if (inv.status === "paid" || inv.status === "disputed") return sum + inv.total;
      return sum;
    }, 0);
  }, [invoices]);

  const expectedTotal = useMemo(() => {
    return invoices.reduce((sum, inv) => add(sum, inv.total), 0);
  }, [invoices]);

  const monthlyInvoices = useMemo(() => {
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    return invoices.filter((inv) => {
      const d = new Date(inv.invoiceDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }, [invoices, today]);

  interface KpiPoint {
    label: string;
    invoiceCount: number;
    paymentReceived: number;
    expectedTotal: number;
    outstanding: number;
  }

  const kpiData = useMemo((): KpiPoint[] => {
    const result: KpiPoint[] = [];
    const currentDate = new Date(today);
    for (let i = 5; i >= 0; i--) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const weekInvoices = invoices.filter((inv) => {
        const invDate = new Date(inv.invoiceDate);
        return invDate >= weekStart && invDate <= weekEnd;
      });
      const invoiceCount = weekInvoices.length;
      const paymentReceived = weekInvoices.filter((inv) => inv.status === "paid" || inv.status === "disputed")
        .reduce((sum, inv) => add(sum, inv.total), 0);
      const expected = weekInvoices.reduce((sum, inv) => add(sum, inv.total), 0);
      const outstanding = weekInvoices.filter((inv) => inv.status !== "paid" && inv.status !== "disputed")
        .reduce((sum, inv) => add(sum, inv.outstanding), 0);
      result.push({
        label: weekStart.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        invoiceCount,
        paymentReceived,
        expectedTotal: expected,
        outstanding,
      });
    }
    return result;
  }, [invoices, today]);

  interface RedInvoice {
    invoice: typeof invoices[number];
    customer: typeof customers[number] | undefined;
    daysLate: number;
    amount: number;
  }

  const redInvoices = useMemo((): RedInvoice[] => {
    return invoices
      .filter((inv) => inv.status === "overdue" && inv.outstanding > 0 && !inv.isDisputed)
      .map((inv) => {
        const customer = customers.find((c) => c.id === inv.customerId);
        const dLate = daysBetween(new Date(inv.dueDate), today);
        return { invoice: inv, customer: customer || undefined, daysLate: dLate, amount: inv.outstanding };
      })
      .filter((r) => r.daysLate >= 30)
      .sort((a, b) => b.daysLate - a.daysLate)
      .slice(0, 5);
  }, [invoices, customers, today]);

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

  return (
    <div className="space-y-6">
      {/* Business Header & Health Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-teal-900 via-teal-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-700/80 text-teal-200 border border-teal-600/50">
                {businessProfile.city ? `${businessProfile.city}, ${businessProfile.state}` : "Operational Workspace"}
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Invoices Synced
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {businessProfile.name || "ApkaInvoice Dashboard"}
            </h1>
            <p className="text-sm text-teal-100/90 max-w-xl leading-relaxed">
              {invoices.length === 0 ? (
                <span>Welcome to your live operational workspace. Upload bill photos or PDF invoices to start tracking customer payments.</span>
              ) : (
                <>
                  You have <strong className="text-white underline decoration-teal-400 underline-offset-2">{chaseList.length} overdue invoices</strong> totaling{" "}
                  <strong className="text-white font-bold">{formatInr(overdueAmount)}</strong>. Chase high-priority accounts today to secure your cash flow.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-teal-900 text-sm font-bold shadow-md hover:bg-teal-50 transition-all hover:scale-[1.02] tap-target cursor-pointer"
            >
              <Upload className="w-4 h-4 text-teal-700" />
              <span>Upload Invoice (Photo or PDF)</span>
            </button>
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

      {/* Invoice Uploaded Live Success Banner */}
      {scanSuccessBanner && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">New Invoice Recorded Successfully!</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">{scanSuccessBanner}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setScanSuccessBanner(null)}
            className="text-xs text-emerald-700 dark:text-emerald-300 hover:underline font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Metric KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Payment Left to Receive"
          value={formatInr(moneyOwed)}
          icon={Wallet}
          change={overdueAmount > 0 ? `${chaseList.length} overdue` : "All clear"}
          changeType={overdueAmount > 0 ? "negative" : "positive"}
          subtitle="Outstanding across open invoices"
          highlight={overdueAmount > 0}
        />
        <KpiCard
          label="Total Payment Received"
          value={formatInr(totalPaid)}
          icon={CheckCircle2}
          change="All-time received"
          changeType="positive"
          subtitle="Paid & settled customer bills"
        />
        <KpiCard
          label="Total Expected Payment"
          value={formatInr(expectedTotal)}
          icon={TrendingUp}
          change="Across all invoices"
          changeType="neutral"
          subtitle="Gross invoice value recorded"
        />
        <KpiCard
          label="Monthly Invoices Received"
          value={monthlyInvoices.toString()}
          icon={Download}
          change="This calendar month"
          changeType="neutral"
          subtitle="New invoices added"
        />
      </div>

      {/* Real Data Onboarding Card (Shown when user has 0 invoices) */}
      {invoices.length === 0 && (
        <div className="p-6 rounded-2xl border border-teal-200 dark:border-teal-800 bg-linear-to-r from-teal-50/80 via-emerald-50/50 to-white dark:from-teal-950/40 dark:via-slate-850 dark:to-slate-800 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Operational Ledger Active
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Start Tracking Your Real Invoices
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                Upload any paper bill photo, receipt, or PDF invoice to auto-extract details, or manually record your customer invoices.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all tap-target cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Upload Invoice (Photo or PDF)</span>
              </button>
              <Link
                to="/invoices/create"
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Plus className="w-4 h-4 text-teal-600" />
                <span>Create Invoice Manually</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Chase These Today (Left 2 cols) + Critical Invoices (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chase List */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Chase These Today</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                  {chaseList.length} Pending
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ranked by risk score: Outstanding balance × Days overdue × Chronic delay penalty.
              </p>
            </div>
            <Link
              to="/reminders"
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
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
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-750 hover:bg-white dark:hover:bg-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/invoices/${inv.id}`}
                            className="font-bold text-sm text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400"
                          >
                            {inv.invoiceNumber}
                          </Link>
                          <span className="text-slate-400">•</span>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {customer?.name || inv.customerName}
                          </span>
                          {customer?.grade && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                customer.grade === "A"
                                  ? "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300"
                                  : customer.grade === "B"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300"
                              }`}
                            >
                              Grade {customer.grade}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
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

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">Balance</span>
                        <span className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
                          {formatInr(inv.outstanding)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-[#25D366] text-white hover:opacity-90 shadow-2xs tap-target"
                          title="Quick WhatsApp reminder"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 tap-target"
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

        {/* Critical Invoices Panel (Right Side) */}
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-rose-100 dark:border-rose-900/40">
              <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-rose-900 dark:text-rose-200">Critical Invoices</h2>
                <p className="text-xs text-rose-600 dark:text-rose-400">Overdue 30+ days</p>
              </div>
            </div>

            <div className="space-y-3 flex-grow overflow-y-auto mt-4">
              {redInvoices.length === 0 ? (
                <div className="text-center py-6 text-xs text-rose-600 dark:text-rose-400">
                  No critical invoices overdue 30+ days. All payments are healthy.
                </div>
              ) : (
                <div className="space-y-3">
                  {redInvoices.map(({ invoice, customer, daysLate: dLate, amount }) => (
                    <div
                      key={invoice.id}
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                      className="p-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200 truncate">{invoice.invoiceNumber}</h3>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                              {dLate}d late
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{customer?.name || invoice.customerName}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-rose-800 dark:text-rose-300">{formatInr(amount)}</div>
                          <div className="text-[10px] text-slate-400">{new Date(invoice.dueDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-rose-100 dark:border-rose-900/40 flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
            <span>Critical overdue ledger</span>
            <Link
              to="/reminders"
              className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 hover:underline"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Analytics Grid: Weekly Invoicing & Collections Activity (Left 2 cols) + Ageing Profile (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Trends Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Weekly Billing & Collections Activity</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                    Real Dataset
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tracks actual invoices recorded, payments received, and outstanding dues across the last 6 weeks.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Received
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Expected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Outstanding
                </span>
              </div>
            </div>

            <div className="h-[280px] w-full flex-grow">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpiData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="paymentReceived" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} name="Payments Received" />
                  <Line type="monotone" dataKey="expectedTotal" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Expected Total" />
                  <Line type="monotone" dataKey="outstanding" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Outstanding" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Aggregated from your live invoices database</span>
            <Link to="/invoices" className="text-teal-600 dark:text-teal-400 hover:underline font-semibold flex items-center gap-1">
              <span>View full dataset</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Invoice Ageing Profile */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Invoice Ageing Profile
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total exposure: <strong>{formatInr(totalAgeing)}</strong>
                </p>
              </div>
            </div>

            {/* Stacked Multi-Color Progress Bar */}
            <div className="space-y-2">
              <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-700 flex overflow-hidden shadow-inner">
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
                    className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${bucket.bg} shrink-0`} />
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {bucket.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold tabular-nums text-slate-900 dark:text-white">
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

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <Link
              to="/invoices?filter=overdue"
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              <span>Filter overdue ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Invoice Camera & PDF OCR Modal */}
      <InvoiceCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onInvoiceStored={(stored) => {
          refresh();
          setScanSuccessBanner(
            `Invoice ${stored.invoiceNumber} for ${stored.customerName} (${formatInr(stored.total)}) has been saved and added to the dashboard!`
          );
          setTimeout(() => setScanSuccessBanner(null), 8000);
        }}
        onApplyExtractedData={(data, imagePreview) => {
          navigate("/invoices/create", { state: { prefill: data, imagePreview } });
        }}
      />
    </div>
  );
}
