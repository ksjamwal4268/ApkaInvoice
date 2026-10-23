import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate } from "../utils/date";
import { formatInr } from "../utils/money";
import { Language } from "../data/i18n";
import { Plus, Search, FileText, ArrowRight, Camera, Zap, Edit } from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";
import { InvoiceCameraModal } from "../components/InvoiceCameraModal";
import { ExtractedInvoiceData } from "../data/dataStore";

type Filter = "all" | "due" | "overdue" | "part-paid" | "paid" | "disputed";

export function Invoices({ lang: _lang }: { lang: Language }) {
  const navigate = useNavigate();
  const { invoices } = useDataStore();

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const counts = useMemo(() => {
    return {
      all: invoices.length,
      due: invoices.filter((i) => i.status === "due").length,
      overdue: invoices.filter((i) => i.status === "overdue").length,
      "part-paid": invoices.filter((i) => i.status === "part-paid").length,
      paid: invoices.filter((i) => i.status === "paid").length,
      disputed: invoices.filter((i) => i.status === "disputed").length,
    };
  }, [invoices]);

  const totalBilled = useMemo(() => invoices.reduce((sum, i) => sum + i.total, 0), [invoices]);
  const totalPaid = useMemo(() => invoices.reduce((sum, i) => sum + i.amountPaid, 0), [invoices]);
  const totalOutstanding = useMemo(() => invoices.reduce((sum, i) => sum + i.outstanding, 0), [invoices]);
  const totalOverdue = useMemo(
    () => invoices.filter((i) => i.status === "overdue").reduce((sum, i) => sum + i.outstanding, 0),
    [invoices]
  );

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (filter !== "all" && inv.status !== filter) return false;
      if (
        search &&
        !inv.customerName.toLowerCase().includes(search.toLowerCase()) &&
        !inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [invoices, filter, search]);

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "due", label: "Due", count: counts.due },
    { value: "overdue", label: "Overdue", count: counts.overdue },
    { value: "part-paid", label: "Part-paid", count: counts["part-paid"] },
    { value: "paid", label: "Paid", count: counts.paid },
    { value: "disputed", label: "Disputed", count: counts.disputed },
  ];

  const handleApplyExtractedData = (_data: ExtractedInvoiceData) => {
    // Navigate to create invoice
    navigate("/invoices/create");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Invoices
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track receivables, scan physical bills via camera, and manage invoice status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCameraModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-teal-100 transition-colors shadow-xs"
          >
            <Camera className="w-4 h-4 text-teal-600" />
            <span>Upload Invoice (Camera / PDF)</span>
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
          </button>

          <Link
            to="/invoices/create"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-sm transition-colors tap-target"
          >
            <Plus className="w-4 h-4" />
            <span>New Invoice</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Billed</p>
          <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
            {formatInr(totalBilled)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Collected</p>
          <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {formatInr(totalPaid)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Outstanding</p>
          <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
            {formatInr(totalOutstanding)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overdue</p>
          <p className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-1">
            {formatInr(totalOverdue)}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors tap-target ${
                filter === f.value
                  ? "bg-teal-600 text-white"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice or customer..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No invoices found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try adjusting your filter or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <th className="px-5 py-3.5">Invoice #</th>
                  <th className="px-5 py-3.5">Customer & City</th>
                  <th className="px-5 py-3.5 text-right">Invoice Total</th>
                  <th className="px-5 py-3.5 text-right">Amount Paid</th>
                  <th className="px-5 py-3.5 text-right">Outstanding</th>
                  <th className="px-5 py-3.5">Due Date</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-750/50 transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400">
                        {inv.invoiceNumber}
                      </span>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{inv.terms}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customers/${inv.customerId}`);
                        }}
                        className="font-semibold text-slate-800 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400"
                      >
                        {inv.customerName}
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {inv.customerCity}, {inv.customerState}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-slate-900 dark:text-white font-medium">
                      {formatInr(inv.total)}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {inv.amountPaid > 0 ? formatInr(inv.amountPaid) : "—"}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                      <span className={inv.outstanding > 0 && inv.status === "overdue" ? "text-rose-600 dark:text-rose-400" : ""}>
                        {formatInr(inv.outstanding)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300 text-xs">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/invoices/${inv.id}/edit`);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Edit Invoice"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/invoices/${inv.id}`);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 tap-target"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Camera & n8n OCR Modal */}
      <InvoiceCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onApplyExtractedData={handleApplyExtractedData}
        onInvoiceStored={() => {
          setIsCameraModalOpen(false);
        }}
      />
    </div>
  );
}
