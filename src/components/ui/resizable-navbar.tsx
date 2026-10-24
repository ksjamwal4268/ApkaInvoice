"use client";
import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface NavItemsProps {
  items: {
    name: string;
    link: string;
  }[];
  className?: string;
  onItemClick?: () => void;
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileNavMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const Navbar = ({ children, className }: NavbarProps) => {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== "undefined") {
        if (window.scrollY > 60) {
          setVisible(true);
        } else {
          setVisible(false);
        }
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "sticky inset-x-0 top-3 z-40 w-full transition-all duration-300 ease-out px-3 sm:px-6",
        className
      )}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean }>,
              { visible }
            )
          : child
      )}
    </div>
  );
};

export const NavBody = ({ children, className, visible }: NavBodyProps) => {
  return (
    <div
      className={cn(
        "relative z-[60] mx-auto hidden lg:flex flex-row items-center justify-between transition-all duration-300 ease-out",
        visible
          ? "w-[85%] max-w-5xl rounded-full bg-white/90 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.06),0_1px_3px_rgb(0,0,0,0.05)] border border-slate-200/80 px-6 py-2.5 translate-y-1"
          : "w-full max-w-7xl rounded-2xl bg-white/40 backdrop-blur-xs border border-transparent px-4 py-3 translate-y-0",
        className
      )}
    >
      {children}
    </div>
  );
};

export const NavItems = ({ items, className, onItemClick }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "flex flex-1 flex-row items-center justify-center space-x-1 text-xs font-semibold text-slate-600",
        className
      )}
    >
      {items.map((item, idx) => (
        <a
          key={`link-${idx}`}
          href={item.link}
          onMouseEnter={() => setHovered(idx)}
          onClick={onItemClick}
          className="relative px-3.5 py-1.5 rounded-full text-slate-700 hover:text-teal-700 transition-colors duration-150"
        >
          {hovered === idx && (
            <div className="absolute inset-0 h-full w-full rounded-full bg-slate-100/90 -z-10 transition-all duration-150" />
          )}
          <span className="relative z-10">{item.name}</span>
        </a>
      ))}
    </div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  return (
    <div
      className={cn(
        "relative z-50 mx-auto flex w-full flex-col items-center justify-between lg:hidden transition-all duration-300 ease-out",
        visible
          ? "w-full rounded-2xl bg-white/95 backdrop-blur-md shadow-md border border-slate-200/80 px-4 py-2"
          : "w-full rounded-xl bg-white/60 backdrop-blur-xs px-2 py-2",
        className
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavHeader = ({
  children,
  className,
}: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between",
        className
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
  onClose,
}: MobileNavMenuProps) => {
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "absolute inset-x-0 top-14 z-50 flex w-full flex-col items-start justify-start gap-4 rounded-2xl bg-white/95 backdrop-blur-md p-6 shadow-xl border border-slate-200/80 animate-in fade-in slide-in-from-top-2 duration-200",
        className
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
      aria-label={isOpen ? "Close navigation" : "Open navigation"}
    >
      {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
    </button>
  );
};

export const NavbarLogo = ({
  href = "/",
  onClick,
}: {
  href?: string;
  onClick?: () => void;
}) => {
  return (
    <Link
      to={href}
      onClick={onClick}
      className="relative z-20 flex items-center space-x-2.5 py-1 text-sm font-normal text-slate-900 group select-none"
    >
      <div className="h-7 w-7 rounded-xl bg-teal-600 flex items-center justify-center text-white font-extrabold text-xs shadow-xs group-hover:scale-105 transition-transform">
        AI
      </div>
      <span className="font-extrabold text-base text-slate-900 tracking-tight">
        ApkaInvoice
      </span>
    </Link>
  );
};

export const NavbarButton = ({
  href,
  as: Tag = "button",
  children,
  className,
  variant = "primary",
  onClick,
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "dark" | "gradient";
  onClick?: () => void;
} & (
  | React.ComponentPropsWithoutRef<"a">
  | React.ComponentPropsWithoutRef<"button">
)) => {
  const baseStyles =
    "px-4 py-2 rounded-xl text-xs font-bold relative cursor-pointer hover:-translate-y-0.5 transition duration-150 inline-flex items-center justify-center text-center tap-target";

  const variantStyles = {
    primary:
      "bg-teal-600 text-white hover:bg-teal-700 shadow-xs",
    secondary:
      "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs",
    dark:
      "bg-slate-900 text-white hover:bg-slate-800 shadow-xs",
    gradient:
      "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-xs",
  };

  return (
    <Tag
      href={href || undefined}
      onClick={onClick}
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Tag>
  );
};

export function NavbarDemo() {
  const navItems = [
    {
      name: "Features",
      link: "#features",
    },
    {
      name: "Pricing",
      link: "#pricing",
    },
    {
      name: "Contact",
      link: "#contact",
    },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="relative w-full">
      <Navbar>
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <div className="flex items-center gap-3">
            <NavbarButton variant="secondary">Login</NavbarButton>
            <NavbarButton variant="primary">Book a call</NavbarButton>
          </div>
        </NavBody>

        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navItems.map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative text-slate-700 font-semibold text-sm py-1"
              >
                <span>{item.name}</span>
              </a>
            ))}
            <div className="flex w-full flex-col gap-2.5 pt-2 border-t border-slate-100">
              <NavbarButton
                onClick={() => setIsMobileMenuOpen(false)}
                variant="secondary"
                className="w-full"
              >
                Login
              </NavbarButton>
              <NavbarButton
                onClick={() => setIsMobileMenuOpen(false)}
                variant="primary"
                className="w-full"
              >
                Book a call
              </NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}

