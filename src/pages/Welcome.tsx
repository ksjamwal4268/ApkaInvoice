import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FileText,
  Users,
  LayoutDashboard,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Language } from "../data/i18n";
import { motion } from "framer-motion";
import { LampContainer } from "../components/ui/lamp";
import { useAuth } from "../utils/auth";
import { useDataStore } from "../hooks/useDataStore";
import { formatInr } from "../utils/money";
import { getStoredBusinessProfile } from "../data/dataStore";
import { OnboardingModal } from "../components/OnboardingModal";
import { InvoiceCameraModal } from "../components/InvoiceCameraModal";
import { CometCard } from "@/components/ui/comet-card";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import "./Welcome.css";

interface WelcomeProps {
  lang: Language;
}

export function Welcome({ lang: _lang }: WelcomeProps) {
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();
  const { invoices, businessProfile } = useDataStore();

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [_authError, setAuthError] = useState<string | null>(null);


  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isInvoiceOverdue = (inv: any) => {
    if (!inv || inv.status === "paid" || inv.status === "disputed") return false;
    if ((inv.outstanding || 0) <= 0) return false;
    if ((inv.status ?? "").toLowerCase() === "overdue") return true;
    if (!inv.dueDate) return false;
    const due = new Date(inv.dueDate);
    return due < today;
  };

  // Calculate live financial KPIs from the data store perfectly in sync with Dashboard
  const moneyOwed = useMemo(() => {
    return invoices
      .filter((inv) => (inv?.status ?? "").toLowerCase() !== "paid" && (inv?.status ?? "").toLowerCase() !== "disputed")
      .reduce((sum: number, inv: any) => sum + (inv?.outstanding || 0), 0);
  }, [invoices]);

  const overdueInvoices = useMemo(() => {
    return invoices.filter(isInvoiceOverdue);
  }, [invoices, isInvoiceOverdue]);

  const overdueAmount = useMemo(() => {
    return overdueInvoices.reduce((sum: number, inv: any) => sum + (inv?.outstanding || 0), 0);
  }, [overdueInvoices]);

  const fourWeeksFromNow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 28);
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const expected4Weeks = useMemo(() => {
    return invoices.reduce((sum: number, inv: any) => {
      const status = (inv?.status ?? "").toLowerCase();
      if (status === "disputed" || status === "paid") return sum;
      if (isInvoiceOverdue(inv)) return sum;
      const due = new Date(inv?.dueDate || 0);
      if (due <= fourWeeksFromNow && (inv?.outstanding || 0) > 0) {
        return sum + (inv?.outstanding || 0);
      }
      return sum;
    }, 0);
  }, [invoices, fourWeeksFromNow, isInvoiceOverdue]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
      setTimeout(() => {
        const prof = getStoredBusinessProfile();
        if ((prof.email && prof.phone) || prof.isOnboarded) {
          navigate("/dashboard");
        }
      }, 500);
    } catch (err: any) {
      console.warn("Google sign in notice:", err);
      if (err?.code !== "auth/popup-closed-by-user") {
        setAuthError("Could not sign in with Google. Please try again.");
      }
    }
  };

  const handleEnterDashboard = () => {
    const prof = getStoredBusinessProfile();
    const hasSavedDetails = Boolean(
      (prof.email || businessProfile.email) && (prof.phone || businessProfile.phone)
    );
    const isOnboarded = Boolean(prof.isOnboarded || businessProfile.isOnboarded);
    if (user && !isOnboarded && !hasSavedDetails) {
      setIsOnboardingOpen(true);
    } else {
      navigate("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="welcome-page min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = user
    ? (businessProfile.name && businessProfile.name !== "OG Enterprises"
        ? businessProfile.name
        : (user.name && user.name !== "Google User" ? user.name : user.email?.split("@")[0] || ""))
    : "";

  return (
    <div className="welcome-page">
      {/* 1. RESIZABLE NAVBAR */}
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody>
          <NavbarLogo />
          <NavItems
            items={[
              { name: "How it works", link: "#how" },
              { name: "Portfolio", link: "#live" },
              { name: "Tools", link: "#tools" },
              { name: "Setup", link: "#setup" },
            ]}
          />
          <div className="flex items-center gap-2.5">
            {!user ? (
              <NavbarButton
                variant="secondary"
                onClick={handleGoogleSignIn}
                title="Sign in with your Google account"
              >
                <svg className="w-3.5 h-3.5 inline mr-1.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Log in</span>
              </NavbarButton>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 transition-colors shadow-2xs"
                  title={`Signed in as ${user.email}`}
                >
                  {user.picture ? (
                    <img src={user.picture} alt="" className="w-4 h-4 rounded-full" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-slate-300 text-[10px] flex items-center justify-center font-bold">
                      {user.name?.charAt(0) || "U"}
                    </span>
                  )}
                  <span className="max-w-[100px] truncate">{user.name?.split(" ")[0] || "Profile"}</span>
                </button>
                <button
                  type="button"
                  onClick={signOutUser}
                  className="text-xs text-slate-500 hover:text-slate-800 px-1.5 py-1"
                  title="Sign out"
                >
                  Sign out
                </button>
              </div>
            )}
            <NavbarButton variant="primary" onClick={handleEnterDashboard}>
              Dashboard →
            </NavbarButton>
          </div>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {[
              { name: "How it works", link: "#how" },
              { name: "Portfolio", link: "#live" },
              { name: "Tools", link: "#tools" },
              { name: "Setup", link: "#setup" },
            ].map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative text-slate-700 font-semibold text-sm py-1"
              >
                <span>{item.name}</span>
              </a>
            ))}
            <div className="flex w-full flex-col gap-2.5 pt-2 border-t border-slate-100">
              {!user ? (
                <NavbarButton
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleGoogleSignIn();
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  Log in
                </NavbarButton>
              ) : (
                <NavbarButton
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate("/profile");
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  Profile ({user.name?.split(" ")[0] || "User"})
                </NavbarButton>
              )}
              <NavbarButton
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleEnterDashboard();
                }}
                variant="primary"
                className="w-full"
              >
                Dashboard
              </NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>

      {/* 2. HERO SECTION WITH ACETERNITY LAMP EFFECT */}
      <LampContainer className="min-h-[520px] my-0 mx-3.5 rounded-xl border border-teal-500/20 shadow-2xl py-12">
        <motion.h1
          initial={{ opacity: 0.5, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.2,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="d text-center text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl"
        >
          Your cash flow should be working harder than you are.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0.5, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="text-slate-300 text-sm sm:text-base max-w-lg text-center my-6"
        >
          {displayName ? `Welcome back, ${displayName}. ` : ""}ApkaInvoice maintains your invoices, tracks dues, and automates payment chasing with WhatsApp and email reminders.
        </motion.p>
        <div className="flex items-center justify-center gap-3 flex-wrap relative z-20">
          <button type="button" className="btn w" onClick={handleEnterDashboard}>
            Enter dashboard
          </button>
        </div>
      </LampContainer>

      {/* 3. TRUST BANNER */}
      <div className="trust">
        <span>100% GST &amp; Tax compliant</span>
        <span>CGST, SGST &amp; IGST to the paisa</span>
        <span>WhatsApp &amp; email reminders</span>
        <span>Automatic overdue alerts</span>
        <span>Maintain &amp; manage invoice dues</span>
      </div>

      {/* 4. HOW IT WORKS SECTION */}
      <section className="s1 wrap scroll-mt-28" id="how">
        <h2 className="d">Your invoices went out.<br />Then the money stopped.</h2>
        <p className="sub">Three steps to keep working capital moving, without a collections team.</p>
        <div className="g3">
          <CometCard className="h-full">
            <div
              className="g3-card cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                if (!user) {
                  handleGoogleSignIn();
                } else {
                  navigate("/invoices");
                }
              }}
            >
              <div className="ic">1</div>
              <h3>Record customer invoices</h3>
              <p>Add invoices with customer details, line items, CGST/SGST and clear payment due dates.</p>
            </div>
          </CometCard>
          <CometCard className="h-full">
            <div
              className="g3-card cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => navigate("/invoices")}
            >
              <div className="ic">2</div>
              <h3>Maintain &amp; view invoices</h3>
              <p>Keep a clear record of all your invoices, due dates, and balances in one place.</p>
            </div>
          </CometCard>
          <CometCard className="h-full">
            <div
              className="g3-card cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => navigate("/reminders")}
            >
              <div className="ic">3</div>
              <h3>Send reminder options</h3>
              <p>One-click reminder options via WhatsApp and email. Review message details and dispatch payment links directly to your buyers.</p>
            </div>
          </CometCard>
        </div>
      </section>

      {/* 5. LIVE PORTFOLIO STATS SECTION (PINK) */}
      <section className="blk pink scroll-mt-28" id="live">
        <div className="wrap">
          <div className="hd">
            <h2 className="d">You slept 8 hours.<br />ApkaInvoice didn't.</h2>
            <p>
              {invoices.length > 0
                ? "Your live portfolio, updated as bills are scanned and payments land."
                : "Continuous monitoring for your receivables, ready as soon as you record your first bill."}
            </p>
          </div>
          <div className="stats">
            {invoices.length > 0 ? (
              <>
                <CometCard className="h-full">
                  <div className="st">
                    <small>Money owed</small>
                    <b>{formatInr(moneyOwed)}</b>
                    <i>Open across all customers</i>
                  </div>
                </CometCard>
                <CometCard className="h-full">
                  <div className="st">
                    <small>Overdue</small>
                    <b>{formatInr(overdueAmount)}</b>
                    <i>{overdueAmount > 0 ? (overdueInvoices.length === 1 ? "1 invoice past due" : `${overdueInvoices.length} invoices past due`) : "All payments current"}</i>
                  </div>
                </CometCard>
                <CometCard className="h-full">
                  <div className="st">
                    <small>Expected in 4 weeks</small>
                    <b>{formatInr(expected4Weeks)}</b>
                    <i>Scheduled customer dues</i>
                  </div>
                </CometCard>
                <CometCard className="h-full">
                  <div className="st">
                    <small>Invoices recorded</small>
                    <b>{invoices.length.toString()}</b>
                    <i>Active in your ledger</i>
                  </div>
                </CometCard>
              </>
            ) : (
              <>
                <CometCard className="h-full">
                  <div className="st">
                    <small>Invoice recording</small>
                    <b>Instant</b>
                    <i>Create and track customer dues</i>
                  </div>
                </CometCard>
                <CometCard className="h-full">
                  <div className="st">
                    <small>Invoice management</small>
                    <b>Organized</b>
                    <i>Maintain invoice dues and stay informed</i>
                  </div>
                </CometCard>
                <CometCard className="h-full">
                  <div className="st">
                    <small>Buyer reminders</small>
                    <b>1-Click</b>
                    <i>WhatsApp &amp; email notifications</i>
                  </div>
                </CometCard>
                <CometCard className="h-full">
                  <div className="st">
                    <small>Direct settlement</small>
                    <b>100% Direct</b>
                    <i>Buyers pay straight to your bank account</i>
                  </div>
                </CometCard>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 6. LIVE FEED SECTION (YELLOW) */}
      <section className="blk yel">
        <div className="wrap">
          <h2 className="d" style={{ textAlign: "center", margin: "0 auto 40px" }}>
            An accountant that never sleeps
          </h2>
          <div className="feed space-y-3">
            <CometCard>
              <div className="fi">
                <div>
                  <b>Bill scanned</b><br />
                  <span>Line items and GST split extracted from your photo or PDF. Ready to review.</span>
                </div>
                <em>02:14 AM</em>
              </div>
            </CometCard>
            <CometCard>
              <div className="fi">
                <div>
                  <b>Payment reminder prepared</b><br />
                  <span>Personalized message ready to dispatch via WhatsApp or email with your payment details.</span>
                </div>
                <em>03:40 AM</em>
              </div>
            </CometCard>
            <CometCard>
              <div className="fi">
                <div>
                  <b>Payment recorded</b><br />
                  <span>Invoice marked received, customer balance updated, and ledger reconciled.</span>
                </div>
                <em>06:05 AM</em>
              </div>
            </CometCard>
          </div>
        </div>
      </section>

      {/* 7. RECOVERY TOOLS SECTION (BLUE) */}
      <section className="blk blu scroll-mt-28" id="tools">
        <div className="wrap">
          <div className="hd">
            <h2 className="d">Recovery tools,<br />ready when you are.</h2>
            <p>Each one works from the invoices you already have.</p>
          </div>
          <div className="sc">
            <CometCard className="sc-card">
              <div
                className="sc-item"
                role="button"
                tabIndex={0}
                onClick={() => navigate("/invoices")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate("/invoices");
                  }
                }}
              >
                <div className="sc-icon">
                  <FileText className="w-5 h-5 text-neutral-800" />
                </div>
                <h3>Invoice Ledger</h3>
                <p>Maintain all your invoices, view due dates, and keep a clear overview of pending dues.</p>
              </div>
            </CometCard>
            <CometCard className="sc-card">
              <div
                className="sc-item"
                role="button"
                tabIndex={0}
                onClick={() => navigate("/customers")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate("/customers");
                  }
                }}
              >
                <div className="sc-icon">
                  <Users className="w-5 h-5 text-neutral-800" />
                </div>
                <h3>Customer Discipline</h3>
                <p>Automated payment grades A, B, and C classify which buyers pay promptly versus chronic late payers.</p>
              </div>
            </CometCard>
            <CometCard className="sc-card">
              <div
                className="sc-item"
                role="button"
                tabIndex={0}
                onClick={handleEnterDashboard}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleEnterDashboard();
                  }
                }}
              >
                <div className="sc-icon">
                  <LayoutDashboard className="w-5 h-5 text-neutral-800" />
                </div>
                <h3>Financial Dashboard</h3>
                <p>Open the comprehensive operational dashboard with billing activity, overdue priority alerts, and metrics.</p>
              </div>
            </CometCard>
          </div>
        </div>
      </section>

      {/* 8. AUTOMATION SETUP SECTION */}
      <section className="wrap my-16 sm:my-24 scroll-mt-28" id="setup">
        <div className="p-7 sm:p-10 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-xl overflow-hidden relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Business Status & Identity */}
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80 text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Business Automation Config</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                {user && businessProfile.name && businessProfile.name !== "OG Enterprises"
                  ? `Automation is configured for ${businessProfile.name}${businessProfile.city ? `, ${businessProfile.city}` : ""}.`
                  : user
                  ? `Automation is configured for ${user.name || user.email}.`
                  : "Your business details will appear here."}
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {user
                  ? "Reminders and automated chasing messages use your verified identity so your buyers always know who is contacting them."
                  : "Sign in with Google to configure your business identity, WhatsApp notification number, and billing email once."}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {user ? (
                  <Link
                    to="/profile"
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white text-xs font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Manage Profile</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                    onClick={handleGoogleSignIn}
                  >
                    <span>Sign up to use</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

              {/* Right Column: Modern Live Status Cards */}
              <div className="lg:col-span-7 space-y-3">
                {/* 1. WhatsApp & Mobile Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-4 transition-all hover:border-teal-500/40">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          WhatsApp &amp; Reminders
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          user && businessProfile.phone
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                        }`}>
                          {user && businessProfile.phone ? "Verified Active" : "Setup needed"}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-0.5">
                        {user && businessProfile.phone
                          ? businessProfile.phone
                          : user
                          ? "Pending — tap Edit Setup to add your mobile"
                          : "Your verified sender number will appear here"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Billing & Sender Email Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-4 transition-all hover:border-teal-500/40">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Billing &amp; Sender Email
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          businessProfile.email || user?.email
                            ? "bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {businessProfile.email || user?.email ? "Ready" : "Pending"}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-0.5">
                        {businessProfile.email || user?.email || "Your billing email will appear here"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Authentication & Cloud Sync Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-4 transition-all hover:border-teal-500/40">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Cloud Multi-Device Sync
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          user
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {user ? "Cloud Synced" : "Guest Mode"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate max-w-xs sm:max-w-md">
                        {user?.email ? `Signed in as ${user.email}` : "Sign in to securely access your data from any device"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </section>

      {/* 9. BOTTOM CTA */}
      <section className="wrap my-16 sm:my-24">
        <div className="cta" style={{ margin: 0 }}>
          <h2 className="d">Stop chasing<br />payments.</h2>
          <p>Maintain your invoices and automate collections in about a minute.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            {user ? (
              <Link
                to="/dashboard"
                className="btn cursor-pointer"
              >
                Open Dashboard
              </Link>
            ) : (
              <button
                type="button"
                className="btn cursor-pointer"
                onClick={handleGoogleSignIn}
              >
                Sign up to use
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer>
        <div className="wm" aria-label="Apka Invoice">
          <span className="wm-word">
            <span>A</span>
            <span>p</span>
            <span>k</span>
            <span>a</span>
          </span>
          <span className="wm-word">
            <span>I</span>
            <span>n</span>
            <span>v</span>
            <span>o</span>
            <span>i</span>
            <span>c</span>
            <span>e</span>
          </span>
        </div>
        <div className="fc">
          <div>
            <b>Product</b>
            <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={() => navigate("/invoices")}>Invoices ledger</button>
            <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={() => navigate("/reminders")}>Reminders</button>
            <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={handleEnterDashboard}>Dashboard</button>
          </div>
          <div>
            <b>Recovery</b>
            <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={() => navigate("/invoices")}>Invoice ledger</button>
            <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={() => navigate("/customers")}>Payment grades</button>
          </div>
          <div>
            <b>Account</b>
            <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={() => navigate("/profile")}>Profile</button>
            <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={() => setIsOnboardingOpen(true)}>Setup</button>
            {!user ? (
              <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={handleGoogleSignIn}>Log in</button>
            ) : (
              <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={signOutUser}>Sign out</button>
            )}
          </div>
        </div>
        <p className="cp">© 2026 ApkaInvoice. Built for Indian manufacturing and trading businesses.</p>
      </footer>

      {/* Invoice Camera / OCR Modal */}
      <InvoiceCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onInvoiceStored={(_stored) => {
          setIsCameraModalOpen(false);
          navigate("/invoices");
        }}
      />

      {/* Onboarding & Business Profile Setup Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        currentUser={user}
        existingProfile={{ ...getStoredBusinessProfile(), ...businessProfile }}
        onComplete={() => {
          setIsOnboardingOpen(false);
          navigate("/dashboard");
        }}
      />
    </div>
  );
}
