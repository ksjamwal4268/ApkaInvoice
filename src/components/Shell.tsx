import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Banknote,
  MessageCircle,
  TrendingUp,
  Users,
  Menu,
} from "lucide-react";
import { LanguageSwitch } from "./LanguageSwitch";
import { DemoBanner } from "./DemoBanner";
import { t, Language } from "../data/i18n";

const NAV_ITEMS = [
  { path: "/", label: "navDashboard", icon: LayoutDashboard },
  { path: "/invoices", label: "navInvoices", icon: FileText },
  { path: "/payments", label: "navPayments", icon: Banknote },
  { path: "/reminders", label: "navReminders", icon: MessageCircle },
  { path: "/forecast", label: "navForecast", icon: TrendingUp },
  { path: "/customers", label: "navCustomers", icon: Users },
];

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
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased">
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="md:hidden p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 tap-target"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              CC
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white leading-tight block">
                Cash Copilot
              </span>
              <span className="text-[10px] text-teal-700 dark:text-teal-400 font-medium hidden sm:block">
                Cash shortage forecaster & unpaid invoice chaser
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitch
            lang={lang}
            onChange={onLangChange}
            dark={dark}
            onToggleDark={onToggleDark}
          />
        </div>
      </header>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-40 md:hidden flex flex-col shadow-xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-teal-600 flex items-center justify-center text-white font-bold text-xs">
                  CC
                </div>
                <span className="font-bold text-slate-900 dark:text-white">Cash Copilot</span>
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? "bg-teal-600/10 border border-teal-600/30 text-teal-700 dark:text-teal-400 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  } tap-target`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span>{t(lang, item.label)}</span>
                </button>
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* Main Container: Sidebar + Main Content side by side */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-60 flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shrink-0">
          <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? "bg-teal-600/10 border border-teal-600/30 text-teal-700 dark:text-teal-400 font-semibold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                } tap-target`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{t(lang, item.label)}</span>
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-400 dark:text-slate-500">
            <p className="font-semibold text-slate-600 dark:text-slate-400">Sharma Packaging</p>
            <p>Pune, MH • GSTIN: 27AABCS1234Q1ZM</p>
          </div>
        </aside>

        {/* Scrollable Main View Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-8">
          <DemoBanner />
          <div className="space-y-6 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 shadow-lg">
        <div className="flex justify-around px-1 py-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 py-1 px-2 text-[11px] transition-colors tap-target ${
                isActive(item.path)
                  ? "text-teal-600 dark:text-teal-400 font-semibold"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{t(lang, item.label)}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
