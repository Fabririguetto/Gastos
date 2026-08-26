import type { Category, Expense, Income, Card, InstallmentPurchase, CardStatement, ExchangeRate } from "@/types/database";

export const CATEGORIES: Category[] = [
  { id: "cat-1", name: "Casa", type: "expense", color: "#6366f1", emoji: "🏠", created_at: "2026-01-01" },
  { id: "cat-2", name: "Supermercado", type: "expense", color: "#10b981", emoji: "🛒", created_at: "2026-01-01" },
  { id: "cat-3", name: "Transporte", type: "expense", color: "#f59e0b", emoji: "🚗", created_at: "2026-01-01" },
  { id: "cat-4", name: "Salud", type: "expense", color: "#ef4444", emoji: "💊", created_at: "2026-01-01" },
  { id: "cat-5", name: "Entretenimiento", type: "expense", color: "#8b5cf6", emoji: "🎮", created_at: "2026-01-01" },
  { id: "cat-6", name: "Otros", type: "expense", color: "#6b7280", emoji: "📦", created_at: "2026-01-01" },
  { id: "cat-7", name: "Sueldo", type: "income", color: "#00e87a", emoji: "💼", created_at: "2026-01-01" },
  { id: "cat-8", name: "Regalo", type: "income", color: "#f472b6", emoji: "🎁", created_at: "2026-01-01" },
  { id: "cat-9", name: "Intereses", type: "income", color: "#0ea5e9", emoji: "📈", created_at: "2026-01-01" },
];

// CCL rates Jan-Aug 2026, trending from ~1000 to ~1548
export const EXCHANGE_RATES: ExchangeRate[] = [
  { id: "er-1", date: "2026-01-15", ccl_rate: 1002 },
  { id: "er-2", date: "2026-02-15", ccl_rate: 1085 },
  { id: "er-3", date: "2026-03-15", ccl_rate: 1148 },
  { id: "er-4", date: "2026-04-15", ccl_rate: 1215 },
  { id: "er-5", date: "2026-05-15", ccl_rate: 1310 },
  { id: "er-6", date: "2026-06-15", ccl_rate: 1392 },
  { id: "er-7", date: "2026-07-15", ccl_rate: 1468 },
  { id: "er-8", date: "2026-08-15", ccl_rate: 1548 },
];

export const CURRENT_CCL = 1548;

