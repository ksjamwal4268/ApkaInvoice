import { useState, useMemo, useEffect, useRef } from "react";
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
  Square,
  CheckSquare,
  Send,
  Bell,
  MessageSquare,
  Loader2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  X,
} from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";
import { GlowingEffect } from "../components/ui/glowing-effect";
import { HoverBorderGradient } from "../components/ui/hover-border-gradient";
import { formatInr } from "../utils/money";
import { formatDate, daysBetween, toISODateString } from "../utils/date";
import { StatusBadge } from "../components/StatusBadge";
import { sendEmailReminder, sendWhatsAppReminder } from "../api/n8n.js";
import { useAuth } from "../utils/auth";

type FilterTab = "all" | "overdue" | "due";
type ChannelTab = "email" | "whatsapp";

export function Reminders({ lang: _appLang }: { lang: Language }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signInWithGoogle } = useAuth();
  const { invoices, customers, businessProfile, addInvoiceEvidence, saveInvoice, saveCustomer } = useDataStore();

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  // Selected Invoice State - NO AUTO-SELECTION by default unless specified in URL search param
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");

  // Channel Selection: defaults to "email"
  const [activeChannel, setActiveChannel] = useState<ChannelTab>("email");

  // Email Composer State
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailValidationError, setEmailValidationError] = useState<string | null>(null);

  // WhatsApp State
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");

  // Dispatch Status
  const [isSending, setIsSending] = useState(false);
  const [dispatchNotice, setDispatchNotice] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  // Sync selected invoice with URL search param if provided
  useEffect(() => {
    const urlInv = searchParams.get("invoice");
    if (urlInv && invoices.some((i) => i.id === urlInv)) {
      setSelectedInvoiceId(urlInv);
    }
  }, [searchParams, invoices]);

  // Toggle selection on tick box / row click
  const handleToggleSelect = (id: string) => {
    setDispatchNotice(null);
    setEmailValidationError(null);
    if (selectedInvoiceId === id) {
      setSelectedInvoiceId("");
      setSearchParams({});
    } else {
      setSelectedInvoiceId(id);
      setSearchParams({ invoice: id });
    }
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

  // Sync composer fields whenever selected invoice or customer changes
  useEffect(() => {
    if (selectedInvoice) {
      const custName = (selectedCustomer?.name || selectedInvoice.payerName || selectedInvoice.customerName || "").trim();
      const custEmail = (selectedCustomer?.email || selectedInvoice.payerEmail || "").trim();
      const custPhone = (selectedCustomer?.phone || selectedInvoice.payerPhone || "").trim();
      const invNum = selectedInvoice.invoiceNumber ?? "";
      const formattedAmt = formatInr(selectedInvoice.outstanding);
      const bName = businessProfile?.name ?? "ApkaInvoice";
      const bPhone = businessProfile?.phone ?? "";
      const bUpi = businessProfile?.upi ?? (bPhone ? `${bPhone.replace(/\D/g, "")}@upi` : "");

      // If customer record was missing email or phone but invoice had it, backfill customer record
      if (selectedCustomer && (!selectedCustomer.email || !selectedCustomer.phone)) {
        let needsUpdate = false;
        const copyCust = { ...selectedCustomer };
        if (!copyCust.email && custEmail) {
          copyCust.email = custEmail;
          needsUpdate = true;
        }
        if (!copyCust.phone && custPhone) {
          copyCust.phone = custPhone;
          needsUpdate = true;
        }
        if (needsUpdate) {
          saveCustomer(copyCust);
        }
      }

      setRecipientName(custName);
      setRecipientEmail(custEmail);
      setWhatsappPhone(custPhone);
      setEmailSubject(`Payment reminder: invoice ${invNum || "(No Number)"}`);

      const dueDateFormatted = formatDate(selectedInvoice.dueDate);

      const defaultMsg = `Dear ${custName || "Customer"},

This is a payment reminder that payment of ${formattedAmt} for invoice ${invNum || "(No Number)"} is ${
        isOverdue ? `overdue by ${overdueDays} days` : "pending"
      }.

Invoice Details:
- Invoice #: ${invNum || "—"}
- Outstanding Due: ${formattedAmt}
- Due Date: ${dueDateFormatted}

Please arrange to clear this pending amount at your earliest convenience. If you have already processed this payment, kindly disregard this notice.

Thank you,
${bName}`;

      setEmailMessage(defaultMsg);

      const defaultWaMsg = `Hello ${custName || "Customer"}, gentle reminder that payment of ${formattedAmt} for invoice ${invNum || "(No Number)"} is ${
        isOverdue ? "overdue" : "pending"
      } (Due Date: ${dueDateFormatted}). Please arrange for clearance at your earliest convenience. Thanks, ${bName}.`;

      setWhatsappMessage(defaultWaMsg);
      setDispatchNotice(null);
      setEmailValidationError(null);
    }
  }, [selectedInvoice, selectedCustomer, businessProfile, isOverdue, overdueDays]);

  // Email Validation Helper
  const isValidEmail = (emailStr: string | null | undefined) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((emailStr ?? "").trim());
  };

  const emailInputRef = useRef<HTMLInputElement>(null);
  const modalEmailInputRef = useRef<HTMLInputElement>(null);
  const [showPayerEmailModal, setShowPayerEmailModal] = useState(false);
  const [payerEmailInput, setPayerEmailInput] = useState("");

  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [waFallbackLink, setWaFallbackLink] = useState<string | null>(null);

  // Send ONE request from the browser to n8n webhook via src/api/n8n.js
  const executeSendEmail = async (targetEmail: string) => {
    if (!selectedInvoice) return;
    if (isSending) return; // Send only once per click, disable while sending

    const emailClean = (targetEmail ?? "").trim();
    if (!emailClean || !isValidEmail(emailClean)) {
      setEmailValidationError("Please enter the customer's email.");
      setDispatchNotice({
        type: "warning",
        message: "Please enter the customer's email.",
      });
      setShowPayerEmailModal(true);
      setPayerEmailInput(emailClean);
      setTimeout(() => {
        modalEmailInputRef.current?.focus();
        emailInputRef.current?.focus();
      }, 50);
      return;
    }

    setIsSending(true);
    setDispatchNotice(null);
    setEmailValidationError(null);

    try {
      const senderName = (businessProfile?.name ?? "ApkaInvoice");
      const senderEmail = (businessProfile?.email ?? "");
      const invNum = (selectedInvoice.invoiceNumber ?? "");
      const dueDateFormatted = selectedInvoice.dueDate
        ? toISODateString(selectedInvoice.dueDate)
        : "";
      const formattedAmt = formatInr(selectedInvoice.outstanding);

      // Check for Google OAuth Gmail token if user connected Gmail
      let senderGmailToken: string | undefined = undefined;
      try {
        const storedToken =
          localStorage.getItem("gmail_access_token") ||
          localStorage.getItem("cc-gmail-token") ||
          sessionStorage.getItem("gmail_access_token");
        if (storedToken && storedToken.trim()) {
          senderGmailToken = storedToken.trim();
        }
      } catch {
        // ignore
      }

      // Call dedicated n8n helper in src/api/n8n.js
      const res = await sendEmailReminder({
        invoiceNumber: invNum,
        email: emailClean,
        buyerName: (recipientName ?? "").trim() || (selectedCustomer?.name ?? selectedInvoice.customerName ?? ""),
        amountText: formattedAmt,
        dueDate: dueDateFormatted,
        senderName,
        senderEmail,
        gmailToken: senderGmailToken,
      });

      if (res.ok) {
        setDispatchNotice({
          type: "success",
          message: res.message || `Email sent to ${emailClean}`,
        });
        setShowPayerEmailModal(false);

        // Record evidence, persist confirmed email, and update last reminder timestamp
        try {
          if (selectedCustomer && selectedCustomer.email !== emailClean) {
            saveCustomer({
              ...selectedCustomer,
              email: emailClean,
            });
          }

          addInvoiceEvidence(selectedInvoice.id, {
            id: `ev-${Date.now()}`,
            date: new Date(),
            type: "reminder",
            title: "Email Reminder Sent",
            description: `Sent to ${emailClean} via automated email`,
            amount: selectedInvoice.outstanding,
            channel: "email",
          });

          const updatedInvoice = {
            ...selectedInvoice,
            payerEmail: emailClean,
            lastReminderSentAt: new Date().toISOString(),
          };
          saveInvoice(updatedInvoice);
        } catch (e) {
          console.warn("Evidence recording notice:", e);
        }
      } else if (res.needEmail) {
        setDispatchNotice({
          type: "warning",
          message: res.error || "Please check the customer's email.",
        });
        setEmailValidationError(res.error || "Please check the customer's email.");
        setShowPayerEmailModal(true);
        setPayerEmailInput(emailClean);
        setTimeout(() => {
          modalEmailInputRef.current?.focus();
          emailInputRef.current?.focus();
        }, 50);
      } else {
        setDispatchNotice({
          type: "error",
          message: res.error || "Email could not be sent. Please try again.",
        });
      }
    } catch (err: any) {
      console.error("Email reminder error:", err);
      setDispatchNotice({
        type: "error",
        message: "Email could not be sent. Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Dispatch Email Reminder via n8n Webhook
  const handleSendEmailReminder = async () => {
    if (!selectedInvoice) return;
    if (isSending) return;

    // 1. When the button is clicked, get the payer's email from the invoice/buyer record:
    // (buyer?.email ?? invoice?.payer_email ?? '').trim()
    const recordEmail = ((selectedCustomer?.email ?? (selectedInvoice as any)?.payer_email ?? "") as string).trim();
    const effectiveEmail = ((recipientEmail ?? "").trim() || recordEmail).trim();

    if (!effectiveEmail || !isValidEmail(effectiveEmail)) {
      setEmailValidationError("Please enter the payer's email");
      setDispatchNotice({
        type: "warning",
        message: "Please enter the payer's email",
      });
      setShowPayerEmailModal(true);
      setPayerEmailInput(effectiveEmail || "");
      setTimeout(() => {
        modalEmailInputRef.current?.focus();
        emailInputRef.current?.focus();
      }, 50);
      return;
    }

    await executeSendEmail(effectiveEmail);
  };

  // Submit handler when user types in the "Payer's email" modal
  const handleModalSubmit = async () => {
    const typed = (payerEmailInput ?? "").trim();
    if (!typed || !isValidEmail(typed)) {
      setEmailValidationError("Please enter a valid payer's email.");
      return;
    }
    setRecipientEmail(typed);
    await executeSendEmail(typed);
  };

  // WhatsApp automated reminder via src/api/n8n.js
  const handleSendWhatsAppReminder = async () => {
    if (!selectedInvoice || isSendingWhatsApp) return;

    const rawPhone = (whatsappPhone ?? "").trim();
    if (!rawPhone) {
      setDispatchNotice({
        type: "warning",
        message: "Please enter the customer's phone number.",
      });
      return;
    }

    setIsSendingWhatsApp(true);
    setDispatchNotice(null);
    setWaFallbackLink(null);

    try {
      const invNum = (selectedInvoice.invoiceNumber ?? "");
      const dueDateFormatted = selectedInvoice.dueDate
        ? toISODateString(selectedInvoice.dueDate)
        : "";
      const formattedAmt = formatInr(selectedInvoice.outstanding);
      const senderName = (businessProfile?.name ?? "ApkaInvoice");
      const buyerName = (recipientName ?? "").trim() || (selectedCustomer?.name ?? selectedInvoice.customerName ?? "");

      const res = await sendWhatsAppReminder({
        invoiceNumber: invNum,
        phone: rawPhone,
        buyerName,
        amountText: formattedAmt,
        dueDate: dueDateFormatted,
        senderName,
      });

      if (res.ok) {
        setDispatchNotice({
          type: "success",
          message: res.message || "WhatsApp reminder sent",
        });
        if (selectedCustomer && selectedCustomer.phone !== rawPhone) {
          saveCustomer({
            ...selectedCustomer,
            phone: rawPhone,
          });
        }
        addInvoiceEvidence(selectedInvoice.id, {
          id: `ev-${Date.now()}`,
          date: new Date(),
          type: "reminder",
          title: "WhatsApp Reminder Sent",
          description: `Sent to ${rawPhone} via automated WhatsApp`,
          amount: selectedInvoice.outstanding,
          channel: "whatsapp",
        });
        const updatedInvoice = {
          ...selectedInvoice,
          payerPhone: rawPhone,
          lastReminderSentAt: new Date().toISOString(),
        };
        saveInvoice(updatedInvoice);
      } else {
        const fallback =
          res.fallbackLink ||
          `https://wa.me/${rawPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
            whatsappMessage ?? ""
          )}`;
        setWaFallbackLink(fallback);
        try {
          window.open(fallback, "_blank");
        } catch (e) {
          console.warn("Auto popup blocked:", e);
        }
        setDispatchNotice({
          type: "warning",
          message:
            res.error ||
            "Couldn't send automatically. Tap 'Open WhatsApp' below to send it yourself.",
        });
      }
    } catch (err: any) {
      const fallback = `https://wa.me/${rawPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
        whatsappMessage ?? ""
      )}`;
      setWaFallbackLink(fallback);
      try {
        window.open(fallback, "_blank");
      } catch (e) {
        console.warn("Auto popup blocked:", e);
      }
      setDispatchNotice({
        type: "warning",
        message: "Couldn't send automatically. Tap 'Open WhatsApp' below to send it yourself.",
      });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // WhatsApp Send helper / Fallback
  const handleOpenWhatsApp = () => {
    if (!selectedInvoice) return;
    const phoneClean = (whatsappPhone ?? "").replace(/\D/g, "");
    if (!phoneClean) {
      alert("Please enter a valid phone number for WhatsApp.");
      return;
    }
    const url = waFallbackLink || `https://wa.me/${phoneClean}?text=${encodeURIComponent(whatsappMessage ?? "")}`;
    window.open(url, "_blank");

    try {
      addInvoiceEvidence(selectedInvoice.id, {
        id: `ev-${Date.now()}`,
        date: new Date(),
        type: "reminder",
        title: "WhatsApp Reminder Prepared",
        description: `Opened WhatsApp for ${phoneClean}`,
        amount: selectedInvoice.outstanding,
        channel: "whatsapp",
      });
    } catch (e) {
      // ignore
    }
  };

  // Filtered invoices for the selector table
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = (searchQuery ?? "").toLowerCase().trim();
      const matchesSearch =
        !q ||
        ((inv.invoiceNumber ?? "").toLowerCase().includes(q)) ||
        ((inv.customerName ?? "").toLowerCase().includes(q));

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
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Reminders
            </h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
              Payment Dispatch
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Tick an invoice below or click <strong>Send Reminder</strong> to choose WhatsApp or Email dispatch.
          </p>
        </div>

        {invoices.length > 0 && (
          <Link
            to="/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline self-start sm:self-auto"
          >
            <span>Master Invoices Dataset ({invoices.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Selected Invoice Workspace Banner */}
      {selectedInvoice ? (
        <div className="relative rounded-2xl border border-teal-500/40 bg-white p-2 md:rounded-3xl md:p-3 shadow-sm animate-in fade-in slide-in-from-top-2">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
          />
          <div className="relative rounded-xl overflow-hidden bg-white">
            {/* Top Summary Bar */}
            <div className="p-5 bg-teal-50/70 border-b border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-xs shrink-0">
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

            <div className="flex items-center gap-4 text-left sm:text-right">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                  Outstanding Due
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatInr(selectedInvoice.outstanding)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSelect(selectedInvoice.id)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer"
                title="Deselect invoice"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Channel Selector Header */}
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Choose Reminder Channel
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select whether to send this payment reminder via <strong>Email</strong> or <strong>WhatsApp</strong>.
                </p>
              </div>

              {/* 2 Options: Email & WhatsApp */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveChannel("email");
                    setDispatchNotice(null);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeChannel === "email"
                      ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Reminder</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveChannel("whatsapp");
                    setDispatchNotice(null);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeChannel === "whatsapp"
                      ? "bg-[#25D366] text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Response / Feedback Banner */}
            {dispatchNotice && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in ${
                  dispatchNotice.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    : dispatchNotice.type === "warning"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                    : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                }`}
              >
                {dispatchNotice.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-xs font-bold">{dispatchNotice.message}</p>
                  {waFallbackLink && activeChannel === "whatsapp" && (
                    <div className="mt-2.5">
                      <a
                        href={waFallbackLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Open WhatsApp Now ↗</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CHANNEL 1: EMAIL DISPATCH WORKFLOW */}
            {activeChannel === "email" && (
              <div className="space-y-4 pt-1 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Recipient Email Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-teal-600" />
                      Payer's email *
                    </label>
                    <input
                      ref={emailInputRef}
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => {
                        setRecipientEmail(e.target.value);
                        if (emailValidationError) setEmailValidationError(null);
                      }}
                      placeholder="Payer's email"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 ${
                        emailValidationError
                          ? "border-rose-500 bg-rose-50/20 focus:ring-rose-500"
                          : "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-teal-500"
                      }`}
                    />
                    {emailValidationError && (
                      <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{emailValidationError}</span>
                      </p>
                    )}
                  </div>

                  {/* Recipient Name Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-teal-600" />
                      Recipient Name (Payer)
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Acme Corporation"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Email Subject */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Payment reminder: invoice..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Message Body */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Plain-Text Reminder Message
                  </label>
                  <textarea
                    rows={7}
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Sender Identity Preview & Dispatch Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                    <p className="flex items-center gap-1.5 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                      <span>
                        Sender: <strong>{businessProfile?.name ?? "ApkaInvoice"}</strong> ({businessProfile?.email || "4268.kulvardhan.7a@gmail.com"})
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Dispatches securely through cloud email automation.
                    </p>
                  </div>

                  <HoverBorderGradient
                    as="button"
                    type="button"
                    onClick={handleSendEmailReminder}
                    disabled={isSending}
                    containerClassName="rounded-xl self-start sm:self-auto"
                    glowColor="#0d9488"
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[inherit] bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Email...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Email Reminder</span>
                      </>
                    )}
                  </HoverBorderGradient>
                </div>
              </div>
            )}

            {/* CHANNEL 2: WHATSAPP DISPATCH */}
            {activeChannel === "whatsapp" && (
              <div className="space-y-4 pt-1 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#25D366]" />
                    Recipient WhatsApp / Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="+91 98200 12345"
                    className="w-full sm:w-80 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp Message Preview
                  </label>
                  <textarea
                    rows={4}
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                  />
                </div>

                {/* Sender Identity Preview & Dispatch Action (Right-aligned like email) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                    <p className="flex items-center gap-1.5 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#25D366]" />
                      <span>
                        Verified Sender: <strong>{businessProfile?.name ?? "ApkaInvoice"}</strong> {businessProfile?.phone ? `(${businessProfile.phone})` : ""}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Dispatches securely through automated WhatsApp webhook service.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-xs font-bold shadow-2xs transition-colors cursor-pointer tap-target"
                    >
                      <MessageSquare className="w-4 h-4 text-[#25D366]" />
                      <span>Open WhatsApp</span>
                    </button>

                    <HoverBorderGradient
                      as="button"
                      type="button"
                      onClick={handleSendWhatsAppReminder}
                      disabled={isSendingWhatsApp}
                      containerClassName="rounded-xl"
                      glowColor="#25D366"
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[inherit] bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      {isSendingWhatsApp ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending Reminder...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 text-teal-200" />
                          <span>Send Reminder</span>
                        </>
                      )}
                    </HoverBorderGradient>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 text-center space-y-1">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            No invoice currently selected.
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Tick the checkbox on an invoice row below or click <strong>Send Reminder</strong> on the side to select it.
          </p>
        </div>
      )}

      {/* Invoice Section with Tick Box Selection and Side Option */}
      <div className="relative rounded-2xl border border-slate-200/80 bg-white p-2 md:rounded-3xl md:p-3 shadow-xs">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />
        <div className="relative rounded-xl p-4 sm:p-6 bg-white space-y-4">
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
              Select an invoice using the tick box or the <strong>Send Reminder</strong> side option.
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
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
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
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
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
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              filterTab === "due"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Pending / Due ({dueCount})
          </button>
        </div>

        {/* Invoices List / Table with Tick Box Selection and Side Option */}
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
                  <th className="px-3 py-3 text-center w-12">Tick</th>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Customer / Buyer</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Side Option</th>
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
                      onClick={() => handleToggleSelect(inv.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-teal-50/80 dark:bg-teal-950/40 font-medium"
                          : "hover:bg-slate-50 dark:hover:bg-slate-700/40"
                      }`}
                    >
                      {/* Tick Box Column */}
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSelect(inv.id);
                          }}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
                          title={isSelected ? "Click to untick" : "Click to tick invoice"}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400 hover:text-slate-600" />
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

                      {/* Side Option Column: Send Reminder */}
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <HoverBorderGradient
                          as="button"
                          type="button"
                          onClick={() => handleToggleSelect(inv.id)}
                          containerClassName="rounded-lg inline-flex"
                          glowColor={isSelected ? "#0d9488" : "#0ea5e9"}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[inherit] text-xs font-bold transition-all ${
                            isSelected
                              ? "bg-teal-600 text-white shadow-xs"
                              : "border border-teal-600/30 text-teal-700 bg-teal-50 hover:bg-teal-600 hover:text-white"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Selected</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              <span>Send Reminder</span>
                            </>
                          )}
                        </HoverBorderGradient>
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

      {/* Small input modal asking "Payer's email" */}
      {showPayerEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payer's email</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter the payer's email address to send the reminder.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPayerEmailModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Payer's email *
              </label>
              <input
                ref={modalEmailInputRef}
                type="email"
                autoFocus
                value={payerEmailInput}
                onChange={(e) => {
                  setPayerEmailInput(e.target.value);
                  if (emailValidationError) setEmailValidationError(null);
                }}
                placeholder="Payer's email"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleModalSubmit();
                  }
                }}
              />
              {emailValidationError && (
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{emailValidationError}</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPayerEmailModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSending}
                onClick={handleModalSubmit}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Email Reminder</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
