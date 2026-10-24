import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  Building2,
  Mail,
  Phone,
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  ArrowRight,
  LayoutDashboard,
  Sparkles,
  Zap,
  MapPin,
  Briefcase,
  Hash,
} from "lucide-react";
import { Language, t } from "../data/i18n";
import { useAuth } from "../utils/auth";
import { useDataStore } from "../hooks/useDataStore";
import { validateGstin, INDIAN_STATES } from "../utils/gstin";
import { BusinessProfile } from "../data/dataStore";

interface ProfileProps {
  lang: Language;
}

export function Profile({ lang }: ProfileProps): React.JSX.Element {
  const navigate = useNavigate();
  const { user, signInWithGoogle, updateUser } = useAuth();
  const { businessProfile, saveBusinessProfile, n8nConfig } = useDataStore();

  // Personal Info
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Proprietor");

  // Business Info
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Sole Proprietorship");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [stateCode, setStateCode] = useState("27");
  const [pincode, setPincode] = useState("");

  // Banking & UPI
  const [upi, setUpi] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [ifsc, setIfsc] = useState("");

  // Status & Validation
  const [gstinError, setGstinError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Load from stored business profile and current user on mount or change
  useEffect(() => {
    if (businessProfile) {
      setContactPerson(businessProfile.contactPerson || user?.name || "");
      setEmail(businessProfile.email || user?.email || "");
      setPhone(businessProfile.phone || "");
      setRole(businessProfile.role || "Proprietor");

      setBusinessName(businessProfile.name || (user?.name ? `${user.name} Enterprises` : ""));
      setBusinessType(businessProfile.businessType || "Sole Proprietorship");
      setGstin(businessProfile.gstin || "");
      setPan(businessProfile.pan || (businessProfile.gstin && businessProfile.gstin.length >= 12 ? businessProfile.gstin.substring(2, 12) : ""));
      setAddress(businessProfile.address || "");
      setCity(businessProfile.city || "Pune");
      setState(businessProfile.state || "Maharashtra");
      setStateCode(businessProfile.stateCode || "27");
      setPincode(businessProfile.pincode || "");

      setUpi(businessProfile.upi || "");
      setBankName(businessProfile.bankName || "HDFC Bank");
      setAccountHolderName(businessProfile.accountHolderName || businessProfile.name || "");
      setBankAccount(businessProfile.bankAccount || "");
      setIfsc(businessProfile.ifsc || "");
    }
  }, [businessProfile, user]);

  const handleStateChange = (selectedState: string) => {
    setState(selectedState);
    const found = INDIAN_STATES.find((s) => s.state === selectedState);
    if (found) {
      setStateCode(found.code);
    }
  };

  const handleGstinChange = (val: string) => {
    const upper = val.toUpperCase().trim();
    setGstin(upper);

    if (upper.length === 15) {
      if (validateGstin(upper)) {
        setGstinError(null);
        // Auto-extract PAN (characters 3 to 12)
        const extractedPan = upper.substring(2, 12);
        setPan(extractedPan);
        // Auto-match state by 2-digit state code
        const code = upper.substring(0, 2);
        const matchState = INDIAN_STATES.find((s) => s.code === code);
        if (matchState) {
          setState(matchState.state);
          setStateCode(matchState.code);
        }
      } else {
        setGstinError("Invalid Indian GSTIN structure (15 alphanumeric characters).");
      }
    } else if (upper.length > 0) {
      setGstinError("GSTIN must be 15 characters (e.g. 27AABCS1234Q1ZM)");
    } else {
      setGstinError(null);
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

    const updatedProfile: BusinessProfile = {
      ...businessProfile,
      name: businessName.trim() || `${contactPerson || "My"} Enterprises`,
      contactPerson: contactPerson.trim(),
      role: role.trim(),
      email: email.trim(),
      phone: phone.trim(),
      businessType,
      gstin: gstin.trim(),
      pan: pan.trim() || (gstin.length >= 12 ? gstin.substring(2, 12) : ""),
      address: address.trim(),
      city: city.trim() || "Pune",
      state,
      stateCode,
      pincode: pincode.trim(),
      upi: upi.trim(),
      bankName: bankName.trim(),
      accountHolderName: accountHolderName.trim() || businessName.trim(),
      bankAccount: bankAccount.trim(),
      ifsc: ifsc.trim().toUpperCase(),
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
        phone: phone.trim(),
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
            User Profile & Identity
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Your details are saved and automatically synced. They power your invoices, payment reminders, and customer communications.
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
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSubmitting ? "Saving..." : "Save Profile"}</span>
          </button>
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
                All future invoices and n8n WhatsApp/Email reminders will use this information. You won't need to fill them again.
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
                {phone ? ` • ${phone}` : ""}
              </p>
              <p className="text-[11px] text-teal-400/90 mt-1 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Synced with local persistent storage & automated workflows</span>
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
        {/* Section 1: Personal & Contact Information */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Personal & Contact Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your direct identity used for account verification and reminder communications.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name (Contact Person) <span className="text-rose-500">*</span>
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

            {/* Role / Designation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Designation / Role
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Proprietor, Director, Accounts Head"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
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
                  placeholder="e.g. accounts@mycompany.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Used to dispatch invoice copies & reminders</p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone / WhatsApp Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Used as sender number for buyer WhatsApp reminders</p>
            </div>
          </div>
        </div>

        {/* Section 2: Business & GST Information */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Business & GST Information
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Printed on your invoices, bills of supply, and GST returns.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Business / Company Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Business / Trade Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Sharma Packaging / Jamwal Enterprises"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold"
                />
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Constitution of Business
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="Partnership">Partnership Firm</option>
                <option value="Private Limited Company">Private Limited (Pvt Ltd)</option>
                <option value="Limited Liability Partnership">LLP</option>
                <option value="Individual / Freelancer">Individual / Freelancer</option>
              </select>
            </div>

            {/* GSTIN */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                GSTIN (15 characters)
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  placeholder="e.g. 27AABCS1234Q1ZM"
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white uppercase font-mono tracking-wider focus:ring-2 focus:outline-none ${
                    gstinError
                      ? "border-rose-400 focus:ring-rose-400"
                      : "border-slate-300 dark:border-slate-600 focus:ring-teal-500"
                  }`}
                />
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              {gstinError ? (
                <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{gstinError}</span>
                </p>
              ) : gstin.length === 15 ? (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Valid GSTIN structure</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-1">Leave blank if unregistered / composition dealer</p>
              )}
            </div>

            {/* PAN Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Permanent Account Number (PAN)
              </label>
              <input
                type="text"
                maxLength={10}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="e.g. AABCS1234Q"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white uppercase font-mono tracking-wider focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* State & State Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                State (Place of Supply)
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

            {/* Pincode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Postal Code (PIN)
              </label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="e.g. 412105"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
              />
            </div>

            {/* Full Street Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Complete Business Address
              </label>
              <div className="relative">
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Plot No. 42, Industrial Phase 2, Chakan"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Bank & UPI Payment Details */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Payment & Banking Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct remittance coordinates embedded in your PDF invoices and reminder links.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Primary UPI ID */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Primary UPI ID (for instant QR & WhatsApp collection) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={upi}
                  onChange={(e) => setUpi(e.target.value.toLowerCase().trim())}
                  placeholder="e.g. sharmapackaging@hdfc or yourname@okaxis"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50/30 dark:bg-teal-950/20 text-slate-900 dark:text-white font-mono font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400 absolute left-3 top-2.5" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Buyers can scan the UPI QR code on your invoice to settle outstanding balances instantly.
              </p>
            </div>

            {/* Bank Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. HDFC Bank, State Bank of India, ICICI"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Account Holder Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Account Holder Name
              </label>
              <input
                type="text"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="e.g. Sharma Packaging"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Bank Account Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Account Number
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value.trim())}
                placeholder="e.g. 50200045678901"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* IFSC Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                IFSC Code (11 characters)
              </label>
              <input
                type="text"
                maxLength={11}
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase().trim())}
                placeholder="e.g. HDFC0001234"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white uppercase font-mono tracking-wider focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 4: n8n Automation Status & Sync Hub */}
        <div className="bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Zap className="w-5 h-5 fill-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    n8n Workflow Automation Hub
                  </h4>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Linked: ksjamwal.app.n8n.cloud
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Whenever you scan an invoice or send a reminder, this user profile will be dispatched via n8n.
                </p>
              </div>
            </div>

            <Link
              to="/reminders"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
            >
              <span>Test Reminders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>All modifications are saved locally and synced with your account automatically.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors text-center"
            >
              Cancel
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
