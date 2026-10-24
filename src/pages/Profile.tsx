import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Save,
  RefreshCw,
  LayoutDashboard,
  Sparkles,
  MapPin,
} from "lucide-react";
import { Language } from "../data/i18n";
import { useAuth } from "../utils/auth";
import { useDataStore } from "../hooks/useDataStore";
import { INDIAN_STATES } from "../utils/gstin";
import { BusinessProfile } from "../data/dataStore";

interface ProfileProps {
  lang: Language;
}

export function Profile({ lang: _lang }: ProfileProps): React.JSX.Element {
  const navigate = useNavigate();
  const { user, signInWithGoogle, updateUser } = useAuth();
  const { businessProfile, saveBusinessProfile } = useDataStore();

  // Personal Info (Sender info for n8n workflow)
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");

  // Location Details
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [stateCode, setStateCode] = useState("27");
  const [pincode, setPincode] = useState("");

  // Direct Phone Payment / UPI
  const [upi, setUpi] = useState("");
  const [gstin, setGstin] = useState("");

  // Status & Feedback
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Load from stored business profile and current user on mount or change
  useEffect(() => {
    if (businessProfile) {
      setContactPerson(businessProfile.contactPerson || user?.name || "");
      setEmail(businessProfile.email || user?.email || "");
      setPhone(businessProfile.phone || "");
      setBusinessName(businessProfile.name || (user?.name ? `${user.name} Enterprises` : ""));

      // Location
      setAddress(businessProfile.address || "");
      setCity(businessProfile.city || "Pune");
      setState(businessProfile.state || "Maharashtra");
      setStateCode(businessProfile.stateCode || "27");
      setPincode(businessProfile.pincode || "");
      setGstin(businessProfile.gstin || "");

      // Direct Phone payment / UPI
      setUpi(businessProfile.upi || (businessProfile.phone ? `${businessProfile.phone.replace(/\D/g, "")}@upi` : ""));
    }
  }, [businessProfile, user]);

  const handleStateChange = (selectedState: string) => {
    setState(selectedState);
    const found = INDIAN_STATES.find((s) => s.state === selectedState);
    if (found) {
      setStateCode(found.code);
    }
  };

  // One-click sync from linked Google Account
  const handleSyncGoogle = () => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    if (user.name) {
      setContactPerson(user.name);
      if (!businessName || businessName === "Sharma Packaging") {
        setBusinessName(`${user.name} Enterprises`);
      }
    }
    if (user.email) {
      setEmail(user.email);
    }
    setSyncNotice("Synced name & email from your Google account!");
    setTimeout(() => setSyncNotice(null), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const cleanPhone = phone.trim();
    const fallbackUpi = upi.trim() || (cleanPhone ? `${cleanPhone.replace(/\D/g, "")}@upi` : "");
    const cleanGstin = gstin.trim().toUpperCase();
    const cleanPan = cleanGstin.length >= 12 ? cleanGstin.substring(2, 12) : (businessProfile.pan || "");

    const updatedProfile: BusinessProfile = {
      ...businessProfile,
      name: businessName.trim() || `${contactPerson || "My"} Enterprises`,
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      phone: cleanPhone,
      // Location details
      address: address.trim(),
      city: city.trim() || "Pune",
      state,
      stateCode,
      pincode: pincode.trim(),
      // Direct Phone Payment (no bank account required)
      upi: fallbackUpi,
      gstin: cleanGstin,
      pan: cleanPan,
      bankName: businessProfile.bankName || "",
      bankAccount: businessProfile.bankAccount || "",
      ifsc: businessProfile.ifsc || "",
      accountHolderName: businessProfile.accountHolderName || "",
      isOnboarded: true,
      syncedAt: new Date().toISOString(),
    };

    // Save to data store (persists in localStorage)
    saveBusinessProfile(updatedProfile);

    // Keep auth state user display name updated
    if (contactPerson.trim() || email.trim()) {
      updateUser({
        name: contactPerson.trim() || user?.name || "User",
        email: email.trim() || user?.email || "",
        phone: cleanPhone,
      });
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    }, 400);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400 mb-1">
            <User className="w-4 h-4" />
            <span>ACCOUNT & SENDER PROFILE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            User Profile & Reminder Identity
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Your phone number and email are used as your sender identity when pressing <strong>"Send Reminder"</strong>. Buyers pay directly to your phone number.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors shadow-2xs"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Sync Success Alert */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500 text-white">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Profile Details Saved & Synced Successfully!</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Whenever you press <strong>"Send Reminder"</strong>, this phone number ({phone || "set below"}) and email ({email}) will automatically be synced and used in the n8n workflow.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccess(false)}
            className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Google Account & Cloud Sync Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-slate-900 via-slate-850 to-teal-950 p-5 sm:p-6 text-white shadow-xl border border-slate-700/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name || "User"}
                className="w-14 h-14 rounded-2xl border-2 border-teal-400 object-cover shadow-md"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md border-2 border-teal-400">
                {(contactPerson || user?.name || "U").substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {contactPerson || user?.name || "Account User"}
                </h2>
                {user ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Google Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Local Device Storage
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {email || user?.email || "No email specified"}
                {phone ? ` • WhatsApp/Pay: ${phone}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSyncGoogle}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-colors"
              title="Sync your name and email from your signed-in Google account"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-300" />
              <span>{user ? "Sync from Google" : "Sign in with Google"}</span>
            </button>
          </div>
        </div>

        {syncNotice && (
          <div className="mt-3 text-xs text-teal-300 bg-teal-900/40 border border-teal-700/50 rounded-lg p-2 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>{syncNotice}</span>
          </div>
        )}
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal & Sender Information */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Sender Contact Details (Used in n8n Reminder Workflow)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                When you click <strong>"Send Reminder"</strong>, this phone number and email will be used as the sender.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name (Sender Name) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Kulvardhan Singh Jamwal"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Business / Display Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Business / Enterprise Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Jamwal Enterprises / Sharma Packaging"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold"
                />
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number (WhatsApp & Direct Payment) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 95413 41656"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50/20 dark:bg-teal-950/20 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono font-semibold"
                />
                <Phone className="w-4 h-4 text-teal-600 dark:text-teal-400 absolute left-3 top-2.5" />
              </div>
              <p className="text-[11px] text-teal-600 dark:text-teal-400 mt-1 font-medium">
                ✓ Customers can pay directly to this phone number via Google Pay, PhonePe, Paytm or UPI.
              </p>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. 4268.kulvardhan.7a@gmail.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Used to dispatch email reminder copies to buyers</p>
            </div>
          </div>
        </div>

        {/* Section 2: Location Details (Required) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Location Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your city, state, and address attached to reminder messages and invoices.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* City */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                City <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Jammu, Pune, Delhi, Mumbai"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                State
              </label>
              <select
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.state}>
                    {s.state} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Pincode / Postal Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="e.g. 180001 / 412105"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
              />
            </div>

            {/* GSTIN */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                GSTIN (Optional)
              </label>
              <input
                type="text"
                maxLength={15}
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase().trim())}
                placeholder="e.g. 27AABCS1234Q1ZM"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Full Street Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Address
              </label>
              <div className="relative">
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Main Market, Gandhi Nagar, Jammu"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Details are saved locally and synced directly when reminders are sent.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors text-center"
            >
              Dashboard
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "Saving..." : "Save & Sync Details"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
