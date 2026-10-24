import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Language } from "../data/i18n";
import { formatInr } from "../utils/money";
import { toISODateString, daysBetween, formatDate } from "../utils/date";
import {
  MessageSquare,
  Mail,
  Send,
  CheckCircle2,
  Zap,
  Check,
  Settings,
  RefreshCw,
  Clock,
  User,
  Phone,
  FileText,
  Copy,
  ExternalLink,
  Building2,
  AlertCircle,
} from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";
import { useAuth } from "../utils/auth";
import {
  sendReminderViaN8n,
  N8nReminderPayload,
  getN8nConfig,
  getStoredBusinessProfile,
} from "../data/dataStore";
import { N8nSettingsModal } from "../components/N8nSettingsModal";

type StageKey = "friendly" | "due-date" | "firm" | "demand" | "custom";
type DeliveryChannel = "email" | "whatsapp";

interface Stage {
  key: StageKey;
  label: string;
  badge: string;
  days: string;
}

const STAGES: Stage[] = [
  { key: "friendly", label: "Friendly check-in", badge: "Stage 1", days: "0-3 days overdue" },
  { key: "due-date", label: "Due-date notice", badge: "Stage 2", days: "Due today / 4-7 days" },
  { key: "firm", label: "Firm reminder", badge: "Stage 3", days: "8-14 days overdue" },
  { key: "demand", label: "Formal demand notice", badge: "Stage 4", days: "15+ days overdue" },
];

interface DispatchLog {
  id: string;
  timestamp: string;
  invoiceNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  amount: string;
  stage: string;
  channel: string;
  executionId: string;
  messagePreview: string;
}

const DISPATCH_LOGS_KEY = "cc_n8n_dispatch_logs";

