import React from "react";
import { Globe, Sun, Moon } from "lucide-react";
import { t, Language } from "../data/i18n";

interface LanguageSwitchProps {
  lang: Language;
  onChange: (lang: Language) => void;
  dark: boolean;
  onToggleDark: () => void;
}

export function LanguageSwitch({
  lang,
  onChange,
  dark,
  onToggleDark,
}: LanguageSwitchProps): React.JSX.Element {
  const labels: Record<Language, string> = {
    en: "EN",
    hi: "हिन्दी",
    mr: "मराठी",
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <button
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 tap-target"
          aria-haspopup="listbox"
          aria-expanded="false"
        >
          <Globe className="w-4 h-4" />
          <span>{labels[lang]}</span>
        </button>
        <div className="absolute right-0 mt-2 w-24 bg-white border border-slate-200 rounded-md shadow-lg dark:bg-slate-800 dark:border-slate-700 z-50">
          {[
            { value: "en", label: "English" },
            { value: "hi", label: "हिन्दी" },
            { value: "mr", label: "मराठी" },
          ].map((l) => (
            <button
              key={l.value}
              onClick={() => onChange(l.value as Language)}
              className={`w-full text-left px-3 py-2 text-sm border-b hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 last:border-0 tap-target ${lang === l.value ? "bg-slate-100 dark:bg-slate-700 font-medium" : ""}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onToggleDark}
        className="w-8 h-8 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 tap-target"
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </div>
  );
}