export const EXPENSES: Expense[] = [
  // August 2026
  { id: "e-1", date: "2026-08-01", category_id: "cat-1", detail: "Alquiler agosto", amount: 280000, currency: "ARS", amount_ars: 280000, amount_usd: 180.8, ccl_rate: 1548, created_at: "2026-08-01" },
  { id: "e-2", date: "2026-08-03", category_id: "cat-2", detail: "Carrefour semanal", amount: 42500, currency: "ARS", amount_ars: 42500, amount_usd: 27.5, ccl_rate: 1548, created_at: "2026-08-03" },
  { id: "e-3", date: "2026-08-05", category_id: "cat-3", detail: "SUBE recarga", amount: 8000, currency: "ARS", amount_ars: 8000, amount_usd: 5.2, ccl_rate: 1548, created_at: "2026-08-05" },
  { id: "e-4", date: "2026-08-07", category_id: "cat-5", detail: "Spotify Premium", amount: 6500, currency: "ARS", amount_ars: 6500, amount_usd: 4.2, ccl_rate: 1548, created_at: "2026-08-07" },
  { id: "e-5", date: "2026-08-10", category_id: "cat-4", detail: "Farmacia antibióticos", amount: 15200, currency: "ARS", amount_ars: 15200, amount_usd: 9.8, ccl_rate: 1548, created_at: "2026-08-10" },
  { id: "e-6", date: "2026-08-12", category_id: "cat-2", detail: "Disco supermercado", amount: 38900, currency: "ARS", amount_ars: 38900, amount_usd: 25.1, ccl_rate: 1548, created_at: "2026-08-12" },
  { id: "e-7", date: "2026-08-14", category_id: "cat-5", detail: "Cine + cena", amount: 28000, currency: "ARS", amount_ars: 28000, amount_usd: 18.1, ccl_rate: 1548, created_at: "2026-08-14" },
  { id: "e-8", date: "2026-08-16", category_id: "cat-3", detail: "Nafta", amount: 22000, currency: "ARS", amount_ars: 22000, amount_usd: 14.2, ccl_rate: 1548, created_at: "2026-08-16" },
  { id: "e-9", date: "2026-08-18", category_id: "cat-6", detail: "Regalo cumpleaños", amount: 35000, currency: "ARS", amount_ars: 35000, amount_usd: 22.6, ccl_rate: 1548, created_at: "2026-08-18" },
  { id: "e-10", date: "2026-08-20", category_id: "cat-2", detail: "Verdulería + carnicería", amount: 19800, currency: "ARS", amount_ars: 19800, amount_usd: 12.8, ccl_rate: 1548, created_at: "2026-08-20" },
  { id: "e-11", date: "2026-08-22", category_id: "cat-4", detail: "Médico clínico", amount: 18000, currency: "ARS", amount_ars: 18000, amount_usd: 11.6, ccl_rate: 1548, created_at: "2026-08-22" },
  { id: "e-12", date: "2026-08-24", category_id: "cat-5", detail: "Netflix", amount: 7200, currency: "ARS", amount_ars: 7200, amount_usd: 4.7, ccl_rate: 1548, created_at: "2026-08-24" },
  // July 2026
  { id: "e-13", date: "2026-07-01", category_id: "cat-1", detail: "Alquiler julio", amount: 265000, currency: "ARS", amount_ars: 265000, amount_usd: 180.5, ccl_rate: 1468, created_at: "2026-07-01" },
  { id: "e-14", date: "2026-07-05", category_id: "cat-2", detail: "Supermercado", amount: 89000, currency: "ARS", amount_ars: 89000, amount_usd: 60.6, ccl_rate: 1468, created_at: "2026-07-05" },
  { id: "e-15", date: "2026-07-10", category_id: "cat-3", detail: "Uber", amount: 12000, currency: "ARS", amount_ars: 12000, amount_usd: 8.2, ccl_rate: 1468, created_at: "2026-07-10" },
  { id: "e-16", date: "2026-07-15", category_id: "cat-5", detail: "Videojuego Steam", amount: 38500, currency: "ARS", amount_ars: 38500, amount_usd: 26.2, ccl_rate: 1468, created_at: "2026-07-15" },
  { id: "e-17", date: "2026-07-20", category_id: "cat-6", detail: "Ropa invierno", amount: 55000, currency: "ARS", amount_ars: 55000, amount_usd: 37.5, ccl_rate: 1468, created_at: "2026-07-20" },
  // June 2026
  { id: "e-18", date: "2026-06-01", category_id: "cat-1", detail: "Alquiler junio", amount: 250000, currency: "ARS", amount_ars: 250000, amount_usd: 179.6, ccl_rate: 1392, created_at: "2026-06-01" },
  { id: "e-19", date: "2026-06-08", category_id: "cat-2", detail: "Supermercado", amount: 76000, currency: "ARS", amount_ars: 76000, amount_usd: 54.6, ccl_rate: 1392, created_at: "2026-06-08" },
  { id: "e-20", date: "2026-06-15", category_id: "cat-4", detail: "Odontólogo", amount: 42000, currency: "ARS", amount_ars: 42000, amount_usd: 30.2, ccl_rate: 1392, created_at: "2026-06-15" },
];

export const INCOMES: Income[] = [
  { id: "i-1", date: "2026-08-05", category_id: "cat-7", detail: "Sueldo agosto", amount: 1580000, currency: "ARS", amount_ars: 1580000, amount_usd: 1020.7, ccl_rate: 1548, created_at: "2026-08-05" },
  { id: "i-2", date: "2026-08-10", category_id: "cat-9", detail: "Intereses plazo fijo", amount: 48500, currency: "ARS", amount_ars: 48500, amount_usd: 31.3, ccl_rate: 1548, created_at: "2026-08-10" },
  { id: "i-3", date: "2026-07-05", category_id: "cat-7", detail: "Sueldo julio", amount: 1480000, currency: "ARS", amount_ars: 1480000, amount_usd: 1008.2, ccl_rate: 1468, created_at: "2026-07-05" },
  { id: "i-4", date: "2026-07-20", category_id: "cat-8", detail: "Regalo cumpleaños", amount: 50000, currency: "ARS", amount_ars: 50000, amount_usd: 34.1, ccl_rate: 1468, created_at: "2026-07-20" },
  { id: "i-5", date: "2026-06-05", category_id: "cat-7", detail: "Sueldo junio", amount: 1380000, currency: "ARS", amount_ars: 1380000, amount_usd: 991.4, ccl_rate: 1392, created_at: "2026-06-05" },
  { id: "i-6", date: "2026-05-05", category_id: "cat-7", detail: "Sueldo mayo", amount: 1280000, currency: "ARS", amount_ars: 1280000, amount_usd: 977.1, ccl_rate: 1310, created_at: "2026-05-05" },
  { id: "i-7", date: "2026-04-05", category_id: "cat-7", detail: "Sueldo abril", amount: 1180000, currency: "ARS", amount_ars: 1180000, amount_usd: 971.2, ccl_rate: 1215, created_at: "2026-04-05" },
  { id: "i-8", date: "2026-03-05", category_id: "cat-7", detail: "Sueldo marzo", amount: 1080000, currency: "ARS", amount_ars: 1080000, amount_usd: 940.8, ccl_rate: 1148, created_at: "2026-03-05" },
  { id: "i-9", date: "2026-02-05", category_id: "cat-7", detail: "Sueldo febrero", amount: 980000, currency: "ARS", amount_ars: 980000, amount_usd: 903.7, ccl_rate: 1085, created_at: "2026-02-05" },
  { id: "i-10", date: "2026-01-05", category_id: "cat-7", detail: "Sueldo enero", amount: 920000, currency: "ARS", amount_ars: 920000, amount_usd: 918.2, ccl_rate: 1002, created_at: "2026-01-05" },
];

