import { useState } from "react";
import { Link } from "react-router-dom";
import { Language } from "../data/i18n";
import { formatInr } from "../utils/money";
import {
  MessageSquare,
  Mail,
  FileWarning,
  CheckCircle,
  ShieldCheck,
  AlertCircle,
  Zap,
  Check,
  Settings,
} from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";
import { sendReminderViaN8n, N8nReminderPayload } from "../data/dataStore";
import { N8nSettingsModal } from "../components/N8nSettingsModal";

type StageKey = "friendly" | "due-date" | "firm" | "demand";

interface Stage {
  key: StageKey;
  label: string;
  badge: string;
  days: string;
}

const STAGES: Stage[] = [
  { key: "friendly", label: "Friendly reminder", badge: "Stage 1", days: "0-3 days overdue" },
  { key: "due-date", label: "Due-date reminder", badge: "Stage 2", days: "4-7 days overdue" },
  { key: "firm", label: "Firm reminder", badge: "Stage 3", days: "8-14 days overdue" },
  { key: "demand", label: "Demand letter", badge: "Stage 4", days: "15+ days overdue" },
];

export function Reminders({ lang: appLang }: { lang: Language }) {
  const { invoices, customers, businessProfile, addInvoiceEvidence } = useDataStore();

  const [selectedStage, setSelectedStage] = useState<StageKey | "all">("all");
  const [previewLang, setPreviewLang] = useState<Language>(appLang || "en");
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [n8nSending, setN8nSending] = useState<Record<string, boolean>>({});
  const [n8nSentResult, setN8nSentResult] = useState<Record<string, string>>({});
  const [isN8nModalOpen, setIsN8nModalOpen] = useState(false);

  const overdueInvoices = invoices.filter(
    (inv) => inv.status === "overdue" && inv.outstanding > 0 && !inv.isDisputed
  );

  const getTemplateText = (stage: StageKey, invNumber: string, custName: string, amount: string, lang: Language) => {
    const bName = businessProfile.name;
    if (lang === "hi") {
      switch (stage) {
        case "friendly":
          return `नमस्ते ${custName}, ${bName} की ओर से सादर प्रणाम। आपका इनवॉइस ${invNumber} (${amount}) का भुगतान देय है। कृपया सुविधा अनुसार भुगतान करें। धन्यवाद।`;
        case "due-date":
          return `प्रिय ${custName}, ${bName} से इनवॉइस ${invNumber} (${amount}) की नियत तिथि निकल चुकी है। कृपया आज ही NEFT/UPI द्वारा भुगतान पूर्ण करें।`;
        case "firm":
          return `अति आवश्यक: ${custName}, इनवॉइस ${invNumber} का बकाया ${amount} कई दिनों से लंबित है। आगे की सामग्री आपूर्ति निर्बाध रखने हेतु कृपया 48 घंटे में भुगतान करें।`;
        case "demand":
          return `अंतिम भुगतान सूचना: ${custName}, इनवॉइस ${invNumber} (${amount}) का भुगतान अतिविलंबित है। कृपया तुरंत खातों का निपटारा करें। औपचारिक मांग पत्र संलग्न है।`;
      }
    } else if (lang === "mr") {
      switch (stage) {
        case "friendly":
          return `नमस्कार ${custName}, ${bName} कडून सस्नेह नमस्कार। आपले इनव्हॉइस ${invNumber} (${amount}) चे पेमेंट देय आहे। कृपया लवकरात लवकर वर्ग करावे। धन्यवाद।`;
        case "due-date":
          return `प्रिय ${custName}, इनव्हॉइस ${invNumber} (${amount}) ची देय तारीख संपली आहे। पुढील सप्लाय सुरू ठेवण्यासाठी कृपया आजच पेमेंट जमा करावे।`;
        case "firm":
          return `तातडीची सूचना: ${custName}, इनव्हॉइस ${invNumber} चे ${amount} अनेक दिवसांपासून थकीत आहे। कृपया पुढील 48 तासांत NEFT/UPI द्वारे खात्यात जमा करावे।`;
        case "demand":
          return `अंतिम मागणी सूचना: ${custName}, इनव्हॉइस ${invNumber} (${amount}) ची रक्कम तातडीने भरावी। अन्यथा अधिकृत कायदेशीर प्रक्रिया सुरू केली जाईल।`;
      }
    } else {
      switch (stage) {
        case "friendly":
          return `Hello ${custName}, greetings from ${bName}! A gentle reminder that invoice ${invNumber} for ${amount} is now due. Please arrange for payment at your earliest convenience.`;
        case "due-date":
          return `Dear ${custName}, payment for invoice ${invNumber} (${amount}) is now overdue. Please clear the outstanding dues via NEFT/UPI (${businessProfile.upi}) today to keep account active.`;
        case "firm":
          return `Urgent Notice: Payment of ${amount} for invoice ${invNumber} is significantly overdue. Please settle within 48 hours to avoid suspension of ongoing deliveries.`;
        case "demand":
          return `Final Payment Demand: Invoice ${invNumber} (${amount}) remains unpaid despite previous reminders. Immediate settlement is requested. Formal demand letter available.`;
      }
    }
  };

  const handleSendViaN8n = async (
    stage: StageKey,
    inv: any,
    cust: any,
    message: string
  ) => {
    const key = `${inv.id}-${stage}`;
    setN8nSending((prev) => ({ ...prev, [key]: true }));

    const payload: N8nReminderPayload = {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      sender: {
        name: businessProfile.name,
        email: businessProfile.email || "accounts@business.com",
        phone: businessProfile.phone || "+91 98765 00000",
        gstin: businessProfile.gstin,
        upi: businessProfile.upi,
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
        upi: businessProfile.upi,
        bankName: businessProfile.bankName,
        bankAccount: businessProfile.bankAccount,
        ifsc: businessProfile.ifsc,
      },
    };

    try {
      const res = await sendReminderViaN8n(payload);
      setN8nSentResult((prev) => ({
        ...prev,
        [key]: `Dispatched (${res.channel})`,
      }));

      // Log evidence in invoice audit timeline
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
      console.error("n8n dispatch failed", err);
    } finally {
      setN8nSending((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Payment Reminders
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            4-stage ladder from polite follow-ups to formal demand notices. Dispatches via n8n, WhatsApp, or Email.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* n8n Webhook Status Pill */}
          <button
            type="button"
            onClick={() => setIsN8nModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-teal-600" />
            <span>n8n Webhook</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          {/* Message Language Selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 px-1.5">Lang:</span>
            {(["en", "hi", "mr"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setPreviewLang(l)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
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
      </div>

      {/* Safety Notice & Guardrail */}
      <div className="p-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/50 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
          <div className="text-xs text-teal-950 dark:text-teal-200">
            <p className="font-bold">Approve-Before-Send Guardrail Active</p>
            <p className="text-teal-800 dark:text-teal-300 mt-0.5 leading-relaxed">
              In accordance with MSME protocol, messages are never triggered silently. Approve each reminder before sending via WhatsApp, Email, or your connected n8n automation workflow.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsN8nModalOpen(true)}
          className="text-xs text-teal-700 dark:text-teal-300 hover:underline font-semibold shrink-0 hidden md:inline-flex items-center gap-1"
        >
          <Settings className="w-3.5 h-3.5" />
          Configure n8n
        </button>
      </div>

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
          All Stages ({overdueInvoices.length} Overdue)
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

      {/* Invoices List */}
      {overdueInvoices.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
          <CheckCircle className="w-10 h-10 text-teal-600 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-800 dark:text-slate-200">
            All invoices are settled or within terms!
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            No overdue invoices requiring buyer payment reminders today.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {overdueInvoices.map((inv) => {
            const customer = customers.find((c) => c.id === inv.customerId);

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
                    <Link
                      to={`/customers/${inv.customerId}`}
                      className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:underline"
                    >
                      {inv.customerName}
                    </Link>
                    {customer?.phone && (
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        ({customer.phone})
                      </span>
                    )}
                    {customer?.isChronicallyLate && (
                      <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 px-2 py-0.5 rounded">
                        Chronically Late
                      </span>
                    )}
                  </div>
                  <div className="text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {formatInr(inv.outstanding)} overdue
                  </div>
                </div>

                {/* Reminder Stages Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {STAGES.filter((s) => selectedStage === "all" || s.key === selectedStage).map((stage) => {
                    const key = `${inv.id}-${stage.key}`;
                    const isApproved = Boolean(approved[key]);
                    const isSendingN8n = Boolean(n8nSending[key]);
                    const n8nResult = n8nSentResult[key];
                    const amountStr = formatInr(inv.outstanding);
                    const message = getTemplateText(stage.key, inv.invoiceNumber, inv.customerName, amountStr, previewLang);
                    const phoneClean = customer?.phone?.replace(/\D/g, "") || "919876543210";
                    const waUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(message)}`;
                    const mailUrl = `mailto:${customer?.email || ""}?subject=${encodeURIComponent(`Payment reminder: Invoice ${inv.invoiceNumber}`)}&body=${encodeURIComponent(message)}`;

                    return (
                      <div
                        key={stage.key}
                        className={`p-4 rounded-xl border transition-all ${
                          isApproved
                            ? "border-teal-300 dark:border-teal-700 bg-teal-50/20 dark:bg-teal-950/10"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40"
                        }`}
                      >
                        {/* Stage Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {stage.badge} • {stage.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => setApproved((prev) => ({ ...prev, [key]: !isApproved }))}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors tap-target ${
                              isApproved
                                ? "bg-teal-600 text-white"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-teal-600 hover:text-white"
                            }`}
                          >
                            {isApproved ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Approved</span>
                              </>
                            ) : (
                              <span>Approve to send</span>
                            )}
                          </button>
                        </div>

                        {/* Message Preview Box */}
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-850 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700/80 min-h-18">
                          {message}
                        </p>

                        {/* Dispatch Result Feedback */}
                        {n8nResult && (
                          <div className="mt-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{n8nResult}</span>
                          </div>
                        )}

                        {/* Dispatch Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-1">
                          {isApproved ? (
                            <>
                              {/* n8n Automation Webhook Button */}
                              <button
                                type="button"
                                onClick={() => handleSendViaN8n(stage.key, inv, customer, message)}
                                disabled={isSendingN8n}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs tap-target"
                              >
                                {isSendingN8n ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                                )}
                                <span>{isSendingN8n ? "Sending..." : "Send Automated Reminder"}</span>
                              </button>

                              {/* Direct WhatsApp Button */}
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-xs font-bold hover:opacity-90 shadow-2xs tap-target"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>

                              {/* Direct Email Draft Button */}
                              <a
                                href={mailUrl}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white dark:bg-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-900 tap-target"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Email Draft</span>
                              </a>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Approve above to enable sending
                            </span>
                          )}

                          {stage.key === "demand" && (
                            <Link
                              to={`/demand-letter?invoice=${inv.id}`}
                              className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold ml-auto tap-target"
                            >
                              <FileWarning className="w-3.5 h-3.5" />
                              <span>Formal Letter</span>
                            </Link>
                          )}
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

      {/* n8n Settings Modal */}
      <N8nSettingsModal
        isOpen={isN8nModalOpen}
        onClose={() => setIsN8nModalOpen(false)}
      />
    </div>
  );
}
