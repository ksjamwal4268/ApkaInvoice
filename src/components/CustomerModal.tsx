import React, { useState, useEffect } from "react";
import { X, Building2, User, Phone, Mail, MapPin, ShieldAlert, Award, FileText, Check, Trash2 } from "lucide-react";
import { Customer } from "../data/sampleData";
import { validateGstin, INDIAN_STATES } from "../utils/gstin";
import { useAuth } from "../utils/auth";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Customer) => void;
  onDelete?: (id: string) => void;
  initialCustomer?: Customer | null;
  suggestedName?: string;
  suggestedGstin?: string;
  suggestedState?: string;
  suggestedCity?: string;
}

export function CustomerModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialCustomer,
  suggestedName,
  suggestedGstin,
  suggestedState,
  suggestedCity,
}: CustomerModalProps): React.JSX.Element | null {
  const { user, signInWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isChronicallyLate, setIsChronicallyLate] = useState(false);
  const [grade, setGrade] = useState<"A" | "B" | "C">("B");
  const [paymentCategory, setPaymentCategory] = useState<"green" | "yellow" | "red">("green");
  const [reason, setReason] = useState("");
  const [gstinError, setGstinError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCustomer) {
      setName(initialCustomer.name);
      setCity(initialCustomer.city);
      setState(initialCustomer.state);
      setGstin(initialCustomer.gstin || "");
      setPan(initialCustomer.pan || "");
      setEmail(initialCustomer.email);
      setPhone(initialCustomer.phone);
      setIsChronicallyLate(initialCustomer.isChronicallyLate);
      setGrade(initialCustomer.grade);
      const cat = initialCustomer.paymentCategory || (initialCustomer.grade === "A" ? "green" : initialCustomer.grade === "C" ? "red" : "yellow");
      setPaymentCategory(cat);
      setReason(initialCustomer.gradeReasons?.[0] || "");
    } else {
      setName(suggestedName || "");
      setCity(suggestedCity || "");
      setState(suggestedState || "");
      const initGstin = suggestedGstin || "";
      setGstin(initGstin);
      if (initGstin.length >= 12) {
        setPan(initGstin.substring(2, 12));
      } else {
        setPan("");
      }
      setEmail("");
      setPhone("+91 ");
      setIsChronicallyLate(false);
      setGrade("A");
      setPaymentCategory("green");
      setReason("New buyer registered");
    }
  }, [initialCustomer, suggestedName, suggestedGstin, suggestedState, suggestedCity, isOpen]);

  if (!isOpen) return null;

  const handleGstinChange = (val: string) => {
    const upper = val.toUpperCase().trim();
    setGstin(upper);
    if (upper.length === 15) {
      if (validateGstin(upper)) {
        setGstinError(null);
        // Extract PAN (characters 3-12)
        setPan(upper.substring(2, 12));
      } else {
        setGstinError("Invalid GSTIN format. Must match standard Indian 15-character GST structure.");
      }
    } else if (upper.length > 0 && upper.length < 15) {
      setGstinError("GSTIN must be 15 characters (e.g. 27AABCS1234Q1ZM)");
    } else {
      setGstinError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      signInWithGoogle();
      return;
    }
    if (!name.trim()) {
      alert("Customer / Buyer name is required.");
      return;
    }

    const newCustomer: Customer = {
      id: initialCustomer ? initialCustomer.id : `cust-${Date.now().toString(36)}`,
      name: name.trim(),
      city: city.trim(),
      state: state.trim(),
      gstin: gstin.trim() ? gstin.toUpperCase().trim() : null,
      pan: pan.trim() ? pan.toUpperCase().trim() : null,
      email: email.trim() || "",
      phone: phone.trim() || "",
      isChronicallyLate: paymentCategory === "red" || isChronicallyLate,
      grade: paymentCategory === "green" ? "A" : paymentCategory === "red" ? "C" : "B",
      paymentCategory,
      gradeReasons: [
        paymentCategory === "green"
          ? "Green Marker: Submits payment under 7 days"
          : paymentCategory === "red"
          ? "Red Marker: Takes more than 30 days to pay"
          : "Yellow Marker: Takes more than 7 days to pay",
      ],
    };

    onSave(newCustomer);
    onClose();
  };

  const STATES = INDIAN_STATES.map((s) => s.state);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-850/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {initialCustomer ? "Edit Buyer Information" : "Add New Buyer / Customer"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Maintain contact details, GSTIN, and credit payment discipline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Company / Buyer Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              Company / Buyer Trade Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Industrial Supplies Pvt Ltd"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Buyer GSTIN */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              GSTIN (15 Digits, Optional)
            </label>
            <input
              type="text"
              value={gstin}
              maxLength={15}
              onChange={(e) => handleGstinChange(e.target.value)}
              placeholder="e.g. 07AAAAA0000A1Z5"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 ${
                gstinError
                  ? "border-rose-500 focus:ring-rose-500 bg-rose-50/20"
                  : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-teal-500"
              }`}
            />
            {gstinError ? (
              <p className="text-[11px] text-rose-600 dark:text-rose-400">{gstinError}</p>
            ) : gstin.length === 15 ? (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Valid Indian GSTIN
              </p>
            ) : null}
          </div>

          {/* Contact Details: Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-600" />
                WhatsApp / Phone Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98234 56780"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[10px] text-slate-400">Used for automated 1-click WhatsApp payment reminders</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-teal-600" />
                Billing Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="accounts@buyer.in"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Location: City & State */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. City name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                State (Place of Supply)
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select State</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Discipline Marker: Green, Yellow, Red */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-teal-600" />
                Payment Discipline Marker *
              </span>
              <span className="text-[11px] font-medium text-slate-400">Green, Yellow, or Red</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  cat: "green" as const,
                  grade: "A" as const,
                  title: "Green Client",
                  timing: "Under 7 days",
                  desc: "Submits payment under 7 days",
                  dotBg: "bg-emerald-500",
                  activeBorder: "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 ring-2 ring-emerald-500 text-emerald-950 dark:text-emerald-200",
                },
                {
                  cat: "yellow" as const,
                  grade: "B" as const,
                  title: "Yellow Client",
                  timing: "More than 7 days",
                  desc: "Takes more than 7 days to pay",
                  dotBg: "bg-amber-500",
                  activeBorder: "border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 ring-2 ring-amber-500 text-amber-950 dark:text-amber-200",
                },
                {
                  cat: "red" as const,
                  grade: "C" as const,
                  title: "Red Client",
                  timing: "More than 30 days",
                  desc: "Takes more than 30 days to pay",
                  dotBg: "bg-rose-500",
                  activeBorder: "border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-500 text-rose-950 dark:text-rose-200",
                },
              ].map((item) => (
                <button
                  type="button"
                  key={item.cat}
                  onClick={() => {
                    setPaymentCategory(item.cat);
                    setGrade(item.grade);
                    setIsChronicallyLate(item.cat === "red");
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    paymentCategory === item.cat
                      ? item.activeBorder
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-3 h-3 rounded-full ${item.dotBg} shadow-xs shrink-0`} />
                      <span className="font-extrabold text-xs">{item.title}</span>
                    </div>
                  </div>
                  <div>
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 mb-1">
                      ⏱ {item.timing}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chronic Late Payer Checkbox */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700">
            <input
              type="checkbox"
              id="chronic"
              checked={isChronicallyLate}
              onChange={(e) => setIsChronicallyLate(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
            />
            <label htmlFor="chronic" className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Flag as Chronically Late Payer (Warns on Create Invoice)
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
            {initialCustomer && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ${initialCustomer.name}? This will remove them from your customer list.`)) {
                    onDelete(initialCustomer.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Buyer</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-all"
              >
                {initialCustomer ? "Update Buyer" : "Save Buyer Info"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
