import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Language } from "../data/i18n";
import { useAuth } from "../utils/auth";
import { useDataStore } from "../hooks/useDataStore";
import { formatInr } from "../utils/money";
import { DEFAULT_OUTFLOWS } from "../utils/forecast";
import { OnboardingModal } from "../components/OnboardingModal";
import { InvoiceCameraModal } from "../components/InvoiceCameraModal";
import { CometCard } from "@/components/ui/comet-card";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import "./Welcome.css";

interface WelcomeProps {
  lang: Language;
}

export function Welcome({ lang: _lang }: WelcomeProps) {
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();
  const { invoices, businessProfile } = useDataStore();

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Automatically trigger onboarding wizard if user logs in and profile is not yet completed
  useEffect(() => {
    if (user && !businessProfile.isOnboarded) {
      setIsOnboardingOpen(true);
    }
  }, [user, businessProfile.isOnboarded]);

  // Calculate live financial KPIs from the data store
  const moneyOwed = invoices
    .filter((inv) => (inv?.status ?? "").toLowerCase() !== "paid" && (inv?.status ?? "").toLowerCase() !== "disputed")
    .reduce((sum, inv) => sum + (inv?.outstanding || 0), 0);

  const overdueAmount = invoices
    .filter((inv) => (inv?.status ?? "").toLowerCase() === "overdue" && (inv?.outstanding || 0) > 0)
    .reduce((sum, inv) => sum + (inv?.outstanding || 0), 0);

  const fourWeeksFromNow = new Date();
  fourWeeksFromNow.setDate(fourWeeksFromNow.getDate() + 28);

  const expected4Weeks = invoices.reduce((sum, inv) => {
    const status = (inv?.status ?? "").toLowerCase();
    if (status === "disputed" || status === "paid") return sum;
    const due = new Date(inv?.dueDate || 0);
    if (due <= fourWeeksFromNow && due >= new Date() && (inv?.outstanding || 0) > 0) {
      return sum + (inv?.outstanding || 0);
    }
    return sum;
  }, 0);

  const bills4Weeks = Object.values(DEFAULT_OUTFLOWS || []).reduce(
    (sum, o) => sum + (o?.amount || 0),
    0
  );

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.warn("Google sign in notice:", err);
      // Fallback demo user if Firebase auth popup is closed or blocked
      const demoUser = {
        id: "demo-user-1",
        name: businessProfile.contactPerson || businessProfile.name || "Rohit Sharma",
        email: businessProfile.email || "accounts@sharmapackaging.com",
        picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sharma",
      };
      localStorage.setItem("cc-google-user", JSON.stringify(demoUser));
      window.location.reload();
    }
  };

  const handleEnterDashboard = () => {
    if (user && !businessProfile.isOnboarded) {
      setIsOnboardingOpen(true);
    } else {
      navigate("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="welcome-page min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const businessName = businessProfile.name || "Sharma Packaging";

  return (
    <div className="welcome-page">
      {/* 1. RESIZABLE NAVBAR */}
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody>
          <NavbarLogo />
          <NavItems
            items={[
              { name: "How it works", link: "#how" },
              { name: "Portfolio", link: "#live" },
              { name: "Tools", link: "#tools" },
              { name: "Setup", link: "#setup" },
            ]}
          />
          <div className="flex items-center gap-2.5">
            {!user ? (
              <NavbarButton
                variant="secondary"
                onClick={handleGoogleSignIn}
                title="Sign in with your Google account"
              >
                <svg className="w-3.5 h-3.5 inline mr-1.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Log in</span>
              </NavbarButton>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 transition-colors shadow-2xs"
                  title={`Signed in as ${user.email}`}
                >
                  {user.picture ? (
                    <img src={user.picture} alt="" className="w-4 h-4 rounded-full" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-slate-300 text-[10px] flex items-center justify-center font-bold">
                      {user.name?.charAt(0) || "U"}
                    </span>
                  )}
                  <span className="max-w-[100px] truncate">{user.name?.split(" ")[0] || "Profile"}</span>
                </button>
                <button
                  type="button"
                  onClick={signOutUser}
                  className="text-xs text-slate-500 hover:text-slate-800 px-1.5 py-1"
                  title="Sign out"
                >
                  Sign out
                </button>
              </div>
            )}
            <NavbarButton variant="primary" onClick={handleEnterDashboard}>
              Dashboard →
            </NavbarButton>
          </div>
        </NavBody>

        {/* Mobile Navigation */}
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
            {[
              { name: "How it works", link: "#how" },
              { name: "Portfolio", link: "#live" },
              { name: "Tools", link: "#tools" },
              { name: "Setup", link: "#setup" },
            ].map((item, idx) => (
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
              {!user ? (
                <NavbarButton
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleGoogleSignIn();
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  Log in
                </NavbarButton>
              ) : (
                <NavbarButton
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate("/profile");
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  Profile ({user.name?.split(" ")[0] || "User"})
                </NavbarButton>
              )}
              <NavbarButton
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleEnterDashboard();
                }}
                variant="primary"
                className="w-full"
              >
                Dashboard
              </NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>

      {/* 2. HERO SECTION */}
      <header className="hero">
        <div className="b b1"></div>
        <div className="b b2"></div>
        <div className="b b3"></div>
        <h1 className="d">Your cash flow should be working harder than you are.</h1>
        <p>
          Welcome back, {businessName}. Apka Invoice predicts cash shortfalls 8 weeks ahead, reads bills from a photo, and chases dues in English, Hindi and Marathi.
        </p>
        <div className="row">
          <button type="button" className="btn w" onClick={handleEnterDashboard}>
            Enter dashboard
          </button>
          <button
            type="button"
            className="btn"
            style={{ background: "#ffffff26", color: "#fff" }}
            onClick={() => setIsCameraModalOpen(true)}
          >
            Upload bill (photo or PDF)
          </button>
        </div>
      </header>

      {/* 3. TRUST BANNER */}
      <div className="trust">
        <span>100% GST &amp; Tax compliant</span>
        <span>CGST, SGST &amp; IGST to the paisa</span>
        <span>WhatsApp &amp; email reminders</span>
        <span>UPI payment links</span>
        <span>TDS 194C/J detection</span>
      </div>

      {/* 4. HOW IT WORKS SECTION */}
      <section className="s1 wrap scroll-mt-28" id="how">
        <h2 className="d">Your invoices went out.<br />Then the money stopped.</h2>
        <p className="sub">Three steps to keep working capital moving, without a collections team.</p>
        <div className="g3">
          <CometCard className="h-full">
            <div
              className="g3-card cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setIsCameraModalOpen(true)}
            >
              <div className="ic">1</div>
              <h3>Scan or upload bills</h3>
              <p>Snap a photo or upload a PDF. Line items, CGST/SGST and paise math are filled in for you.</p>
            </div>
          </CometCard>
          <CometCard className="h-full">
            <div
              className="g3-card cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => navigate("/invoices")}
            >
              <div className="ic">2</div>
              <h3>Track real-time invoices</h3>
              <p>See billed, received and open balances with no guesswork.</p>
            </div>
          </CometCard>
          <CometCard className="h-full">
            <div
              className="g3-card cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => navigate("/reminders")}
            >
              <div className="ic">3</div>
              <h3>Send automated reminders</h3>
              <p>A 4-stage reminder ladder in English, Hindi and Marathi. You approve every WhatsApp and email before it goes.</p>
            </div>
          </CometCard>
        </div>
      </section>

      {/* 5. LIVE PORTFOLIO STATS SECTION (PINK) */}
      <section className="blk pink scroll-mt-28" id="live">
        <div className="wrap">
          <div className="hd">
            <h2 className="d">You slept 8 hours.<br />Apka Invoice didn't.</h2>
            <p>Your live portfolio, updated as bills are scanned and payments land.</p>
          </div>
          <div className="stats">
            <CometCard className="h-full">
              <div className="st">
                <small>Money owed</small>
                <b>{moneyOwed > 0 ? formatInr(moneyOwed) : "₹5,310"}</b>
                <i>Open across all customers</i>
              </div>
            </CometCard>
            <CometCard className="h-full">
              <div className="st">
                <small>Overdue</small>
                <b>{overdueAmount > 0 ? formatInr(overdueAmount) : "₹0"}</b>
                <i>{overdueAmount > 0 ? "Requires action" : "Nothing late right now"}</i>
              </div>
            </CometCard>
            <CometCard className="h-full">
              <div className="st">
                <small>Expected in 4 weeks</small>
                <b>{expected4Weeks > 0 ? formatInr(expected4Weeks) : "₹0"}</b>
                <i>{expected4Weeks > 0 ? "Scheduled customer dues" : "No payments scheduled"}</i>
              </div>
            </CometCard>
            <CometCard className="h-full">
              <div className="st">
                <small>Bills due in 4 weeks</small>
                <b>{bills4Weeks > 0 ? formatInr(bills4Weeks) : "₹0"}</b>
                <i>Nothing to pay soon</i>
              </div>
            </CometCard>
          </div>
        </div>
      </section>

      {/* 6. LIVE FEED SECTION (YELLOW) */}
      <section className="blk yel">
        <div className="wrap">
          <h2 className="d" style={{ textAlign: "center", margin: "0 auto 40px" }}>
            An accountant that never sleeps
          </h2>
          <div className="feed space-y-3">
            <CometCard>
              <div className="fi">
                <div>
                  <b>Bill scanned</b><br />
                  <span>Line items and GST split read from your photo. Ready to review.</span>
                </div>
                <em>02:14 AM</em>
              </div>
            </CometCard>
            <CometCard>
              <div className="fi">
                <div>
                  <b>Reminder drafted</b><br />
                  <span>Stage 2 message in Hindi is waiting for your approval.</span>
                </div>
                <em>03:40 AM</em>
              </div>
            </CometCard>
            <CometCard>
              <div className="fi">
                <div>
                  <b>Payment matched</b><br />
                  <span>Bank credit tied to its invoice. TDS 194C flagged.</span>
                </div>
                <em>06:05 AM</em>
              </div>
            </CometCard>
          </div>
        </div>
      </section>

      {/* 7. RECOVERY TOOLS SECTION (BLUE) */}
      <section className="blk blu scroll-mt-28" id="tools">
        <div className="wrap">
          <div className="hd">
            <h2 className="d">Recovery tools,<br />ready when you are.</h2>
            <p>Each one works from the invoices you already have.</p>
          </div>
          <div className="sc">
            <CometCard className="sc-card">
              <div className="sc-item" onClick={() => navigate("/invoices")}>
                <div>
                  <h3>Bank reconciliation</h3>
                  <p>Matches credits to invoices and detects TDS 194C/J automatically.</p>
                </div>
                <small>Open →</small>
              </div>
            </CometCard>
            <CometCard className="sc-card">
              <div className="sc-item" onClick={() => navigate("/customers")}>
                <div>
                  <h3>Customer discipline</h3>
                  <p>Payment grades A, B and C show who pays on time.</p>
                </div>
                <small>Open →</small>
              </div>
            </CometCard>
            <CometCard className="sc-card">
              <div className="sc-item" onClick={handleEnterDashboard}>
                <div>
                  <h3>Main app</h3>
                  <p>Open the full dashboard with every invoice and forecast.</p>
                </div>
                <small>Enter →</small>
              </div>
            </CometCard>
          </div>
        </div>
      </section>

      {/* 8. AUTOMATION SETUP SECTION */}
      <section className="wrap my-16 sm:my-24 scroll-mt-28" id="setup">
        <CometCard className="w-full">
          <div className="cfg">
            <h2 className="d">
              Automation is configured for {businessProfile.name ? `${businessProfile.name}${businessProfile.city ? `, ${businessProfile.city}` : ""}` : "Sharma Packaging Enterprises, Pune"}.
            </h2>
            <div>
              <ul>
                <li>
                  <b>WhatsApp &amp; payments</b>
                  <span>{businessProfile.phone || "9906639590"}</span>
                </li>
                <li>
                  <b>Email</b>
                  <span>{businessProfile.email || "arnavgos09@gmail.com"}</span>
                </li>
                <li>
                  <b>UPI</b>
                  <span>{businessProfile.upi || "sharmapackaging@hdfc"}</span>
                </li>
                <li>
                  <b>Signed in as</b>
                  <span>{user?.email || "billing@sharmapackaging.in"}</span>
                </li>
              </ul>
              <p style={{ marginTop: "18px", display: "flex", gap: "8px" }}>
                <button type="button" className="btn" onClick={() => navigate("/profile")}>
                  Profile
                </button>
                <button type="button" className="btn o" onClick={() => setIsOnboardingOpen(true)}>
                  Setup
                </button>
              </p>
            </div>
          </div>
        </CometCard>
      </section>

      {/* 9. BOTTOM CTA */}
      <section className="wrap">
        <CometCard className="w-full">
          <div className="cta" style={{ margin: 0 }}>
            <h2 className="d">Stop chasing<br />payments.</h2>
            <p>Upload one bill and see your cash forecast in about a minute.</p>
            <button type="button" className="btn" onClick={() => setIsCameraModalOpen(true)}>
              Upload bill (photo or PDF)
            </button>
          </div>
        </CometCard>
      </section>

      {/* 10. FOOTER */}
      <footer>
        <div className="wm" aria-label="apkainvoice">
          <span>a</span>
          <span>p</span>
          <span>k</span>
          <span>a</span>
          <span>i</span>
        </div>
        <div className="fc">
          <div>
            <b>Product</b>
            <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={() => navigate("/invoices")}>Invoices ledger</button>
            <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={() => navigate("/reminders")}>Reminders</button>
            <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={handleEnterDashboard}>Cash forecast</button>
          </div>
          <div>
            <b>Recovery</b>
            <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={() => navigate("/invoices")}>Bank reconciliation</button>
            <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={() => navigate("/customers")}>Payment grades</button>
          </div>
          <div>
            <b>Account</b>
            <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={() => navigate("/profile")}>Profile</button>
            <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={() => setIsOnboardingOpen(true)}>Setup</button>
            {!user ? (
              <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={handleGoogleSignIn}>Log in</button>
            ) : (
              <button type="button" className="text-left hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer text-xs" onClick={signOutUser}>Sign out</button>
            )}
          </div>
        </div>
        <p className="cp">© 2026 Apka Invoice. Built for Indian manufacturing and trading businesses.</p>
      </footer>

      {/* Invoice Camera / OCR Modal */}
      <InvoiceCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onInvoiceStored={(stored) => {
          setIsCameraModalOpen(false);
          navigate("/invoices");
        }}
      />

      {/* Onboarding & Business Profile Setup Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        currentUser={user}
        existingProfile={businessProfile}
        onComplete={() => {
          setIsOnboardingOpen(false);
          navigate("/dashboard");
        }}
      />
    </div>
  );
}
