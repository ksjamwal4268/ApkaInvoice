import React from "react";
import { Sun, Moon } from "lucide-react";
import { Language } from "../data/i18n";

interface LanguageSwitchProps {
  lang?: Language;
  onChange?: (lang: Language) => void;
  dark: boolean;
  onToggleDark: () => void;
}

export function LanguageSwitch({
  dark,
  onToggleDark,
}: LanguageSwitchProps): React.JSX.Element {
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={onToggleDark}
        className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors tap-target shadow-xs"
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
      </button>
    </div>
  );
}