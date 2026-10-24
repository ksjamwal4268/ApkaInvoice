import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatInr } from "../utils/money";
import { Language } from "../data/i18n";
import { Users, AlertTriangle, CheckCircle, Search, ArrowRight, Plus, Edit } from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";
import { CustomerModal } from "../components/CustomerModal";
import { Customer } from "../data/sampleData";

export function Customers({ lang: _lang }: { lang: Language }) {
  const navigate = useNavigate();
  const { customers, invoices, saveCustomer } = useDataStore();

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const customersData = useMemo(() => {
    return customers.map((c) => {
      const invs = invoices.filter((inv) => inv.customerId === c.id);
      const totalOwed = invs.reduce((sum, inv) => sum + inv.outstanding, 0);
      const overdueCount = invs.filter((inv) => inv.status === "overdue" && inv.outstanding > 0).length;
      return {
        ...c,
        totalInvoices: invs.length,
        totalOwed,
        overdueCount,
      };
    });
  }, [customers, invoices]);

  const filtered = useMemo(() => {
    return customersData.filter((c) => {
      if (gradeFilter !== "all" && c.grade !== gradeFilter) return false;
      if (search) {
        const q = (search || "").toLowerCase().trim();
        return (
          Boolean(c && c.name && c.name.toLowerCase().includes(q)) ||
          Boolean(c && c.city && c.city.toLowerCase().includes(q)) ||
          Boolean(c && c.gstin && c.gstin.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [customersData, gradeFilter, search]);

  const totalOwedAll = customersData.reduce((sum, c) => sum + c.totalOwed, 0);
  const chronicCount = customersData.filter((c) => c.isChronicallyLate).length;

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

  return (
    <div className="space-y-6">
      {/* Header with Add Buyer Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 text-slate-900 mb-1">
            Buyers & Customers
          </h1>
          <p className="text-sm text-slate-500 text-slate-500">
            Payment discipline grades, overdue balances, contact numbers, and customer credit health.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all self-start sm:self-auto tap-target"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Buyer</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 border-slate-200 bg-white bg-slate-50 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 bg-teal-900/30 text-teal-600 text-teal-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 text-slate-500">Total Buyers</p>
              <p className="text-2xl font-bold text-slate-900 text-slate-900 mt-0.5">{customers.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 border-slate-200 bg-white bg-slate-50 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 bg-amber-900/30 text-amber-600 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 text-slate-500">Chronically Late</p>
              <p className="text-2xl font-bold text-amber-600 text-amber-400 mt-0.5">{chronicCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 border-slate-200 bg-white bg-slate-50 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 bg-teal-900/30 text-teal-600 text-teal-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 text-slate-500">Total Money Owed</p>
              <p className="text-2xl font-bold tabular-nums text-slate-900 text-slate-900 mt-0.5">
                {formatInr(totalOwedAll)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buyer name, city, GSTIN..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 border-slate-200 bg-white bg-slate-50 text-slate-900 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto">
          {["all", "A", "B", "C"].map((grade) => (
            <button
              key={grade}
              onClick={() => setGradeFilter(grade)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors tap-target ${
                gradeFilter === grade
                  ? "bg-teal-600 text-white"
                  : "bg-white bg-slate-50 border border-slate-200 border-slate-200 text-slate-600 text-slate-500 hover:bg-slate-50 hover:bg-slate-50"
              }`}
            >
              {grade === "all" ? "All grades" : `Grade ${grade}`}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl border border-slate-200 border-slate-200 bg-white bg-slate-50 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 border-slate-200 bg-slate-50 bg-slate-50 text-xs font-bold text-slate-600 text-slate-500">
                <th className="px-5 py-3.5">Buyer / Trade Name</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5">Payment Grade</th>
                <th className="px-5 py-3.5 text-right">Invoices</th>
                <th className="px-5 py-3.5 text-right">Total Owed</th>
                <th className="px-5 py-3.5 text-right">Overdue</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 divide-slate-700">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="hover:bg-slate-50/70 hover:bg-slate-750/50 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900 text-slate-900 group-hover:text-teal-600 group-hover:text-teal-400">
                      {c.name}
                    </p>
                    <p className="text-xs text-slate-500 text-slate-500 font-mono mt-0.5">
                      {c.gstin || "Unregistered"} • {c.city}, {c.state}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-xs">
                    <p className="font-semibold text-slate-800 text-slate-200">{c.phone}</p>
                    <p className="text-slate-400 mt-0.5 truncate max-w-40">{c.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          c.grade === "A"
                            ? "bg-emerald-100 text-emerald-800 bg-emerald-950/60 text-emerald-300"
                            : c.grade === "B"
                            ? "bg-sky-100 text-sky-800 bg-sky-950/60 text-sky-300"
                            : "bg-rose-100 text-rose-800 bg-rose-950/60 text-rose-300"
                        }`}
                      >
                        Grade {c.grade}
                      </span>
                      {c.isChronicallyLate && (
                        <span className="text-[11px] font-bold text-rose-600 text-rose-400 bg-rose-50 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 border-rose-900">
                          Chronic
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums text-slate-700 text-slate-500 font-medium">
                    {c.totalInvoices}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums font-bold text-slate-900 text-slate-900">
                    {formatInr(c.totalOwed)}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums">
                    {c.overdueCount > 0 ? (
                      <span className="font-bold text-rose-600 text-rose-400">
                        {c.overdueCount} overdue
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 text-emerald-400">
                        Up to date
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditModal(c, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 hover:bg-slate-50 transition-colors"
                        title="Edit Buyer Information"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customers/${c.id}`);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 text-teal-400 tap-target"
                      >
                        <span>Profile</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleSaveCustomer}
        initialCustomer={editingCustomer}
      />
    </div>
  );
}
