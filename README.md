# Cash Copilot

**Cash Copilot** is a responsive React web app designed for small Indian manufacturing and trading businesses (MSMEs) to chase unpaid invoices and forecast cash shortages well before they happen.

Live Dev Server: `http://localhost:5173`

---

## 🌟 Key Features

1. **8-Week Cash Shortfall Forecasting (`/forecast` & `/`)**:
   - Ties out mathematically: `closing[i] = opening[i] + inflow − outflow` and `opening[i+1] = closing[i]`.
   - "What if they pay late?" slider to simulate impact of delayed payments on cash balances.
   - Shortfall week highlighted in red with actionable mitigation recommendations.

2. **GST Invoicing & Bill of Supply (`/invoices/create`)**:
   - Intra-state (CGST + SGST) vs Inter-state (IGST) automatic tax routing.
   - GST rounded per line item in whole paise.
   - Total amount converted into Indian currency words.
   - Upload invoice photo or CSV with interactive field extraction review modal.
   - Tax Invoice / Bill of Supply print and PDF preview modal.

3. **Bank Statement Reconciliation (`/payments`)**:
   - Upload bank statement CSV (supports UPI, NEFT, RTGS).
   - Auto-matches exact invoice sums and partial payments.
   - Automated detection of 1%, 2%, and 10% corporate TDS deductions (Section 194C / 194J).
   - Interactive manual linker for unmatched credits.

4. **4-Stage Reminder Ladder (`/reminders`)**:
   - Stage 1: Friendly reminder (0-3 days overdue)
   - Stage 2: Due-date reminder (4-7 days overdue)
   - Stage 3: Firm reminder (8-14 days overdue)
   - Stage 4: Demand letter (15+ days overdue)
   - Trilingual templates in **English, हिन्दी (Hindi), and मराठी (Marathi)**.
   - Prefilled `wa.me` WhatsApp links and `mailto:` email drafts.
   - Enforced safety guardrail: messages are never sent automatically; requires explicit approval.

5. **Customer Payment Discipline (`/customers` & `/customers/:id`)**:
   - Payment grades: Grade A (Fast payer), Grade B (Occasional delay), Grade C (High risk, chronic delay).
   - In-depth customer profile with historical invoices and average days late.

6. **Invoice Disputes (`/dispute/:invoiceId`)**:
   - Logging a dispute automatically pauses reminders and excludes invoice from forecast cash inflows.

7. **Trilingual & Dark Mode Support**:
   - Instant language switching between English, Hindi, and Marathi with persistence (`cc-lang`).
   - Dark/light mode theme toggle with persistence (`cc-dark`).

---

## 📁 Project Structure

```
cash-copilot/
├── src/
│   ├── components/
│   │   ├── DemoBanner.tsx      # Demo data indicator
│   │   ├── EmptyState.tsx      # Empty state with icon
│   │   ├── ForecastChart.tsx   # Recharts 8-week cash balance chart
│   │   ├── InvoiceTable.tsx    # Filterable invoice table
│   │   ├── KpiCard.tsx         # Summary metric card
│   │   ├── LanguageSwitch.tsx  # EN / HI / MR language & theme toggle
│   │   ├── Money.tsx           # Indian rupee formatted money display
│   │   ├── Shell.tsx           # Responsive layout (desktop sidebar + mobile bottom nav)
│   │   ├── StatusBadge.tsx     # Status badges (paid, due, overdue, disputed)
│   │   └── Timeline.tsx        # Event timeline for invoice detail
│   ├── data/
│   │   ├── i18n.ts             # Translations dictionary (EN, HI, MR) + safe t() helper
│   │   └── sampleData.ts       # Sharma Packaging business data, 6 customers, 12 invoices
│   ├── pages/
│   │   ├── Dashboard.tsx       # 4 KPIs, cash forecast chart, what-if slider, chase list
│   │   ├── Invoices.tsx        # Filterable invoice ledger with search & create action
│   │   ├── InvoiceDetail.tsx   # Full tax breakdown, timeline, dispute & demand actions
│   │   ├── CreateInvoice.tsx   # GST calculator, extracted fields review, PDF preview
│   │   ├── Payments.tsx        # Bank statement matcher, TDS review, unmatched credits
│   │   ├── Reminders.tsx       # 4-stage reminder ladder with wa.me & mailto drafts
│   │   ├── DemandLetter.tsx    # Formal payment demand letter with printable layout
│   │   ├── Customers.tsx       # Customer directory with grades and total debt
│   │   ├── CustomerPage.tsx    # Customer profile and invoice ledger
│   │   ├── Dispute.tsx         # Dispute submission form with auto-pause
│   │   └── Forecast.tsx        # Detailed 8-week cash flow table and action plan
│   └── utils/
│       ├── money.ts            # Whole paise arithmetic, formatInr, amountInWords
│       ├── date.ts             # Indian date formatting, computeDueDate, addDays
│       ├── forecast.ts         # Cash shortage engine & invariant verification
│       ├── gstin.ts            # Indian GSTIN validator
│       └── csv.ts              # CSV parser and bank statement matching logic
```

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npx vite
# Runs at http://localhost:5173
```

### 3. Build for Production
```bash
npm run build
# Type checks and builds production bundle into dist/
```
