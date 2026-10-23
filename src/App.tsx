import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Shell } from "./components/Shell";
import { t, Language } from "./data/i18n";
import { Dashboard } from "./pages/Dashboard";
import { Invoices } from "./pages/Invoices";
import { InvoiceDetail } from "./pages/InvoiceDetail";
import { CreateInvoice } from "./pages/CreateInvoice";
import { Payments } from "./pages/Payments";
import { Reminders } from "./pages/Reminders";
import { DemandLetter } from "./pages/DemandLetter";
import { CustomerPage } from "./pages/CustomerPage";
import { Dispute } from "./pages/Dispute";
import { Forecast } from "./pages/Forecast";

export default function App(): JSX.Element {
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/invoices/create" element={<CreateInvoice />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/demand-letter" element={<DemandLetter />} />
          <Route path="/customers/:id" element={<CustomerPage />} />
          <Route path="/dispute/:invoiceId" element={<Dispute />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </Router>
  );
}
