import { createClient } from "./client";
import type {
  Expense,
  Income,
  Category,
  Card,
  InstallmentPurchase,
  CardStatement,
  ExchangeRate,
  Settings,
  CreateExpenseInput,
  CreateIncomeInput,
  CreateInstallmentInput,
} from "@/types/database";

// ─── Categories ───────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from("categories")
    .select("*")
    .order("type")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

// ─── Cards ───────────────────────────────────────────────────

export async function getCards(): Promise<Card[]> {
  const sb = createClient();
  const { data, error } = await sb.from("cards").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

// ─── Exchange rates ───────────────────────────────────────────

export async function saveExchangeRate(ccl: number, blue?: number): Promise<void> {
  const sb = createClient();
  const today = new Date().toISOString().split("T")[0];
  await sb.from("exchange_rates").upsert(
    { date: today, ccl_rate: ccl, blue_rate: blue },
    { onConflict: "date" }
  );
}

export async function getLatestExchangeRate(): Promise<ExchangeRate | null> {
  const sb = createClient();
  const { data } = await sb
    .from("exchange_rates")
    .select("*")
    .order("date", { ascending: false })
    .limit(1)
    .single();
  return data ?? null;
}

// ─── Expenses ────────────────────────────────────────────────

export async function getExpenses(
  year: number,
  month: number,
  opts?: { search?: string; category_id?: string }
): Promise<Expense[]> {
  const sb = createClient();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-31`;

  let q = sb
    .from("expenses")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });

  if (opts?.category_id && opts.category_id !== "all") {
    q = q.eq("category_id", opts.category_id);
  }
  if (opts?.search) {
    q = q.ilike("detail", `%${opts.search}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const sb = createClient();
  const { data, error } = await sb
    .from("expenses")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateExpense(id: string, input: Partial<CreateExpenseInput>): Promise<Expense> {
  const sb = createClient();
  const { data, error } = await sb
    .from("expenses")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

// ─── Incomes ─────────────────────────────────────────────────

export async function getIncomes(
  year: number,
  month: number,
  opts?: { search?: string; category_id?: string }
): Promise<Income[]> {
  const sb = createClient();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-31`;

  let q = sb
    .from("incomes")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });

  if (opts?.category_id && opts.category_id !== "all") {
    q = q.eq("category_id", opts.category_id);
  }
  if (opts?.search) {
    q = q.ilike("detail", `%${opts.search}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createIncome(input: CreateIncomeInput): Promise<Income> {
  const sb = createClient();
  const { data, error } = await sb
    .from("incomes")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateIncome(id: string, input: Partial<CreateIncomeInput>): Promise<Income> {
  const sb = createClient();
  const { data, error } = await sb
    .from("incomes")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteIncome(id: string): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from("incomes").delete().eq("id", id);
  if (error) throw error;
}

// ─── Month summary (for Dashboard) ───────────────────────────

export async function getMonthSummary(year: number, month: number) {
  const sb = createClient();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-31`;

  const [expensesRes, incomesRes] = await Promise.all([
    sb.from("expenses").select("amount_ars").gte("date", from).lte("date", to),
    sb.from("incomes").select("amount_ars").gte("date", from).lte("date", to),
  ]);

  const gastos_ars = (expensesRes.data ?? []).reduce((s, e) => s + Number(e.amount_ars), 0);
  const ingresos_ars = (incomesRes.data ?? []).reduce((s, i) => s + Number(i.amount_ars), 0);

  // Cuotas activas en este mes
  const cuotas_ars = await getInstallmentsTotalForMonth(year, month);

  return {
    ingresos_ars,
    gastos_ars,
    cuotas_ars,
    saldo_ars: ingresos_ars - gastos_ars - cuotas_ars,
  };
}

// ─── Installment Purchases ───────────────────────────────────

export async function getInstallmentPurchases(opts?: { search?: string }): Promise<InstallmentPurchase[]> {
  const sb = createClient();
  let q = sb
    .from("installment_purchases")
    .select("*")
    .order("created_at", { ascending: false });

  if (opts?.search) {
    q = q.ilike("description", `%${opts.search}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getInstallmentsTotalForMonth(year: number, month: number): Promise<number> {
  const sb = createClient();
  const targetDate = `${year}-${String(month).padStart(2, "0")}-01`;

  // Active = start_date <= target month AND (end_date >= target month OR end_date IS NULL)
  const { data, error } = await sb
    .from("installment_purchases")
    .select("total_amount, paid_amount, total_installments")
    .lte("start_date", targetDate)
    .or(`end_date.gte.${targetDate},end_date.is.null`)
    .lt("paid_installments", sb.from("installment_purchases").select("total_installments") as unknown as string);

  if (error) {
    // Fallback: compute in JS if the query is too complex
    const { data: all } = await sb
      .from("installment_purchases")
      .select("total_amount, paid_amount, total_installments, start_date, paid_installments");

    const [sy, sm] = [year, month];
    return (all ?? []).reduce((sum, p) => {
      const [py, pm] = p.start_date.split("-").map(Number);
      const monthsFromStart = (sy - py) * 12 + (sm - pm);
      if (monthsFromStart >= 0 && monthsFromStart < p.total_installments) {
        const base = p.paid_amount ?? p.total_amount;
        return sum + base / p.total_installments;
      }
      return sum;
    }, 0);
  }

  return (data ?? []).reduce((sum, p) => {
    const base = p.paid_amount ?? p.total_amount;
    return sum + base / p.total_installments;
  }, 0);
}

export async function createInstallmentPurchase(input: CreateInstallmentInput): Promise<InstallmentPurchase> {
  const sb = createClient();

  // Compute end_date
  const [sy, sm] = input.start_date.split("-").map(Number);
  const endMonthTotal = sm + input.total_installments - 1;
  const endYear = sy + Math.floor((endMonthTotal - 1) / 12);
  const endMonth = ((endMonthTotal - 1) % 12) + 1;
  const end_date = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const { data: purchase, error } = await sb
    .from("installment_purchases")
    .insert({
      description: input.description,
      card_id: input.card_id,
      total_amount: input.total_amount,
      paid_amount: input.paid_amount,
      currency: input.currency,
      total_installments: input.total_installments,
      paid_installments: 0,
      start_date: input.start_date,
      end_date,
      counts_towards_balance: input.counts_towards_balance,
    })
    .select()
    .single();

  if (error) throw error;

  // If toggle is on: also create an expense entry
  if (input.create_expense && purchase) {
    const ccl = input.ccl_rate ?? 1548;
    const amount = input.paid_amount ?? input.total_amount;
    const amount_ars = input.currency === "ARS" ? amount : amount * ccl;
    const amount_usd = input.currency === "USD" ? amount : amount / ccl;

    const { data: expense } = await sb
      .from("expenses")
      .insert({
        date: input.expense_date ?? new Date().toISOString().split("T")[0],
        category_id: input.expense_category_id,
        detail: input.description,
        amount,
        currency: input.currency,
        amount_ars,
        amount_usd,
        ccl_rate: ccl,
        installment_purchase_id: purchase.id,
      })
      .select()
      .single();

    if (expense) {
      await sb
        .from("installment_purchases")
        .update({ expense_id: expense.id })
        .eq("id", purchase.id);
    }
  }

  return purchase;
}

// ─── Card Statements ─────────────────────────────────────────

export async function getCardStatements(): Promise<CardStatement[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from("card_statements")
    .select("*")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertCardStatement(
  card_id: string,
  period_month: number,
  period_year: number,
  amount: number,
  currency: "ARS" | "USD"
): Promise<CardStatement> {
  const sb = createClient();
  const { data, error } = await sb
    .from("card_statements")
    .upsert({ card_id, period_month, period_year, amount, currency }, { onConflict: "card_id,period_month,period_year" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Settings ────────────────────────────────────────────────

export async function getSettings(): Promise<Settings | null> {
  const sb = createClient();
  const { data } = await sb.from("settings").select("*").limit(1).single();
  return data ?? null;
}

export async function updateSettings(updates: Partial<Settings>): Promise<void> {
  const sb = createClient();
  const { data: existing } = await sb.from("settings").select("id").limit(1).single();
  if (existing) {
    await sb.from("settings").update(updates).eq("id", existing.id);
  } else {
    await sb.from("settings").insert(updates);
  }
}
