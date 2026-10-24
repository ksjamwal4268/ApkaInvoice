"use client";
import React, { useState, createContext, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarLinkItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  onClick?: () => void;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <>
      <DesktopSidebar className={className}>{children}</DesktopSidebar>
      <MobileSidebar className={className}>{children}</MobileSidebar>
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const { open, setOpen, animate } = useSidebar();

  return (
    <aside
      className={cn(
        "h-full px-3 py-4 hidden md:flex md:flex-col justify-between bg-white/90 backdrop-blur-md border-r border-slate-200/80 shrink-0 transition-[width] duration-300 ease-in-out z-20 select-none shadow-xs",
        animate ? (open ? "w-[260px]" : "w-[72px]") : "w-[260px]",
        className
      )}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
    </aside>
  );
};

export const MobileSidebar = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const { open, setOpen } = useSidebar();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          "relative w-72 max-w-[80vw] h-full bg-white flex flex-col justify-between p-5 z-10 shadow-2xl transition-transform animate-in slide-in-from-left duration-250",
          className
        )}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const SidebarLink = ({
  link,
  className,
}: {
  link: SidebarLinkItem;
  className?: string;
}) => {
  const { open, animate, setOpen } = useSidebar();
  const location = useLocation();

  const isActive =
    link.href === "/dashboard"
      ? location.pathname === "/dashboard"
      : link.href === "/profile"
      ? location.pathname === "/profile"
      : location.pathname === link.href ||
        (link.href !== "/" &&
          link.href !== "/dashboard" &&
          link.href !== "/profile" &&
          location.pathname.startsWith(link.href));

  const content = (
    <>
      <div className="w-6 h-6 shrink-0 flex items-center justify-center">
        {link.icon}
      </div>

      <span
        className={cn(
          "text-xs font-semibold whitespace-nowrap overflow-hidden transition-all duration-200",
          animate
            ? open
              ? "opacity-100 max-w-[180px] ml-3"
              : "opacity-0 max-w-0 ml-0 pointer-events-none md:hidden"
            : "opacity-100 max-w-[180px] ml-3"
        )}
      >
        {link.label}
      </span>

      {link.badge && (
        <span
          className={cn(
            "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-opacity",
            link.badgeColor || "bg-slate-100 text-slate-600",
            animate && !open ? "md:hidden" : "opacity-100"
          )}
        >
          {link.badge}
        </span>
      )}
    </>
  );

  const baseClasses = cn(
    "flex items-center justify-start py-2.5 px-3 rounded-xl transition-all duration-150 group/sidebar tap-target cursor-pointer",
    isActive
      ? "bg-teal-600/10 text-teal-700 font-bold shadow-2xs border border-teal-600/20"
      : "text-slate-600 hover:text-teal-700 hover:bg-slate-100/80",
    className
  );

  if (link.onClick) {
    return (
      <button
        type="button"
        onClick={() => {
          link.onClick?.();
          setOpen(false);
        }}
        className={cn(baseClasses, "w-full text-left")}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={link.href}
      onClick={() => setOpen(false)}
      className={baseClasses}
    >
      {content}
    </Link>
  );
};

export const Logo = () => {
  return (
    <Link
      to="/"
      className="relative z-20 flex items-center space-x-2.5 py-1 text-sm font-normal text-slate-900 group"
    >
      <div className="h-6 w-7 shrink-0 rounded-xl bg-teal-600 flex items-center justify-center text-white font-extrabold text-xs shadow-xs group-hover:scale-105 transition-transform">
        AI
      </div>
      <span className="font-extrabold whitespace-pre text-slate-900 tracking-tight text-base">
        ApkaInvoice
      </span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      to="/"
      className="relative z-20 flex items-center justify-center py-1 text-sm font-normal text-slate-900 group"
      title="ApkaInvoice"
    >
      <div className="h-7 w-7 shrink-0 rounded-xl bg-teal-600 flex items-center justify-center text-white font-extrabold text-xs shadow-xs group-hover:scale-105 transition-transform">
        AI
      </div>
    </Link>
  );
};

export function SidebarDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden rounded-md border border-slate-200 bg-slate-50 md:flex-row h-screen">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              <SidebarLink
                link={{
                  label: "Dashboard",
                  href: "/dashboard",
                  icon: <div className="w-5 h-5 bg-teal-600 rounded" />,
                }}
              />
            </div>
          </div>
        </SidebarBody>
      </Sidebar>
    </div>
  );
}

