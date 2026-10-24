import React, { useState, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate, PaymentTerms, toISODateString, daysBetween, isOverdue } from "../utils/date";
import { formatInr, toPaise } from "../utils/money";
import { Language } from "../data/i18n";
import {
  Plus,
  Search,
  FileText,
  ArrowRight,
  Camera,
  Zap,
  Edit,
  Trash2,
  CheckCircle2,
  Square,
  CheckSquare,
  Send,
  Check,
  Upload,
  X,
  Image as ImageIcon,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  RotateCcw,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";
import { InvoiceCameraModal } from "../components/InvoiceCameraModal";
import {
  ExtractedInvoiceData,
  sendReminderViaN8n,
  N8nReminderPayload,
  getStoredBusinessProfile,
} from "../data/dataStore";
import { Invoice } from "../data/sampleData";

type Filter = "all" | "ready" | "completed" | "due" | "overdue" | "part-paid" | "disputed";
type SortField = "dueDate" | "invoiceNumber" | "total" | "outstanding" | "customerName";

export function Invoices({ lang: _lang }: { lang: Language }) {
  const navigate = useNavigate();
  const { invoices, customers, businessProfile, saveInvoice, saveCustomer, deleteInvoice, loadSampleData, refresh } =
    useDataStore();

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [modalInitialFile, setModalInitialFile] = useState<File | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  // Edit Modal State
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState({
    invoiceNumber: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerCity: "",
    customerState: "",
    invoiceDate: "",
    dueDate: "",
    terms: "Net 30" as PaymentTerms,
    totalInr: 0,
    amountPaidInr: 0,
    status: "due" as "ready" | "paid" | "overdue" | "part-paid" | "due" | "disputed",
    isDisputed: false,
    disputeReason: "",
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Summary counts and KPI calculations
  const counts = useMemo(() => {
    return {
      all: invoices.length,
      ready: invoices.filter((i) => (i?.status ?? "").toLowerCase() === "ready").length,
      completed: invoices.filter((i) => (i?.status ?? "").toLowerCase() === "paid" || (i?.outstanding ?? 0) === 0).length,
      due: invoices.filter((i) => (i?.status ?? "").toLowerCase() === "due" && (i?.outstanding ?? 0) > 0).length,
      overdue: invoices.filter((i) => (i?.status ?? "").toLowerCase() === "overdue" && (i?.outstanding ?? 0) > 0).length,
      "part-paid": invoices.filter((i) => (i?.status ?? "").toLowerCase() === "part-paid").length,
      disputed: invoices.filter((i) => (i?.status ?? "").toLowerCase() === "disputed" || Boolean(i?.isDisputed)).length,
    };
  }, [invoices]);

  const totalBilled = useMemo(() => invoices.reduce((sum, i) => sum + (i?.total || 0), 0), [invoices]);
  const totalPaid = useMemo(() => invoices.reduce((sum, i) => sum + (i?.amountPaid || 0), 0), [invoices]);
  const totalOutstanding = useMemo(() => invoices.reduce((sum, i) => sum + (i?.outstanding || 0), 0), [invoices]);
  const totalOverdue = useMemo(
    () => invoices.filter((i) => (i?.status ?? "").toLowerCase() === "overdue").reduce((sum, i) => sum + (i?.outstanding || 0), 0),
    [invoices]
  );

  // Filtering & Sorting
  const filtered = useMemo(() => {
    const list = invoices.filter((inv) => {
      if (!inv) return false;
      const status = (inv.status ?? "").toLowerCase();
      const isCompleted = status === "paid" || (inv.outstanding ?? 0) === 0;
      if (filter === "ready" && status !== "ready") return false;
      if (filter === "completed" && !isCompleted) return false;
      if (filter === "due" && (status !== "due" || isCompleted)) return false;
      if (filter === "overdue" && (status !== "overdue" || isCompleted)) return false;
      if (filter === "part-paid" && status !== "part-paid") return false;
      if (filter === "disputed" && !inv.isDisputed && status !== "disputed") return false;

      if (search) {
        const query = (search ?? "").toLowerCase().trim();
        const matchesCustomer =
          (inv.customerName ?? "").toLowerCase().includes(query) ||
          (inv.payerName ?? "").toLowerCase().includes(query);
        const matchesNumber = (inv.invoiceNumber ?? "").toLowerCase().includes(query);
        const matchesCity = (inv.customerCity ?? "").toLowerCase().includes(query);
        const matchesStatus = (inv.status ?? "").toLowerCase().includes(query);
        const cust = customers.find((c) => Boolean(c && c.id === inv.customerId));
        const matchesPhone = Boolean(cust && (cust.phone ?? "").includes(query));
        const matchesCustName = Boolean(cust && (cust.name ?? "").toLowerCase().includes(query));
        if (!matchesCustomer && !matchesNumber && !matchesCity && !matchesStatus && !matchesPhone && !matchesCustName) {
          return false;
        }
      }
      return true;
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "dueDate") {
        cmp = new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
      } else if (sortField === "invoiceNumber") {
        cmp = (a.invoiceNumber ?? "").localeCompare(b.invoiceNumber ?? "");
      } else if (sortField === "total") {
        cmp = (a.total || 0) - (b.total || 0);
      } else if (sortField === "outstanding") {
        cmp = (a.outstanding || 0) - (b.outstanding || 0);
      } else if (sortField === "customerName") {
        cmp = (a.customerName ?? "").localeCompare(b.customerName ?? "");
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [invoices, customers, filter, search, sortField, sortAsc]);

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All Dataset", count: counts.all },
    { value: "ready", label: "Ready", count: counts.ready },
    { value: "completed", label: "Completed (Paid)", count: counts.completed },
    { value: "due", label: "Due (Pending)", count: counts.due },
    { value: "overdue", label: "Overdue", count: counts.overdue },
    { value: "part-paid", label: "Part-Paid", count: counts["part-paid"] },
    { value: "disputed", label: "Disputed", count: counts.disputed },
  ];

  // Callback from Camera / OCR modal
  const handleApplyExtractedData = (data: ExtractedInvoiceData, imagePreviewUrl?: string) => {
    navigate("/invoices/create", { state: { prefill: data, imagePreview: imagePreviewUrl } });
  };

  // 1. Tick mark payment received / completed toggle
  const handleTogglePaymentReceived = (inv: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isCurrentlyPaid = inv.status === "paid" || inv.outstanding === 0;

    if (!isCurrentlyPaid) {
      // Mark as completed
      const updated: Invoice = {
        ...inv,
        status: "paid",
        amountPaid: inv.total,
        outstanding: 0,
        evidence: [
          ...(inv.evidence || []),
          {
            id: `ev-${Date.now()}`,
            date: new Date(),
            type: "payment",
            title: "Payment Received (Completed)",
            description: `Full payment of ${formatInr(inv.total)} received and verified.`,
            amount: inv.total,
            channel: "phone",
          },
        ],
      };
      saveInvoice(updated);
      setToastMessage(`✓ Payment received${inv.invoiceNumber ? ` for ${inv.invoiceNumber}` : ""}! Status updated to Completed.`);
    } else {
      // Revert to pending / overdue
      const isPastDue = new Date(inv.dueDate).getTime() < Date.now();
      const updated: Invoice = {
        ...inv,
        status: isPastDue ? "overdue" : "due",
        amountPaid: 0,
        outstanding: inv.total,
        evidence: [
          ...(inv.evidence || []),
          {
            id: `ev-${Date.now()}`,
            date: new Date(),
            type: "dispute",
            title: "Payment Reopened",
            description: `Payment status reset to Pending.`,
            amount: inv.total,
            channel: "phone",
          },
        ],
      };
      saveInvoice(updated);
      setToastMessage(`Payment status${inv.invoiceNumber ? ` for ${inv.invoiceNumber}` : ""} reopened as Pending.`);
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 2. Send reminder option - takes invoice to Reminders page
  const handleSendReminder = (inv: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (inv.status === "paid" || inv.outstanding === 0) return;
    navigate(`/reminders?invoice=${inv.id}`);
  };

  // 3. Edit invoice option
  const handleOpenEdit = (inv: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const cust = customers.find((c) => c.id === inv.customerId);
    setEditingInvoice(inv);
    setEditForm({
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      customerPhone: cust?.phone || "",
      customerEmail: cust?.email || "",
      customerCity: inv.customerCity || "",
      customerState: inv.customerState || "",
      invoiceDate: toISODateString(inv.invoiceDate),
      dueDate: toISODateString(inv.dueDate),
      terms: inv.terms,
      totalInr: inv.total / 100,
      amountPaidInr: inv.amountPaid / 100,
      status: inv.status,
      isDisputed: inv.isDisputed,
      disputeReason: inv.disputeReason || "",
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    const totalPaise = toPaise(editForm.totalInr);
    const amountPaidPaise = toPaise(editForm.amountPaidInr);
    const outstandingPaise = Math.max(0, totalPaise - amountPaidPaise);

    let finalStatus = editForm.status;
    if (outstandingPaise === 0 && totalPaise > 0) {
      finalStatus = "paid";
    } else if (finalStatus === "paid" && outstandingPaise > 0) {
      finalStatus = "part-paid";
    }

    const updatedInvoice: Invoice = {
      ...editingInvoice,
      invoiceNumber: editForm.invoiceNumber,
      customerName: editForm.customerName,
      customerCity: editForm.customerCity,
      customerState: editForm.customerState,
      invoiceDate: new Date(editForm.invoiceDate),
      dueDate: new Date(editForm.dueDate),
      terms: editForm.terms,
      total: totalPaise,
      amountPaid: amountPaidPaise,
      outstanding: outstandingPaise,
      status: finalStatus,
      isDisputed: editForm.isDisputed,
      disputeReason: editForm.isDisputed ? editForm.disputeReason : null,
    };

    saveInvoice(updatedInvoice);

    // Sync customer updates if changed
    const cust = customers.find((c) => c.id === editingInvoice.customerId);
    if (cust) {
      saveCustomer({
        ...cust,
        name: editForm.customerName,
        phone: editForm.customerPhone || cust.phone,
        email: editForm.customerEmail || cust.email,
        city: editForm.customerCity || cust.city,
        state: editForm.customerState || cust.state,
      });
    }

    setEditingInvoice(null);
    setToastMessage(`Invoice ${updatedInvoice.invoiceNumber || updatedInvoice.id} updated successfully!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 4. Delete invoice option
  const handleDeleteInvoice = (inv: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const invLabel = inv.invoiceNumber ? `invoice ${inv.invoiceNumber}` : `invoice for ${inv.customerName}`;
    if (window.confirm(`Are you sure you want to delete ${invLabel}?`)) {
      deleteInvoice(inv.id);
      setToastMessage(`${invLabel} deleted from dataset.`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Invoices Dataset
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300">
              {invoices.length} Records
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Master billing dataset: upload invoices, update details, tick received payments, and dispatch reminders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Universal Upload Button (Photo or PDF) */}
          <button
            type="button"
            onClick={() => {
              setModalInitialFile(null);
              setIsCameraModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors shadow-xs cursor-pointer"
          >
            <Upload className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Upload Invoice (Photo / PDF)</span>
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

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Billed</p>
          <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
            {formatInr(totalBilled)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{invoices.length} invoices generated</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Collected</p>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
              Completed
            </span>
          </div>
          <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {formatInr(totalPaid)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{counts.completed} payments received</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Outstanding Balance</p>
          <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
            {formatInr(totalOutstanding)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{counts.due + counts.overdue} pending collection</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overdue Risk</p>
            {counts.overdue > 0 && (
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                Action Req.
              </span>
            )}
          </div>
          <p className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-1">
            {formatInr(totalOverdue)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{counts.overdue} overdue bills</p>
        </div>
      </div>

      {/* Filters, Search & Sort */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors tap-target ${
                filter === f.value
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice #, customer, phone..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-transparent border-none text-xs font-medium focus:ring-0 cursor-pointer"
            >
              <option value="dueDate">Due Date</option>
              <option value="invoiceNumber">Invoice #</option>
              <option value="total">Amount</option>
              <option value="outstanding">Outstanding</option>
              <option value="customerName">Customer</option>
            </select>
            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500"
              title={sortAsc ? "Sort ascending" : "Sort descending"}
            >
              {sortAsc ? "↑" : "↓"}
            </button>
          </div>
        </div>
      </div>

      {/* Master Invoice Dataset Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {invoices.length === 0 ? "No invoices in your dataset yet" : "No matching invoices found"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
              {invoices.length === 0
                ? "Upload your physical bills via camera, upload a PDF invoice, or create a new invoice to get started."
                : "Try adjusting your search query or filter tags to find what you're looking for."}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors shadow-xs"
              >
                <Camera className="w-4 h-4" />
                <span>Upload Invoice</span>
              </button>

              <Link
                to="/invoices/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Invoice</span>
              </Link>

              {invoices.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    loadSampleData();
                    refresh();
                    setToastMessage("Demo dataset loaded successfully!");
                    setTimeout(() => setToastMessage(null), 4000);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Load Sample Dataset</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <th className="px-4 py-3.5 text-center w-28">Payment Received</th>
                  <th className="px-5 py-3.5">Invoice #</th>
                  <th className="px-5 py-3.5">Customer / Buyer</th>
                  <th className="px-4 py-3.5 text-right">Total</th>
                  <th className="px-4 py-3.5 text-right">Received</th>
                  <th className="px-4 py-3.5 text-right">Outstanding</th>
                  <th className="px-4 py-3.5">Due Date</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-center">Reminder</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filtered.map((inv) => {
                  const cust = customers.find((c) => c.id === inv.customerId);
                  const isCompleted = inv.status === "paid" || inv.outstanding === 0;
                  const isLate = isOverdue(inv.dueDate) && !isCompleted;
                  const daysLate = Math.max(0, daysBetween(inv.dueDate, new Date()));

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className={`cursor-pointer transition-colors group ${
                        isCompleted
                          ? "hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 bg-emerald-50/10 dark:bg-emerald-950/5"
                          : isLate
                          ? "hover:bg-rose-50/40 dark:hover:bg-rose-950/20 bg-rose-50/10"
                          : "hover:bg-slate-50/70 dark:hover:bg-slate-750/50"
                      }`}
                    >
                      {/* 1. Payment Received Checkbox / Tick Mark Column */}
                      <td
                        className="px-4 py-4 text-center shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleTogglePaymentReceived(inv, e)}
                          title={
                            isCompleted
                              ? "Payment received and completed. Click to unmark."
                              : "Click to tick mark payment as received"
                          }
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-2xs ${
                            isCompleted
                              ? "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600"
                              : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/40"
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <CheckSquare className="w-4 h-4 text-white" />
                              <span>Completed</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                              <span className="text-[11px] font-medium">Pending</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Invoice # & Terms */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400">
                            {inv.invoiceNumber ? (
                              inv.invoiceNumber
                            ) : (
                              <span className="text-slate-400 font-normal italic">— (No Number)</span>
                            )}
                          </span>
                          {inv.pdfUrl && inv.pdfUrl.startsWith("data:image") && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800" title="Bill photo attached">
                              📷 Photo
                            </span>
                          )}
                          {inv.pdfUrl && (inv.pdfUrl.includes(".pdf") || inv.pdfUrl.startsWith("data:application/pdf")) && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600" title="PDF attached">
                              📄 PDF
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                            {inv.terms}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatDate(inv.invoiceDate)}
                          </span>
                        </div>
                      </td>

                      {/* Customer & City */}
                      <td className="px-5 py-4">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${inv.customerId}`);
                          }}
                          className="font-semibold text-slate-800 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 block"
                        >
                          {inv.customerName}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {inv.customerCity ? `${inv.customerCity}, ${inv.customerState}` : cust?.phone || "No phone"}
                        </p>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-4 text-right tabular-nums text-slate-900 dark:text-white font-medium">
                        {formatInr(inv.total)}
                      </td>

                      {/* Received */}
                      <td className="px-4 py-4 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                        {inv.amountPaid > 0 ? formatInr(inv.amountPaid) : "—"}
                      </td>

                      {/* Outstanding */}
                      <td className="px-4 py-4 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                        <span
                          className={
                            inv.outstanding > 0 && isLate
                              ? "text-rose-600 dark:text-rose-400"
                              : isCompleted
                              ? "text-slate-400 line-through"
                              : ""
                          }
                        >
                          {formatInr(inv.outstanding)}
                        </span>
                      </td>

                      {/* Due Date & Late Badge */}
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300 text-xs">
                        <div>{formatDate(inv.dueDate)}</div>
                        {isLate && (
                          <span className="inline-block text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-1 rounded mt-0.5 border border-rose-200 dark:border-rose-800">
                            +{daysLate}d late
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <StatusBadge status={inv.status} />
                      </td>

                      {/* Reminder Column */}
                      <td
                        className="px-4 py-4 text-center shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <Check className="w-3 h-3" /> Paid
                          </span>
                        ) : inv.lastReminderSentAt ? (
                          <div className="inline-flex items-center gap-1">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-[11px] font-bold"
                              title={`Last sent at ${new Date(inv.lastReminderSentAt).toLocaleString()}`}
                            >
                              <CheckCircle2 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                              <span>Sent</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleSendReminder(inv, e)}
                              disabled={sendingReminderId === inv.id}
                              className="text-[10px] text-teal-600 hover:underline px-1 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Resend payment reminder"
                            >
                              Resend
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleSendReminder(inv, e)}
                            disabled={sendingReminderId === inv.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-2xs hover:scale-102 tap-target"
                            title="Dispatch WhatsApp payment reminder to buyer"
                          >
                            <Send className="w-3 h-3" />
                            <span>{sendingReminderId === inv.id ? "Sending..." : "Send Reminder"}</span>
                          </button>
                        )}
                      </td>

                      {/* Actions Column (Edit, View, Delete) */}
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(inv, e)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-700 transition-colors"
                            title="Edit Invoice Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* View details button */}
                          <button
                            type="button"
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="View Full Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteInvoice(inv, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-750">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit Invoice Details
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update billing data, buyer information, and payment status {editingInvoice.invoiceNumber ? `for ${editingInvoice.invoiceNumber}` : `for ${editingInvoice.customerName}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Invoice Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={editForm.invoiceNumber}
                    onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                    placeholder="e.g. INV-001 (optional)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                {/* Terms */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={editForm.terms}
                    onChange={(e) => setEditForm({ ...editForm, terms: e.target.value as PaymentTerms })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Net 7">Net 7 Days</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 45">Net 45 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                  </select>
                </div>
              </div>

              {/* Customer / Buyer Information */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Buyer Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Customer / Business Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.customerName}
                      onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Customer Phone (WhatsApp)
                    </label>
                    <input
                      type="text"
                      value={editForm.customerPhone}
                      onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Customer Email
                    </label>
                    <input
                      type="email"
                      value={editForm.customerEmail}
                      onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })}
                      placeholder="accounts@buyer.in"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={editForm.customerCity}
                        onChange={(e) => setEditForm({ ...editForm, customerCity: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={editForm.customerState}
                        onChange={(e) => setEditForm({ ...editForm, customerState: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates & Amounts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice Issue Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.invoiceDate}
                    onChange={(e) => setEditForm({ ...editForm, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={editForm.totalInr}
                    onChange={(e) => setEditForm({ ...editForm, totalInr: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount Paid (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.amountPaidInr}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditForm({
                        ...editForm,
                        amountPaidInr: val,
                        status: val >= editForm.totalInr && editForm.totalInr > 0 ? "paid" : editForm.status,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {[
                    { value: "ready", label: "Ready" },
                    { value: "paid", label: "Completed (Paid)" },
                    { value: "due", label: "Due (Pending)" },
                    { value: "overdue", label: "Overdue" },
                    { value: "part-paid", label: "Part-Paid" },
                    { value: "disputed", label: "Disputed" },
                  ].map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => {
                        const newStatus = s.value as any;
                        setEditForm({
                          ...editForm,
                          status: newStatus,
                          amountPaidInr: newStatus === "paid" ? editForm.totalInr : editForm.amountPaidInr,
                        });
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        editForm.status === s.value
                          ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dispute Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isDisputed}
                    onChange={(e) => setEditForm({ ...editForm, isDisputed: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Mark invoice as disputed by buyer
                  </span>
                </label>

                {editForm.isDisputed && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Reason for dispute (e.g. quantity mismatch, quality inspection)"
                      value={editForm.disputeReason}
                      onChange={(e) => setEditForm({ ...editForm, disputeReason: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100"
                    />
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/invoices/${editingInvoice.id}/edit`);
                  }}
                  className="text-xs text-teal-600 hover:underline font-semibold"
                >
                  Open Full Line-Item Editor →
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingInvoice(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera & n8n OCR Modal */}
      <InvoiceCameraModal
        isOpen={isCameraModalOpen}
        initialFile={modalInitialFile}
        onClose={() => {
          setIsCameraModalOpen(false);
          setModalInitialFile(null);
        }}
        onApplyExtractedData={handleApplyExtractedData}
        onInvoiceStored={(stored) => {
          refresh();
          setIsCameraModalOpen(false);
          setModalInitialFile(null);
          const invDesc = stored.invoiceNumber ? `Invoice ${stored.invoiceNumber}` : `Invoice for ${stored.customerName}`;
          setToastMessage(`${invDesc} uploaded and added to dataset!`);
          setTimeout(() => setToastMessage(null), 5000);
        }}
      />
    </div>
  );
}
