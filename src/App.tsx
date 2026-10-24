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
import { Payments } from "./pages/Payments";
import { Reminders } from "./pages/Reminders";
import { DemandLetter } from "./pages/DemandLetter";
import { Customers } from "./pages/Customers";
import { CustomerPage } from "./pages/CustomerPage";
import { Dispute } from "./pages/Dispute";
import { Forecast } from "./pages/Forecast";

export default function App() {
  const [lang, setLang] = useState<Language>("en");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("cc-lang") as Language;
    if (savedLang && (savedLang === "en" || savedLang === "hi" || savedLang === "mr")) {
      setLang(savedLang);
    }
    const savedDark = localStorage.getItem("cc-dark");
    if (savedDark !== null) {
      setDark(savedDark === "true");
      if (savedDark === "true") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      }
    }
  }, []);

  const onLangChange = (next: Language) => {
    setLang(next);
    localStorage.setItem("cc-lang", next);
  };

  const onToggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("cc-dark", String(next));
    if (next) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  };

  return (
    <Router>
      <Shell lang={lang} onLangChange={onLangChange} dark={dark} onToggleDark={onToggleDark}>
        <Routes>
          <Route path="/" element={<Welcome lang={lang} />} />
          <Route path="/welcome" element={<Welcome lang={lang} />} />
          <Route path="/profile" element={<Profile lang={lang} />} />
          <Route path="/dashboard" element={<Dashboard lang={lang} />} />
          <Route path="/invoices" element={<Invoices lang={lang} />} />
          <Route path="/invoices/:id" element={<InvoiceDetail lang={lang} />} />
          <Route path="/invoices/create" element={<CreateInvoice lang={lang} />} />
          <Route path="/invoices/:id/edit" element={<CreateInvoice lang={lang} isEditMode />} />
          <Route path="/payments" element={<Payments lang={lang} />} />
          <Route path="/reminders" element={<Reminders lang={lang} />} />
          <Route path="/demand-letter" element={<DemandLetter lang={lang} />} />
          <Route path="/customers" element={<Customers lang={lang} />} />
          <Route path="/customers/:id" element={<CustomerPage lang={lang} />} />
          <Route path="/dispute/:invoiceId" element={<Dispute lang={lang} />} />
          <Route path="/forecast" element={<Forecast lang={lang} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </Router>
  );
}
