import { Language } from "../data/i18n";
import { useGoogleAuth, GoogleUser, GOOGLE_CLIENT_ID } from "../utils/auth";

export function Welcome({ lang }: { lang: Language }) {
  const { user, isLoading, signIn, signOut } = useGoogleAuth();

  // Initialize KPI data
  const moneyOwed = totalOutstanding();
  const overdueAmount = totalOverdue(new Date());

  const fourWeeksFromNow = new Date();
  fourWeeksFromNow.setDate(fourWeeksFromNow.getDate() + 28);
  const expected4Weeks = INVOICES.reduce((sum, inv) => {
    if (inv.status === "disputed" || inv.status === "paid") return sum;
    if (inv.dueDate <= fourWeeksFromNow && inv.dueDate >= new Date() && inv.outstanding > 0) {
      return sum + inv.outstanding;
    }
    return sum;
  }, 0);

  const bills4Weeks = Object.values(DEFAULT_OUTFLOWS || []).reduce(
    (sum, o) => sum + o.amount,
    0
  );

  if (isLoading) {
    return null; // Will be handled by Shell's loading state
  }

  // Show different UI based on auth status
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 via-slate-100 to-white p-4 md:p-8 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-teal-600 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path className="stroke-2" strokeLinecap="round" strokeLinejoin="round" d="M12 19v2m0 0L9.937 11.09l-2.072-2.072a2.5 2.5 0 1 1 1.414-3.536L15 13.03l1.73-1.73a2.5 2.5 0 1 1 3.536 1.414l4.245-4.245a2.5 2.5 0 1 1 1.414 3.536L19.73 11M12 4a8 8 0 00-8 8v2m0-8V0m12 8a8 8 0 01-8 8v2m0-8v0m-9.53-9.033a3.5 3.5 0 017.06 0l.75.071a3.5 3.5 0 011.058 2.988l.162-.038a3.5 3.5 0 01.118-1.05l.25.165a3.5 3.5 0 01-.89 3.057l-.139.088a3.5 3.5 0 01-3.042-.602l-.14-.255a3.5 3.5 0 01-1.05-.89l-.089.139a3.5 3.5 0 01-2.988-.118l-.071.156a3.5 3.5 0 01-2.988-.118l-.156-.255a3.5 3.5 0 01-.602-1.05l-.088.139a3.5 3.5 0 01-3.042.602l-.139-.088a3.5 3.5 0 01-1.05-2.988l-.071-.156a3.5 3.5 0 01-.602-2.988l-.139-.088a3.5 3.5 0 01-1.05-2.988l-.088-.139a3.5 3.5 0 01-.602-2.988l-.156.255a3.5 3.5 0 01-.89 1.05l-.162.038a3.5 3.5 0 01-1.118 1.05l-.25-.165a3.5 3.5 0 01-.89-3.057l.139-.088a3.5 3.5 0 01-3.042.602l.14.255a3.5 3.5 0 01.89 3.057l-.071.156a3.5 3.5 0 01-.118 2.988l.071-.156a3.5 3.5 0 01.602-1.05l.156-.255a3.5 3.5 0 01.89-1.05l.162-.038a3.5 3.5 0 011.058-2.988l-.162-.038a3.5 3.5 0 01-1.058-2.988l-.25.165a3.5 3.5 0 01.89-3.057l-.14-.255a3.5 3.5 0 01.058-3.057l-.25-.165z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            {t("cash_copilot", lang)}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {t("sign_in_to_continue", lang)}
          </p>
          <button
            onClick={signIn}
            className="flex items-center gap-3 px-6 py-3 rounded-lg bg-teal-600 text-white font-medium text-sm hover:bg-teal-700 transition-colors"
          >
            {t("google_sign_in", lang)}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path className="stroke-2" strokeLinecap="round" strokeLinejoin="round" d="M12 19v2m0 0L9.937 11.09l-2.072-2.072a2.5 2.5 0 1 1 1.414-3.536L15 13.03l1.73-1.73a2.5 2.5 0 1 1 3.536 1.414l4.245-4.245a2.5 2.5 0 1 1 1.414 3.536L19.73 11M12 4a8 8 0 00-8 8v2m0-8V0m12 8a8 8 0 01-8 8v2m0-8v0" />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  // Authenticated user - show KPI cards
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 max-w-7xl mx-auto">
      <KpiCard
        title={t("money_owed", lang)}
        amount={formatInr(moneyOwed)}
        trending="up"
      />
      <KpiCard
        title={t("overdue", lang)}
        amount={formatInr(overdueAmount)}
        trending="down"
      />
      <KpiCard
        title={t("expected_in_4w", lang)}
        amount={formatInr(expected4Weeks)}
        trending="up"
      />
      <KpiCard
        title={t("bills_due_4w", lang)}
        amount={formatInr(bills4Weeks)}
        trending="side"
      />
    </div>
  );
}
