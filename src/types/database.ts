export interface Category {
  id: string;
  name: string;
  type: "expense" | "income";
  color: string;
  emoji: string;
  created_at: string;
}

export interface Card {
  id: string;
  name: string;
  bank: string;
  color: string;
  created_at?: string;
}

export interface ExchangeRate {
  id: string;
  date: string;
  ccl_rate: number;
  blue_rate?: number;
  created_at?: string;
}

export interface Expense {
  id: string;
  date: string;
  category_id: string;
  detail: string;
  amount: number;
  currency: "ARS" | "USD";
  amount_ars: number;
  amount_usd: number;
  ccl_rate: number;
  installment_purchase_id?: string;
  created_at: string;
}

export interface Income {
  id: string;
  date: string;
  category_id: string;
  detail: string;
  amount: number;
  currency: "ARS" | "USD";
  amount_ars: number;
  amount_usd: number;
  ccl_rate: number;
  created_at: string;
}

export interface InstallmentPurchase {
  id: string;
  description: string;
  card_id: string;
  total_amount: number;
  paid_amount?: number;
  currency: "ARS" | "USD";
  total_installments: number;
  paid_installments: number;
  start_date: string;
  end_date?: string;
  counts_towards_balance: boolean;
  expense_id?: string;
  created_at: string;
}

export interface CardStatement {
  id: string;
  card_id: string;
  period_month: number;
  period_year: number;
  amount: number;
  currency: "ARS" | "USD";
  created_at?: string;
}

export interface Settings {
  id?: string;
  monthly_budget_ars: number;
  notification_email: string;
  ccl_auto_fetch: boolean;
}

// ─── Input types for mutations ───────────────────────────────

export interface CreateExpenseInput {
  date: string;
  category_id: string;
  detail: string;
  amount: number;
  currency: "ARS" | "USD";
  amount_ars: number;
  amount_usd: number;
  ccl_rate: number;
  installment_purchase_id?: string;
}

export interface CreateIncomeInput {
  date: string;
  category_id: string;
  detail: string;
  amount: number;
  currency: "ARS" | "USD";
  amount_ars: number;
  amount_usd: number;
  ccl_rate: number;
}

export interface CreateInstallmentInput {
  description: string;
  card_id: string;
  total_amount: number;
  paid_amount?: number;
  currency: "ARS" | "USD";
  total_installments: number;
  start_date: string;           // first day of next month from purchase date
  counts_towards_balance: boolean;
  create_expense: boolean;      // toggle: descontar del presupuesto ahora
  expense_category_id?: string;
  expense_date?: string;        // fecha de la compra (para el gasto asociado)
  ccl_rate?: number;
}
