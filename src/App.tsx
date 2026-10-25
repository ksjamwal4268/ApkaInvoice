import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Shell } from "./components/Shell";
import { Language } from "./data/i18n";
import { Dashboard } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import { Welcome } from "./pages/Welcome";
import { Invoices } from "./pages/Invoices";
import { InvoiceDetail } from "./pages/InvoiceDetail";
import { CreateInvoice } from "./pages/CreateInvoice";
import { Reminders } from "./pages/Reminders";
import { Customers } from "./pages/Customers";
import { CustomerPage } from "./pages/CustomerPage";
import { Dispute } from "./pages/Dispute";
import { DemandLetter } from "./pages/DemandLetter";
import { Forecast } from "./pages/Forecast";
import { BackgroundRippleEffect } from "./components/ui/background-ripple-effect";

export default function App() {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    // Always enforce clean white / light mode
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    localStorage.removeItem("cc-dark");

    const savedLang = localStorage.getItem("cc-lang") as Language;
    if (savedLang && (savedLang === "en" || savedLang === "hi" || savedLang === "mr")) {
      setLang(savedLang);
    }
  }, []);

  const onLangChange = (next: Language) => {
    setLang(next);
    localStorage.setItem("cc-lang", next);
  };

  return (
    <Router>
      <div className="relative min-h-screen w-full bg-slate-50/60 text-slate-900 overflow-x-hidden">
        {/* Whole-site interactive Background Boxes Ripple Effect */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <BackgroundRippleEffect />
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 min-h-screen">
          <Shell lang={lang} onLangChange={onLangChange}>
            <Routes>
              <Route path="/" element={<Welcome lang={lang} />} />
              <Route path="/welcome" element={<Welcome lang={lang} />} />
              <Route path="/profile" element={<Profile lang={lang} />} />
              <Route path="/dashboard" element={<Dashboard lang={lang} />} />
              <Route path="/invoices" element={<Invoices lang={lang} />} />
              <Route path="/invoices/:id" element={<InvoiceDetail lang={lang} />} />
              <Route path="/invoices/create" element={<CreateInvoice lang={lang} />} />
              <Route path="/invoices/:id/edit" element={<CreateInvoice lang={lang} isEditMode />} />
              <Route path="/payments" element={<Navigate to="/invoices" replace />} />
              <Route path="/reminders" element={<Reminders lang={lang} />} />
              <Route path="/demand-letter" element={<DemandLetter lang={lang} />} />
              <Route path="/customers" element={<Customers lang={lang} />} />
              <Route path="/customers/:id" element={<CustomerPage lang={lang} />} />
              <Route path="/dispute/:invoiceId" element={<Dispute lang={lang} />} />
              <Route path="/forecast" element={<Forecast lang={lang} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Shell>
        </div>
      </div>
    </Router>
  );
}
