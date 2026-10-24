import { Language } from "../data/i18n";
import { MessageCircle } from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";

// Note: Full previous implementation backed up in src/pages/Reminders.backup.tsx.bak
export function Reminders({ lang: _appLang }: { lang: Language }) {
  const { invoices: _invoices, customers: _customers, businessProfile: _profile } = useDataStore();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Reminders
            </h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
              Workspace Ready
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Payment reminders and messaging center.
          </p>
        </div>
      </div>

      {/* Clean Slate Canvas */}
      <div className="min-h-[420px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 p-8 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
          <MessageCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Reminders Canvas Cleared
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
          Clean slate ready. Tell me how you want this page structured and we will build it out step-by-step.
        </p>
      </div>
    </div>
  );
}
