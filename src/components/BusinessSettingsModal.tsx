import React, { useState } from "react";
import {
  X,
  Building2,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  QrCode,
  FileText,
  Check,
  Trash2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  BusinessProfile,
  getStoredBusinessProfile,
  saveBusinessProfile,
  clearAllData,
} from "../data/dataStore";
import { validateGstin } from "../utils/gstin";

interface BusinessSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BusinessSettingsModal({
  isOpen,
  onClose,
}: BusinessSettingsModalProps): React.JSX.Element | null {
  const [profile, setProfile] = useState<BusinessProfile>(getStoredBusinessProfile);
  const [gstinError, setGstinError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  if (!isOpen) return null;

  const handleGstinChange = (val: string) => {
    const upper = val.toUpperCase().trim();
    setProfile({ ...profile, gstin: upper });
    if (upper.length === 15) {
      if (validateGstin(upper)) {
        setGstinError(null);
      } else {
        setGstinError("Invalid Indian GSTIN structure (15 characters).");
      }
    } else if (upper.length > 0) {
      setGstinError("GSTIN must be 15 characters (e.g. 27AABCS1234Q1ZM)");
    } else {
      setGstinError(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name.trim()) {
      alert("Business Name is required.");
      return;
    }
    saveBusinessProfile(profile);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleClearAllFakeData = () => {
    clearAllData();
    setClearConfirm(false);
    onClose();
  };

  const STATES = [
    "Maharashtra",
    "Delhi",
    "Karnataka",
    "Gujarat",
    "Tamil Nadu",
    "West Bengal",
    "Telangana",
    "Uttar Pradesh",
    "Haryana",
    "Rajasthan",
    "Madhya Pradesh",
    "Punjab",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-850/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Business Profile & Banking Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure your real business details, GSTIN, and UPI ID for customer invoices and reminders
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
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Business Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              Your Real Business / Trade Name *
            </label>
            <input
              type="text"
              required
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="e.g. Apex Industries, Bharat Solutions, etc."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* GSTIN & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                Your GSTIN (15 Digits)
              </label>
              <input
                type="text"
                value={profile.gstin}
                maxLength={15}
                onChange={(e) => handleGstinChange(e.target.value)}
                placeholder="27AABCS1234Q1ZM"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono uppercase focus:outline-none focus:ring-2 ${
                  gstinError
                    ? "border-rose-500 bg-rose-50/20 focus:ring-rose-500"
                    : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-teal-500"
                }`}
              />
              {gstinError ? (
                <p className="text-[11px] text-rose-500">{gstinError}</p>
              ) : profile.gstin.length === 15 ? (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Valid Indian GSTIN
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                State (Home State)
              </label>
              <select
                value={profile.state}
                onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                City / Industrial Area
              </label>
              <input
                type="text"
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                placeholder="e.g. Pune / Mumbai / Bangalore"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Full Physical Address
              </label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Unit No, Industrial Area, PIN"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Contact: Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-600" />
                Official Phone / WhatsApp
              </label>
              <input
                type="text"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+91 98200 12345"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-teal-600" />
                Billing Email
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="billing@yourbusiness.in"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Banking & UPI Details */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-teal-600" />
              Settlement Bank Account & UPI
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={profile.bankName}
                  onChange={(e) => setProfile({ ...profile, bankName: e.target.value })}
                  placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  value={profile.bankAccount}
                  onChange={(e) => setProfile({ ...profile, bankAccount: e.target.value })}
                  placeholder="50200012345678"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={profile.ifsc}
                  onChange={(e) => setProfile({ ...profile, ifsc: e.target.value.toUpperCase() })}
                  placeholder="HDFC0001234"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-semibold uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-teal-600" />
                  UPI ID (Used in Payment Reminders)
                </label>
                <input
                  type="text"
                  value={profile.upi}
                  onChange={(e) => setProfile({ ...profile, upi: e.target.value })}
                  placeholder="yourbusiness@okhdfcbank"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Clean Fake Data Danger Area */}
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-rose-600" />
                Clear All Demo / Fake Invoices & Buyers
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-400">
                Wipe all mock demo data completely to start fresh with your real business data only.
              </p>
            </div>
            {clearConfirm ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearAllFakeData}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs"
                >
                  Confirm Wipe
                </button>
                <button
                  type="button"
                  onClick={() => setClearConfirm(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setClearConfirm(true)}
                className="px-3.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold shrink-0 transition-colors"
              >
                Clear Demo Data
              </button>
            )}
          </div>

          {/* Footer Save */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-all"
            >
              {saveSuccess ? "Saved!" : "Save Business Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
