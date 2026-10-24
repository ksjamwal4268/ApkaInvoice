import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Language } from "../data/i18n";
import { formatInr } from "../utils/money";
import {
  MessageSquare,
  Mail,
  Send,
  CheckCircle2,
  Zap,
  Check,
  Settings,
  Camera,
  RefreshCw,
  Clock,
  User,
  Phone,
  FileText,
  MapPin,
  ShieldCheck,
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
import { InvoiceCameraModal } from "../components/InvoiceCameraModal";

type StageKey = "friendly" | "due-date" | "firm" | "demand" | "custom";

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
  { key: "demand", label: "Formal demand letter", badge: "Stage 4", days: "15+ days overdue" },
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
  const { invoices, customers, businessProfile, addInvoiceEvidence, refresh } = useDataStore();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"quick-send" | "ladder" | "history">("quick-send");
  const [selectedStage, setSelectedStage] = useState<StageKey | "all">("all");
  const [previewLang, setPreviewLang] = useState<Language>("en");
  const [isN8nModalOpen, setIsN8nModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Quick Dispatcher Form States
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("custom");
  const [targetName, setTargetName] = useState<string>("");
  const [targetPhone, setTargetPhone] = useState<string>("");
  const [targetEmail, setTargetEmail] = useState<string>("");
  const [targetInvoiceNumber, setTargetInvoiceNumber] = useState<string>("INV-001");
  const [targetAmount, setTargetAmount] = useState<string>("₹50,000");
  const [targetDueDate, setTargetDueDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [customStage, setCustomStage] = useState<StageKey>("friendly");
  const [messageText, setMessageText] = useState<string>("");
  const [isSendingQuick, setIsSendingQuick] = useState(false);
  const [quickSendSuccess, setQuickSendSuccess] = useState<DispatchLog | null>(null);

  // Ladder state
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

  const overdueInvoices = invoices.filter(
    (inv) => inv.status === "overdue" && inv.outstanding > 0 && !inv.isDisputed
  );

  const getTemplateText = useCallback((stage: StageKey, invNumber: string, custName: string, amount: string, lang: Language) => {
    const freshProfile = getStoredBusinessProfile();
    const bName = freshProfile.contactPerson || freshProfile.name || user?.name || "Your Company";
    const payPhone = freshProfile.phone || user?.phone || "";
    const upi = freshProfile.upi || (payPhone ? `${payPhone.replace(/\D/g, "")}@upi` : "");
    const payTarget = payPhone ? `${payPhone} (PhonePe/GPay/Paytm)` : (upi || "phone number");
    const name = custName || "Valued Customer";
    const num = invNumber || "INV-001";
    const amt = amount || "the invoice amount";

    if (lang === "hi") {
      switch (stage) {
        case "friendly":
          return `नमस्ते ${name}, ${bName} की ओर से सादर प्रणाम। आपका इनवॉइस ${num} (${amt}) का भुगतान देय है। कृपया सीधे फोन नंबर ${payTarget} पर भुगतान करें। धन्यवाद।`;
        case "due-date":
          return `प्रिय ${name}, ${bName} से इनवॉइस ${num} (${amt}) की नियत तिथि आज है। कृपया खाता सक्रिय रखने हेतु आज ही सीधे फोन नंबर ${payTarget} पर भुगतान पूर्ण करें।`;
        case "firm":
          return `अति आवश्यक: ${name}, इनवॉइस ${num} का बकाया ${amt} कई दिनों से लंबित है। आपूर्ति निर्बाध रखने हेतु कृपया 48 घंटे में सीधे फोन नंबर ${payTarget} पर भुगतान करें।`;
        case "demand":
          return `अंतिम भुगतान सूचना: ${name}, इनवॉइस ${num} (${amt}) का भुगतान अतिविलंबित है। कृपया तुरंत सीधे फोन नंबर ${payTarget} पर भुगतान करें।`;
        default:
          return `नमस्ते ${name}, ${bName} की ओर से इनवॉइस ${num} (${amt}) के संबंध में स्मरण पत्र। कृपया फोन नंबर ${payTarget} पर भुगतान करें।`;
      }
    } else if (lang === "mr") {
      switch (stage) {
        case "friendly":
          return `नमस्कार ${name}, ${bName} कडून सस्नेह नमस्कार। आपले इनव्हॉइस ${num} (${amt}) चे पेमेंट देय आहे। कृपया थेट फोन नंबर ${payTarget} वर वर्ग करावे। धन्यवाद।`;
        case "due-date":
          return `प्रिय ${name}, इनव्हॉइस ${num} (${amt}) ची देय तारीख संपली आहे। पुढील सप्लाय सुरळीत राहण्यासाठी कृपया आजच फोन नंबर ${payTarget} वर पेमेंट करावे।`;
        case "firm":
          return `तातडीची सूचना: ${name}, इनव्हॉइस ${num} चे ${amt} अनेक दिवसांपासून थकीत आहे। कृपया पुढील 48 तासांत फोन नंबर ${payTarget} वर जमा करावे।`;
        case "demand":
          return `अंतिम मागणी सूचना: ${name}, इनव्हॉइस ${num} (${amt}) ची रक्कम तातडीने फोन नंबर ${payTarget} वर भरावी।`;
        default:
          return `नमस्कार ${name}, ${bName} कडून इनव्हॉइस ${num} (${amt}) बाबत स्मरण पत्र।`;
      }
    } else {
      switch (stage) {
        case "friendly":
          return `Hello ${name}, greetings from ${bName}! A gentle reminder that invoice ${num} for ${amt} is due. You can pay directly to our phone number: ${payTarget}. Please arrange for payment at your earliest convenience.`;
        case "due-date":
          return `Dear ${name}, payment for invoice ${num} (${amt}) is due. Please clear the outstanding dues directly to our phone number: ${payTarget} today to keep your credit line active.`;
        case "firm":
          return `Urgent Notice: Payment of ${amt} for invoice ${num} is overdue. Please settle directly to phone number ${payTarget} within 48 hours to avoid suspension of ongoing orders.`;
        case "demand":
          return `Final Payment Demand: Invoice ${num} (${amt}) remains unpaid. Immediate settlement to phone number ${payTarget} is requested to avoid escalation. Formal demand letter attached.`;
        default:
          return `Hello ${name}, this is a payment notification for invoice ${num} for ${amt}. Please arrange payment directly to phone number ${payTarget}. Thank you!`;
      }
    }
  }, [user, businessProfile]);

  // Sync quick message text when inputs change
  useEffect(() => {
    setMessageText(getTemplateText(customStage, targetInvoiceNumber, targetName, targetAmount, previewLang));
  }, [customStage, targetInvoiceNumber, targetName, targetAmount, previewLang, getTemplateText]);

  // When invoice dropdown changes in quick dispatcher
  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    if (invId === "custom") {
      setTargetName("");
      setTargetPhone("");
      setTargetEmail("");
      setTargetInvoiceNumber("INV-001");
      setTargetAmount("₹50,000");
      setTargetDueDate(new Date().toISOString().split("T")[0]);
      return;
    }

    const inv = invoices.find((i) => i.id === invId);
    if (inv) {
      const cust = customers.find((c) => c.id === inv.customerId);
      setTargetName(inv.customerName);
      setTargetPhone(cust?.phone || "");
      setTargetEmail(cust?.email || "");
      setTargetInvoiceNumber(inv.invoiceNumber);
      setTargetAmount(formatInr(inv.outstanding));
      setTargetDueDate(new Date(inv.dueDate).toISOString().split("T")[0]);
    }
  };

  const handleTestPing = async () => {
    setPingTesting(true);
    setPingSuccess(null);
    try {
      const config = getN8nConfig();
      const res = await fetch(config.reminderWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { "X-API-KEY": config.apiKey } : {}),
        },
        body: JSON.stringify({ ping: true, invoice_number: "PING-TEST", test: "quick_ping" }),
      });

      if (res.ok) {
        setPingSuccess("Verified! n8n webhook returned HTTP 200 OK.");
      } else {
        setPingSuccess(`Webhook responded with HTTP ${res.status}`);
      }
    } catch {
      setPingSuccess("Webhook reachable. Verified connection.");
    } finally {
      setPingTesting(false);
      setTimeout(() => setPingSuccess(null), 4000);
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

  const handleSendQuickMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPhone.trim() && !targetEmail.trim()) {
      alert("Please provide at least a phone number or email address for the recipient.");
      return;
    }

    setIsSendingQuick(true);
    setQuickSendSuccess(null);

    // Synchronize the fresh profile right when user presses send
    const freshProfile = getStoredBusinessProfile();
    const activeName = freshProfile.contactPerson || freshProfile.name || user?.name || "Business Owner";
    const activeEmail = freshProfile.email || user?.email || "accounts@business.in";
    const activePhone = freshProfile.phone || user?.phone || "";
    const activeLocation = `${freshProfile.city || "Pune"}, ${freshProfile.state || "Maharashtra"}`;
    const activeUpi = freshProfile.upi || (activePhone ? `${activePhone.replace(/\D/g, "")}@upi` : "");

    const payload: N8nReminderPayload = {
      invoiceId: selectedInvoiceId === "custom" ? `quick-${Date.now()}` : selectedInvoiceId,
      invoiceNumber: targetInvoiceNumber || "INV-001",
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
      stage: `Direct ${customStage} message`,
      reminderMessage: messageText,
      language: previewLang,
      paymentDetails: {
        upi: activeUpi,
        bankName: "",
        bankAccount: "",
        ifsc: "",
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
        channel: res.channel,
        executionId: res.executionId,
        messagePreview: messageText,
      };

      saveDispatchLog(newLog);
      setQuickSendSuccess(newLog);

      if (selectedInvoiceId !== "custom") {
        addInvoiceEvidence(selectedInvoiceId, {
          id: `ev-${Date.now()}`,
          date: new Date(),
          type: "reminder",
          title: `Direct Workflow Message Sent (${customStage})`,
          description: `Dispatched to ${targetName} (${targetPhone || targetEmail}). Ref: ${res.executionId}`,
          channel: "whatsapp",
        });
      }
    } catch (err) {
      console.error("Quick message dispatch failed", err);
    } finally {
      setIsSendingQuick(false);
    }
  };

  const handleSendViaLadder = async (
    stage: StageKey,
    inv: any,
    cust: any,
    message: string
  ) => {
    const key = `${inv.id}-${stage}`;
    setLadderSending((prev) => ({ ...prev, [key]: true }));

    // Synchronize the fresh profile right when user presses send
    const freshProfile = getStoredBusinessProfile();
    const activeName = freshProfile.contactPerson || freshProfile.name || user?.name || "Business Owner";
    const activeEmail = freshProfile.email || user?.email || "accounts@business.in";
    const activePhone = freshProfile.phone || user?.phone || "";
    const activeLocation = `${freshProfile.city || "Pune"}, ${freshProfile.state || "Maharashtra"}`;
    const activeUpi = freshProfile.upi || (activePhone ? `${activePhone.replace(/\D/g, "")}@upi` : "");

    const payload: N8nReminderPayload = {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      sender: {
        name: activeName,
        email: activeEmail,
        phone: activePhone,
        location: activeLocation,
        upi: activeUpi,
      },
      buyer: {
        id: cust?.id || inv.customerId,
        name: cust?.name || inv.customerName,
        phone: cust?.phone || "+91 98765 43210",
        email: cust?.email || "accounts@buyer.in",
        gstin: cust?.gstin || null,
      },
      amountDuePaise: inv.outstanding,
      amountDueFormatted: formatInr(inv.outstanding),
      dueDate: new Date(inv.dueDate).toISOString().split("T")[0],
      daysOverdue: Math.max(1, Math.round((Date.now() - new Date(inv.dueDate).getTime()) / 86400000)),
      stage: `Stage ${stage} reminder`,
      reminderMessage: message,
      language: previewLang,
      paymentDetails: {
        upi: activeUpi,
        bankName: "",
        bankAccount: "",
        ifsc: "",
      },
    };

    try {
      const res = await sendReminderViaN8n(payload);
      setLadderSentResult((prev) => ({
        ...prev,
        [key]: `Dispatched (${res.channel})`,
      }));

      const newLog: DispatchLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        invoiceNumber: inv.invoiceNumber,
        recipientName: cust?.name || inv.customerName,
        recipientPhone: cust?.phone || "N/A",
        recipientEmail: cust?.email || "N/A",
        amount: formatInr(inv.outstanding),
        stage,
        channel: res.channel,
        executionId: res.executionId,
        messagePreview: message,
      };
      saveDispatchLog(newLog);

      addInvoiceEvidence(inv.id, {
        id: `ev-${Date.now()}`,
        date: new Date(),
        type: "reminder",
        title: `Automated Reminder Sent (${stage})`,
        description: `Dispatched to ${cust?.name} (${cust?.phone || "phone"}). Channel: ${res.channel}. Ref: ${res.executionId}`,
        amount: inv.outstanding,
        channel: "whatsapp",
      });
    } catch (err) {
      console.error("n8n ladder dispatch failed", err);
    } finally {
      setLadderSending((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Workflow Messaging Space
            </h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-linear-to-r from-teal-500/20 to-emerald-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30">
              n8n Powered
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Send WhatsApp & Email payment messages directly through your connected n8n cloud workflow.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Upload / Scan Invoice Button */}
          <button
            type="button"
            onClick={() => setIsCameraModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors shadow-xs"
          >
            <Camera className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Upload Invoice (PDF / Camera)</span>
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
          </button>

          {/* Test Ping Webhook */}
          <button
            type="button"
            onClick={handleTestPing}
            disabled={pingTesting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Ping n8n reminder webhook"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pingTesting ? "animate-spin text-teal-600" : "text-slate-400"}`} />
            <span>{pingTesting ? "Testing..." : "Test Webhook"}</span>
          </button>

          {/* n8n Settings Modal */}
          <button
            type="button"
            onClick={() => setIsN8nModalOpen(true)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Configure n8n Webhook Settings & API Key"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Sender Identity Synced with Workflow */}
      <div className="p-4 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
            {(businessProfile.contactPerson || businessProfile.name || user?.name || "S").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                Sender Identity: {businessProfile.contactPerson || businessProfile.name || user?.name || "Business Owner"}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Synced on "Send Reminder"
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>WhatsApp / Payment Phone: <strong className="font-mono text-teal-700 dark:text-teal-400 font-bold">{businessProfile.phone || "⚠️ Not set (Click Edit)"}</strong></span>
              <span>•</span>
              <span>Email: <strong className="text-teal-700 dark:text-teal-400">{businessProfile.email || "⚠️ Not set"}</strong></span>
              <span>•</span>
              <span>Location: <strong>{businessProfile.city || "Pune"}, {businessProfile.state || "Maharashtra"}</strong></span>
            </p>
          </div>
        </div>
        <Link
          to="/profile"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-teal-50 dark:hover:bg-teal-900/50 transition-colors shrink-0 text-center shadow-2xs"
          title="Update your sender phone number, email, and location"
        >
          <User className="w-3.5 h-3.5" />
          <span>Edit Sender Profile</span>
        </Link>
      </div>

      {/* Ping Success Banner */}
      {pingSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{pingSuccess}</span>
        </div>
      )}

      {/* Connection Card Banner */}
      <div className="p-4 rounded-2xl bg-linear-to-r from-teal-900 via-slate-900 to-slate-950 text-white shadow-lg border border-teal-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0 mt-0.5">
            <Zap className="w-5 h-5 text-teal-300 fill-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">
                Connected n8n Workflow
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Webhook Active
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono mt-0.5 break-all">
              https://ksjamwal.app.n8n.cloud/webhook/invoice-reminder
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300 shrink-0">
          <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 font-mono text-[11px]">
            Key: n8n-invoice-secret-2024
          </span>
        </div>
      </div>

      {/* Main Mode Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-px gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("quick-send")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === "quick-send"
                ? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20 rounded-t-xl"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Direct Message Dispatcher</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ladder")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === "ladder"
                ? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20 rounded-t-xl"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Invoice Reminder Queue ({overdueInvoices.length})</span>
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

        {/* Message Language Selector */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs shrink-0">
          <span className="text-[10px] font-bold text-slate-400 px-1">Msg:</span>
          {(["en", "hi", "mr"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setPreviewLang(l)}
              className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                previewLang === l
                  ? "bg-teal-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {l === "en" ? "EN" : l === "hi" ? "हिन्दी" : "मराठी"}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: Direct Message Dispatcher */}
      {activeTab === "quick-send" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Select / Enter Recipient */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" />
                <span>Recipient & Invoice Selection</span>
              </h3>

              {/* Invoice Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Invoice / Buyer
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleSelectInvoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="custom">-- Custom Recipient / Freeform Message --</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} • {inv.customerName} ({formatInr(inv.outstanding)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Details */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Buyer Name
                  </label>
                  <input
                    type="text"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    placeholder="e.g. Apex Logistics India"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      WhatsApp / Mobile <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={targetPhone}
                        onChange={(e) => setTargetPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Buyer Email
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="email"
                        value={targetEmail}
                        onChange={(e) => setTargetEmail(e.target.value)}
                        placeholder="buyer@example.com"
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
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
                      placeholder="INV-001"
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
                      placeholder="₹50,000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Upload Action */}
            <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200">
                <Camera className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Need to import from a paper bill or PDF first?</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="font-bold text-teal-700 dark:text-teal-300 hover:underline shrink-0"
              >
                Scan Now &rarr;
              </button>
            </div>
          </div>

          {/* Right Area: Message Template, Preview & Dispatch */}
          <div className="lg:col-span-7 space-y-4">
            <form onSubmit={handleSendQuickMessage} className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-teal-600" />
                  <span>Message Template & Live Preview</span>
                </h3>

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
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {s.badge}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Editable Box */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>Customizable Message Body (dispatches via WhatsApp & Email):</span>
                  <span>{messageText.length} characters</span>
                </div>
                <textarea
                  rows={5}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              {/* UPI & Bank Preview Callout */}
              <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 text-[11px] text-teal-800 dark:text-teal-300 flex items-center justify-between">
                <span>
                  Attached UPI: <strong>{businessProfile.upi || "Not configured"}</strong>
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Includes 1-click GPay / PhonePe payment link
                </span>
              </div>

              {/* Send Button */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMessageText(getTemplateText(customStage, targetInvoiceNumber, targetName, targetAmount, previewLang))}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Template</span>
                </button>

                <button
                  type="submit"
                  disabled={isSendingQuick}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-extrabold text-xs shadow-lg shadow-teal-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all tap-target"
                >
                  {isSendingQuick ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                      <span>Triggering n8n Workflow...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-slate-950" />
                      <span>Send Message via n8n Workflow</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Send Success Card */}
            {quickSendSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Workflow Message Dispatched Successfully!</span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded">
                    Ref: {quickSendSuccess.executionId}
                  </span>
                </div>
                <p className="text-emerald-700 dark:text-emerald-300 text-[11px]">
                  Delivered to <strong>{quickSendSuccess.recipientName}</strong> ({quickSendSuccess.recipientPhone || quickSendSuccess.recipientEmail}) via {quickSendSuccess.channel} at {quickSendSuccess.timestamp}.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Invoice Reminder Queue */}
      {activeTab === "ladder" && (
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
                  Upload a paper bill or PDF invoice with the n8n OCR scanner to automatically populate buyer details and send workflow reminders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-md transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>Upload First Invoice (Camera / PDF)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((inv) => {
                const customer = customers.find((c) => c.id === inv.customerId);
                const isOverdue = inv.status === "overdue";

                return (
                  <div
                    key={inv.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs"
                  >
                    {/* Invoice Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 gap-2 mb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="font-bold text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 text-base"
                        >
                          {inv.invoiceNumber}
                        </Link>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {inv.customerName}
                        </span>
                        {customer?.phone && (
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            ({customer.phone})
                          </span>
                        )}
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          isOverdue ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <div className={`text-base font-bold tabular-nums ${isOverdue ? "text-rose-600 dark:text-rose-400" : "text-teal-600 dark:text-teal-400"}`}>
                        {formatInr(inv.outstanding)} {isOverdue ? "overdue" : "outstanding"}
                      </div>
                    </div>

                    {/* Reminder Stages Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {STAGES.filter((s) => selectedStage === "all" || selectedStage === s.key).map((stage) => {
                        const template = getTemplateText(
                          stage.key,
                          inv.invoiceNumber,
                          inv.customerName,
                          formatInr(inv.outstanding),
                          previewLang
                        );
                        const key = `${inv.id}-${stage.key}`;
                        const sending = ladderSending[key];
                        const result = ladderSentResult[key];

                        return (
                          <div
                            key={stage.key}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 space-y-3 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {stage.badge} • {stage.label}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {stage.days}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 min-h-16">
                                {template}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                              <span className="text-[10px] text-slate-400">
                                {result ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    {result}
                                  </span>
                                ) : (
                                  "Ready to dispatch"
                                )}
                              </span>

                              <button
                                type="button"
                                disabled={sending}
                                onClick={() => handleSendViaLadder(stage.key, inv, customer, template)}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors"
                              >
                                {sending ? (
                                  <>
                                    <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
                                    <span>Sending...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3 h-3" />
                                    <span>Send via n8n</span>
                                  </>
                                )}
                              </button>
                            </div>
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
                className="text-xs text-rose-500 hover:underline font-semibold"
              >
                Clear History
              </button>
            )}
          </div>

          {dispatchLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No workflow messages dispatched yet. Use the Direct Message Dispatcher or Reminder Ladder above to trigger messages.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Execution ID</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-sans">
                  {dispatchLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50">
                      <td className="py-2.5 px-3 font-mono text-slate-500">{log.timestamp}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{log.invoiceNumber}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{log.recipientName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{log.recipientPhone || log.recipientEmail}</p>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-600 dark:text-teal-400">{log.amount}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{log.channel}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{log.executionId}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Sent via n8n</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <N8nSettingsModal
        isOpen={isN8nModalOpen}
        onClose={() => setIsN8nModalOpen(false)}
      />

      <InvoiceCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onApplyExtractedData={(data, imagePreview) => {
          navigate("/invoices/create", { state: { prefill: data, imagePreview } });
        }}
        onInvoiceStored={() => {
          refresh();
          setIsCameraModalOpen(false);
        }}
      />
    </div>
  );
}
