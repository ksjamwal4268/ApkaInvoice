import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Language } from "../data/i18n";
import { FileText, Plus, User, Clock, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";
import { formatInr } from "../utils/money";
import { formatDate, daysBetween } from "../utils/date";

export function Reminders({ lang: _appLang }: { lang: Language }) {
  const [searchParams] = useSearchParams();
  const { invoices, customers } = useDataStore();

  // Selected Invoice State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");

  // Auto-select from URL search param or default to first invoice
  useEffect(() => {
    const urlInv = searchParams.get("invoice");
    if (urlInv && invoices.some((i) => i.id === urlInv)) {
      setSelectedInvoiceId(urlInv);
    } else if (invoices.length > 0 && !selectedInvoiceId) {
      setSelectedInvoiceId(invoices[0].id);
    }
  }, [searchParams, invoices, selectedInvoiceId]);

  const selectedInvoice = useMemo(() => {
    return invoices.find((i) => i.id === selectedInvoiceId) || null;
  }, [invoices, selectedInvoiceId]);

  const selectedCustomer = useMemo(() => {
    if (!selectedInvoice) return null;
    return customers.find((c) => c.id === selectedInvoice.customerId) || null;
  }, [selectedInvoice, customers]);

  const isOverdue = useMemo(() => {
    if (!selectedInvoice) return false;
    return (selectedInvoice.status ?? "").toLowerCase() === "overdue" || new Date(selectedInvoice.dueDate).getTime() < Date.now();
  }, [selectedInvoice]);

  const overdueDays = useMemo(() => {
    if (!selectedInvoice || !isOverdue) return 0;
    return Math.max(0, daysBetween(new Date(selectedInvoice.dueDate), new Date()));
  }, [selectedInvoice, isOverdue]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Reminders
            </h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
              Step 1: Choose Invoice
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Select the invoice you want to send a payment reminder for.
          </p>
        </div>

        {invoices.length > 0 && (
          <Link
            to="/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline self-start sm:self-auto"
          >
            <span>View All Invoices ({invoices.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* STEP 1: Select Invoice Section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Select Invoice
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose from your recorded invoices to load billing details and recipient contact
              </p>
            </div>
          </div>

          {selectedInvoice && (
            <Link
              to={`/invoices/${selectedInvoice.id}`}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              Open Invoice &rarr;
            </Link>
          )}
        </div>

        {/* Invoice Dropdown Selector */}
        {invoices.length === 0 ? (
          <div className="p-8 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
            <FileText className="w-10 h-10 text-slate-400 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No invoices found in your system
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                Upload or create an invoice first to start dispatching payment reminders.
              </p>
            </div>
            <Link
              to="/invoices/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Invoice</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Choose an Invoice from your records:
              </label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                {invoices.map((inv) => {
                  const late = (inv.status ?? "").toLowerCase() === "overdue" || new Date(inv.dueDate).getTime() < Date.now();
                  const numDisplay = inv.invoiceNumber ? `Invoice #${inv.invoiceNumber}` : "(No Number)";
                  return (
                    <option key={inv.id} value={inv.id}>
                      {numDisplay} • {inv.customerName} — {formatInr(inv.outstanding)} {late ? "[OVERDUE]" : "[DUE]"}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Selected Invoice Summary Card */}
            {selectedInvoice && (
              <div className="p-5 rounded-xl border border-teal-200 dark:border-teal-800/80 bg-teal-50/40 dark:bg-teal-950/20 space-y-4 animate-in fade-in">
                {/* Top Row: Invoice Number, Customer & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-teal-200/60 dark:border-teal-800/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        {selectedInvoice.invoiceNumber || <span className="font-normal italic text-slate-400">— (No Number)</span>}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          isOverdue
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                        }`}
                      >
                        {selectedInvoice.status || (isOverdue ? "Overdue" : "Due")}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>{selectedInvoice.customerName}</span>
                      {selectedCustomer?.city && (
                        <span className="text-slate-400">• {selectedCustomer.city}, {selectedCustomer.state}</span>
                      )}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Outstanding Balance
                    </span>
                    <span className="text-lg font-extrabold tabular-nums text-rose-600 dark:text-rose-400">
                      {formatInr(selectedInvoice.outstanding)}
                    </span>
                  </div>
                </div>

                {/* Grid: Details Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Total Billed</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                      {formatInr(selectedInvoice.total)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Due Date</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatDate(selectedInvoice.dueDate)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Overdue Status</span>
                    <span className="font-bold">
                      {isOverdue ? (
                        <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {overdueDays} days late
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          On schedule
                        </span>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Buyer Contact</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                      {selectedCustomer?.email || selectedCustomer?.phone || "No contact recorded"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
