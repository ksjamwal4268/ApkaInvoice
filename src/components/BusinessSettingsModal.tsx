import React, { useState } from "react";
import {
  X,
  Building2,
  MapPin,
  Phone,
  Mail,
  QrCode,
  Check,
  Trash2,
  User,
} from "lucide-react";
import {
  BusinessProfile,
  getStoredBusinessProfile,
  saveBusinessProfile,
  clearAllData,
} from "../data/dataStore";
import { updateStoredUser } from "../utils/auth";
import { INDIAN_STATES } from "../utils/gstin";

interface BusinessSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BusinessSettingsModal({
  isOpen,
  onClose,
}: BusinessSettingsModalProps): React.JSX.Element | null {
  const [profile, setProfile] = useState<BusinessProfile>(getStoredBusinessProfile);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name.trim()) {
      alert("Business Name is required.");
      return;
    }
    const cleanPhone = profile.phone?.trim() || "";
    const cleanUpi = profile.upi?.trim() || (cleanPhone ? `${cleanPhone.replace(/\D/g, "")}@upi` : "");

    const updated: BusinessProfile = {
      ...profile,
      phone: cleanPhone,
      upi: cleanUpi,
      bankName: profile.bankName || "",
      bankAccount: profile.bankAccount || "",
      ifsc: profile.ifsc || "",
      accountHolderName: profile.accountHolderName || "",
      gstin: profile.gstin || "",
      pan: profile.pan || "",
    };

    saveBusinessProfile(updated);
    if (profile.contactPerson || profile.email) {
      updateStoredUser({
        name: profile.contactPerson || undefined,
        email: profile.email || undefined,
        phone: cleanPhone || undefined,
      });
    }
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

  const STATES = INDIAN_STATES.map((s) => s.state);

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
                Business & Sender Contact Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure your contact phone number, email, and location. Buyers pay directly to your phone number.
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
          {/* Business & Sender Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                Business / Trade Name *
              </label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="e.g. Jamwal Enterprises"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-600" />
                Contact Person Name
              </label>
              <input
                type="text"
                value={profile.contactPerson || ""}
                onChange={(e) => setProfile({ ...profile, contactPerson: e.target.value })}
                placeholder="e.g. Kulvardhan Singh Jamwal"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Contact: Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-600" />
                Phone Number (WhatsApp & Direct Payment) *
              </label>
              <input
                type="text"
                required
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+91 95413 41656"
                className="w-full px-3.5 py-2.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50/20 dark:bg-teal-950/20 text-sm font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[11px] text-teal-600 dark:text-teal-400">
                Buyers can pay directly to this phone number via PhonePe/GPay/Paytm.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-teal-600" />
                Sender Email Address *
              </label>
              <input
                type="email"
                required
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="4268.kulvardhan.7a@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Location Fields */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-teal-600" />
              Business Location
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  placeholder="e.g. Jammu / Pune / Delhi"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  State
                </label>
                <select
                  value={profile.state}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  placeholder="Street / Area / Market"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-teal-600" />
                  UPI ID (Optional, defaults to phone number)
                </label>
                <input
                  type="text"
                  value={profile.upi}
                  onChange={(e) => setProfile({ ...profile, upi: e.target.value })}
                  placeholder={profile.phone ? `${profile.phone.replace(/\D/g, "")}@upi` : "e.g. 9541341656@upi"}
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
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
                >
                  Yes, Wipe All Data
                </button>
                <button
                  type="button"
                  onClick={() => setClearConfirm(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setClearConfirm(true)}
                className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
              >
                Clear Demo Data
              </button>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-all hover:scale-[1.02]"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
