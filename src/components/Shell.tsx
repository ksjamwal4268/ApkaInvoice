import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  MessageCircle,
  TrendingUp,
  Users,
  Menu,
  Plus,
  Building2,
  FileWarning,
  Zap,
  ArrowRight,
  UserCircle,
  User,
} from "lucide-react";
import { LanguageSwitch } from "./LanguageSwitch";
import { t, Language } from "../data/i18n";
import { useDataStore } from "../hooks/useDataStore";
import { useAuth } from "../utils/auth";
import { N8nSettingsModal } from "./N8nSettingsModal";
import { BusinessSettingsModal } from "./BusinessSettingsModal";

interface ShellProps {
  children: React.ReactNode;
  lang: Language;
  onLangChange: (lang: Language) => void;
  dark: boolean;
  onToggleDark: () => void;
}

export function Shell({
  children,
  lang,
  onLangChange,
  dark,
  onToggleDark,
}: ShellProps): React.JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [n8nModalOpen, setN8nModalOpen] = useState(false);
  const [businessModalOpen, setBusinessModalOpen] = useState(false);
  const { invoices, customers, businessProfile } = useDataStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const overdueCount = invoices.filter(
    (i) => i.status === "overdue" && i.outstanding > 0 && !i.isDisputed
  ).length;

  const isWelcome = location.pathname === "/" || location.pathname === "/welcome";

  const NAV_ITEMS = [
    { path: "/dashboard", label: "navDashboard", icon: LayoutDashboard },
    { path: "/invoices", label: "navInvoices", icon: FileText, badge: `${invoices.length}` },
    {
      path: "/reminders",
      label: "navReminders",
      icon: MessageCircle,
      badge: overdueCount > 0 ? `${overdueCount}` : undefined,
      badgeColor: "bg-rose-500 text-white",
    },
    { path: "/customers", label: "navCustomers", icon: Users, badge: customers.length > 0 ? `${customers.length}` : undefined },
    { path: "/profile", label: "navProfile", icon: UserCircle },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    if (path === "/profile") {
      return location.pathname === "/profile";
    }
    return location.pathname === path || (path !== "/" && path !== "/dashboard" && path !== "/profile" && location.pathname.startsWith(path));
  };

  if (isWelcome) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased font-sans">
      {/* Top Glassmorphic Navigation Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 tap-target"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo & Brand (Click to go to Welcome page) */}
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
            title="Go to Welcome page"
          >
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-extrabold text-sm shadow-sm group-hover:scale-105 transition-transform">
              CC
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 dark:text-white leading-tight block tracking-tight">
                ApkaInvoice
              </span>
              <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium hidden sm:block">
                MSME Cash Shortage Forecaster
              </span>
            </div>
          </div>

          {/* User & Business Profile Header Chip (Clickable to go to /profile) */}
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="hidden sm:flex items-center gap-2.5 ml-4 pl-4 border-l border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors group"
            title="Click to view & edit your user profile, phone, email & UPI details"
          >
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name || "User"}
                className="w-7 h-7 rounded-lg object-cover border border-teal-500/40 shadow-2xs group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center group-hover:scale-105 transition-transform">
                {(businessProfile.contactPerson || user?.name || businessProfile.name || "U").substring(0, 1).toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 block leading-tight">
                {businessProfile.contactPerson || user?.name || "My Profile"}
              </span>
              <span className="text-[10px] text-slate-400 block leading-tight truncate max-w-[140px]">
                {businessProfile.name} ({businessProfile.city})
              </span>
            </div>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* n8n Automation Status Pill */}
          <button
            type="button"
            onClick={() => setN8nModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors shadow-2xs"
            title="n8n Workflow Automation Hub (Camera OCR & Buyer Reminders)"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="hidden sm:inline">n8n Workflow</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          <Link
            to="/invoices/create"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-xs transition-colors tap-target"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Invoice</span>
          </Link>

          <LanguageSwitch
            lang={lang}
            onChange={onLangChange}
            dark={dark}
            onToggleDark={onToggleDark}
          />
        </div>
      </header>

      {/* n8n Settings Modal */}
      <N8nSettingsModal
        isOpen={n8nModalOpen}
        onClose={() => setN8nModalOpen(false)}
      />

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-50 md:hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div
                onClick={() => {
                  navigate("/");
                  setSidebarOpen(false);
                }}
                className="flex items-center gap-2 cursor-pointer select-none group"
                title="Go to Welcome page"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-xs group-hover:scale-105 transition-transform">
                  CC
                </div>
                <span className="font-bold text-slate-900 dark:text-white">ApkaInvoice</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    isActive(item.path)
                      ? "bg-teal-600/10 border border-teal-600/30 text-teal-700 dark:text-teal-400"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  } tap-target`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span>{t(lang, item.label)}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.badgeColor || "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-xs">
              <Link
                to="/demand-letter"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-teal-600"
              >
                <FileWarning className="w-4 h-4" />
                <span>Demand Letters</span>
              </Link>
            </div>
          </aside>
        </>
      )}

      {/* Desktop Layout Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Modern Sidebar */}
        <aside className="hidden md:flex md:w-64 flex-col bg-white dark:bg-slate-800 border-r border-slate-200/80 dark:border-slate-700/80 shrink-0">
          <div className="p-3">
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      active
                        ? "bg-teal-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                    } tap-target`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-5 h-5 shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
                      <span>{t(lang, item.label)}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          active
                            ? "bg-white/20 text-white"
                            : item.badgeColor || "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Demand Letter Link on Desktop */}
          <div className="px-3 py-2 border-t border-slate-200/80 dark:border-slate-700/80">
            <Link
              to="/demand-letter"
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                location.pathname === "/demand-letter"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60"
              }`}
            >
              <FileWarning className="w-4 h-4 text-amber-500 shrink-0" />
              <span>MSME Demand Letters</span>
            </Link>
          </div>

          {/* User & Business Profile Footnote in Sidebar (Clickable to /profile) */}
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="mt-auto p-4 border-t border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left w-full group"
            title="Click to view & edit your user profile, phone, GSTIN and UPI details"
          >
            <div className="flex items-center gap-3">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name || "User"}
                  className="w-9 h-9 rounded-xl object-cover border border-teal-500/40 shrink-0 group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300 font-bold text-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {(businessProfile.contactPerson || user?.name || businessProfile.name || "U").substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {businessProfile.contactPerson || user?.name || businessProfile.name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  {businessProfile.name} • {businessProfile.city}
                </p>
              </div>
            </div>
          </button>
        </aside>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-10">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Business Settings Modal */}
      <BusinessSettingsModal
        isOpen={businessModalOpen}
        onClose={() => setBusinessModalOpen(false)}
      />

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="flex justify-around px-1 py-1.5">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-semibold transition-colors tap-target ${
                  active
                    ? "text-teal-600 dark:text-teal-400"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{t(lang, item.label)}</span>
                {item.badge && (
                  <span className="absolute top-1 right-2.5 h-2 w-2 rounded-full bg-rose-500" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
