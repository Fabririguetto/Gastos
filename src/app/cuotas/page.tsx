"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, ChevronDown, Check, Search, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { DateRangeFilter, DateRange, nextMonthRange } from "@/components/ui/DateRangeFilter";
import type { InstallmentPurchase, Card, CardStatement, Category } from "@/types/database";

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

function NewPurchaseModal({ open, onClose, onSave, cards, categories, currentCcl, editingPurchase }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: NewPurchaseForm) => Promise<void>;
  cards: Card[];
  categories: Category[];
  currentCcl: number;
  editingPurchase?: InstallmentPurchase | null;
}) {
  const blankForm: NewPurchaseForm = {
    description: "",
    total_amount: "",
    paid_amount: "",
    currency: "ARS",
    total_installments: "12",
    card_id: cards[0]?.id ?? "",
    category_id: categories[0]?.id ?? "",
    start_date: firstOfNextMonth(),
    counts_towards_balance: true,
  };

  const [form, setForm] = useState<NewPurchaseForm>(blankForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
      if (editingPurchase) {
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
        setForm({ ...blankForm, card_id: cards[0]?.id ?? "", category_id: categories[0]?.id ?? "" });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingPurchase]);

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
    if (form.counts_towards_balance && !form.category_id) e.category_id = "Seleccioná una categoría";
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
                  <strong>${new Intl.NumberFormat("es-AR").format(Math.round(perInstallment))} {form.currency}</strong>
                </div>
                {isShared && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-green)", marginTop: "6px" }}>
                    <span>Mi aporte/cuota:</span>
                    <strong>${new Intl.NumberFormat("es-AR").format(Math.round(perInstallmentMine))} {form.currency}</strong>
                  </div>
                )}
                {form.currency === "USD" && (
                  <div style={{ color: "var(--text-muted)", marginTop: "6px", fontSize: "12px", textAlign: "right" }}>
                    ≈ ${new Intl.NumberFormat("es-AR").format(Math.round(perInstallmentMine * currentCcl))} ARS/cuota
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
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Por defecto el 1° del próximo mes</p>
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

            {form.counts_towards_balance && (
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Categoría del gasto *</label>
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
              </div>
            )}
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

function CargarResumenModal({ open, card, onClose, onSave }: {
  open: boolean;
  card: Card | null;
  onClose: () => void;
  onSave: (cardId: string, amount: number, currency: "ARS" | "USD") => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setAmount(""); setSaved(false); }
  }, [open]);

  if (!open || !card) return null;

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    setSaving(true);
    await onSave(card.id, num, currency);
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
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{card.name} · {new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })}</p>
            </div>
            <button onClick={onClose} style={{ background: "#252525", border: "none", color: "var(--text-muted)", cursor: "pointer", borderRadius: "6px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={16} />
            </button>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px", lineHeight: 1.5 }}>
            Ingresá el monto real del resumen. Este número incluye impuestos y recargos.
          </p>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Moneda</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["ARS", "USD"] as const).map((cur) => (
                <button key={cur} onClick={() => setCurrency(cur)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `2px solid ${currency === cur ? card.color : "var(--border)"}`, background: currency === cur ? `${card.color}12` : "transparent", color: currency === cur ? card.color : "var(--text-muted)", cursor: "pointer", fontSize: "14px", fontWeight: "700", transition: "all 0.15s ease" }}>
                  {cur}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: "24px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Monto del resumen ({currency})</label>
            <input type="number" placeholder="Ej: 285000" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ fontSize: "20px", fontWeight: "700" }} />
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "8px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!amount || parseFloat(amount) <= 0 || saving} style={{ flex: 2, padding: "12px", borderRadius: "8px", background: saved ? "#1d4731" : card.color, border: "none", color: saved ? "var(--accent-green)" : "#0f0f0f", cursor: !amount || parseFloat(amount) <= 0 ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "background 0.2s ease", opacity: !amount || parseFloat(amount) <= 0 ? 0.5 : 1 }}>
              {saved ? <><Check size={16} />Guardado</> : "Guardar resumen"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function installmentDate(startDate: string, index: number): string {
  const [sy, sm] = startDate.split("-").map(Number);
  const total = sm + index;
  const year = sy + Math.floor((total - 1) / 12);
  const month = ((total - 1) % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function buildExpenseRecords(
  purchaseId: string,
  form: NewPurchaseForm,
  ccl: number,
  today: string,
): object[] {
  const totalInst = parseInt(form.total_installments) || 1;
  const paidTotal = parseFloat(form.paid_amount || form.total_amount) || 0;
  const perInstallment = paidTotal / totalInst;
  const isUSD = form.currency === "USD";
  const amount_ars = isUSD ? perInstallment * ccl : perInstallment;
  const amount_usd = isUSD ? perInstallment : perInstallment / ccl;

  return Array.from({ length: totalInst }, (_, i) => ({
    // Cuota 1 → hoy (para que impacte en el balance del mes actual)
    // Cuota 2+ → 1° de cada mes siguiente a start_date
    date: i === 0 ? today : installmentDate(form.start_date, i - 1),
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
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>(nextMonthRange());
  const [sortKey, setSortKey] = useState<"description" | "start_date" | "progress" | "amount">("start_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sb = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cardsRes, catsRes, purchasesRes, statementsRes, rateRes] = await Promise.all([
        sb.from("cards").select("*").order("name"),
        sb.from("categories").select("*").eq("type", "expense").order("name"),
        sb.from("installment_purchases").select("*").order("created_at", { ascending: false }),
        sb.from("card_statements").select("*").order("period_year", { ascending: false }).order("period_month", { ascending: false }),
        sb.from("exchange_rates").select("ccl_rate").order("date", { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (cardsRes.data) setCards(cardsRes.data);
      if (catsRes.data) setCategories(catsRes.data);
      if (purchasesRes.data) setPurchases(purchasesRes.data);
      if (statementsRes.data) setStatements(statementsRes.data);
      if (rateRes.data) setCurrentCcl(Number(rateRes.data.ccl_rate));
    } catch {
      showToast("Error cargando datos", "error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredPurchases = purchases.filter((p) => {
    if (p.start_date > dateRange.to) return false;
    if ((p.end_date ?? p.start_date) < dateRange.from) return false;
    if (searchQuery && !p.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  function toggleSort(key: typeof sortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }
  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "description") cmp = a.description.localeCompare(b.description);
    else if (sortKey === "start_date") cmp = a.start_date.localeCompare(b.start_date);
    else if (sortKey === "progress") cmp = (a.paid_installments / a.total_installments) - (b.paid_installments / b.total_installments);
    else if (sortKey === "amount") cmp = (Number(a.total_amount) / a.total_installments) - (Number(b.total_amount) / b.total_installments);
    return sortDir === "asc" ? cmp : -cmp;
  });
  const SI = ({ k }: { k: typeof sortKey }) =>
    <span style={{ marginLeft: "4px", fontSize: "10px", opacity: sortKey === k ? 1 : 0.35 }}>{sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>;

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
      }).select("id").single();

      if (error) throw error;

      if (data.counts_towards_balance && inserted?.id) {
        const today = new Date().toISOString().split("T")[0];
        const expenses = buildExpenseRecords(inserted.id, data, currentCcl, today);
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
        const today = new Date().toISOString().split("T")[0];
        const expenses = buildExpenseRecords(editingPurchase.id, data, currentCcl, today);
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

  const handleSaveResumen = async (cardId: string, amount: number, currency: "ARS" | "USD") => {
    try {
      const now = new Date();
      const { error } = await sb.from("card_statements").upsert(
        { card_id: cardId, period_month: now.getMonth() + 1, period_year: now.getFullYear(), amount, currency },
        { onConflict: "card_id,period_month,period_year" }
      );
      if (error) throw error;
      showToast("Resumen guardado", "success");
      await loadData();
    } catch {
      showToast("Error al guardar el resumen", "error");
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
              const latestStatement = statements.filter((s) => s.card_id === card.id).sort((a, b) => b.period_year - a.period_year || b.period_month - a.period_month)[0];
              const activeForCard = purchases.filter((p) => p.card_id === card.id && p.paid_installments < p.total_installments);
              const activeBalanced = activeForCard.filter((p) => p.counts_towards_balance);
              const cuotaTarjeta = activeBalanced.reduce((s, p) => {
                const monthly = Number(p.total_amount) / p.total_installments;
                return s + (p.currency === "ARS" ? monthly : monthly * currentCcl);
              }, 0);
              const cuotaMine = activeBalanced.reduce((s, p) => {
                const monthly = Number(p.paid_amount ?? p.total_amount) / p.total_installments;
                return s + (p.currency === "ARS" ? monthly : monthly * currentCcl);
              }, 0);
              const isSharedCard = Math.abs(cuotaTarjeta - cuotaMine) > 1;

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
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Último resumen</span>
                      <span style={{ fontSize: "14px", fontWeight: "700", fontVariantNumeric: "tabular-nums" }}>
                        {latestStatement ? `$${new Intl.NumberFormat("es-AR").format(latestStatement.amount)}` : "Sin datos"}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Cuotas activas</span>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: card.color }}>{activeForCard.length}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Cuota tarjeta est.</span>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent-blue)", fontVariantNumeric: "tabular-nums" }}>
                        ${new Intl.NumberFormat("es-AR").format(Math.round(cuotaTarjeta))}
                      </span>
                    </div>
                    {isSharedCard && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Mi aporte est.</span>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent-green)", fontVariantNumeric: "tabular-nums" }}>
                          ${new Intl.NumberFormat("es-AR").format(Math.round(cuotaMine))}
                        </span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setResumenModal({ open: true, card })} style={{ marginTop: "16px", width: "100%", padding: "9px", borderRadius: "8px", border: `1px solid ${card.color}50`, background: `${card.color}10`, color: card.color, fontSize: "13px", fontWeight: "600", cursor: "pointer", transition: "all 0.15s ease" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${card.color}20`; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${card.color}10`; }}>
                    Cargar resumen del mes
                  </button>
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
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
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
                <table style={{ minWidth: "640px" }}>
                  <thead>
                    <tr>
                      <th><button onClick={() => toggleSort("description")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "inherit", fontWeight: "inherit", padding: 0 }}>Descripción<SI k="description" /></button></th>
                      <th>Tarjeta</th>
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
                      const pct = Math.round((p.paid_installments / p.total_installments) * 100);
                      const cuotaCard = Number(p.total_amount) / p.total_installments;
                      const cuotaMy = Number(p.paid_amount ?? p.total_amount) / p.total_installments;
                      const rowShared = Math.abs(cuotaCard - cuotaMy) > 0.5;
                      return (
                        <tr key={p.id}>
                          <td>
                            <span style={{ fontSize: "14px", fontWeight: "500" }}>{p.description}</span>
                            {cat && <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{cat.emoji} {cat.name}</div>}
                          </td>
                          <td>
                            {card && <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: 500, background: `${card.color}20`, color: card.color }}>{card.name}</span>}
                          </td>
                          <td style={{ minWidth: "140px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ flex: 1, height: "5px", background: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: card?.color ?? "var(--accent-green)", borderRadius: "3px" }} />
                              </div>
                              <span style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{p.paid_installments}/{p.total_installments}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            <span style={{ fontWeight: "600", fontSize: "14px", color: "var(--accent-blue)" }}>
                              ${new Intl.NumberFormat("es-AR").format(Math.round(cuotaCard))}
                              <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "4px" }}>{p.currency}</span>
                            </span>
                            {rowShared && (
                              <div style={{ fontSize: "12px", color: "var(--accent-green)", marginTop: "2px" }}>
                                mío: ${new Intl.NumberFormat("es-AR").format(Math.round(cuotaMy))}
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
      />
      <CargarResumenModal open={resumenModal.open} card={resumenModal.card} onClose={() => setResumenModal({ open: false, card: null })} onSave={handleSaveResumen} />
    </div>
  );
}
