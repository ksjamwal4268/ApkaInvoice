import React from "react";
import { AlertCircle } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: React.JSX.Element;
}

export function EmptyState({
  title,
  message,
  action,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
      <h3 className="text-lg font-medium text-slate-900 dark:text-white">
        {title || "No data"}
      </h3>
      <p className="mt-1 text-slate-500 dark:text-slate-400 max-w-xs">
        {message || "Nothing to show here yet."}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}