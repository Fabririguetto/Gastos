export interface InstallmentExpenseInput {
  purchaseId: string;
  description: string;
  totalAmount: number;
  paidAmount?: number;
  currency: "ARS" | "USD";
  totalInstallments: number;
  categoryId: string;
  startDate: string; // YYYY-MM-DD (primer mes de pago de tarjeta)
  registrationDate: string; // YYYY-MM-DD (fecha de carga/compra)
  countsTowardsBalance: boolean;
  ccl: number;
}

export function computeInstallmentDates(
  baseDateStr: string,
  totalInstallments: number,
): string[] {
  const [y, m, d] = baseDateStr.split("-").map(Number);
  return Array.from({ length: totalInstallments }, (_, i) => {
    const targetMonthTotal = m - 1 + i;
    const targetYear = y + Math.floor(targetMonthTotal / 12);
    const targetMonth = (targetMonthTotal % 12) + 1;
    const maxDays = new Date(targetYear, targetMonth, 0).getDate();
    const targetDay = Math.min(d, maxDays);
    return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
  });
}

export interface GeneratedExpenseRecord {
  date: string;
  category_id: string | null;
  detail: string;
  amount: number;
  currency: "ARS" | "USD";
  amount_ars: number;
  amount_usd: number;
  ccl_rate: number;
  installment_purchase_id: string;
}

export function buildDistributedExpenses(input: InstallmentExpenseInput): GeneratedExpenseRecord[] {
  const totalInst = Math.max(1, input.totalInstallments || 1);
  const paidTotal = input.paidAmount != null && input.paidAmount > 0 ? input.paidAmount : input.totalAmount;
  const perInstallment = paidTotal / totalInst;
  const isUSD = input.currency === "USD";
  const amount_ars = isUSD ? perInstallment * input.ccl : perInstallment;
  const amount_usd = isUSD ? perInstallment : perInstallment / input.ccl;

  // Si descuenta del saldo (Sí): la 1ra cuota impacta en el mes de carga (registrationDate) y las siguientes en los sucesivos.
  // Si NO descuenta del saldo (No): las cuotas impactan a partir del mes de pago de la tarjeta (startDate) y los sucesivos.
  let baseDate: string;
  if (input.countsTowardsBalance) {
    baseDate = input.registrationDate;
  } else {
    // Tomamos el año y mes de startDate, y el día de registrationDate (o de startDate si registrationDate no está)
    const [sy, sm] = input.startDate.split("-").map(Number);
    const [, , rd] = (input.registrationDate || input.startDate).split("-").map(Number);
    const maxDays = new Date(sy, sm, 0).getDate();
    const day = Math.min(rd || 1, maxDays);
    baseDate = `${sy}-${String(sm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const dates = computeInstallmentDates(baseDate, totalInst);

  return dates.map((date, i) => ({
    date,
    category_id: input.categoryId || null,
    detail: `${input.description} (cuota ${i + 1}/${totalInst})`,
    amount: perInstallment,
    currency: input.currency,
    amount_ars,
    amount_usd,
    ccl_rate: input.ccl,
    installment_purchase_id: input.purchaseId,
  }));
}
