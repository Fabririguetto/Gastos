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
}

export interface InstallmentPurchase {
  id: string;
  description: string;
  card_id: string;
  total_amount: number;
  currency: "ARS" | "USD";
  total_installments: number;
  paid_installments: number;
  start_date: string;
  counts_towards_balance: boolean;
}

export interface CardStatement {
  id: string;
  card_id: string;
  period_month: number;
  period_year: number;
  amount: number;
  currency: "ARS" | "USD";
}

export interface ExchangeRate {
  id: string;
  date: string;
  ccl_rate: number;
}

export interface Settings {
  monthly_budget_ars: number;
  notification_email: string;
  ccl_auto_fetch: boolean;
}
