import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Banknote,
  MessageCircle,
  TrendingUp,
  Menu,
} from "lucide-react";
import { LanguageSwitch } from "./LanguageSwitch";
import { DemoBanner } from "./DemoBanner";
import { t, Language } from "../data/i18n;

const NAV_ITEMS = [
  { path: "/", label: "navDashboard", icon: LayoutDashboard },
  { path: "/invoices", label: "navInvoices", icon: FileText },
  { path: "/payments", label: "navPayments", icon: Banknote },
  { path: "/reminders", label: "navReminders", icon: MessageCircle },
  { path: "/forecast", label: "navForecast", icon: TrendingUp },
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
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="md:hidden tap-target"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
              SC
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">
              Cash Copilot
            </span>
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

      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-40 md:hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white tap-target"
              >
                <span className="text-sm font-medium">Back</span>
              </button>
            </div>
            <nav className="p-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? "bg-teal-600/10 border border-teal-600/30 text-teal-700 dark:text-teal-400"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  } tap-target`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{t(lang, item.label)}</span>
                </button>
              ))}
            </nav>
          </aside>
        </>
      )}

      <div className="hidden md:flex md:w-64 flex-col border-r border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
            SC
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-white">
            Cash Copilot
          </span>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? "bg-teal-600/10 border border-teal-600/30 text-teal-700 dark:text-teal-400"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              } tap-target`}
            >
              <item.icon className="w-5 h-5" />
              <span>{t(lang, item.label)}</span>
            </button>
          ))}
        </nav>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <DemoBanner />
        <div className="space-y-6">{children}</div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <div className="flex justify-around px-2 py-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-2 py-2 text-sm transition-colors tap-target ${
                isActive(item.path)
                  ? "text-teal-600"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className={isActive(item.path) ? "font-medium" : ""}>
                {t(lang, item.label)}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}