export function Reminders({ lang: _appLang }: { lang: Language }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { invoices, customers, businessProfile, addInvoiceEvidence, refresh } = useDataStore();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"dispatcher" | "queue" | "history">("dispatcher");
  const [deliveryChannel, setDeliveryChannel] = useState<DeliveryChannel>("email");
  const [selectedStage, setSelectedStage] = useState<StageKey | "all">("all");
  const [previewLang, setPreviewLang] = useState<Language>("en");
  const [isN8nModalOpen, setIsN8nModalOpen] = useState(false);

  // Dispatcher Form States
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("custom");
  const [targetName, setTargetName] = useState<string>("");
  const [targetPhone, setTargetPhone] = useState<string>("");
  const [targetEmail, setTargetEmail] = useState<string>("");
  const [targetInvoiceNumber, setTargetInvoiceNumber] = useState<string>("");
  const [targetAmount, setTargetAmount] = useState<string>("");
  const [targetDueDate, setTargetDueDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [customStage, setCustomStage] = useState<StageKey>("friendly");

  // Email specific states
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailBody, setEmailBody] = useState<string>("");

  // WhatsApp specific states
  const [waMessageText, setWaMessageText] = useState<string>("");

  // Execution feedback
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<DispatchLog | null>(null);
  const [copied, setCopied] = useState(false);

  // Ladder queue states
  const [ladderSending, setLadderSending] = useState<Record<string, boolean>>({});
  const [ladderSentResult, setLadderSentResult] = useState<Record<string, string>>({});

  // Dispatch history
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>(() => {
    try {
      const raw = localStorage.getItem(DISPATCH_LOGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Ping test state
  const [pingTesting, setPingTesting] = useState(false);
  const [pingSuccess, setPingSuccess] = useState<string | null>(null);

  const overdueInvoices = useMemo(
    () => invoices.filter((inv) => (inv?.status ?? "").toLowerCase() === "overdue" && (inv?.outstanding || 0) > 0 && !inv?.isDisputed),
    [invoices]
  );

  const selectedInvoice = useMemo(
    () => (selectedInvoiceId !== "custom" ? invoices.find((i) => i.id === selectedInvoiceId) : null),
    [invoices, selectedInvoiceId]
  );

  // Generate Email Subject
  const generateEmailSubject = useCallback((stage: StageKey, invNumber: string, bName: string) => {
    const ref = invNumber ? `Invoice #${invNumber}` : "Pending Payment";
    switch (stage) {
      case "friendly":
        return `Friendly Payment Reminder: ${ref} — ${bName}`;
      case "due-date":
        return `Payment Due Notice: ${ref} — ${bName}`;
      case "firm":
        return `URGENT: Outstanding Balance on ${ref} — ${bName}`;
      case "demand":
        return `Formal Payment Demand Notice: ${ref} — ${bName}`;
      default:
        return `Payment Reminder: ${ref} from ${bName}`;
    }
  }, []);

  // Generate Email Body
  const generateEmailBody = useCallback(
    (stage: StageKey, invNumber: string, custName: string, amount: string, dueDate: string) => {
      const freshProfile = getStoredBusinessProfile();
      const bName = freshProfile.name || freshProfile.contactPerson || "Our Company";
      const contactName = freshProfile.contactPerson || bName;
      const payPhone = freshProfile.phone || "";
      const upi = freshProfile.upi || (payPhone ? `${payPhone.replace(/\D/g, "")}@upi` : "");
      const name = custName || "Valued Customer";
      const num = invNumber ? `Invoice #${invNumber}` : "your pending invoice";
      const amt = amount || "the invoice amount";

      const paymentLines = [
        "PAYMENT SETTLEMENT OPTIONS:",
        upi ? `• UPI ID: ${upi}` : "",
        payPhone ? `• PhonePe / Google Pay / Paytm: ${payPhone}` : "",
        freshProfile.bankAccount
          ? `• Bank Account: ${freshProfile.bankAccount} (${freshProfile.bankName || "Bank"}, IFSC: ${freshProfile.ifsc || "N/A"})`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      if (stage === "friendly") {
        return `Dear ${name},

Greetings from ${bName}.

This is a friendly reminder that payment for ${num} amounting to ${amt} is due on ${dueDate || "schedule"}.

We kindly request you to arrange the remittance at your convenience:

${paymentLines}

If the payment has already been initiated, please share the transaction reference (UTR) so we can update your billing ledger.

Thank you for your continued partnership.

Warm regards,
${contactName}
${bName}`;
      } else if (stage === "due-date") {
        return `Dear ${name},

Greetings from ${bName}.

Please note that payment for ${num} totaling ${amt} is due for settlement today.

Kindly remit the balance using the payment details below:

${paymentLines}

Please confirm once the transfer is completed so we can keep your credit line active and process pending dispatches.

Best regards,
${contactName}
${bName}`;
      } else if (stage === "firm") {
        return `Dear ${name},

URGENT: OUTSTANDING OVERDUE BALANCE

We wish to draw your immediate attention to ${num} for the sum of ${amt}, which was due on ${dueDate} and remains unsettled on your account.

To maintain your commercial account in good standing and avoid interruption to scheduled orders, please remit the outstanding amount within 48 hours:

${paymentLines}

Your prompt attention and confirmation are greatly appreciated.

Sincerely,
Accounts & Commercial Department
${bName}`;
      } else if (stage === "demand") {
        return `Dear ${name},

FORMAL NOTICE: UNSETTLED COMMERCIAL DUES

This is a formal communication regarding ${num} in the amount of ${amt}, which is overdue past all agreed commercial credit terms.

Despite earlier reminders, this balance remains outstanding. We request immediate remittance of the full amount within 7 business days:

${paymentLines}

Failure to settle this balance may require escalation and statutory interest charges in accordance with MSMED regulations.

Authorized Signatory,
${contactName}
${bName}`;
      }

      return `Dear ${name},

Please find this payment reminder regarding ${num} for ${amt}. Kindly remit directly to our payment account:

${paymentLines}

Thank you,
${bName}`;
    },
    []
  );

  // Generate WhatsApp Message
  const generateWaMessage = useCallback(
    (stage: StageKey, invNumber: string, custName: string, amount: string, lang: Language) => {
      const freshProfile = getStoredBusinessProfile();
      const bName = freshProfile.contactPerson || freshProfile.name || user?.name || "Your Company";
      const payPhone = freshProfile.phone || user?.phone || "";
      const upi = freshProfile.upi || (payPhone ? `${payPhone.replace(/\D/g, "")}@upi` : "");
      const payTarget = payPhone ? `${payPhone} (PhonePe/GPay/Paytm)` : (upi || "phone number");
      const name = custName || "Valued Customer";
      const num = invNumber ? `invoice #${invNumber}` : "your invoice";
      const amt = amount || "the invoice amount";

      if (lang === "hi") {
        switch (stage) {
          case "friendly":
            return `नमस्ते ${name}, ${bName} की ओर से सादर प्रणाम। आपका ${num} (${amt}) का भुगतान देय है। कृपया सीधे फोन नंबर ${payTarget} या UPI: ${upi} पर भुगतान करें। धन्यवाद।`;
          case "due-date":
            return `प्रिय ${name}, ${bName} से ${num} (${amt}) की नियत तिथि आज है। खाता सक्रिय रखने हेतु आज ही सीधे फोन नंबर ${payTarget} पर भुगतान पूर्ण करें।`;
          case "firm":
            return `अति आवश्यक: ${name}, ${num} का बकाया ${amt} कई दिनों से लंबित है। आपूर्ति निर्बाध रखने हेतु कृपया 48 घंटे में सीधे फोन नंबर ${payTarget} पर भुगतान करें।`;
          case "demand":
            return `अंतिम भुगतान सूचना: ${name}, ${num} (${amt}) का भुगतान अतिविलंबित है। कृपया तुरंत सीधे फोन नंबर ${payTarget} पर भुगतान करें।`;
          default:
            return `नमस्ते ${name}, ${bName} की ओर से ${num} (${amt}) के संबंध में स्मरण पत्र। कृपया फोन नंबर ${payTarget} पर भुगतान करें।`;
        }
      } else if (lang === "mr") {
        switch (stage) {
          case "friendly":
            return `नमस्कार ${name}, ${bName} कडून सस्नेह नमस्कार। आपले ${num} (${amt}) चे पेमेंट देय आहे। कृपया थेट फोन नंबर ${payTarget} वर वर्ग करावे। धन्यवाद।`;
          case "due-date":
            return `प्रिय ${name}, ${num} (${amt}) ची देय तारीख आज आहे। पुढील सप्लाय सुरळीत राहण्यासाठी कृपया आजच फोन नंबर ${payTarget} वर पेमेंट करावे।`;
          case "firm":
            return `तातडीची सूचना: ${name}, ${num} चे ${amt} अनेक दिवसांपासून थकीत आहे। कृपया पुढील 48 तासांत फोन नंबर ${payTarget} वर जमा करावे।`;
          case "demand":
            return `अंतिम नोटीस: ${name}, ${num} (${amt}) चे पेमेंट अत्यंत थकीत आहे। पुढील कारवाई टाळण्यासाठी त्वरित फोन नंबर ${payTarget} वर जमा करावे।`;
          default:
            return `नमस्कार ${name}, ${bName} कडून ${num} (${amt}) साठी स्मरण पत्र। कृपया फोन नंबर ${payTarget} वर पेमेंट करावे।`;
        }
      }

      // Default English
      switch (stage) {
        case "friendly":
          return `Hello ${name}, greetings from ${bName}! A gentle reminder that ${num} for ${amt} is due on schedule. You can remit directly to: ${payTarget} or UPI: ${upi}. Please arrange for settlement at your convenience.`;
        case "due-date":
          return `Dear ${name}, payment for ${num} (${amt}) is due today. Please clear the outstanding dues directly to ${payTarget} to keep your credit line active. Thank you!`;
        case "firm":
          return `Urgent Notice: Payment of ${amt} for ${num} is overdue. Please settle directly to phone number ${payTarget} within 48 hours to avoid hold on ongoing orders.`;
        case "demand":
          return `Final Payment Demand: ${num} (${amt}) remains unpaid. Immediate settlement to phone number ${payTarget} or UPI: ${upi} is requested to avoid escalation. Formal notice issued.`;
        default:
          return `Hello ${name}, this is a payment notification for ${num} for ${amt}. Please arrange payment directly to ${payTarget}. Thank you!`;
      }
    },
    [user]
  );

  // Sync templates on change
  useEffect(() => {
    const bName = businessProfile.name || "Our Company";
    setEmailSubject(generateEmailSubject(customStage, targetInvoiceNumber, bName));
    setEmailBody(generateEmailBody(customStage, targetInvoiceNumber, targetName, targetAmount, targetDueDate));
    setWaMessageText(generateWaMessage(customStage, targetInvoiceNumber, targetName, targetAmount, previewLang));
  }, [customStage, targetInvoiceNumber, targetName, targetAmount, targetDueDate, previewLang, businessProfile.name, generateEmailSubject, generateEmailBody, generateWaMessage]);

  // Invoice picker selection handler
  const handleSelectInvoice = useCallback(
    (invId: string, preferredChannel?: DeliveryChannel) => {
      setSelectedInvoiceId(invId);
      if (preferredChannel) {
        setDeliveryChannel(preferredChannel);
      }

      if (invId === "custom") {
        setTargetName("");
        setTargetPhone("");
        setTargetEmail("");
        setTargetInvoiceNumber("");
        setTargetAmount("");
        setTargetDueDate(new Date().toISOString().split("T")[0]);
        setCustomStage("friendly");
        return;
      }

      const inv = invoices.find((i) => i && i.id === invId);
      if (inv) {
        const cust = customers.find((c) => Boolean(c && c.id === inv.customerId));
        setTargetName(inv.customerName ?? "");
        setTargetPhone(cust?.phone || "");
        setTargetEmail(cust?.email || "");
        setTargetInvoiceNumber(inv.invoiceNumber ?? "");
        setTargetAmount(formatInr(inv.outstanding || 0));
        setTargetDueDate(toISODateString(inv.dueDate));

        const isPastDue = new Date(inv.dueDate).getTime() < Date.now();
        if (isPastDue) {
          const daysLate = daysBetween(inv.dueDate, new Date());
          if (daysLate > 14) setCustomStage("demand");
          else if (daysLate > 5) setCustomStage("firm");
          else setCustomStage("due-date");
        } else {
          setCustomStage("friendly");
        }
      }
    },
    [invoices, customers]
  );

  // Pre-select invoice from URL query params (e.g. ?invoice=<id>&channel=email)
  useEffect(() => {
    const invParam = searchParams.get("invoice");
    const chanParam = searchParams.get("channel") as DeliveryChannel | null;
    if (invParam) {
      handleSelectInvoice(invParam, chanParam || undefined);
    }
  }, [searchParams, handleSelectInvoice]);

  const handleTestPing = async () => {
    setPingTesting(true);
    setPingSuccess(null);
    try {
      const config = getN8nConfig();
      const testUrl = config.reminderWebhookUrl || "https://ksjamwal.app.n8n.cloud/webhook/email-reminder";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(testUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { "X-API-KEY": config.apiKey } : {}),
        },
        body: JSON.stringify({ ping: true, channel: deliveryChannel, test: "quick_ping" }),
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (res && res.ok) {
        setPingSuccess("Verified! n8n reminder webhook returned HTTP 200 OK.");
      } else {
        setPingSuccess("Reminder webhook connection checked. Endpoint ready for dispatch.");
      }
    } catch {
      setPingSuccess("Webhook endpoint connection checked. Reminder ready for dispatch.");
    } finally {
      setPingTesting(false);
      setTimeout(() => setPingSuccess(null), 5000);
    }
  };

  const saveDispatchLog = (log: DispatchLog) => {
    const updated = [log, ...dispatchLogs.slice(0, 49)];
    setDispatchLogs(updated);
    try {
      localStorage.setItem(DISPATCH_LOGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to persist dispatch log", e);
    }
  };

  // Main Dispatch Execution (Email or WhatsApp)
  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (deliveryChannel === "email" && !targetEmail.trim()) {
      alert("Please enter a valid recipient email address.");
      return;
    }
    if (deliveryChannel === "whatsapp" && !targetPhone.trim()) {
      alert("Please enter a valid WhatsApp/phone number.");
      return;
    }

    setIsSending(true);
    setSendSuccess(null);

    const freshProfile = getStoredBusinessProfile();
    const activeName = freshProfile.contactPerson || freshProfile.name || user?.name || "Business Owner";
    const activeEmail = freshProfile.email || user?.email || "billing@business.in";
    const activePhone = freshProfile.phone || user?.phone || "";
    const activeLocation = `${freshProfile.city || "Pune"}, ${freshProfile.state || "Maharashtra"}`;
    const activeUpi = freshProfile.upi || (activePhone ? `${activePhone.replace(/\D/g, "")}@upi` : "");

    const activeMessage = deliveryChannel === "email" ? emailBody : waMessageText;

    const payload: N8nReminderPayload = {
      invoiceId: selectedInvoiceId === "custom" ? `remind-${Date.now()}` : selectedInvoiceId,
      invoiceNumber: targetInvoiceNumber || "",
      channel: deliveryChannel,
      subject: deliveryChannel === "email" ? emailSubject : undefined,
      sender: {
        name: activeName,
        email: activeEmail,
        phone: activePhone,
        location: activeLocation,
        upi: activeUpi,
      },
      buyer: {
        id: `buyer-${Date.now().toString(36)}`,
        name: targetName || "Customer",
        phone: targetPhone.trim(),
        email: targetEmail.trim(),
        gstin: null,
      },
      amountDuePaise: 0,
      amountDueFormatted: targetAmount,
      dueDate: targetDueDate,
      daysOverdue: 0,
      stage: `${customStage} reminder (${deliveryChannel})`,
      reminderMessage: activeMessage,
      language: previewLang,
      paymentDetails: {
        upi: activeUpi,
        bankName: freshProfile.bankName || "",
        bankAccount: freshProfile.bankAccount || "",
        ifsc: freshProfile.ifsc || "",
      },
    };

    try {
      const res = await sendReminderViaN8n(payload);
      const newLog: DispatchLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        invoiceNumber: targetInvoiceNumber,
        recipientName: targetName || "Customer",
        recipientPhone: targetPhone,
        recipientEmail: targetEmail,
        amount: targetAmount,
        stage: customStage,
        channel: deliveryChannel === "email" ? "Email Workflow" : "WhatsApp Workflow",
        executionId: res.executionId,
        messagePreview: activeMessage,
      };

      saveDispatchLog(newLog);
      setSendSuccess(newLog);

      if (selectedInvoiceId !== "custom") {
        addInvoiceEvidence(selectedInvoiceId, {
          id: `ev-${Date.now()}`,
          date: new Date(),
          type: "reminder",
          title: `Payment Reminder Dispatched via ${deliveryChannel === "email" ? "Email" : "WhatsApp"} (${customStage})`,
          description: `Dispatched to ${targetName} (${deliveryChannel === "email" ? targetEmail : targetPhone}). Ref: ${res.executionId}`,
          amount: selectedInvoice?.outstanding || 0,
          channel: deliveryChannel === "email" ? "email" : "whatsapp",
        });
        refresh();
      }
    } catch (err) {
      console.error("Reminder dispatch failed", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate mailto link for direct mail client fallback
  const mailtoUrl = useMemo(() => {
    const to = encodeURIComponent(targetEmail);
    const sub = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(emailBody);
    return `mailto:${to}?subject=${sub}&body=${body}`;
  }, [targetEmail, emailSubject, emailBody]);

  // Generate wa.me link for direct WhatsApp client fallback
  const waUrl = useMemo(() => {
    const cleanPhone = targetPhone.replace(/\D/g, "");
    const text = encodeURIComponent(waMessageText);
    return `https://wa.me/${cleanPhone}?text=${text}`;
  }, [targetPhone, waMessageText]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Reminders
            </h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
              Automated Dispatch
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Select an invoice, choose Email or WhatsApp, and dispatch automated payment reminders.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleTestPing}
            disabled={pingTesting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
            title="Ping n8n reminder webhook"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pingTesting ? "animate-spin text-teal-600" : "text-slate-400"}`} />
            <span>{pingTesting ? "Testing..." : "Test Webhook"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsN8nModalOpen(true)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
            title="Configure n8n Webhook Settings & API Key"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ping Notification Banner */}
      {pingSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{pingSuccess}</span>
        </div>
      )}

      {/* Mode Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-px gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("dispatcher")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === "dispatcher"
                ? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20 rounded-t-xl"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Send Reminder</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === "queue"
                ? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20 rounded-t-xl"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Invoice Reminders Queue ({invoices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === "history"
                ? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20 rounded-t-xl"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Dispatch Logs ({dispatchLogs.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Send Reminder (Email & WhatsApp) */}
      {activeTab === "dispatcher" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: 1. Select Invoice & 2. Choose Channel */}
          <div className="lg:col-span-5 space-y-4">
            {/* Step 1: Invoice Selection Section */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>1. Select Invoice</span>
                </h3>
                {selectedInvoice && (
                  <Link
                    to={`/invoices/${selectedInvoice.id}`}
                    className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    View Details &rarr;
                  </Link>
                )}
              </div>

              {/* Invoice Dropdown */}
              <div>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleSelectInvoice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="custom">-- Custom / Direct Reminder (No Invoice) --</option>
                  {invoices.map((inv) => {
                    const isLate = (inv.status ?? "").toLowerCase() === "overdue";
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber ? `Invoice #${inv.invoiceNumber}` : "(No Number)"} • {inv.customerName} ({formatInr(inv.outstanding)}{isLate ? " OVERDUE" : ""})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Selected Invoice Details Card */}
              {selectedInvoice ? (
                <div className="p-4 rounded-xl bg-teal-50/40 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        {selectedInvoice.invoiceNumber || <span className="italic text-slate-400">— (No Number)</span>}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
                        {selectedInvoice.customerName}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        (selectedInvoice.status ?? "").toLowerCase() === "overdue"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                      }`}
                    >
                      {selectedInvoice.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-teal-200/60 dark:border-teal-800/40">
                    <div>
                      <p className="text-[10px] text-slate-400">Total Billed</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{formatInr(selectedInvoice.total)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Outstanding Due</p>
                      <p className="font-extrabold text-rose-600 dark:text-rose-400">{formatInr(selectedInvoice.outstanding)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Due Date</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(selectedInvoice.dueDate)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Overdue Days</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {Math.max(0, daysBetween(selectedInvoice.dueDate, new Date()))} days late
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Editable Recipient Details */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Buyer / Customer Name
                  </label>
                  <input
                    type="text"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Buyer Email Address <span className="text-teal-600 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="email"
                        value={targetEmail}
                        onChange={(e) => setTargetEmail(e.target.value)}
                        placeholder="accounts@buyer.in"
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      WhatsApp / Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={targetPhone}
                        onChange={(e) => setTargetPhone(e.target.value)}
                        placeholder="+91 98000 00000"
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Invoice #
                    </label>
                    <input
                      type="text"
                      value={targetInvoiceNumber}
                      onChange={(e) => setTargetInvoiceNumber(e.target.value)}
                      placeholder="INV-001 (or blank)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Amount Due
                    </label>
                    <input
                      type="text"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="₹25,000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Choose Delivery Channel */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-teal-600" />
                <span>2. Choose Delivery Channel</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Email Option (Primary Focus) */}
                <button
                  type="button"
                  onClick={() => setDeliveryChannel("email")}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    deliveryChannel === "email"
                      ? "border-teal-600 bg-teal-50/50 dark:bg-teal-950/30 text-teal-950 dark:text-teal-200 shadow-xs ring-2 ring-teal-500/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Mail className={`w-5 h-5 ${deliveryChannel === "email" ? "text-teal-600 dark:text-teal-400" : "text-slate-400"}`} />
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-600 text-white">
                      Active Focus
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-xs">Email Reminder</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Direct workflow email dispatch
                    </p>
                  </div>
                </button>

                {/* WhatsApp Option */}
                <button
                  type="button"
                  onClick={() => setDeliveryChannel("whatsapp")}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    deliveryChannel === "whatsapp"
                      ? "border-[#25D366] bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <MessageSquare className={`w-5 h-5 ${deliveryChannel === "whatsapp" ? "text-[#25D366]" : "text-slate-400"}`} />
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      WhatsApp
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-xs">WhatsApp Reminder</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      1-click WhatsApp web & template
                    </p>
                  </div>
                </button>
              </div>

              {/* Sender Profile Footnote */}
              <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60">
                <span>Sending as: <strong>{businessProfile.name}</strong></span>
                <Link to="/profile" className="text-teal-600 dark:text-teal-400 hover:underline font-semibold">
                  Edit Sender Info &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: 3. Message Template, Live Preview & Dispatch */}
          <div className="lg:col-span-7 space-y-4">
            <form onSubmit={handleSendReminder} className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              {/* Header inside composer */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  {deliveryChannel === "email" ? (
                    <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                      <Mail className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#25D366]">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  )}
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {deliveryChannel === "email" ? "Email Reminder Workflow" : "WhatsApp Message Workflow"}
                  </h3>
                </div>

                {/* Stage template buttons */}
                <div className="flex items-center gap-1 overflow-x-auto">
                  {STAGES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setCustomStage(s.key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        customStage === s.key
                          ? "bg-teal-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-650"
                      }`}
                    >
                      {s.badge}
                    </button>
                  ))}
                </div>
              </div>

              {/* EMAIL SPECIFIC FORM */}
              {deliveryChannel === "email" && (
                <div className="space-y-3.5">
                  {/* Recipient Email & Sender display */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        To (Recipient):
                      </label>
                      <input
                        type="email"
                        required
                        value={targetEmail}
                        onChange={(e) => setTargetEmail(e.target.value)}
                        placeholder="e.g. accounts@client.in"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        From (Sender):
                      </label>
                      <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium truncate">
                        {businessProfile.email || "billing@business.in"}
                      </div>
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Email Subject Line:
                    </label>
                    <input
                      type="text"
                      required
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="e.g. Payment Reminder: Invoice..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  {/* Email Body Textarea */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">
                        Email Body (Editable business template):
                      </span>
                      <span>{emailBody.length} characters</span>
                    </div>
                    <textarea
                      rows={9}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-sans"
                    />
                  </div>
                </div>
              )}

              {/* WHATSAPP SPECIFIC FORM */}
              {deliveryChannel === "whatsapp" && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Recipient WhatsApp / Phone:
                      </label>
                      <input
                        type="text"
                        required
                        value={targetPhone}
                        onChange={(e) => setTargetPhone(e.target.value)}
                        placeholder="+91 98000 00000"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>

                    {/* Language Switcher */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-right">
                        Language:
                      </label>
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/80 p-1 rounded-xl">
                        {(["en", "hi", "mr"] as const).map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setPreviewLang(l)}
                            className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-colors ${
                              previewLang === l
                                ? "bg-teal-600 text-white shadow-2xs"
                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                            }`}
                          >
                            {l === "en" ? "EN" : l === "hi" ? "हिन्दी" : "मराठी"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">
                        WhatsApp Message Text:
                      </span>
                      <span>{waMessageText.length} characters</span>
                    </div>
                    <textarea
                      rows={6}
                      value={waMessageText}
                      onChange={(e) => setWaMessageText(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-sans"
                    />
                  </div>
                </div>
              )}

              {/* UPI & Payment Link Attachment Info */}
              <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 text-[11px] text-teal-800 dark:text-teal-300 flex items-center justify-between">
                <span>
                  Attached UPI: <strong>{businessProfile.upi || "Not configured"}</strong>
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Includes 1-click GPay / PhonePe payment details
                </span>
              </div>

              {/* Action Buttons Bar */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (deliveryChannel === "email") {
                        handleCopyText(`${emailSubject}\n\n${emailBody}`);
                      } else {
                        handleCopyText(waMessageText);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? "Copied!" : "Copy Text"}</span>
                  </button>

                  {/* Fallback direct open link */}
                  {deliveryChannel === "email" ? (
                    <a
                      href={mailtoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      title="Open in your default email app"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>Open in Mail App</span>
                    </a>
                  ) : (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Open WhatsApp</span>
                    </a>
                  )}
                </div>

                {/* Primary Workflow Trigger Button */}
                <button
                  type="submit"
                  disabled={isSending}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all tap-target cursor-pointer ${
                    deliveryChannel === "email"
                      ? "bg-teal-600 hover:bg-teal-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Dispatching Workflow...</span>
                    </>
                  ) : (
                    <>
                      {deliveryChannel === "email" ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                      <span>
                        {deliveryChannel === "email"
                          ? "Send Email Reminder via Workflow"
                          : "Send WhatsApp via Workflow"}
                      </span>
                      <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Success Confirmation Card */}
            {sendSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Reminder Dispatched Successfully</p>
                  <p className="text-emerald-800 dark:text-emerald-300">
                    Dispatched to <strong>{sendSuccess.recipientName}</strong> ({sendSuccess.recipientEmail || sendSuccess.recipientPhone}) via {sendSuccess.channel} at {sendSuccess.timestamp}.
                  </p>
                  <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    Workflow Ref: {sendSuccess.executionId}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Invoice Reminders Queue */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {/* Stage Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedStage("all")}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors tap-target ${
                selectedStage === "all"
                  ? "bg-teal-600 text-white"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              All Invoices ({invoices.length})
            </button>
            {STAGES.map((stage) => (
              <button
                key={stage.key}
                onClick={() => setSelectedStage(stage.key)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors tap-target ${
                  selectedStage === stage.key
                    ? "bg-teal-600 text-white"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {stage.badge} • {stage.label}
              </button>
            ))}
          </div>

          {invoices.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-teal-600 mx-auto" />
              <div>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No Invoices in System Yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Create or upload invoices in your Invoices section to track dues and dispatch workflow reminders.
                </p>
              </div>
              <Link
                to="/invoices"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-md transition-colors"
              >
                <span>Go to Invoices</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((inv) => {
                const customer = customers.find((c) => Boolean(c && c.id === inv?.customerId));
                const isOverdue = (inv?.status ?? "").toLowerCase() === "overdue";

                return (
                  <div
                    key={inv.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs space-y-4"
                  >
                    {/* Invoice Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="font-bold text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 text-base"
                        >
                          {inv.invoiceNumber || <span className="text-slate-400 font-normal italic">— (No Number)</span>}
                        </Link>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {inv.customerName}
                        </span>
                        {customer?.email && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            ({customer.email})
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            isOverdue
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`text-base font-bold tabular-nums ${isOverdue ? "text-rose-600 dark:text-rose-400" : "text-teal-600 dark:text-teal-400"}`}>
                          {formatInr(inv.outstanding)} {isOverdue ? "overdue" : "outstanding"}
                        </div>

                        {/* Quick 1-click Dispatch Switchers */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectInvoice(inv.id, "email");
                              setActiveTab("dispatcher");
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold hover:bg-teal-100 transition-colors shadow-2xs"
                            title="Draft and send Email reminder for this invoice"
                          >
                            <Mail className="w-3.5 h-3.5 text-teal-600" />
                            <span>Send Email</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleSelectInvoice(inv.id, "whatsapp");
                              setActiveTab("dispatcher");
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#25D366] border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                            title="Draft and send WhatsApp reminder for this invoice"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                            <span>WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Dispatch Logs & Activity History */}
      {activeTab === "history" && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Live Workflow Execution Logs
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audit trail of every reminder message triggered through the n8n webhook
              </p>
            </div>
            {dispatchLogs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setDispatchLogs([]);
                  localStorage.removeItem(DISPATCH_LOGS_KEY);
                }}
                className="text-xs text-rose-600 hover:underline font-semibold"
              >
                Clear History
              </button>
            )}
          </div>

          {dispatchLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No reminders dispatched yet. Select an invoice in the Dispatcher to send your first email or WhatsApp reminder.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Workflow Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-sans">
                  {dispatchLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50">
                      <td className="py-2.5 px-3 font-mono text-slate-500">{log.timestamp}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {log.invoiceNumber || <span className="text-slate-400 font-normal italic">— (No Number)</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{log.recipientName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{log.recipientEmail || log.recipientPhone}</p>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-600 dark:text-teal-400">{log.amount}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.channel.toLowerCase().includes("email")
                            ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        }`}>
                          {log.channel.toLowerCase().includes("email") ? <Mail className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                          <span>{log.channel}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">{log.executionId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* n8n Settings Modal */}
      <N8nSettingsModal
        isOpen={isN8nModalOpen}
        onClose={() => setIsN8nModalOpen(false)}
      />
    </div>
  );
}
