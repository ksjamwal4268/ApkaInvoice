import React from "react";
import { formatInr } from "../utils/money";

interface MoneyProps {
  paise: number;
  className?: string;
}

export function Money({ paise, className }: MoneyProps): React.JSX.Element {
  return (
    <span className={`tabular-nums ${className || ""}`}>
      {formatInr(paise)}
    </span>
  );
}