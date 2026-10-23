import { useState } from "react";
import { Shell } from "../components/Shell";
import { Money } from "../components/Money";
import { INVOICES, CUSTOMERS, getCustomer } from "../data/sampleData";
import { Language } from "../data/i18n";

const STAGES = [
  { key: "friendly", label: "Friendly reminder", days: 0 },
  { key: "due-date", label: "Due-date reminder", days: 1 },
  { key: "firm", label: "Firm reminder", days: 7 },
  { key: "demand", label: "Demand letter", days: 15 },
] as const;

export function Reminders({ lang }: { lang: Language }): JSX.Element {
  const [approved, setApproved] = useState<Record<string, boolean>>({});

  const overdueInvoices = INVOICES.filter(
    (inv) => inv.status === "overdue" && inv.outstanding > 0 && !inv.isDisputed
  );

  return (
    <Shell lang={lang} onLangChange={() => {}} dark={false} onToggleDark={() => {}}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Reminders
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Choose a reminder stage, preview the message, and approve before sending.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {STAGES.map((stage) => (
            <button
              key={stage.key}
              className="whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 tap-target"
            >
              {stage.label}
            </button>
          ))}
        </div>

        {overdueInvoices.length === 0 ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">No overdue invoices to remind about.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {overdueInvoices.map((inv) => {
              const customer = getCustomer(inv.customerId);
              return (
                <div
                  key={inv.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {inv.invoiceNumber}
                        </span>
                        {customer?.isChronicallyLate && (
                          <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-1.5 py-0.5 rounded">
                            Chronic late
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {customer?.name} — {formatInr(inv.outstanding)} outstanding
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {STAGES.map((stage) => {
                      const key = `${inv.id}-${stage.key}`;
                      const isApproved = approved[key];
                      const message = `Reminder for invoice ${inv.invoiceNumber} (${formatInr(inv.outstanding)} outstanding). Stage: ${stage.label}.`;
                      const waUrl = `https://wa.me/${customer?.phone?.replace(/\D/g, "") || "919876543210"}?text=${encodeURIComponent(message)}`;

                      return (
                        <div key={stage.key} className="flex items-center justify-between p-3 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {stage.label}
                              </span>
                              {isApproved && (
                                <span className="text-xs bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400 px-2 py-0.5 rounded">
                                  Approved
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{message}</p>
                            <div className="flex gap-2 mt-2">
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-700 tap-target"
                              >
                                📱 WhatsApp
                              </a>
                              <a
                                href={`mailto:${customer?.email || ""}?subject=Payment reminder&body=${encodeURIComponent(message)}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 tap-target"
                              >
                                ✉️ Email
                              </a>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setApproved({ ...approved, [key]: !isApproved })
                            }
                            className={`w-5 h-5 rounded-full border-2 transition-colors tap-target ${
                              isApproved
                                ? "bg-teal-600 border-teal-600"
                                : "border-slate-300 dark:border-slate-600 hover:border-teal-600"
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}