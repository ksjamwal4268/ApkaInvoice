import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { KpiCard } from "../components/KpiCard";
import { EmptyState } from "../components/EmptyState";
import { GlowingEffect } from "../components/ui/glowing-effect";
import { HoverBorderGradient } from "../components/ui/hover-border-gradient";
import { formatInr, add } from "../utils/money";
import { daysBetween, formatHindiDate, formatDate } from "../utils/date";
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
  FileText,
  Send,
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

export function Dashboard({ lang }: { lang: Language }) {
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

  const isInvoiceOverdue = (inv: any) => {
    if (!inv || inv.status === "paid" || inv.status === "disputed") return false;
    if ((inv.outstanding || 0) <= 0) return false;
    if ((inv.status ?? "").toLowerCase() === "overdue") return true;
    if (!inv.dueDate) return false;
    const due = new Date(inv.dueDate);
    return due < today;
  };

  const overdueInvoices = useMemo(() => {
    return invoices
      .filter(isInvoiceOverdue)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [invoices, today]);

  const overdueAmount = useMemo(() => {
    return overdueInvoices.reduce((sum, inv) => sum + (inv.outstanding || 0), 0);
  }, [overdueInvoices]);

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
    dateRange: string;
    invoiceCount: number;
    paymentReceived: number;
    expectedTotal: number;
    outstanding: number;
  }

  const [graphTimeframe, setGraphTimeframe] = useState<"weekly" | "monthly">("weekly");

  const anchorDate = useMemo(() => {
    if (!invoices || invoices.length === 0) return today;
    const validTimes = invoices
      .map((i) => new Date(i.invoiceDate || i.dueDate || Date.now()).getTime())
      .filter((t) => !isNaN(t));
    if (validTimes.length === 0) return today;
    const maxTime = Math.max(...validTimes);
    // If the latest invoice is within 60 days of today, anchor to today
    if (Math.abs(today.getTime() - maxTime) < 60 * 24 * 60 * 60 * 1000) {
      return today;
    }
    return new Date(maxTime);
  }, [invoices, today]);

  const kpiData = useMemo((): KpiPoint[] => {
    const result: KpiPoint[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if (graphTimeframe === "monthly") {
      for (let i = 5; i >= 0; i--) {
        const mStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - i, 1, 0, 0, 0, 0);
        const mEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - i + 1, 0, 23, 59, 59, 999);

        const mInvoices = invoices.filter((inv) => {
          const invDate = new Date(inv.invoiceDate || inv.dueDate);
          return invDate >= mStart && invDate <= mEnd;
        });

        const invoiceCount = mInvoices.length;
        const paymentReceivedPaise = mInvoices
          .filter((inv) => (inv.status ?? "").toLowerCase() === "paid")
          .reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);

        const expectedTotalPaise = mInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

        const outstandingPaise = mInvoices
          .filter((inv) => (inv.status ?? "").toLowerCase() !== "paid" && !inv.isDisputed)
          .reduce((sum, inv) => sum + (inv.outstanding || 0), 0);

        const label = `${monthNames[mStart.getMonth()]} '${String(mStart.getFullYear()).slice(-2)}`;
        const dateRange = `${monthNames[mStart.getMonth()]} ${mStart.getFullYear()}`;

        result.push({
          label,
          dateRange,
          invoiceCount,
          paymentReceived: Math.round(paymentReceivedPaise / 100),
          expectedTotal: Math.round(expectedTotalPaise / 100),
          outstanding: Math.round(outstandingPaise / 100),
        });
      }
    } else {
      // Weekly timeframe: 6 chronological weeks ending at anchorDate
      for (let i = 5; i >= 0; i--) {
        const weekStart = new Date(anchorDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (i * 7));
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekInvoices = invoices.filter((inv) => {
          const invDate = new Date(inv.invoiceDate || inv.dueDate);
          return invDate >= weekStart && invDate <= weekEnd;
        });

        const invoiceCount = weekInvoices.length;
        const paymentReceivedPaise = weekInvoices
          .filter((inv) => (inv.status ?? "").toLowerCase() === "paid")
          .reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);

        const expectedTotalPaise = weekInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

        const outstandingPaise = weekInvoices
          .filter((inv) => (inv.status ?? "").toLowerCase() !== "paid" && !inv.isDisputed)
          .reduce((sum, inv) => sum + (inv.outstanding || 0), 0);

        const label = `${String(weekStart.getDate()).padStart(2, "0")} ${monthNames[weekStart.getMonth()]}`;
        const dateRange = `${weekStart.getDate()} ${monthNames[weekStart.getMonth()]} – ${weekEnd.getDate()} ${monthNames[weekEnd.getMonth()]}`;

        result.push({
          label,
          dateRange,
          invoiceCount,
          paymentReceived: Math.round(paymentReceivedPaise / 100),
          expectedTotal: Math.round(expectedTotalPaise / 100),
          outstanding: Math.round(outstandingPaise / 100),
        });
      }
    }

    return result;
  }, [invoices, anchorDate, graphTimeframe]);

  const graphSummary = useMemo(() => {
    const totalBilled = kpiData.reduce((acc, p) => acc + p.expectedTotal, 0);
    const totalCollected = kpiData.reduce((acc, p) => acc + p.paymentReceived, 0);
    const totalOutstanding = kpiData.reduce((acc, p) => acc + p.outstanding, 0);
    return {
      totalBilled,
      totalCollected,
      totalOutstanding,
    };
  }, [kpiData]);

  interface RedInvoice {
    invoice: typeof invoices[number];
    customer: typeof customers[number] | undefined;
    daysLate: number;
    amount: number;
  }

  const redInvoices = useMemo((): RedInvoice[] => {
    return overdueInvoices
      .map((inv) => {
        const customer = customers.find((c) => Boolean(c && c.id === inv?.customerId));
        const dLate = Math.max(0, daysBetween(new Date(inv?.dueDate || Date.now()), today));
        return { invoice: inv, customer: customer || undefined, daysLate: dLate, amount: inv?.outstanding || 0 };
      })
      .sort((a, b) => b.daysLate - a.daysLate || b.amount - a.amount)
      .slice(0, 6);
  }, [overdueInvoices, customers, today]);

  return (
    <div className="space-y-6">
      {/* Business Header & Health Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-700/80 text-teal-200 border border-teal-600/50">
                {businessProfile.city ? `${businessProfile.city}, ${businessProfile.state}` : "Operational Workspace"}
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
                Live Invoices Synced
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {businessProfile.name || "ApkaInvoice Dashboard"}
            </h1>
            <p className="text-sm text-teal-100 max-w-xl leading-relaxed">
              {invoices.length === 0 ? (
                <span>Welcome to your live operational workspace. Upload bill photos or PDF invoices to start tracking customer payments.</span>
              ) : overdueInvoices.length > 0 ? (
                <>
                  You have <strong className="text-white underline decoration-teal-400 underline-offset-2">{overdueInvoices.length} overdue {overdueInvoices.length === 1 ? "invoice" : "invoices"}</strong> totaling{" "}
                  <strong className="text-white font-bold">{formatInr(overdueAmount)}</strong>. Chase high-priority accounts today to secure your cash flow.
                </>
              ) : (
                <>
                  All recorded customer invoices are currently up to date. Total left to collect:{" "}
                  <strong className="text-white font-bold">{formatInr(moneyOwed)}</strong>.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/invoices"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-bold shadow-md hover:bg-slate-100 transition-all hover:scale-[1.02] tap-target border border-white/80"
            >
              <FileText className="w-4 h-4 text-teal-600" />
              <span>View Invoices</span>
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
          change={overdueAmount > 0 ? `${overdueInvoices.length} overdue` : "All clear"}
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
        <div className="relative rounded-2xl border border-teal-200 bg-white p-2 md:rounded-3xl md:p-3 shadow-xs">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
          />
          <div className="relative p-6 rounded-xl bg-linear-to-r from-teal-50/80 via-emerald-50/50 to-white shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Operational Ledger Active
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  Start Tracking Your Real Invoices
                </h2>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
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
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Plus className="w-4 h-4 text-teal-600" />
                  <span>Create Invoice Manually</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Row: Activity Graph (Left 2 cols) + Critical Invoices (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly / Monthly Billing & Collections Activity Graph (Left 2 cols) */}
        <div className="lg:col-span-2 relative rounded-2xl border border-slate-200/80 bg-white p-2 md:rounded-3xl md:p-3 shadow-xs">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />
        <div className="relative rounded-xl p-4 md:p-6 bg-white flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Billing & Collections Activity
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                  {graphTimeframe === "weekly" ? "Weekly Trend" : "Monthly Trend"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tracks actual invoices billed, payments received, and pending dues ({graphTimeframe === "weekly" ? "last 6 active weeks" : "last 6 months"}).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Timeframe Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setGraphTimeframe("weekly")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    graphTimeframe === "weekly"
                      ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-2xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  Weekly (6 Wks)
                </button>
                <button
                  type="button"
                  onClick={() => setGraphTimeframe("monthly")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    graphTimeframe === "monthly"
                      ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-2xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  Monthly (6 Mos)
                </button>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Received
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  Expected
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Outstanding
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar for Selected Window */}
          <div className="grid grid-cols-3 gap-3 mb-4 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-750 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Period Total Billed</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {formatInr(graphSummary.totalBilled * 100)}
              </span>
            </div>
            <div>
              <span className="text-emerald-600/80 dark:text-emerald-400/80 block text-[11px]">Period Received</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {formatInr(graphSummary.totalCollected * 100)}
              </span>
            </div>
            <div>
              <span className="text-rose-600/80 dark:text-rose-400/80 block text-[11px]">Period Outstanding</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                {formatInr(graphSummary.totalOutstanding * 100)}
              </span>
            </div>
          </div>

          <div className="h-[280px] w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kpiData} margin={{ top: 10, right: 15, left: -5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickFormatter={(val: number) => {
                    if (val === 0) return "₹0";
                    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
                    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
                    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
                    return `₹${val}`;
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const pt = payload[0]?.payload;
                    return (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-3.5 shadow-xl text-xs space-y-2 min-w-[210px]">
                        <div className="pb-1.5 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                          <span>{pt?.dateRange || label}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {pt?.invoiceCount ?? 0} {pt?.invoiceCount === 1 ? "invoice" : "invoices"}
                          </span>
                        </div>
                        <div className="space-y-1.5 font-medium">
                          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Received:
                            </span>
                            <span className="font-bold tabular-nums">
                              {formatInr((pt?.paymentReceived || 0) * 100)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              Expected Total:
                            </span>
                            <span className="font-bold tabular-nums">
                              {formatInr((pt?.expectedTotal || 0) * 100)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              Outstanding:
                            </span>
                            <span className="font-bold tabular-nums">
                              {formatInr((pt?.outstanding || 0) * 100)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="paymentReceived"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, strokeWidth: 1.5, fill: "#10b981" }}
                  activeDot={{ r: 5 }}
                  name="Payments Received"
                />
                <Line
                  type="monotone"
                  dataKey="expectedTotal"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={{ r: 3.5, strokeWidth: 1.5, fill: "#0d9488" }}
                  activeDot={{ r: 5 }}
                  name="Expected Total"
                />
                <Line
                  type="monotone"
                  dataKey="outstanding"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3.5, strokeWidth: 1.5, fill: "#ef4444" }}
                  activeDot={{ r: 5 }}
                  name="Outstanding"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Aggregated from your live invoices database</span>
          <Link to="/invoices" className="text-teal-600 hover:underline font-semibold flex items-center gap-1">
            <span>View full dataset</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        </div>
      </div>

        {/* Critical Invoices Panel (Right 1 col, right of graph) */}
        <div className="lg:col-span-1 relative rounded-2xl border border-rose-200/80 bg-rose-50/20 p-2 md:rounded-3xl md:p-3 shadow-xs flex flex-col justify-between">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
          />
          <div className="relative rounded-xl p-4 md:p-5 bg-white flex flex-col justify-between h-full border border-rose-100/80">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-rose-100">
                <div className="p-2 rounded-lg bg-rose-100 text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-rose-900">Critical Invoices</h2>
                  <p className="text-xs text-rose-600">
                    {overdueInvoices.length > 0 ? `${overdueInvoices.length} overdue accounts` : "Urgent payment alerts"}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 flex-grow overflow-y-auto mt-4 max-h-[310px]">
                {redInvoices.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500">
                    No overdue invoices. All accounts are up to date!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {redInvoices.map(({ invoice, customer, daysLate: dLate, amount }) => (
                      <div
                        key={invoice.id}
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                        className="p-3 rounded-xl border border-rose-200 bg-white hover:bg-rose-50/70 transition-all cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-rose-900 truncate">
                                {invoice.invoiceNumber || <span className="font-normal italic text-slate-400">— (No number)</span>}
                              </h3>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 shrink-0">
                                {dLate}d late
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 truncate">{customer?.name || invoice.customerName}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-rose-800">{formatInr(amount)}</div>
                            <div className="text-[10px] text-slate-400">{new Date(invoice.dueDate).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-rose-100 flex items-center justify-between text-xs text-rose-600">
              <span>High priority alerts</span>
              <Link
                to="/reminders"
                className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline"
              >
                <span>Open Reminders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Invoices Section (Shown directly below the graph) */}
      <div className="relative rounded-2xl border border-slate-200/80 bg-white p-2 md:rounded-3xl md:p-3 shadow-xs">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />
        <div className="relative rounded-xl p-4 sm:p-6 bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Overdue Invoices
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                    {overdueInvoices.length} Pending
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Customer bills past due date requiring payment collection.
                </p>
              </div>
            </div>

            <Link
              to="/reminders"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto tap-target"
            >
              <Send className="w-3.5 h-3.5 text-teal-200" />
              <span>Batch Remind</span>
            </Link>
          </div>

          {overdueInvoices.length === 0 ? (
            <EmptyState
              title="All invoices up to date"
              message="No customer accounts are currently overdue. All payments are clear or awaiting their due date."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Customer / Buyer</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Overdue By</th>
                    <th className="px-4 py-3 text-right">Outstanding</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overdueInvoices.map((inv) => {
                    const cust = customers.find((c) => c.id === inv.customerId);
                    const daysLate = Math.max(0, daysBetween(new Date(inv.dueDate), today));
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          <Link to={`/invoices/${inv.id}`} className="hover:text-teal-600 hover:underline">
                            {inv.invoiceNumber || <span className="text-slate-400 italic">— (No Number)</span>}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{inv.customerName}</div>
                          {cust?.phone && <div className="text-[10px] text-slate-400 font-mono">{cust.phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(inv.dueDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            +{daysLate}d late
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-rose-600 text-sm">
                          {formatInr(inv.outstanding)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              to={`/reminders?invoiceId=${inv.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 text-white hover:bg-teal-700 text-xs font-semibold shadow-2xs transition-colors"
                            >
                              <Send className="w-3 h-3 text-teal-200" />
                              <span>Remind</span>
                            </Link>
                            <Link
                              to={`/invoices/${inv.id}`}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
                            >
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
