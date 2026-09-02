"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, ChevronDown, Check, Search, Pencil, Trash2, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import type { InstallmentPurchase, Card, CardStatement, Category, CardClosingOverride } from "@/types/database";
import { WEEKDAY_NAMES, formatClosingDate, getEffectiveClosingDate, suggestFirstInstallmentDate } from "@/lib/cardClosing";

// Todos los montos de esta página se muestran con 2 decimales (a diferencia del resto de la app).
function fmt2(n: number): string {
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function defaultNextMonth(): string {
  const now = new Date();
  const y = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const m = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function thisMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// El resumen se carga cuando la tarjeta cierra (hoy), pero corresponde al mes en que se paga (el siguiente).
function resumenPeriod(): { year: number; month: number } {
  const now = new Date();
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const month = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
  return { year, month };
}

function BankInitials({ bank, color }: { bank: string; color: string }) {
  return (
    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${color}25`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", color, flexShrink: 0 }}>
      {bank.slice(0, 2).toUpperCase()}
    </div>
  );
}

function firstOfNextMonth(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toISOString().split("T")[0];
}

interface NewPurchaseForm {
  description: string;
  total_amount: string;
  paid_amount: string;
  currency: "ARS" | "USD";
  total_installments: string;
  card_id: string;
  category_id: string;
  start_date: string;
  counts_towards_balance: boolean;
}

function NewPurchaseModal({ open, onClose, onSave, cards, categories, currentCcl, editingPurchase, overrides }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: NewPurchaseForm) => Promise<void>;
  cards: Card[];
  categories: Category[];
  currentCcl: number;
  editingPurchase?: InstallmentPurchase | null;
  overrides: CardClosingOverride[];
}) {
  const today = new Date();

  function suggestedStartDateFor(cardId: string): string {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return firstOfNextMonth();
    return suggestFirstInstallmentDate(card, today.getFullYear(), today.getMonth() + 1, today.getDate(), overrides);
  }

  const blankForm: NewPurchaseForm = {
    description: "",
    total_amount: "",
    paid_amount: "",
    currency: "ARS",
    total_installments: "1",
    card_id: cards[0]?.id ?? "",
    category_id: categories[0]?.id ?? "",
    start_date: firstOfNextMonth(),
    counts_towards_balance: true,
  };

  const [form, setForm] = useState<NewPurchaseForm>(blankForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [startDateTouched, setStartDateTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
      if (editingPurchase) {
        setStartDateTouched(true);
        setForm({
          description: editingPurchase.description,
          total_amount: String(editingPurchase.total_amount),
          paid_amount: editingPurchase.paid_amount != null && editingPurchase.paid_amount !== editingPurchase.total_amount
            ? String(editingPurchase.paid_amount)
            : "",
          currency: editingPurchase.currency as "ARS" | "USD",
          total_installments: String(editingPurchase.total_installments),
          card_id: editingPurchase.card_id,
          category_id: editingPurchase.category_id ?? categories[0]?.id ?? "",
          start_date: editingPurchase.start_date,
          counts_towards_balance: editingPurchase.counts_towards_balance,
        });
      } else {
        const card_id = cards[0]?.id ?? "";
        setStartDateTouched(false);
        setForm({ ...blankForm, card_id, category_id: categories[0]?.id ?? "", start_date: suggestedStartDateFor(card_id) });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingPurchase]);

  useEffect(() => {
    if (open && !editingPurchase && !startDateTouched) {
      setForm((f) => ({ ...f, start_date: suggestedStartDateFor(f.card_id) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.card_id]);

  if (!open) return null;

  const amountNum = parseFloat(form.total_amount) || 0;
  const paidNum = parseFloat(form.paid_amount) || amountNum;
  const installmentsNum = parseInt(form.total_installments) || 1;
  const perInstallment = amountNum / installmentsNum;
  const perInstallmentMine = paidNum / installmentsNum;
  const isShared = paidNum > 0 && Math.abs(paidNum - amountNum) > 0.01;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.description.trim()) e.description = "La descripción es obligatoria";
    if (!form.total_amount || parseFloat(form.total_amount) <= 0) e.total_amount = "Ingresá un monto mayor a cero";
    if (!form.category_id) e.category_id = "Seleccioná una categoría";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(520px, calc(100vw - 32px))", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", zIndex: 101, display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700" }}>{editingPurchase ? "Editar compra" : "Nueva compra en cuotas"}</h2>
          <button onClick={onClose} style={{ background: "#252525", border: "none", color: "var(--text-muted)", cursor: "pointer", borderRadius: "6px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "24px", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Descripción *</label>
              <input type="text" placeholder="Ej: iPhone 16 Pro" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={errors.description ? { borderColor: "var(--error)" } : {}} />
              {errors.description && <p style={{ fontSize: "11px", color: "var(--error)", marginTop: "4px" }}>{errors.description}</p>}
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Moneda</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {(["ARS", "USD"] as const).map((cur) => (
                  <button key={cur} onClick={() => setForm({ ...form, currency: cur })} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `2px solid ${form.currency === cur ? (cur === "ARS" ? "var(--accent-green)" : "var(--accent-blue)") : "var(--border)"}`, background: form.currency === cur ? (cur === "ARS" ? "rgba(0,232,122,0.08)" : "rgba(14,165,233,0.08)") : "transparent", color: form.currency === cur ? (cur === "ARS" ? "var(--accent-green)" : "var(--accent-blue)") : "var(--text-muted)", cursor: "pointer", fontSize: "14px", fontWeight: "700", transition: "all 0.15s ease" }}>
                    {cur}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", minWidth: 0 }}>
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Monto total *</label>
                <input type="number" placeholder="0" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} style={errors.total_amount ? { borderColor: "var(--error)" } : {}} />
                {errors.total_amount && <p style={{ fontSize: "11px", color: "var(--error)", marginTop: "4px" }}>{errors.total_amount}</p>}
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>N° cuotas</label>
                <input type="number" min="1" max="60" value={form.total_installments} onChange={(e) => setForm({ ...form, total_installments: e.target.value })} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Lo que abonás vos{" "}
                <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: "11px" }}>(opcional — si compartís la compra)</span>
              </label>
              <input
                type="number"
                placeholder={form.total_amount || "= monto total"}
                value={form.paid_amount}
                onChange={(e) => setForm({ ...form, paid_amount: e.target.value })}
              />
            </div>

            {perInstallment > 0 && (
              <div style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)", borderRadius: "8px", padding: "12px 14px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-blue)" }}>
                  <span>Cuota tarjeta:</span>
                  <strong>${fmt2(perInstallment)} {form.currency}</strong>
                </div>
                {isShared && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-green)", marginTop: "6px" }}>
                    <span>Mi aporte/cuota:</span>
                    <strong>${fmt2(perInstallmentMine)} {form.currency}</strong>
                  </div>
                )}
                {form.currency === "USD" && (
                  <div style={{ color: "var(--text-muted)", marginTop: "6px", fontSize: "12px", textAlign: "right" }}>
                    ≈ ${fmt2(perInstallmentMine * currentCcl)} ARS/cuota
                  </div>
                )}
              </div>
            )}

            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tarjeta</label>
              <div style={{ position: "relative" }}>
                <select value={form.card_id} onChange={(e) => setForm({ ...form, card_id: e.target.value })} style={{ appearance: "none", paddingRight: "36px" }}>
                  {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Primera cuota (mes)</label>
              <input type="date" value={form.start_date} onChange={(e) => { setStartDateTouched(true); setForm({ ...form, start_date: e.target.value }); }} />
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                {editingPurchase ? "Por defecto el 1° del próximo mes" : "Sugerido según la fecha de cierre de la tarjeta"}
              </p>
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Categoría *</label>
              <div style={{ position: "relative" }}>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  style={{ appearance: "none", paddingRight: "36px", ...(errors.category_id ? { borderColor: "var(--error)" } : {}) }}
                >
                  <option value="">— Seleccioná una categoría —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              </div>
              {errors.category_id && <p style={{ fontSize: "11px", color: "var(--error)", marginTop: "4px" }}>{errors.category_id}</p>}
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                Se usa para calcular el gasto por categoría en Analytics, aunque no descuente del saldo.
              </p>
            </div>

            <div style={{ background: "#202020", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: "600" }}>¿Descuenta de mi saldo?</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    {form.counts_towards_balance
                      ? "Cada cuota se registra como gasto automáticamente"
                      : "Solo seguimiento — no impacta en el balance"}
                  </p>
                </div>
                <button onClick={() => setForm({ ...form, counts_towards_balance: !form.counts_towards_balance })} style={{ width: "44px", height: "24px", borderRadius: "12px", border: "none", background: form.counts_towards_balance ? "var(--accent-green)" : "var(--border)", cursor: "pointer", position: "relative", transition: "background 0.2s ease", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: "3px", left: form.counts_towards_balance ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "white", transition: "left 0.2s ease" }} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: "12px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "8px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>
            Cancelar
          </button>
          <button
            disabled={saving}
            onClick={async () => {
              if (!validate()) return;
              setSaving(true);
              await onSave(form);
              setSaving(false);
            }}
            style={{ flex: 2, padding: "12px", borderRadius: "8px", background: saving ? "#1d4731" : "var(--accent-green)", border: "none", color: "#0f0f0f", cursor: saving ? "default" : "pointer", fontSize: "14px", fontWeight: "700", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Guardando..." : editingPurchase ? "Guardar cambios" : "Guardar compra"}
          </button>
        </div>
      </div>
    </>
  );
}

function CargarResumenModal({ open, card, statements, onClose, onSave }: {
  open: boolean;
  card: Card | null;
  statements: CardStatement[];
  onClose: () => void;
  onSave: (cardId: string, periodYear: number, periodMonth: number, amountArs: number | null, amountUsd: number | null, discountAmount: number | null, discountCurrency: "ARS" | "USD" | null) => Promise<void>;
}) {
  const [period, setPeriod] = useState("");
  const [amountArs, setAmountArs] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [payWithUsdAccount, setPayWithUsdAccount] = useState(false);
  const [montoAQuitar, setMontoAQuitar] = useState("");
  const [payCurrency, setPayCurrency] = useState<"ARS" | "USD">("ARS");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && card) {
      const { year, month } = resumenPeriod();
      setPeriod(`${year}-${String(month).padStart(2, "0")}`);
      setSaved(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card?.id]);

  useEffect(() => {
    if (open && card && period) {
      const [py, pm] = period.split("-").map(Number);
      const existing = statements.find((s) => s.card_id === card.id && s.period_year === py && s.period_month === pm);
      setAmountArs(existing?.amount_ars != null ? String(existing.amount_ars) : "");
      setAmountUsd(existing?.amount_usd != null ? String(existing.amount_usd) : "");
      setPayWithUsdAccount(existing?.discount_amount != null);
      setMontoAQuitar(existing?.discount_amount != null ? String(existing.discount_amount) : "");
      setPayCurrency(existing?.discount_currency ?? "ARS");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, card?.id]);

  if (!open || !card) return null;

  const arsNum = parseFloat(amountArs) || 0;
  const usdNum = parseFloat(amountUsd) || 0;
  const isValid = arsNum > 0 || usdNum > 0;
  const montoAQuitarNum = parseFloat(montoAQuitar) || 0;
  const grossInPayCurrency = payCurrency === "ARS" ? arsNum : usdNum;
  const montoAPagar = grossInPayCurrency - montoAQuitarNum;

  const handleSave = async () => {
    if (!isValid || !period) return;
    setSaving(true);
    const [py, pm] = period.split("-").map(Number);
    const hasDiscount = payWithUsdAccount && montoAQuitarNum > 0;
    await onSave(
      card.id,
      py,
      pm,
      arsNum > 0 ? arsNum : null,
      usdNum > 0 ? usdNum : null,
      hasDiscount ? montoAQuitarNum : null,
      hasDiscount ? payCurrency : null,
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(440px, calc(100vw - 32px))", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", zIndex: 101, overflow: "hidden" }}>
        <div style={{ height: "4px", background: card.color }} />
        <div style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>Cargar resumen</h2>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{card.name}</p>
            </div>
            <button onClick={onClose} style={{ background: "#252525", border: "none", color: "var(--text-muted)", cursor: "pointer", borderRadius: "6px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={16} />
            </button>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px", lineHeight: 1.5 }}>
            Ingresá el monto real del resumen. Estos números incluyen impuestos y recargos. Completá al menos una moneda.
          </p>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Mes en que se paga <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: "11px" }}>(no el de cierre)</span>
            </label>
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Monto del resumen (ARS)</label>
            <input type="number" placeholder="Ej: 285000" value={amountArs} onChange={(e) => setAmountArs(e.target.value)} style={{ fontSize: "20px", fontWeight: "700" }} />
          </div>
          <div style={{ marginBottom: "24px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Monto del resumen (USD)</label>
            <input type="number" placeholder="Ej: 120" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} style={{ fontSize: "20px", fontWeight: "700" }} />
          </div>

          {usdNum > 0 && (
            <div style={{ background: "#202020", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: "600" }}>¿Pagás con dólares de tu cuenta?</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Ingresá el monto que te van a descontar del resumen
                  </p>
                </div>
                <button onClick={() => setPayWithUsdAccount(!payWithUsdAccount)} style={{ width: "44px", height: "24px", borderRadius: "12px", border: "none", background: payWithUsdAccount ? "var(--accent-green)" : "var(--border)", cursor: "pointer", position: "relative", transition: "background 0.2s ease", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: "3px", left: payWithUsdAccount ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "white", transition: "left 0.2s ease" }} />
                </button>
              </div>
              {payWithUsdAccount && (
                <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <label style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Me lo descuentan en</label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {(["ARS", "USD"] as const).map((cur) => (
                        <button
                          key={cur}
                          onClick={() => setPayCurrency(cur)}
                          style={{ padding: "6px 12px", borderRadius: "6px", border: `2px solid ${payCurrency === cur ? card.color : "var(--border)"}`, background: payCurrency === cur ? `${card.color}12` : "transparent", color: payCurrency === cur ? card.color : "var(--text-muted)", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}
                        >
                          {cur}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginTop: "12px" }}>
                    <label style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Monto a quitar ({payCurrency})</label>
                    <input
                      type="number"
                      placeholder="Ej: 36"
                      value={montoAQuitar}
                      onChange={(e) => setMontoAQuitar(e.target.value)}
                      style={{ width: "100px", textAlign: "right", fontSize: "14px", fontWeight: "600" }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                    <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Monto a abonar</span>
                    <strong style={{ fontSize: "18px", color: card.color, fontVariantNumeric: "tabular-nums" }}>
                      {payCurrency === "ARS" ? "$" : "U$D "}{fmt2(montoAPagar)}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "8px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!isValid || saving} style={{ flex: 2, padding: "12px", borderRadius: "8px", background: saved ? "#1d4731" : card.color, border: "none", color: saved ? "var(--accent-green)" : "#0f0f0f", cursor: !isValid ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "background 0.2s ease", opacity: !isValid ? 0.5 : 1 }}>
              {saved ? <><Check size={16} />Guardado</> : "Guardar resumen"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

type ClosingRule = "none" | "fixed_day" | "last_weekday";

function ClosingConfigModal({ open, card, overrides, onClose, onSave }: {
  open: boolean;
  card: Card | null;
  overrides: CardClosingOverride[];
  onClose: () => void;
  onSave: (cardId: string, rule: ClosingRule, closingDay: number | null, closingWeekday: number | null, overrideDate: string | null) => Promise<void>;
}) {
  const [rule, setRule] = useState<ClosingRule>("none");
  const [closingDay, setClosingDay] = useState("10");
  const [closingWeekday, setClosingWeekday] = useState(4);
  const [overrideDate, setOverrideDate] = useState("");
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const periodYear = now.getFullYear();
  const periodMonth = now.getMonth() + 1;

  useEffect(() => {
    if (open && card) {
      setRule((card.closing_rule as ClosingRule) ?? "none");
      setClosingDay(card.closing_day ? String(card.closing_day) : "10");
      setClosingWeekday(card.closing_weekday ?? 4);
      const existingOverride = overrides.find(
        (o) => o.card_id === card.id && o.period_year === periodYear && o.period_month === periodMonth,
      );
      setOverrideDate(existingOverride?.closing_date ?? "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card]);

  if (!open || !card) return null;

  const effectiveClosing = getEffectiveClosingDate(
    { id: card.id, closing_rule: rule, closing_day: parseInt(closingDay) || null, closing_weekday: closingWeekday },
    periodYear,
    periodMonth,
    overrideDate ? [{ id: "preview", card_id: card.id, period_year: periodYear, period_month: periodMonth, closing_date: overrideDate }] : [],
  );

  const handleSave = async () => {
    setSaving(true);
    await onSave(
      card.id,
      rule,
      rule === "fixed_day" ? parseInt(closingDay) || null : null,
      rule === "last_weekday" ? closingWeekday : null,
      overrideDate || null,
    );
    setSaving(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(440px, calc(100vw - 32px))", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", zIndex: 101, overflow: "hidden" }}>
        <div style={{ height: "4px", background: card.color }} />
        <div style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>Fecha de cierre</h2>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{card.name}</p>
            </div>
            <button onClick={onClose} style={{ background: "#252525", border: "none", color: "var(--text-muted)", cursor: "pointer", borderRadius: "6px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={16} />
            </button>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px", lineHeight: 1.5 }}>
            Si una compra se carga después del cierre, la primera cuota se sugiere para el mes siguiente al habitual.
          </p>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Regla de cierre</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {([
                { key: "none" as const, label: "Sin regla" },
                { key: "fixed_day" as const, label: "Día fijo del mes" },
                { key: "last_weekday" as const, label: "Último día de la semana" },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setRule(opt.key)}
                  style={{ textAlign: "left", padding: "10px 12px", borderRadius: "8px", border: `2px solid ${rule === opt.key ? card.color : "var(--border)"}`, background: rule === opt.key ? `${card.color}12` : "transparent", color: rule === opt.key ? card.color : "var(--text-muted)", cursor: "pointer", fontSize: "13px", fontWeight: "600", transition: "all 0.15s ease" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {rule === "fixed_day" && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Día del mes</label>
              <input type="number" min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} />
            </div>
          )}

          {rule === "last_weekday" && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Día de la semana</label>
              <div style={{ position: "relative" }}>
                <select value={closingWeekday} onChange={(e) => setClosingWeekday(parseInt(e.target.value))} style={{ appearance: "none", paddingRight: "36px" }}>
                  {WEEKDAY_NAMES.map((name, idx) => <option key={idx} value={idx}>{name}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              </div>
            </div>
          )}

          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Corrección solo para este mes <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: "11px" }}>(opcional)</span>
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} style={{ flex: 1 }} />
              {overrideDate && (
                <button onClick={() => setOverrideDate("")} style={{ padding: "0 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
                  Quitar
                </button>
              )}
            </div>
          </div>

          <div style={{ background: "#202020", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px 14px", marginBottom: "20px", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
            <span style={{ color: "var(--text-muted)" }}>Cierre efectivo este mes</span>
            <strong style={{ color: card.color }}>{effectiveClosing ?? "Sin definir"}</strong>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "8px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "12px", borderRadius: "8px", background: card.color, border: "none", color: "#0f0f0f", cursor: saving ? "default" : "pointer", fontSize: "14px", fontWeight: "700", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

// Fecha local (no UTC) en formato YYYY-MM-DD, para no correrse de día cerca de medianoche en husos horarios negativos.
function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function localDateFromISO(iso: string | undefined | null): string {
  return toLocalDateString(iso ? new Date(iso) : new Date());
}

// Cuotas transcurridas hasta el mes "desde" del filtro, tomando start_date como arranque.
function elapsedInstallments(startDate: string, refMonth: string, totalInstallments: number): number {
  const [sy, sm] = startDate.split("-").map(Number);
  const [ry, rm] = refMonth.split("-").map(Number);
  // +1: el mes de start_date ya corresponde a la cuota 1, no a la cuota 0.
  const elapsed = (ry - sy) * 12 + (rm - sm) + 1;
  return Math.max(0, Math.min(elapsed, totalInstallments));
}

function buildExpenseRecords(
  purchaseId: string,
  form: NewPurchaseForm,
  ccl: number,
  registrationDate: string,
): object[] {
  const totalInst = parseInt(form.total_installments) || 1;
  const paidTotal = parseFloat(form.paid_amount || form.total_amount) || 0;
  const perInstallment = paidTotal / totalInst;
  const isUSD = form.currency === "USD";
  const amount_ars = isUSD ? perInstallment * ccl : perInstallment;
  const amount_usd = isUSD ? perInstallment : perInstallment / ccl;

  return Array.from({ length: totalInst }, (_, i) => ({
    // El gasto se carga con la fecha real de registro; la cuota se sigue imputando a su mes vía start_date/end_date en installment_purchases.
    date: registrationDate,
    category_id: form.category_id || null,
    detail: `${form.description} (cuota ${i + 1}/${totalInst})`,
    amount: perInstallment,
    currency: form.currency,
    amount_ars,
    amount_usd,
    ccl_rate: ccl,
    installment_purchase_id: purchaseId,
  }));
}

// ─── Page ─────────────────────────────────────────────────────

export default function CuotasPage() {
  const { showToast } = useToast();
  const [cards, setCards] = useState<Card[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [purchases, setPurchases] = useState<InstallmentPurchase[]>([]);
  const [statements, setStatements] = useState<CardStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCcl, setCurrentCcl] = useState(1548);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<InstallmentPurchase | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resumenModal, setResumenModal] = useState<{ open: boolean; card: Card | null }>({ open: false, card: null });
  const [closingModal, setClosingModal] = useState<{ open: boolean; card: Card | null }>({ open: false, card: null });
  const [overrides, setOverrides] = useState<CardClosingOverride[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(defaultNextMonth());
  const [sortKey, setSortKey] = useState<"description" | "start_date" | "progress" | "amount">("start_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sb = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cardsRes, catsRes, purchasesRes, statementsRes, rateRes, overridesRes] = await Promise.all([
        sb.from("cards").select("*").order("name"),
        sb.from("categories").select("*").eq("type", "expense").order("name"),
        sb.from("installment_purchases").select("*").order("created_at", { ascending: false }),
        sb.from("card_statements").select("*").order("period_year", { ascending: false }).order("period_month", { ascending: false }),
        sb.from("exchange_rates").select("ccl_rate").order("date", { ascending: false }).limit(1).maybeSingle(),
        sb.from("card_closing_overrides").select("*"),
      ]);

      if (cardsRes.data) setCards(cardsRes.data);
      if (catsRes.data) setCategories(catsRes.data);
      if (purchasesRes.data) setPurchases(purchasesRes.data);
      if (statementsRes.data) setStatements(statementsRes.data);
      if (rateRes.data) setCurrentCcl(Number(rateRes.data.ccl_rate));
      if (overridesRes.data) setOverrides(overridesRes.data);
    } catch {
      showToast("Error cargando datos", "error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Una compra "entra" en el mes seleccionado si ese mes cae entre su primera y su última cuota.
  const filteredPurchases = purchases.filter((p) => {
    if (selectedMonth) {
      const startKey = p.start_date.slice(0, 7);
      const endKey = (p.end_date ?? p.start_date).slice(0, 7);
      if (startKey > selectedMonth || endKey < selectedMonth) return false;
    }
    if (searchQuery && !p.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  function toggleSort(key: typeof sortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }
  const progressRefMonth = selectedMonth ?? thisMonthKey();
  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "description") cmp = a.description.localeCompare(b.description);
    else if (sortKey === "start_date") cmp = a.start_date.localeCompare(b.start_date);
    else if (sortKey === "progress") {
      cmp = (elapsedInstallments(a.start_date, progressRefMonth, a.total_installments) / a.total_installments)
        - (elapsedInstallments(b.start_date, progressRefMonth, b.total_installments) / b.total_installments);
    }
    else if (sortKey === "amount") cmp = (Number(a.total_amount) / a.total_installments) - (Number(b.total_amount) / b.total_installments);
    return sortDir === "asc" ? cmp : -cmp;
  });
  const SI = ({ k }: { k: typeof sortKey }) =>
    <span style={{ marginLeft: "4px", fontSize: "10px", opacity: sortKey === k ? 1 : 0.35 }}>{sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>;

  // Consumo del mes: monto total de las compras que se ORIGINARON este mes (no la cuota prorrateada).
  const consumoDelMesArs = selectedMonth
    ? purchases.filter((p) => p.currency === "ARS" && p.start_date.slice(0, 7) === selectedMonth).reduce((s, p) => s + Number(p.total_amount), 0)
    : 0;
  const consumoDelMesUsd = selectedMonth
    ? purchases.filter((p) => p.currency === "USD" && p.start_date.slice(0, 7) === selectedMonth).reduce((s, p) => s + Number(p.total_amount), 0)
    : 0;

  // ─── Crear cuota ────────────────────────────────────────────

  const handleSavePurchase = async (data: NewPurchaseForm) => {
    try {
      const [sy, sm] = data.start_date.split("-").map(Number);
      const totalInst = parseInt(data.total_installments) || 1;
      const endMonthTotal = sm + totalInst - 1;
      const endYear = sy + Math.floor((endMonthTotal - 1) / 12);
      const endMonth = ((endMonthTotal - 1) % 12) + 1;
      const end_date = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

      const { data: inserted, error } = await sb.from("installment_purchases").insert({
        description: data.description,
        card_id: data.card_id,
        category_id: data.category_id || null,
        total_amount: parseFloat(data.total_amount) || 0,
        paid_amount: parseFloat(data.paid_amount || data.total_amount) || 0,
        currency: data.currency,
        total_installments: totalInst,
        paid_installments: 0,
        start_date: data.start_date,
        end_date,
        counts_towards_balance: data.counts_towards_balance,
      }).select("id, created_at").single();

      if (error) throw error;

      if (data.counts_towards_balance && inserted?.id) {
        const registrationDate = localDateFromISO(inserted.created_at);
        const expenses = buildExpenseRecords(inserted.id, data, currentCcl, registrationDate);
        const { error: expErr } = await sb.from("expenses").insert(expenses);
        if (expErr) throw expErr;
      }

      showToast("Compra registrada", "success");
      setModalOpen(false);
      await loadData();
    } catch {
      showToast("Error al guardar la compra", "error");
    }
  };

  // ─── Editar cuota ───────────────────────────────────────────

  const handleUpdatePurchase = async (data: NewPurchaseForm) => {
    if (!editingPurchase) return;
    try {
      const [sy, sm] = data.start_date.split("-").map(Number);
      const totalInst = parseInt(data.total_installments) || 1;
      const endMonthTotal = sm + totalInst - 1;
      const endYear = sy + Math.floor((endMonthTotal - 1) / 12);
      const endMonth = ((endMonthTotal - 1) % 12) + 1;
      const end_date = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

      // Borrar los gastos existentes ligados a esta cuota
      await sb.from("expenses").delete().eq("installment_purchase_id", editingPurchase.id);

      const { error } = await sb.from("installment_purchases").update({
        description: data.description,
        card_id: data.card_id,
        category_id: data.category_id || null,
        total_amount: parseFloat(data.total_amount) || 0,
        paid_amount: parseFloat(data.paid_amount || data.total_amount) || 0,
        currency: data.currency,
        total_installments: totalInst,
        start_date: data.start_date,
        end_date,
        counts_towards_balance: data.counts_towards_balance,
      }).eq("id", editingPurchase.id);

      if (error) throw error;

      if (data.counts_towards_balance) {
        const registrationDate = localDateFromISO(editingPurchase.created_at);
        const expenses = buildExpenseRecords(editingPurchase.id, data, currentCcl, registrationDate);
        const { error: expErr } = await sb.from("expenses").insert(expenses);
        if (expErr) throw expErr;
      }

      showToast("Compra actualizada", "success");
      setEditingPurchase(null);
      setModalOpen(false);
      await loadData();
    } catch {
      showToast("Error al actualizar la compra", "error");
    }
  };

  // ─── Eliminar cuota ─────────────────────────────────────────

  const handleDeletePurchase = async (id: string) => {
    try {
      await sb.from("expenses").delete().eq("installment_purchase_id", id);
      const { error } = await sb.from("installment_purchases").delete().eq("id", id);
      if (error) throw error;
      showToast("Compra eliminada", "success");
      setDeletingId(null);
      await loadData();
    } catch {
      showToast("Error al eliminar la compra", "error");
    }
  };

  // ─── Resumen tarjeta ────────────────────────────────────────

  const handleSaveResumen = async (
    cardId: string,
    periodYear: number,
    periodMonth: number,
    amountArs: number | null,
    amountUsd: number | null,
    discountAmount: number | null,
    discountCurrency: "ARS" | "USD" | null,
  ) => {
    try {
      const { error } = await sb.from("card_statements").upsert(
        {
          card_id: cardId, period_month: periodMonth, period_year: periodYear,
          amount_ars: amountArs, amount_usd: amountUsd,
          discount_amount: discountAmount, discount_currency: discountCurrency,
        },
        { onConflict: "card_id,period_month,period_year" }
      );
      if (error) throw error;
      showToast("Resumen guardado", "success");
      await loadData();
    } catch {
      showToast("Error al guardar el resumen", "error");
    }
  };

  // ─── Fecha de cierre de tarjeta ───────────────────────────────

  const handleSaveClosing = async (
    cardId: string,
    rule: "none" | "fixed_day" | "last_weekday",
    closingDay: number | null,
    closingWeekday: number | null,
    overrideDate: string | null,
  ) => {
    try {
      const { error } = await sb.from("cards").update({
        closing_rule: rule,
        closing_day: closingDay,
        closing_weekday: closingWeekday,
      }).eq("id", cardId);
      if (error) throw error;

      const now = new Date();
      const period_month = now.getMonth() + 1;
      const period_year = now.getFullYear();

      if (overrideDate) {
        const { error: ovError } = await sb.from("card_closing_overrides").upsert(
          { card_id: cardId, period_month, period_year, closing_date: overrideDate },
          { onConflict: "card_id,period_month,period_year" }
        );
        if (ovError) throw ovError;
      } else {
        await sb.from("card_closing_overrides").delete()
          .eq("card_id", cardId).eq("period_month", period_month).eq("period_year", period_year);
      }

      showToast("Cierre actualizado", "success");
      setClosingModal({ open: false, card: null });
      await loadData();
    } catch {
      showToast("Error al guardar el cierre", "error");
    }
  };

  return (
    <div className="page-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "36px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.02em" }}>Cuotas & Tarjetas</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{filteredPurchases.length} compras</p>
        </div>
        <button onClick={() => setModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", background: "var(--accent-green)", border: "none", borderRadius: "8px", color: "#0f0f0f", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}>
          <Plus size={16} strokeWidth={2.5} /> Nueva compra
        </button>
      </div>

      {loading ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "80px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Cargando...</p>
        </div>
      ) : (
        <>
          {/* Cards por tarjeta */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", marginBottom: "44px" }}>
            {cards.map((card) => {
              const [cardsRefYear, cardsRefMonthNum] = progressRefMonth.split("-").map(Number);
              // Con un mes elegido: el resumen guardado para ese mes puntual (mismo mes en que se paga, no en que cierra).
              // En Histórico: el más reciente guardado.
              const latestStatement = selectedMonth
                ? statements.find((s) => s.card_id === card.id && s.period_year === cardsRefYear && s.period_month === cardsRefMonthNum)
                : statements.filter((s) => s.card_id === card.id).sort((a, b) => b.period_year - a.period_year || b.period_month - a.period_month)[0];
              // Compras activas en el mes de referencia (el filtrado, o el actual en Histórico).
              const activeForCard = purchases.filter((p) => {
                if (p.card_id !== card.id) return false;
                const startKey = p.start_date.slice(0, 7);
                const endKey = (p.end_date ?? p.start_date).slice(0, 7);
                return startKey <= progressRefMonth && endKey >= progressRefMonth;
              });
              // La cuota real del resumen incluye TODAS las compras activas, descuenten o no del saldo personal.
              const cuotaTarjetaArs = activeForCard.filter((p) => p.currency === "ARS").reduce((s, p) => s + Number(p.total_amount) / p.total_installments, 0);
              const cuotaTarjetaUsd = activeForCard.filter((p) => p.currency === "USD").reduce((s, p) => s + Number(p.total_amount) / p.total_installments, 0);
              const cuotaMineArs = activeForCard.filter((p) => p.currency === "ARS").reduce((s, p) => s + Number(p.paid_amount ?? p.total_amount) / p.total_installments, 0);
              const cuotaMineUsd = activeForCard.filter((p) => p.currency === "USD").reduce((s, p) => s + Number(p.paid_amount ?? p.total_amount) / p.total_installments, 0);
              const cuotaTarjeta = cuotaTarjetaArs + cuotaTarjetaUsd * currentCcl;
              const cuotaMine = cuotaMineArs + cuotaMineUsd * currentCcl;
              const isSharedCard = Math.abs(cuotaTarjeta - cuotaMine) > 1;
              const closingLabel = formatClosingDate(card, cardsRefYear, cardsRefMonthNum, overrides) ?? "Sin definir";

              return (
                <div key={card.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: card.color, borderRadius: "14px 14px 0 0" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <BankInitials bank={card.bank} color={card.color} />
                    <div>
                      <p style={{ fontSize: "15px", fontWeight: "700" }}>{card.name}</p>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{card.bank}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Último resumen</span>
                      <div style={{ textAlign: "right" }}>
                        {latestStatement ? (
                          <>
                            {latestStatement.amount_ars != null && (
                              <div style={{ fontSize: "14px", fontWeight: "700", fontVariantNumeric: "tabular-nums" }}>
                                ${fmt2(latestStatement.amount_ars)}
                              </div>
                            )}
                            {latestStatement.amount_usd != null && (
                              <div style={{ fontSize: latestStatement.amount_ars != null ? "12px" : "14px", fontWeight: latestStatement.amount_ars != null ? 600 : 700, color: latestStatement.amount_ars != null ? "var(--text-muted)" : "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                                U$D {fmt2(latestStatement.amount_usd)}
                              </div>
                            )}
                            {latestStatement.discount_amount != null && latestStatement.discount_currency && (
                              <div style={{ fontSize: "11px", color: "var(--accent-green)", marginTop: "2px" }}>
                                A abonar: {latestStatement.discount_currency === "ARS" ? "$" : "U$D "}
                                {fmt2((latestStatement.discount_currency === "ARS" ? latestStatement.amount_ars ?? 0 : latestStatement.amount_usd ?? 0) - latestStatement.discount_amount)}
                              </div>
                            )}
                          </>
                        ) : (
                          <span style={{ fontSize: "14px", fontWeight: "700" }}>Sin datos</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Cuotas activas</span>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: card.color }}>{activeForCard.length}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Cuota tarjeta est.</span>
                      <div style={{ textAlign: "right" }}>
                        {cuotaTarjetaArs > 0 && (
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent-blue)", fontVariantNumeric: "tabular-nums" }}>
                            ${fmt2(cuotaTarjetaArs)}
                          </div>
                        )}
                        {cuotaTarjetaUsd > 0 && (
                          <div style={{ fontSize: cuotaTarjetaArs > 0 ? "12px" : "14px", fontWeight: cuotaTarjetaArs > 0 ? 500 : 600, color: "var(--accent-blue)", fontVariantNumeric: "tabular-nums" }}>
                            U$D {fmt2(cuotaTarjetaUsd)}
                          </div>
                        )}
                        {cuotaTarjetaArs === 0 && cuotaTarjetaUsd === 0 && (
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent-blue)" }}>$0</div>
                        )}
                      </div>
                    </div>
                    {isSharedCard && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Mi aporte est.</span>
                        <div style={{ textAlign: "right" }}>
                          {cuotaMineArs > 0 && (
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent-green)", fontVariantNumeric: "tabular-nums" }}>
                              ${fmt2(cuotaMineArs)}
                            </div>
                          )}
                          {cuotaMineUsd > 0 && (
                            <div style={{ fontSize: cuotaMineArs > 0 ? "12px" : "14px", fontWeight: cuotaMineArs > 0 ? 500 : 600, color: "var(--accent-green)", fontVariantNumeric: "tabular-nums" }}>
                              U$D {fmt2(cuotaMineUsd)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Cierre este mes</span>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>{closingLabel}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                    <button onClick={() => setResumenModal({ open: true, card })} style={{ flex: 1, padding: "9px", borderRadius: "8px", border: `1px solid ${card.color}50`, background: `${card.color}10`, color: card.color, fontSize: "13px", fontWeight: "600", cursor: "pointer", transition: "all 0.15s ease" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${card.color}20`; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${card.color}10`; }}>
                      Cargar resumen
                    </button>
                    <button onClick={() => setClosingModal({ open: true, card })} title="Configurar cierre" style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}>
                      <Settings2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cuotas activas */}
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <h2 style={{ fontSize: "16px", fontWeight: "700" }}>Cuotas</h2>
                <div style={{ position: "relative", flex: "0 1 220px" }}>
                  <Search size={13} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                  <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: "32px", width: "100%" }} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <input
                  type="month"
                  value={selectedMonth ?? ""}
                  onChange={(e) => setSelectedMonth(e.target.value || null)}
                  style={{ padding: "6px 10px", fontSize: "13px" }}
                />
                <button
                  onClick={() => setSelectedMonth(selectedMonth ? null : defaultNextMonth())}
                  style={{
                    padding: "6px 12px", borderRadius: "6px",
                    border: `1px solid ${selectedMonth === null ? "var(--accent-green)" : "var(--border)"}`,
                    background: selectedMonth === null ? "rgba(0,232,122,0.1)" : "transparent",
                    color: selectedMonth === null ? "var(--accent-green)" : "var(--text-muted)",
                    fontSize: "12px", fontWeight: selectedMonth === null ? 600 : 400, cursor: "pointer",
                  }}
                >
                  Histórico
                </button>
                {selectedMonth && (consumoDelMesArs > 0 || consumoDelMesUsd > 0) && (
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Consumo del mes:{" "}
                    <strong style={{ color: "var(--text-primary)" }}>
                      {consumoDelMesArs > 0 && `$${fmt2(consumoDelMesArs)}`}
                      {consumoDelMesArs > 0 && consumoDelMesUsd > 0 && " · "}
                      {consumoDelMesUsd > 0 && `U$D ${fmt2(consumoDelMesUsd)}`}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            {filteredPurchases.length === 0 ? (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "60px 24px", textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
                <p style={{ fontSize: "16px", fontWeight: "600" }}>Sin cuotas en este período</p>
                <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "6px" }}>No hay compras en el rango seleccionado</p>
              </div>
            ) : (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                <table style={{ minWidth: "920px" }}>
                  <thead>
                    <tr>
                      <th><button onClick={() => toggleSort("description")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "inherit", fontWeight: "inherit", padding: 0 }}>Descripción<SI k="description" /></button></th>
                      <th>Cargado</th>
                      <th>Tarjeta</th>
                      <th>Pago inicial</th>
                      <th>Pago final</th>
                      <th><button onClick={() => toggleSort("start_date")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "inherit", fontWeight: "inherit", padding: 0 }}>Progreso<SI k="start_date" /></button></th>
                      <th style={{ textAlign: "right" }}><button onClick={() => toggleSort("amount")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "inherit", fontWeight: "inherit", padding: 0 }}>Cuota/mes<SI k="amount" /></button></th>
                      <th style={{ textAlign: "center" }}>Descuenta</th>
                      <th style={{ textAlign: "center", width: "90px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPurchases.map((p) => {
                      const card = cards.find((c) => c.id === p.card_id);
                      const cat = categories.find((c) => c.id === p.category_id);
                      const paidAtFilter = elapsedInstallments(p.start_date, progressRefMonth, p.total_installments);
                      const pct = Math.round((paidAtFilter / p.total_installments) * 100);
                      const cuotaCard = Number(p.total_amount) / p.total_installments;
                      const cuotaMy = Number(p.paid_amount ?? p.total_amount) / p.total_installments;
                      const rowShared = Math.abs(cuotaCard - cuotaMy) > 0.5;
                      return (
                        <tr key={p.id}>
                          <td>
                            <span style={{ fontSize: "14px", fontWeight: "500" }}>{p.description}</span>
                            {cat && <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{cat.emoji} {cat.name}</div>}
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: "13px", whiteSpace: "nowrap" }}>
                            {p.created_at ? new Date(p.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          </td>
                          <td>
                            {card && <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: 500, background: `${card.color}20`, color: card.color }}>{card.name}</span>}
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: "13px", whiteSpace: "nowrap" }}>
                            {new Date(p.start_date + "T12:00:00").toLocaleDateString("es-AR", { month: "short", year: "numeric" })}
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: "13px", whiteSpace: "nowrap" }}>
                            {new Date((p.end_date ?? p.start_date) + "T12:00:00").toLocaleDateString("es-AR", { month: "short", year: "numeric" })}
                          </td>
                          <td style={{ minWidth: "140px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ flex: 1, height: "5px", background: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: card?.color ?? "var(--accent-green)", borderRadius: "3px" }} />
                              </div>
                              <span style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{paidAtFilter}/{p.total_installments}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            <span style={{ fontWeight: "600", fontSize: "14px", color: "var(--accent-blue)" }}>
                              ${fmt2(cuotaCard)}
                              <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "4px" }}>{p.currency}</span>
                            </span>
                            {rowShared && (
                              <div style={{ fontSize: "12px", color: "var(--accent-green)", marginTop: "2px" }}>
                                mío: ${fmt2(cuotaMy)}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: 600, background: p.counts_towards_balance ? "rgba(0,232,122,0.12)" : "rgba(107,114,128,0.12)", color: p.counts_towards_balance ? "var(--accent-green)" : "var(--text-muted)" }}>
                              {p.counts_towards_balance ? "Sí" : "No"}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                              <button
                                onClick={() => { setEditingPurchase(p); setModalOpen(true); }}
                                title="Editar"
                                style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--text-muted)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                              >
                                <Pencil size={13} />
                              </button>
                              {deletingId === p.id ? (
                                <button
                                  onClick={() => handleDeletePurchase(p.id)}
                                  style={{ padding: "0 8px", height: "28px", borderRadius: "6px", border: "1px solid var(--error)", background: "rgba(239,68,68,0.12)", color: "var(--error)", cursor: "pointer", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap" }}
                                  onBlur={() => setDeletingId(null)}
                                >
                                  ¿Eliminar?
                                </button>
                              ) : (
                                <button
                                  onClick={() => setDeletingId(p.id)}
                                  title="Eliminar"
                                  style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--error)"; e.currentTarget.style.borderColor = "var(--error)"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <NewPurchaseModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingPurchase(null); }}
        onSave={editingPurchase ? handleUpdatePurchase : handleSavePurchase}
        cards={cards}
        categories={categories}
        currentCcl={currentCcl}
        editingPurchase={editingPurchase}
        overrides={overrides}
      />
      <CargarResumenModal open={resumenModal.open} card={resumenModal.card} statements={statements} onClose={() => setResumenModal({ open: false, card: null })} onSave={handleSaveResumen} />
      <ClosingConfigModal open={closingModal.open} card={closingModal.card} overrides={overrides} onClose={() => setClosingModal({ open: false, card: null })} onSave={handleSaveClosing} />
    </div>
  );
}
