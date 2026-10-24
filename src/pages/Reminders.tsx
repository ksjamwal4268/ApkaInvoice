import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Language } from "../data/i18n";
import {
  FileText,
  Plus,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Search,
  Check,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";
import { formatInr } from "../utils/money";
import { formatDate, daysBetween } from "../utils/date";
import { StatusBadge } from "../components/StatusBadge";

type FilterTab = "all" | "overdue" | "due";

export function Reminders({ lang: _appLang }: { lang: Language }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { invoices, customers } = useDataStore();

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  // Selected Invoice State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");

  // Sync selected invoice with URL search param
  useEffect(() => {
    const urlInv = searchParams.get("invoice");
    if (urlInv && invoices.some((i) => i.id === urlInv)) {
      setSelectedInvoiceId(urlInv);
    } else if (invoices.length > 0 && !selectedInvoiceId) {
      setSelectedInvoiceId(invoices[0].id);
    }
  }, [searchParams, invoices, selectedInvoiceId]);

  const handleSelectInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    setSearchParams({ invoice: id });
  };

  const selectedInvoice = useMemo(() => {
    return invoices.find((i) => i.id === selectedInvoiceId) || null;
  }, [invoices, selectedInvoiceId]);

  const selectedCustomer = useMemo(() => {
    if (!selectedInvoice) return null;
    return customers.find((c) => c.id === selectedInvoice.customerId) || null;
  }, [selectedInvoice, customers]);

  const isOverdue = useMemo(() => {
    if (!selectedInvoice) return false;
    return (
      (selectedInvoice.status ?? "").toLowerCase() === "overdue" ||
      new Date(selectedInvoice.dueDate).getTime() < Date.now()
    );
  }, [selectedInvoice]);

  const overdueDays = useMemo(() => {
    if (!selectedInvoice || !isOverdue) return 0;
    return Math.max(0, daysBetween(new Date(selectedInvoice.dueDate), new Date()));
  }, [selectedInvoice, isOverdue]);

  // Filtered invoices for the selector table
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const late =
        (inv.status ?? "").toLowerCase() === "overdue" ||
        new Date(inv.dueDate).getTime() < Date.now();

      if (filterTab === "overdue") return late && (inv.outstanding ?? 0) > 0;
      if (filterTab === "due") return !late && (inv.outstanding ?? 0) > 0;
      return true;
    });
  }, [invoices, searchQuery, filterTab]);

  const overdueCount = useMemo(
    () =>
      invoices.filter(
        (i) =>
          ((i.status ?? "").toLowerCase() === "overdue" ||
            new Date(i.dueDate).getTime() < Date.now()) &&
          (i.outstanding ?? 0) > 0
      ).length,
    [invoices]
  );

  const dueCount = useMemo(
    () =>
      invoices.filter(
        (i) =>
          (i.status ?? "").toLowerCase() !== "overdue" &&
          new Date(i.dueDate).getTime() >= Date.now() &&
          (i.outstanding ?? 0) > 0
      ).length,
    [invoices]
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Reminders
            </h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
              Select Invoice
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Select an invoice from your invoice records below to initiate a payment reminder.
          </p>
        </div>

        {invoices.length > 0 && (
          <Link
            to="/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline self-start sm:self-auto"
          >
            <span>Manage Master Invoices ({invoices.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Selected Invoice Banner (If an invoice is selected) */}
      {selectedInvoice && (
        <div className="p-5 rounded-2xl border border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/20 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-teal-200 dark:border-teal-900/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                    Active Invoice Selected
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      isOverdue
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                    }`}
                  >
                    {isOverdue ? `Overdue (+${overdueDays}d)` : "Payment Due"}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {selectedInvoice.invoiceNumber || <span className="font-normal italic text-slate-400">— (No Number)</span>}
                  <span className="text-slate-400 dark:text-slate-500 font-normal mx-2">•</span>
                  <span className="text-slate-700 dark:text-slate-200 font-semibold">{selectedInvoice.customerName}</span>
                </h3>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Outstanding Due
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {formatInr(selectedInvoice.outstanding)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>Buyer: <strong>{selectedCustomer?.name || selectedInvoice.customerName}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>Phone: <strong>{selectedCustomer?.phone || "Not provided"}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>Email: <strong>{selectedCustomer?.email || "Not provided"}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Section with Select Option */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xs space-y-4">
        {/* Controls: Header, Filter Pills & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Invoices Section
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                {invoices.length} Available
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose an invoice using the <strong>Select</strong> option to load it for the reminder workflow.
            </p>
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice # or buyer name..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 border-b border-slate-100 dark:border-slate-750 pb-3">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              filterTab === "all"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            All Invoices ({invoices.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("overdue")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              filterTab === "overdue"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Overdue ({overdueCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("due")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              filterTab === "due"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Pending / Due ({dueCount})
          </button>
        </div>

        {/* Invoices List / Table with Select Option */}
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
        ) : filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            No invoices match your search query or filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-600 dark:text-slate-300 font-bold">
                  <th className="px-4 py-3 text-center w-28">Select Option</th>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Customer / Buyer</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredInvoices.map((inv) => {
                  const isSelected = selectedInvoiceId === inv.id;
                  const cust = customers.find((c) => c.id === inv.customerId);
                  const late =
                    (inv.status ?? "").toLowerCase() === "overdue" ||
                    new Date(inv.dueDate).getTime() < Date.now();
                  const daysLate = Math.max(0, daysBetween(new Date(inv.dueDate), new Date()));

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => handleSelectInvoice(inv.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-teal-50 dark:bg-teal-950/40 font-medium"
                          : "hover:bg-slate-50 dark:hover:bg-slate-700/40"
                      }`}
                    >
                      {/* Select Option Button */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectInvoice(inv.id);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                            isSelected
                              ? "bg-teal-600 text-white shadow-xs scale-102"
                              : "border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:border-teal-500 hover:text-teal-600"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>Selected</span>
                            </>
                          ) : (
                            <span>Select</span>
                          )}
                        </button>
                      </td>

                      {/* Invoice # */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {inv.invoiceNumber ? (
                              inv.invoiceNumber
                            ) : (
                              <span className="text-slate-400 font-normal italic">— (No Number)</span>
                            )}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                              Active
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer / Buyer */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {inv.customerName}
                        </div>
                        {cust?.phone && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {cust.phone}
                          </div>
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {formatInr(inv.total)}
                      </td>

                      {/* Outstanding */}
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                        <span className={inv.outstanding > 0 && late ? "text-rose-600 dark:text-rose-400" : ""}>
                          {formatInr(inv.outstanding)}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <div>{formatDate(inv.dueDate)}</div>
                        {late && inv.outstanding > 0 && (
                          <span className="inline-block text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-1 rounded border border-rose-200 dark:border-rose-800 mt-0.5">
                            +{daysLate}d late
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={inv.status} />
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
  );
}
