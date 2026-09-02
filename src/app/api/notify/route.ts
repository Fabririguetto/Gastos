import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

function monthName(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createAdminClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to   = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // ── Fetch data ──────────────────────────────────────────────
  const [expensesRes, incomesRes, allExpensesRes, allIncomesRes, categoriesRes, allPurchasesRes] = await Promise.all([
    sb.from("expenses").select("amount_ars, category_id").gte("date", from).lte("date", to),
    sb.from("incomes").select("amount_ars").gte("date", from).lte("date", to),
    sb.from("expenses").select("amount_ars").lte("date", to),
    sb.from("incomes").select("amount_ars").lte("date", to),
    sb.from("categories").select("id, name, emoji, color").eq("type", "expense"),
    sb.from("installment_purchases")
      .select("description, total_amount, paid_amount, total_installments, paid_installments, currency"),
  ]);

  for (const [label, res] of [
    ["expenses", expensesRes], ["incomes", incomesRes],
    ["allExpenses", allExpensesRes], ["allIncomes", allIncomesRes],
    ["categories", categoriesRes], ["purchases", allPurchasesRes],
  ] as const) {
    if (res.error) console.error(`[notify] ${label} query failed:`, res.error);
  }

  const expenses       = expensesRes.data ?? [];
  const incomes        = incomesRes.data ?? [];
  const cats           = categoriesRes.data ?? [];
  const allPurchases   = allPurchasesRes.data ?? [];
  const activePurchases = allPurchases.filter(p => p.paid_installments < p.total_installments);

  const totalGastos   = expenses.reduce((s, e) => s + Number(e.amount_ars), 0);
  const totalIngresos = incomes.reduce((s, i) => s + Number(i.amount_ars), 0);

  // Saldo histórico: all-time ingresos - all-time gastos
  const histIngresos = (allIncomesRes.data ?? []).reduce((s, i) => s + Number(i.amount_ars), 0);
  const histGastos   = (allExpensesRes.data ?? []).reduce((s, e) => s + Number(e.amount_ars), 0);
  const saldo        = histIngresos - histGastos;

  // Top categories
  const catTotals: Record<string, number> = {};
  for (const e of expenses) {
    if (e.category_id) catTotals[e.category_id] = (catTotals[e.category_id] ?? 0) + Number(e.amount_ars);
  }
  const topCats = Object.entries(catTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, total]) => {
      const cat = cats.find(c => c.id === id);
      return { name: cat?.name ?? "Otros", emoji: cat?.emoji ?? "📦", total };
    });

  // ── Email HTML ──────────────────────────────────────────────
  const saldoColor = saldo >= 0 ? "#00c96a" : "#ef4444";

  const topCatsRows = topCats.map(c => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;color:#e0e0e0;">
        ${c.emoji} ${c.name}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;text-align:right;font-size:14px;font-weight:600;color:#ffffff;font-variant-numeric:tabular-nums;">
        $${fmt(c.total)}
      </td>
    </tr>`).join("");

  const cuotasRows = activePurchases.slice(0, 8).map(p => {
    const cuota = Number(p.paid_amount ?? p.total_amount) / p.total_installments;
    const pct   = Math.round((p.paid_installments / p.total_installments) * 100);
    return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;color:#e0e0e0;">
        ${p.description}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;text-align:center;font-size:12px;color:#888;">
        ${p.paid_installments}/${p.total_installments} (${pct}%)
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;text-align:right;font-size:14px;font-weight:600;color:#5b9bd5;font-variant-numeric:tabular-nums;">
        $${fmt(cuota)} ${p.currency}
      </td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="padding-bottom:32px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#00e87a;border-radius:50%;width:36px;height:36px;text-align:center;vertical-align:middle;">
                <span style="font-size:20px;font-weight:800;color:#0f0f0f;line-height:36px;">G</span>
              </td>
              <td style="padding-left:12px;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">
                gas<span style="color:#00e87a;">tos</span>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">
            Resumen semanal
          </p>
          <p style="margin:4px 0 0;font-size:13px;color:#666;text-transform:capitalize;">
            ${monthName(month, year)}
          </p>
        </td></tr>

        <!-- Balance -->
        <tr><td style="background:#1a1a1a;border-radius:12px;padding:24px;margin-bottom:16px;">
          <p style="margin:0 0 16px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#555;">Balance del mes</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align:center;padding:0 8px;">
                <p style="margin:0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.08em;">Ingresos</p>
                <p style="margin:6px 0 0;font-size:24px;font-weight:700;color:#00e87a;font-variant-numeric:tabular-nums;">$${fmt(totalIngresos)}</p>
              </td>
              <td style="text-align:center;padding:0 8px;border-left:1px solid #2a2a2a;border-right:1px solid #2a2a2a;">
                <p style="margin:0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.08em;">Gastos</p>
                <p style="margin:6px 0 0;font-size:24px;font-weight:700;color:#ef4444;font-variant-numeric:tabular-nums;">$${fmt(totalGastos)}</p>
              </td>
              <td style="text-align:center;padding:0 8px;">
                <p style="margin:0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.08em;">Balance</p>
                <p style="margin:6px 0 0;font-size:24px;font-weight:700;color:${saldoColor};font-variant-numeric:tabular-nums;">${saldo >= 0 ? "+" : ""}$${fmt(saldo)}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="height:16px;"></td></tr>

        <!-- Top categorías -->
        ${topCats.length > 0 ? `
        <tr><td style="background:#1a1a1a;border-radius:12px;padding:24px;">
          <p style="margin:0 0 16px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#555;">Top categorías</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${topCatsRows}
          </table>
        </td></tr>
        <tr><td style="height:16px;"></td></tr>
        ` : ""}

        <!-- Cuotas activas -->
        ${activePurchases.length > 0 ? `
        <tr><td style="background:#1a1a1a;border-radius:12px;padding:24px;">
          <p style="margin:0 0 16px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#555;">
            Cuotas activas <span style="color:#444;font-weight:400;">(${activePurchases.length})</span>
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <th style="text-align:left;font-size:11px;color:#555;padding-bottom:8px;font-weight:600;">Descripción</th>
              <th style="text-align:center;font-size:11px;color:#555;padding-bottom:8px;font-weight:600;">Progreso</th>
              <th style="text-align:right;font-size:11px;color:#555;padding-bottom:8px;font-weight:600;">Cuota/mes</th>
            </tr>
            ${cuotasRows}
          </table>
        </td></tr>
        <tr><td style="height:16px;"></td></tr>
        ` : ""}

        <!-- Footer -->
        <tr><td style="padding-top:8px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#444;">
            Resumen automático de <strong style="color:#666;">gastos app</strong> · Todos los lunes a las 9am
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // ── Send ────────────────────────────────────────────────────
  const to_email = process.env.NOTIFICATION_EMAIL ?? "fabririguetto@gmail.com";

  const { error } = await resend.emails.send({
    from: "Gastos App <onboarding@resend.dev>",
    to: [to_email],
    subject: `Resumen semanal — ${monthName(month, year)}`,
    html,
  });

  if (error) {
    console.error("[notify]", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent_to: to_email });
}
