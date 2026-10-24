import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatInr } from "../utils/money";
import { Language } from "../data/i18n";
import { Users, AlertTriangle, CheckCircle, Search, ArrowRight, Plus, Edit, ShieldAlert, Trash2 } from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";
import { CustomerModal } from "../components/CustomerModal";
import { Customer, getCustomerCategory } from "../data/sampleData";

export function Customers({ lang: _lang }: { lang: Language }) {
  const navigate = useNavigate();
  const { customers, invoices, saveCustomer, deleteCustomer } = useDataStore();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "green" | "yellow" | "red">("all");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const customersData = useMemo(() => {
    return customers.map((c) => {
      const invs = invoices.filter((inv) => inv.customerId === c.id);
      const totalOwed = invs.reduce((sum, inv) => sum + (inv.outstanding || 0), 0);
      const overdueCount = invs.filter((inv) => (inv.status ?? "").toLowerCase() === "overdue" && (inv.outstanding || 0) > 0).length;
      return {
        ...c,
        category: getCustomerCategory(c),
        totalInvoices: invs.length,
        totalOwed,
        overdueCount,
      };
    });
  }, [customers, invoices]);

  const greenCount = useMemo(() => customersData.filter((c) => c.category === "green").length, [customersData]);
  const yellowCount = useMemo(() => customersData.filter((c) => c.category === "yellow").length, [customersData]);
  const redCount = useMemo(() => customersData.filter((c) => c.category === "red").length, [customersData]);
  const totalOwedAll = useMemo(() => customersData.reduce((sum, c) => sum + (c.totalOwed || 0), 0), [customersData]);

  const filtered = useMemo(() => {
    return customersData.filter((c) => {
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
      if (search) {
        const q = (search ?? "").toLowerCase().trim();
        return (
          (c?.name ?? "").toLowerCase().includes(q) ||
          (c?.city ?? "").toLowerCase().includes(q) ||
          (c?.gstin ?? "").toLowerCase().includes(q) ||
          (c?.phone ?? "").includes(q)
        );
      }
      return true;
    });
  }, [customersData, categoryFilter, search]);

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setIsCustomerModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(c);
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = (saved: Customer) => {
    saveCustomer(saved);
  };

  const handleDeleteCustomer = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${c.name}? This will remove them from your customer list.`)) {
      deleteCustomer(c.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Buyer Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Buyers & Customers
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Categorized by payment speed: <strong className="text-emerald-600 dark:text-emerald-400">Green (&lt; 7 days)</strong>, <strong className="text-amber-600 dark:text-amber-400">Yellow (&gt; 7 days)</strong>, and <strong className="text-rose-600 dark:text-rose-400">Red (&gt; 30 days)</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all self-start sm:self-auto tap-target cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* KPI Cards: Total, Green, Yellow, Red & Money Owed */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Customers */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Buyers</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{customers.length}</p>
            </div>
          </div>
        </div>

        {/* Green: < 7 days */}
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-2xs shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Green (&lt; 7 Days)</p>
              <p className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-0.5">{greenCount}</p>
            </div>
          </div>
        </div>

        {/* Yellow: > 7 days */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 p-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-2xs shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">Yellow (&gt; 7 Days)</p>
              <p className="text-xl font-extrabold text-amber-900 dark:text-amber-200 mt-0.5">{yellowCount}</p>
            </div>
          </div>
        </div>

        {/* Red: > 30 days */}
        <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/20 p-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-2xs shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300">Red (&gt; 30 Days)</p>
              <p className="text-xl font-extrabold text-rose-900 dark:text-rose-200 mt-0.5">{redCount}</p>
            </div>
          </div>
        </div>

        {/* Total Money Owed */}
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Money Owed</p>
              <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {formatInr(totalOwedAll)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter by Category and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buyer name, city, GSTIN..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto">
          {[
            { id: "all", label: `All (${customers.length})` },
            { id: "green", label: `🟢 Green < 7d (${greenCount})` },
            { id: "yellow", label: `🟡 Yellow > 7d (${yellowCount})` },
            { id: "red", label: `🔴 Red > 30d (${redCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors tap-target cursor-pointer whitespace-nowrap ${
                categoryFilter === tab.id
                  ? "bg-teal-600 text-white shadow-2xs"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850/60 text-xs font-bold text-slate-600 dark:text-slate-400">
                <th className="px-5 py-3.5">Buyer / Trade Name</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5">Payment Speed Marker</th>
                <th className="px-5 py-3.5 text-right">Invoices</th>
                <th className="px-5 py-3.5 text-right">Total Owed</th>
                <th className="px-5 py-3.5 text-right">Overdue</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-xs text-slate-400">
                    No buyers found matching your criteria. Click "Add New Customer" to register one.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const cat = c.category;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400">
                          {c.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {c.gstin || "Unregistered"} • {c.city}, {c.state}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{c.phone || "—"}</p>
                        <p className="text-slate-400 mt-0.5 truncate max-w-40">{c.email || "—"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {cat === "green" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              Green (&lt; 7 days)
                            </span>
                          ) : cat === "yellow" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                              Yellow (&gt; 7 days)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                              Red (&gt; 30 days)
                            </span>
                          )}
                          {c.isChronicallyLate && cat !== "red" && (
                            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                              Late
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                        {c.totalInvoices}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                        {formatInr(c.totalOwed)}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums">
                        {c.overdueCount > 0 ? (
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            {c.overdueCount} overdue
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            Up to date
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditModal(c, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="Edit Customer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomer(c, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/customers/${c.id}`);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 tap-target"
                          >
                            <span>Profile</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleSaveCustomer}
        onDelete={deleteCustomer}
        initialCustomer={editingCustomer}
      />
    </div>
  );
}
