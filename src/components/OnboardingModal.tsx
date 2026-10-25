import React, { useState, useEffect } from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  User,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { BusinessProfile, saveBusinessProfile } from "../data/dataStore";
import { AppUser, updateStoredUser } from "../utils/auth";
import { validateGstin, INDIAN_STATES, STATE_CODES } from "../utils/gstin";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  existingProfile: BusinessProfile;
  onComplete: () => void;
}

export function OnboardingModal({
  isOpen,
  onClose,
  currentUser,
  existingProfile,
  onComplete,
}: OnboardingModalProps): React.JSX.Element | null {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Name and Business Name
  const [contactPerson, setContactPerson] = useState("");
  const [businessName, setBusinessName] = useState("");

  // Step 2: Automation & Other Essential Details
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [upi, setUpi] = useState("");

  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [gstinError, setGstinError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successSaved, setSuccessSaved] = useState(false);

  // Initialize or prefill fields with user details & existing profile
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setStep1Error(null);
      setStep2Error(null);
      setGstinError(null);

      setContactPerson(
        currentUser?.name || existingProfile.contactPerson || ""
      );
      setBusinessName(
        existingProfile.name && existingProfile.name !== "Sharma Packaging"
          ? existingProfile.name
          : ""
      );
      setEmail(
        currentUser?.email || existingProfile.email || ""
      );
      setPhone(
        existingProfile.phone && existingProfile.phone !== "+91 98765 43210"
          ? existingProfile.phone
          : currentUser?.phone || ""
      );
      setState(existingProfile.state || "");
      setStateCode(existingProfile.stateCode || "");
      setCity(existingProfile.city && existingProfile.city !== "Pune" ? existingProfile.city : "");
      setAddress(existingProfile.address || "");
      setGstin(existingProfile.gstin || "");
      setUpi(existingProfile.upi || "");
    }
  }, [isOpen, currentUser, existingProfile]);

  if (!isOpen) return null;

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

    // Auto-detect state from first 2 digits of GSTIN (e.g. 01 for Jammu & Kashmir, 27 for Maharashtra)
    if (upper.length >= 2) {
      const prefix = upper.substring(0, 2);
      if (STATE_CODES[prefix]) {
        setState(STATE_CODES[prefix]);
        setStateCode(prefix);
      }
    }

    if (upper.length === 15) {
      const res = validateGstin(upper);
      if (res.valid) {
        setGstinError(null);
        if (res.stateName) setState(res.stateName);
        if (res.stateCode) setStateCode(res.stateCode);
      } else {
        setGstinError("Invalid Indian GSTIN structure (15 characters).");
      }
    } else if (upper.length > 0) {
      setGstinError("GSTIN must be 15 characters (e.g. 01AABCS1234Q1ZM)");
    } else {
      setGstinError(null);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactPerson.trim()) {
      setStep1Error("Please enter your name.");
      return;
    }
    if (!businessName.trim()) {
      setStep1Error("Please enter your business or company name.");
      return;
    }
    setStep1Error(null);
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      setStep2Error("Please enter a valid WhatsApp/Mobile number for automation.");
      return;
    }
    if (!email.trim()) {
      setStep2Error("Please enter your sender Gmail/Email address.");
      return;
    }

    setStep2Error(null);
    setIsSubmitting(true);

    const cleanPhone = phone.trim();
    const fallbackUpi = upi.trim() || (cleanPhone ? `${cleanPhone.replace(/\D/g, "")}@upi` : "");
    const cleanGstin = gstin.trim() ? gstin.toUpperCase().trim() : existingProfile.gstin || "";
    const cleanPan = cleanGstin.length >= 12 ? cleanGstin.substring(2, 12) : existingProfile.pan || "";

    const updatedProfile: BusinessProfile = {
      ...existingProfile,
      name: businessName.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: cleanPhone,
      email: email.trim(),
      state,
      stateCode,
      city: city.trim() || existingProfile.city || "",
      address: address.trim() || existingProfile.address || "",
      gstin: cleanGstin,
      pan: cleanPan,
      bankName: existingProfile.bankName || "",
      bankAccount: existingProfile.bankAccount || "",
      ifsc: existingProfile.ifsc || "",
      accountHolderName: existingProfile.accountHolderName || "",
      upi: fallbackUpi,
      isOnboarded: true,
    };

    saveBusinessProfile(updatedProfile);
    if (contactPerson.trim() || email.trim()) {
      updateStoredUser({
        name: contactPerson.trim(),
        email: email.trim(),
        phone: cleanPhone,
      });
    }
    setSuccessSaved(true);

    setTimeout(() => {
      setIsSubmitting(false);
      onComplete();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-linear-to-r from-teal-50 via-slate-50 to-white dark:from-teal-950/40 dark:via-slate-800 dark:to-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  Welcome Setup
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  Step {step} of 2
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {step === 1
                  ? "First, tell us your name and business name."
                  : "Next, configure your contact details for automated reminders."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-700/50 h-1.5">
          <div
            className="bg-teal-500 h-1.5 transition-all duration-300 ease-out"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>

        {/* Google Authentication Verified Pill */}
        {currentUser && (
          <div className="px-6 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                Authenticated as: <strong>{currentUser.email}</strong>
              </span>
            </div>
            {currentUser.picture && (
              <img
                src={currentUser.picture}
                alt={currentUser.name}
                className="w-5 h-5 rounded-full border border-emerald-300 dark:border-emerald-700"
              />
            )}
          </div>
        )}

        {/* STEP 1: Ask Name then Next */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="p-6 space-y-5 text-xs">
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={contactPerson}
                    onChange={(e) => {
                      setContactPerson(e.target.value);
                      if (step1Error) setStep1Error(null);
                    }}
                    placeholder="e.g. Rahul Verma"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  How you'd like your customers and team to address you.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                  Business / Company Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => {
                      setBusinessName(e.target.value);
                      if (step1Error) setStep1Error(null);
                    }}
                    placeholder="e.g. Apex Enterprises or Shanti Logistics"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  This business name appears on all invoices and WhatsApp reminder messages.
                </p>
              </div>
            </div>

            {step1Error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{step1Error}</span>
              </div>
            )}

            {/* Step 1 Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold text-xs"
              >
                Skip for now
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] tap-target"
              >
                <span>Next: Contact Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Ask Other Details (Mobile, Gmail, State, City, GSTIN, UPI) */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
            {/* Automation Setup Card (Mobile & Gmail) */}
            <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60 space-y-3">
              <div className="flex items-start gap-2 text-teal-900 dark:text-teal-200">
                <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[11px] uppercase tracking-wider">
                    Automation Contact Details
                  </h4>
                  <p className="text-[11px] text-teal-700 dark:text-teal-300 mt-0.5 leading-relaxed">
                    Used when sending automated reminders so customers can reply directly to your mobile and email.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-teal-600" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98200 12345"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gmail / Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-teal-600" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="billing@yourdomain.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Location & Tax Details */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Location & Tax Details</span>
              </h3>

              <div className="mb-3">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                    GSTIN (Optional — auto-detects State)
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder="e.g. 27AABCS1234Q1ZM"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white uppercase font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                  {gstinError && (
                    <p className="text-[11px] text-rose-500 mt-1">{gstinError}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    State (Place of Supply)
                  </label>
                  <select
                    value={state}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.state} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. City name"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Address / Area
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Street, Area or Industrial Estate"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* 1-Click UPI Payment */}
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Primary UPI ID (Optional — for 1-click buyer WhatsApp payment)</span>
              </label>
              <div className="relative">
                <QrCode className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={upi}
                  onChange={(e) => setUpi(e.target.value)}
                  placeholder="e.g. yourname@okhdfcbank"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Buyers can click this link in WhatsApp reminders to pay via GPay, PhonePe, or Paytm instantly.
              </p>
            </div>

            {step2Error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{step2Error}</span>
              </div>
            )}

            {/* Step 2 Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-extrabold text-xs shadow-lg shadow-teal-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all tap-target"
              >
                {successSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>Profile Saved! Loading Dashboard...</span>
                  </>
                ) : (
                  <>
                    <span>Finish & Enter Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
