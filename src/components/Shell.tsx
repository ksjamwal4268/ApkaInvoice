"use client";
import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  MessageCircle,
  Users,
  Plus,
  Zap,
  Menu,
} from "lucide-react";
import { Language } from "../data/i18n";
import { useDataStore } from "../hooks/useDataStore";
import { useAuth } from "../utils/auth";
import { N8nSettingsModal } from "./N8nSettingsModal";
import { BusinessSettingsModal } from "./BusinessSettingsModal";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  Logo,
  LogoIcon,
} from "./ui/sidebar";

interface ShellProps {
  children: React.ReactNode;
  lang: Language;
  onLangChange: (lang: Language) => void;
}

export function Shell({
  children,
}: ShellProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [n8nModalOpen, setN8nModalOpen] = useState(false);
  const [businessModalOpen, setBusinessModalOpen] = useState(false);
  const { invoices, customers, businessProfile } = useDataStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isWelcome = location.pathname === "/" || location.pathname === "/welcome";

  if (isWelcome) {
    return <>{children}</>;
  }

  const overdueCount = invoices.filter(
    (i) => i.status === "overdue" && i.outstanding > 0 && !i.isDisputed
  ).length;

  const links = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="w-5 h-5 shrink-0 text-slate-700" />,
    },
    {
      label: "Invoices",
      href: "/invoices",
      icon: <FileText className="w-5 h-5 shrink-0 text-slate-700" />,
      badge: `${invoices.length}`,
    },
    {
      label: "Smart Reminders",
      href: "/reminders",
      icon: <MessageCircle className="w-5 h-5 shrink-0 text-slate-700" />,
      badge: overdueCount > 0 ? `${overdueCount}` : undefined,
      badgeColor: "bg-rose-500 text-white",
    },
    {
      label: "Customers",
      href: "/customers",
      icon: <Users className="w-5 h-5 shrink-0 text-slate-700" />,
      badge: customers.length > 0 ? `${customers.length}` : undefined,
    },
    {
      label: "New Invoice",
      href: "/invoices/create",
      icon: <Plus className="w-5 h-5 shrink-0 text-teal-600" />,
    },
    {
      label: "Cloud Automation",
      href: "#automation",
      icon: <Zap className="w-5 h-5 shrink-0 text-amber-500 fill-amber-500" />,
      onClick: () => setN8nModalOpen(true),
    },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-transparent text-slate-900 antialiased font-sans">
      {/* Aceternity UI Expandable Sidebar */}
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-6">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <div className="py-1">
              {open ? <Logo /> : <LogoIcon />}
            </div>

            <div className="mt-6 flex flex-col gap-1">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>

          {/* User Profile Footer in Sidebar */}
          <div className="pt-3 border-t border-slate-200/80">
            <SidebarLink
              link={{
                label: businessProfile.contactPerson || user?.name || businessProfile.name || "Profile & Settings",
                href: "/profile",
                icon: user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name || "User"}
                    className="w-7 h-7 rounded-xl object-cover border border-teal-500/40 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-xl bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                    {(businessProfile.contactPerson || user?.name || businessProfile.name || "U").substring(0, 1).toUpperCase()}
                  </div>
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="h-14 px-4 sm:px-6 flex items-center justify-between bg-white/85 backdrop-blur-md border-b border-slate-200/80 shrink-0 z-10 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="p-1.5 -ml-1 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors md:hidden tap-target flex items-center justify-center"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-teal-600 transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-teal-600 flex md:hidden items-center justify-center text-white font-extrabold text-[11px] shadow-xs">
                AI
              </div>
              <span className="font-bold">{businessProfile.name || "ApkaInvoice"}</span>
              {businessProfile.city && (
                <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
                  • {businessProfile.city}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setN8nModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 text-xs font-bold hover:bg-teal-100 transition-colors shadow-2xs"
              title="Cloud Automation Hub"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="hidden sm:inline">Cloud Automation</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            <Link
              to="/invoices/create"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-xs transition-colors tap-target"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Invoice</span>
            </Link>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Cloud Automation Modal */}
      <N8nSettingsModal
        isOpen={n8nModalOpen}
        onClose={() => setN8nModalOpen(false)}
      />

      {/* Business Settings Modal */}
      <BusinessSettingsModal
        isOpen={businessModalOpen}
        onClose={() => setBusinessModalOpen(false)}
      />
    </div>
  );
}
