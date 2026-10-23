import { useState } from "react";
import { Link } from "react-router-dom";
import { INVOICES, getCustomer } from "../data/sampleData";
import { Language } from "../data/i18n";
import { formatInr } from "../utils/money";
import { MessageSquare, Mail, FileWarning, CheckCircle, ShieldCheck, AlertCircle } from "lucide-react";

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
  const [selectedStage, setSelectedStage] = useState<StageKey | "all">("all");
  const [previewLang, setPreviewLang] = useState<Language>(appLang || "en");
  const [approved, setApproved] = useState<Record<string, boolean>>({});

  const overdueInvoices = INVOICES.filter(
    (inv) => inv.status === "overdue" && inv.outstanding > 0 && !inv.isDisputed
  );

  const getTemplateText = (stage: StageKey, invNumber: string, custName: string, amount: string, lang: Language) => {
    if (lang === "hi") {
      switch (stage) {
        case "friendly":
          return `नमस्ते ${custName}, शर्मा पैकेजिंग की ओर से सादर प्रणाम। आपका इनवॉइस ${invNumber} (${amount}) का भुगतान देय है। कृपया सुविधा अनुसार भुगतान करें। धन्यवाद।`;
        case "due-date":
          return `प्रिय ${custName}, शर्मा पैकेजिंग से इनवॉइस ${invNumber} (${amount}) की नियत तिथि निकल चुकी है। कृपया आज ही NEFT/UPI द्वारा भुगतान पूर्ण करें।`;
        case "firm":
          return `अति आवश्यक: ${custName}, इनवॉइस ${invNumber} का बकाया ${amount} कई दिनों से लंबित है। आगे की सामग्री आपूर्ति निर्बाध रखने हेतु कृपया 48 घंटे में भुगतान करें।`;
        case "demand":
          return `अंतिम भुगतान सूचना: ${custName}, इनवॉइस ${invNumber} (${amount}) का भुगतान अतिविलंबित है। कृपया तुरंत खातों का निपटारा करें। औपचारिक मांग पत्र संलग्न है।`;
      }
    } else if (lang === "mr") {
      switch (stage) {
        case "friendly":
          return `नमस्कार ${custName}, शर्मा पॅकेजिंगकडून सस्नेह नमस्कार। आपले इनव्हॉइस ${invNumber} (${amount}) चे पेमेंट देय आहे। कृपया लवकरात लवकर वर्ग करावे। धन्यवाद।`;
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
          return `Hello ${custName}, greetings from Sharma Packaging! A gentle reminder that invoice ${invNumber} for ${amount} is now due. Please arrange for payment at your earliest convenience.`;
        case "due-date":
          return `Dear ${custName}, payment for invoice ${invNumber} (${amount}) is now overdue. Please clear the outstanding dues via NEFT/UPI today to keep account active.`;
        case "firm":
          return `Urgent Notice: Payment of ${amount} for invoice ${invNumber} is significantly overdue. Please settle within 48 hours to avoid suspension of ongoing packaging deliveries.`;
        case "demand":
          return `Final Payment Demand: Invoice ${invNumber} (${amount}) remains unpaid despite previous reminders. Immediate settlement is requested. Formal demand letter available.`;
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Payment Reminders
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            4-stage ladder from polite follow-ups to formal demand notices. Review and approve before sending.
          </p>
        </div>

        {/* Message Language Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs self-start sm:self-auto">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2">Template Language:</span>
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

      {/* Safety Notice */}
      <div className="p-4 rounded-lg bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/50 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-900 dark:text-teal-200">
          <p className="font-semibold">Safety Guardrail Active</p>
          <p className="text-teal-700 dark:text-teal-400 mt-0.5">
            Messages are never sent automatically. You must approve each reminder before the WhatsApp or Email button opens a draft.
          </p>
        </div>
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
          All Stages
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

      {overdueInvoices.length === 0 ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
          <CheckCircle className="w-8 h-8 text-teal-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">All invoices are up to date!</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No overdue invoices requiring reminders today.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {overdueInvoices.map((inv) => {
            const customer = getCustomer(inv.customerId);
            return (
              <div
                key={inv.id}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="font-bold text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 text-base"
                    >
                      {inv.invoiceNumber}
                    </Link>
                    <span className="text-xs text-slate-500 dark:text-slate-400">•</span>
                    <Link
                      to={`/customers/${inv.customerId}`}
                      className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:underline"
                    >
                      {inv.customerName}
                    </Link>
                    {customer?.isChronicallyLate && (
                      <span className="text-[10px] font-bold uppercase bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 px-2 py-0.5 rounded">
                        Chronically Late
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">
                    {formatInr(inv.outstanding)} overdue
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {STAGES.filter((s) => selectedStage === "all" || s.key === selectedStage).map((stage) => {
                    const key = `${inv.id}-${stage.key}`;
                    const isApproved = Boolean(approved[key]);
                    const amountStr = formatInr(inv.outstanding);
                    const message = getTemplateText(stage.key, inv.invoiceNumber, inv.customerName, amountStr, previewLang);
                    const phoneClean = customer?.phone?.replace(/\D/g, "") || "919876543210";
                    const waUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(message)}`;
                    const mailUrl = `mailto:${customer?.email || ""}?subject=${encodeURIComponent(`Payment reminder: Invoice ${inv.invoiceNumber}`)}&body=${encodeURIComponent(message)}`;

                    return (
                      <div
                        key={stage.key}
                        className={`p-4 rounded-lg border transition-all ${
                          isApproved
                            ? "border-teal-300 dark:border-teal-700 bg-teal-50/30 dark:bg-teal-950/10"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {stage.badge} • {stage.label}
                            </span>
                          </div>
                          <button
                            onClick={() => setApproved((prev) => ({ ...prev, [key]: !isApproved }))}
                            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors tap-target ${
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

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800 p-2.5 rounded border border-slate-200/80 dark:border-slate-700/80 min-h-16">
                          {message}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {isApproved ? (
                            <>
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white rounded text-xs font-semibold hover:opacity-90 shadow-2xs tap-target"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Send WhatsApp</span>
                              </a>
                              <a
                                href={mailUrl}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white dark:bg-slate-700 rounded text-xs font-semibold hover:bg-slate-900 tap-target"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Email Draft</span>
                              </a>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Approve to enable send links
                            </span>
                          )}

                          {stage.key === "demand" && (
                            <Link
                              to={`/demand-letter?invoice=${inv.id}`}
                              className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline font-semibold ml-auto tap-target"
                            >
                              <FileWarning className="w-3.5 h-3.5" />
                              <span>Open Formal Letter</span>
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
    </div>
  );
}
