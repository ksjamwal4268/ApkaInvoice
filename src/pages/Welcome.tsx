import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Language, t } from "../data/i18n";
import { useAuth } from "../utils/auth";
import { useDataStore } from "../hooks/useDataStore";
import { formatInr } from "../utils/money";
import { DEFAULT_OUTFLOWS } from "../utils/forecast";
import { KpiCard } from "../components/KpiCard";
import { OnboardingModal } from "../components/OnboardingModal";
import { GlowingStarsBackgroundCardPreview } from "../components/GlowingStarsBackgroundCardPreview";
import {
  ArrowRight,
  TrendingUp,
  FileText,
  Camera,
  MessageCircle,
  Building2,
  ShieldCheck,
  Sparkles,
  LogOut,
  ChevronRight,
  AlertCircle,
  Clock,
  Banknote,
  Users,
  Settings,
  CheckCircle2,
  Phone,
  Mail,
  QrCode,
} from "lucide-react";

interface WelcomeProps {
  lang: Language;
}

export function Welcome({ lang }: WelcomeProps) {
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();
  const { invoices, businessProfile } = useDataStore();

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [demoNotice, setDemoNotice] = useState(false);

  // Automatically trigger onboarding wizard if user logs in and profile is not yet completed
  useEffect(() => {
    if (user && !businessProfile.isOnboarded) {
      setIsOnboardingOpen(true);
    }
  }, [user, businessProfile.isOnboarded]);

  // Calculate live financial KPIs from the data store
  const moneyOwed = invoices
    .filter((inv) => inv.status !== "paid" && inv.status !== "disputed")
    .reduce((sum, inv) => sum + inv.outstanding, 0);

  const overdueAmount = invoices
    .filter((inv) => inv.status === "overdue" && inv.outstanding > 0)
    .reduce((sum, inv) => sum + inv.outstanding, 0);

  const fourWeeksFromNow = new Date();
  fourWeeksFromNow.setDate(fourWeeksFromNow.getDate() + 28);

  const expected4Weeks = invoices.reduce((sum, inv) => {
    if (inv.status === "disputed" || inv.status === "paid") return sum;
    const due = new Date(inv.dueDate);
    if (due <= fourWeeksFromNow && due >= new Date() && inv.outstanding > 0) {
      return sum + inv.outstanding;
    }
    return sum;
  }, 0);

  const bills4Weeks = Object.values(DEFAULT_OUTFLOWS || []).reduce(
    (sum, o) => sum + (o.amount || 0),
    0
  );

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      console.warn("Google sign in notice:", err);
      setDemoNotice(true);
    }
  };

  const handleDemoSignIn = () => {
    const demoUser = {
      id: "demo-user-1",
      name: businessProfile.name || "Rohit Sharma",
      email: businessProfile.email || "accounts@sharmapackaging.com",
      picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sharma",
    };
    localStorage.setItem("cc-google-user", JSON.stringify(demoUser));
    window.location.reload();
  };

  const handleEnterDashboard = () => {
    if (user && !businessProfile.isOnboarded) {
      setIsOnboardingOpen(true);
    } else {
      navigate("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Top Banner / Hero */}
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-teal-900 via-slate-900 to-slate-950 text-white p-6 sm:p-10 lg:p-12 shadow-2xl border border-teal-800/40">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>MSME Cash Flow & Invoice Recovery Copilot</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white mb-4">
              {user ? (
                <>
                  Welcome,{" "}
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-teal-300 to-emerald-400">
                    {businessProfile.contactPerson || user.name}
                  </span>
                </>
              ) : (
                <>
                  Take full control of your{" "}
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-teal-300 to-emerald-400">
                    receivables & cash flow
                  </span>
                </>
              )}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8 max-w-2xl font-normal">
              Predict cash shortfalls 8 weeks before they hit payroll, scan invoices instantly via Camera OCR, and chase unpaid dues with trilingual WhatsApp reminders.
            </p>

            {/* Action Bar (Auth & Navigation) */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Primary Next Page Action */}
              <button
                type="button"
                onClick={handleEnterDashboard}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-linear-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-extrabold text-sm shadow-lg shadow-teal-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all tap-target"
              >
                <span>
                  {user
                    ? businessProfile.isOnboarded
                      ? "Enter Dashboard"
                      : "Complete Setup & Enter Dashboard"
                    : "Get Started (Open Dashboard)"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Google Auth Button */}
              {!user ? (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm shadow-md transition-all hover:scale-[1.02] tap-target"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name}
                        className="w-6 h-6 rounded-full border border-teal-400"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-[10px]">
                        {user.name.charAt(0)}
                      </div>
                    )}
                    <span className="font-semibold text-slate-200">{user.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={signOutUser}
                    title="Sign Out"
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Direct Scan Invoice Shortcut */}
              <button
                type="button"
                onClick={() => navigate("/invoices/create")}
                className="inline-flex items-center gap-2 px-4 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/10 transition-colors tap-target"
              >
                <Camera className="w-4 h-4 text-teal-300" />
                <span>Scan Bill</span>
              </button>
            </div>

            {/* Post-Login Automation & Business Setup Status Strip */}
            {user && (
              <div className="mt-6 pt-5 border-t border-white/10">
                {businessProfile.isOnboarded ? (
                  <div className="p-4 rounded-2xl bg-teal-950/60 border border-teal-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-teal-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Automation Configured for: {businessProfile.name}</span>
                        {businessProfile.gstin && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-900/80 text-teal-200">
                            GST: {businessProfile.gstin}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-slate-300 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-teal-400" />
                          <span>WhatsApp: {businessProfile.phone}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-teal-400" />
                          <span>Gmail: {businessProfile.email}</span>
                        </span>
                        {businessProfile.upi && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <QrCode className="w-3 h-3 text-teal-400" />
                              <span>UPI: {businessProfile.upi}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsOnboardingOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 font-bold text-xs border border-teal-500/30 transition-colors shrink-0"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Edit Setup</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-300 block">
                          Step 2 of 2: Set Up Business & Automation Contact Details
                        </span>
                        <p className="text-amber-200/90 text-[11px] mt-0.5">
                          Add your business name, mobile number, and email to enable automatic WhatsApp payment reminders.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOnboardingOpen(true)}
                      className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 shadow-sm shrink-0 tap-target"
                    >
                      Complete Setup Now
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Fallback Notice for Firebase Popup restriction */}
            {demoNotice && !user && (
              <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300 block">Google Sign-In Notice:</span>
                    <span>
                      Firebase popup was closed or restricted. You can continue with Demo Account below:
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDemoSignIn}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 shrink-0"
                >
                  Sign In with Demo User
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Financial Snapshot (KPI Grid) */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 text-slate-500">
              Live MSME Portfolio Snapshot
            </h2>
            <button
              type="button"
              onClick={handleEnterDashboard}
              className="text-xs font-semibold text-teal-600 text-teal-600 hover:underline flex items-center gap-1"
            >
              <span>View full dashboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label={t(lang, "kpiMoneyOwed")}
              value={formatInr(moneyOwed)}
              icon={FileText}
              highlight={moneyOwed > 0}
              subtitle="Total pending customer bills"
            />
            <KpiCard
              label={t(lang, "kpiOverdue")}
              value={formatInr(overdueAmount)}
              icon={Clock}
              highlight={overdueAmount > 0}
              change={overdueAmount > 0 ? "Requires action" : "Up to date"}
              changeType={overdueAmount > 0 ? "negative" : "positive"}
              subtitle="Past due payment deadline"
            />
            <KpiCard
              label={t(lang, "kpiExpected4Weeks")}
              value={formatInr(expected4Weeks)}
              icon={TrendingUp}
              subtitle="Anticipated customer collections"
            />
            <KpiCard
              label={t(lang, "kpiBills4Weeks")}
              value={formatInr(bills4Weeks)}
              icon={Banknote}
              subtitle="Rent, salaries & vendor costs"
            />
          </div>
        </div>

        {/* 3 Step Interactive Walkthrough */}
        <div className="rounded-2xl bg-white bg-slate-50 p-6 sm:p-8 border border-slate-200/80 border-slate-200/80 shadow-xs">
          <div className="max-w-2xl mb-6">
            <h2 className="text-xl font-bold text-slate-900 text-slate-900 mb-1">
              How ApkaInvoice Protects Your MSME
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 text-slate-500">
              Three streamlined steps to prevent working capital crunches:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div
              onClick={() => navigate("/invoices/create")}
              className="group p-5 rounded-xl border border-slate-200/70 border-slate-200/70 hover:border-teal-500/50 bg-slate-50/50 bg-slate-850/50 hover:bg-teal-50/20 hover:bg-teal-950/20 transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 text-teal-600/50 text-teal-300 flex items-center justify-center font-bold text-sm mb-4 group-hover:scale-110 transition-transform">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-slate-900 text-sm mb-1.5 flex items-center justify-between">
                <span>Scan or Upload Bills</span>
                <Camera className="w-4 h-4 text-teal-600 text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-600 text-slate-500 leading-relaxed mb-3">
                Snap photos with your phone camera or upload bill PDFs. Automatic line items, CGST/SGST and paise math.
              </p>
              <span className="text-[11px] font-bold text-teal-600 text-teal-600 flex items-center gap-1 group-hover:underline">
                Create invoice <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            {/* Step 2 */}
            <div
              onClick={() => navigate("/forecast")}
              className="group p-5 rounded-xl border border-slate-200/70 border-slate-200/70 hover:border-teal-500/50 bg-slate-50/50 bg-slate-850/50 hover:bg-teal-50/20 hover:bg-teal-950/20 transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 bg-emerald-50 text-emerald-300 flex items-center justify-center font-bold text-sm mb-4 group-hover:scale-110 transition-transform">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-slate-900 text-sm mb-1.5 flex items-center justify-between">
                <span>Predict Cash Shortages</span>
                <TrendingUp className="w-4 h-4 text-emerald-600 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-600 text-slate-500 leading-relaxed mb-3">
                See your 8-week cash balance forecast. Simulate "what if they pay late" and catch red shortfall weeks early.
              </p>
              <span className="text-[11px] font-bold text-teal-600 text-teal-600 flex items-center gap-1 group-hover:underline">
                View forecast <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            {/* Step 3 */}
            <div
              onClick={() => navigate("/reminders")}
              className="group p-5 rounded-xl border border-slate-200/70 border-slate-200/70 hover:border-teal-500/50 bg-slate-50/50 bg-slate-850/50 hover:bg-teal-50/20 hover:bg-teal-950/20 transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 bg-amber-50 text-amber-300 flex items-center justify-center font-bold text-sm mb-4 group-hover:scale-110 transition-transform">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-slate-900 text-sm mb-1.5 flex items-center justify-between">
                <span>Automated Reminders</span>
                <MessageCircle className="w-4 h-4 text-amber-600 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-600 text-slate-500 leading-relaxed mb-3">
                4-stage reminder ladder in English, Hindi & Marathi. Safe approve-before-send WhatsApp & Email dispatch.
              </p>
              <span className="text-[11px] font-bold text-teal-600 text-teal-600 flex items-center gap-1 group-hover:underline">
                Send reminders <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Feature Shortcut Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => navigate("/payments")}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-teal-200 cursor-pointer transition-all flex items-center gap-3.5"
          >
            <div className="p-2 rounded-xl bg-teal-50 border border-teal-100 text-teal-600">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900">Bank Reconciliation</p>
              <p className="text-[11px] text-slate-500">Auto TDS 194C/J detection</p>
            </div>
          </div>

          <div
            onClick={() => navigate("/customers")}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-teal-200 cursor-pointer transition-all flex items-center gap-3.5"
          >
            <div className="p-2 rounded-xl bg-teal-50 border border-teal-100 text-teal-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900">Customer Discipline</p>
              <p className="text-[11px] text-slate-500">Payment Grades A/B/C</p>
            </div>
          </div>

          <div
            onClick={() => navigate("/demand-letter")}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-teal-200 cursor-pointer transition-all flex items-center gap-3.5"
          >
            <div className="p-2 rounded-xl bg-teal-50 border border-teal-100 text-teal-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900">Formal Demand Notices</p>
              <p className="text-[11px] text-slate-500">Printable MSME recovery</p>
            </div>
          </div>

          <div
            onClick={handleEnterDashboard}
            className="p-4 rounded-xl bg-teal-600 text-white hover:bg-teal-700 hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
          >
            <div>
              <p className="font-extrabold text-xs">Enter Main App</p>
              <p className="text-[11px] text-teal-100">Open Full Dashboard</p>
            </div>
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Onboarding & Business Profile Setup Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        currentUser={user}
        existingProfile={businessProfile}
        onComplete={() => {
          setIsOnboardingOpen(false);
          navigate("/dashboard");
        }}
      />

      {/* Footer Info */}
      <footer className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            100% Indian MSME Compliant
          </span>
          <span>•</span>
          <span>CGST, SGST & IGST Whole Paise Math</span>
        </div>
        <p>© {new Date().getFullYear()} ApkaInvoice. Built for Indian Manufacturing & Trading Businesses.</p>
      </footer>
      <GlowingStarsBackgroundCardPreview />
    </div>
  );
}