export const CARDS: Card[] = [
  { id: "card-1", name: "Visa Macro", bank: "Macro", color: "#00e87a" },
  { id: "card-2", name: "Mercado Pago", bank: "MP", color: "#0ea5e9" },
  { id: "card-3", name: "Naranja X", bank: "Naranja", color: "#f59e0b" },
];

export const INSTALLMENT_PURCHASES: InstallmentPurchase[] = [
  { id: "ip-1", description: "MacBook Air M3", card_id: "card-1", total_amount: 2400000, currency: "ARS", total_installments: 12, paid_installments: 4, start_date: "2026-05-01", counts_towards_balance: true },
  { id: "ip-2", description: "iPhone 16 Pro", card_id: "card-2", total_amount: 1800000, currency: "ARS", total_installments: 18, paid_installments: 2, start_date: "2026-07-01", counts_towards_balance: true },
  { id: "ip-3", description: "Heladera Samsung", card_id: "card-3", total_amount: 680000, currency: "ARS", total_installments: 6, paid_installments: 6, start_date: "2026-03-01", counts_towards_balance: false },
  { id: "ip-4", description: "Smart TV 55\"", card_id: "card-1", total_amount: 450000, currency: "ARS", total_installments: 6, paid_installments: 1, start_date: "2026-08-01", counts_towards_balance: true },
  { id: "ip-5", description: "Airfryer Xiaomi", card_id: "card-3", total_amount: 95000, currency: "ARS", total_installments: 3, paid_installments: 3, start_date: "2026-06-01", counts_towards_balance: false },
];

export const CARD_STATEMENTS: CardStatement[] = [
  { id: "cs-1", card_id: "card-1", period_month: 8, period_year: 2026, amount: 285000, currency: "ARS" },
  { id: "cs-2", card_id: "card-1", period_month: 7, period_year: 2026, amount: 268000, currency: "ARS" },
  { id: "cs-3", card_id: "card-2", period_month: 8, period_year: 2026, amount: 198000, currency: "ARS" },
  { id: "cs-4", card_id: "card-2", period_month: 7, period_year: 2026, amount: 175000, currency: "ARS" },
  { id: "cs-5", card_id: "card-3", period_month: 8, period_year: 2026, amount: 145000, currency: "ARS" },
  { id: "cs-6", card_id: "card-3", period_month: 7, period_year: 2026, amount: 132000, currency: "ARS" },
];

// Monthly aggregated data for charts Jan-Aug 2026
// balance = ingresos - gastos (cuotas tracked separately for compatibility)
export const MONTHLY_DATA = [
  { month: "Ene", dateKey: "2026-01", ingresos: 920000,  gastos: 380000, cuotas: 180000, balance: 540000,  ccl: 1002 },
  { month: "Feb", dateKey: "2026-02", ingresos: 980000,  gastos: 420000, cuotas: 185000, balance: 560000,  ccl: 1085 },
  { month: "Mar", dateKey: "2026-03", ingresos: 1080000, gastos: 460000, cuotas: 290000, balance: 620000,  ccl: 1148 },
  { month: "Abr", dateKey: "2026-04", ingresos: 1180000, gastos: 510000, cuotas: 295000, balance: 670000,  ccl: 1215 },
  { month: "May", dateKey: "2026-05", ingresos: 1280000, gastos: 540000, cuotas: 390000, balance: 740000,  ccl: 1310 },
  { month: "Jun", dateKey: "2026-06", ingresos: 1380000, gastos: 580000, cuotas: 415000, balance: 800000,  ccl: 1392 },
  { month: "Jul", dateKey: "2026-07", ingresos: 1530000, gastos: 620000, cuotas: 445000, balance: 910000,  ccl: 1468 },
  { month: "Ago", dateKey: "2026-08", ingresos: 1628500, gastos: 520100, cuotas: 623450, balance: 1108400, ccl: 1548 },
];

// Current month (August 2026) summary
export const CURRENT_MONTH = {
  ingresos_ars: 1628500,
  gastos_ars: 520100,
  cuotas_ars: 623450,
  saldo_ars: 1628500 - 520100 - 623450,
  budget_ars: 800000,
  ccl: 1548,
};

export const getCategoryById = (id: string): Category | undefined =>
  CATEGORIES.find((c) => c.id === id);

export const getCardById = (id: string): Card | undefined =>
  CARDS.find((c) => c.id === id);

export const formatARS = (amount: number): string =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);

export const formatUSD = (amount: number): string =>
  `u$d ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount)}`;

export const formatNumber = (amount: number): string =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount);
