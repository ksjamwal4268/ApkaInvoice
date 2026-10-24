import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../utils/auth";
import { t } from "../data/i18n";
import {
  ChevronDown,
  User,
  FileText,
  CreditCard,
  BarChart2,
  Clock,
  Users,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function Navbar() {
  const navigate = useNavigate();
  const { user, signOutUser, isLoading } = useAuth();

  const _navItems: NavItem[] = [
    { label: t("navDashboard"), href: "/", icon: User },
    { label: t("navInvoices"), href: "/invoices", icon: FileText },
    { label: t("navForecast"), href: "/forecast", icon: BarChart2 },
    { label: t("navReminders"), href: "/reminders", icon: Clock },
  ];

  const handleSignOut = async () => {
    try {
      await signOutUser();
      navigate("/");
    } catch (err) {
      console.warn("Sign out error:", err);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-teal-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 7l5 5 5-5" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-900">{t("appName")}</h1>
              <p className="text-slate-500 text-sm">{t("tagline")}</p>
            </div>
          </div>

          {/* Right Side: User Menu */} 
          <div className="flex items-center gap-4">

            {/* User Menu */}
            {user ? (
              <div
                onClick={() => navigate("/profile")}
                className="relative flex items-center gap-2 cursor-pointer hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors"
                title="View & edit Profile"
              >
                <User className="w-5 h-5 text-teal-600" />
                <span className="font-medium text-slate-700">{user.name || "User"}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            ) : (
              <button
                onClick={() => navigate("/welcome")}
                className="px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded transition-colors"
              >
                {isLoading ? "Signing in..." : "Sign in with Google"}
              </button>
            )}

            {/* Sign Out */}
            {user && (
              <button
                onClick={handleSignOut}
                className="px-3 py-1 text-xs text-red-600 hover:bg-red-100 rounded transition-colors"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}