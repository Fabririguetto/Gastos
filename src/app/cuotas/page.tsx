"use client";

import { useState } from "react";
import { Plus, X, ChevronDown } from "lucide-react";
import {
  CARDS,
  CARD_STATEMENTS,
  INSTALLMENT_PURCHASES,
  CURRENT_CCL,
} from "@/lib/mock-data";
import type { InstallmentPurchase } from "@/types/database";

function BankInitials({ bank, color }: { bank: string; color: string }) {
  const initials = bank.slice(0, 2).toUpperCase();
  return (
    <div
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "10px",
        background: `${color}25`,
        border: `1px solid ${color}40`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "13px",
        fontWeight: "700",
        color,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

interface NewPurchaseForm {
  description: string;
  total_amount: string;
  currency: "ARS" | "USD";
  total_installments: string;
  card_id: string;
  start_date: string;
  counts_towards_balance: boolean;
}

function NewPurchaseModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: NewPurchaseForm) => void;
}) {
  const [form, setForm] = useState<NewPurchaseForm>({
    description: "",
    total_amount: "",
    currency: "ARS",
    total_installments: "12",
    card_id: CARDS[0]?.id ?? "",
    start_date: new Date().toISOString().split("T")[0],
    counts_towards_balance: true,
  });

  if (!open) return null;

  const amountNum = parseFloat(form.total_amount) || 0;
  const installmentsNum = parseInt(form.total_installments) || 1;
  const perInstallment = amountNum / installmentsNum;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 100,
          backdropFilter: "blur(2px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(520px, calc(100vw - 32px))",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "24px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: "700" }}>
            Nueva compra en cuotas
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "#252525",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              borderRadius: "6px",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "24px", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Descripción */}
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Descripción
              </label>
              <input
                type="text"
                placeholder="Ej: iPhone 16 Pro"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Moneda */}
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Moneda
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {(["ARS", "USD"] as const).map((cur) => (
                  <button
                    key={cur}
                    onClick={() => setForm({ ...form, currency: cur })}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border: `2px solid ${form.currency === cur ? (cur === "ARS" ? "var(--accent-green)" : "var(--accent-blue)") : "var(--border)"}`,
                      background: form.currency === cur
                        ? cur === "ARS" ? "rgba(0,232,122,0.08)" : "rgba(14,165,233,0.08)"
                        : "transparent",
                      color: form.currency === cur
                        ? cur === "ARS" ? "var(--accent-green)" : "var(--accent-blue)"
                        : "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "700",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>

            {/* Monto + cuotas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Monto total
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.total_amount}
                  onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  N° cuotas
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={form.total_installments}
                  onChange={(e) => setForm({ ...form, total_installments: e.target.value })}
                />
              </div>
            </div>

            {/* Per installment preview */}
            {perInstallment > 0 && (
              <div
                style={{
                  background: "rgba(14,165,233,0.08)",
                  border: "1px solid rgba(14,165,233,0.2)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  fontSize: "13px",
                  color: "var(--accent-blue)",
                }}
              >
                Cuota base:{" "}
                <strong>
                  ${new Intl.NumberFormat("es-AR").format(Math.round(perInstallment))} {form.currency}
                </strong>
                {form.currency === "USD" && (
                  <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>
                    ≈ ${new Intl.NumberFormat("es-AR").format(Math.round(perInstallment * CURRENT_CCL))} ARS
                  </span>
                )}
              </div>
            )}

            {/* Tarjeta */}
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Tarjeta
              </label>
              <div style={{ position: "relative" }}>
                <select
                  value={form.card_id}
                  onChange={(e) => setForm({ ...form, card_id: e.target.value })}
                  style={{ appearance: "none", paddingRight: "36px" }}
                >
                  {CARDS.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              </div>
            </div>

            {/* Fecha */}
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Fecha inicio
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>

            {/* Toggle descuenta saldo */}
            <div
              style={{
                background: "#202020",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: "600" }}>¿Descuenta de mi saldo?</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    {form.counts_towards_balance
                      ? "Las cuotas impactan en tu balance mensual"
                      : "Las cuotas NO impactan en tu balance (gasto compartido)"}
                  </p>
                </div>
                <button
                  onClick={() => setForm({ ...form, counts_towards_balance: !form.counts_towards_balance })}
                  style={{
                    width: "44px",
                    height: "24px",
                    borderRadius: "12px",
                    border: "none",
                    background: form.counts_towards_balance ? "var(--accent-green)" : "var(--border)",
                    cursor: "pointer",
                    position: "relative",
                    transition: "background 0.2s ease",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "3px",
                      left: form.counts_towards_balance ? "23px" : "3px",
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "white",
                      transition: "left 0.2s ease",
                    }}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: "12px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (form.description && form.total_amount) {
                onSave(form);
                onClose();
              }
            }}
            style={{
              flex: 2,
              padding: "12px",
              borderRadius: "8px",
              background: "var(--accent-green)",
              border: "none",
              color: "#0f0f0f",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "700",
            }}
          >
            Guardar compra
          </button>
        </div>
      </div>
    </>
  );
}

export default function CuotasPage() {
  const [purchases, setPurchases] = useState<InstallmentPurchase[]>(INSTALLMENT_PURCHASES);
  const [modalOpen, setModalOpen] = useState(false);

  const activePurchases = purchases.filter(
    (p) => p.paid_installments < p.total_installments
  );

  const handleSave = (data: NewPurchaseForm) => {
    const newPurchase: InstallmentPurchase = {
      id: `ip-${Date.now()}`,
      description: data.description,
      card_id: data.card_id,
      total_amount: parseFloat(data.total_amount) || 0,
      currency: data.currency,
      total_installments: parseInt(data.total_installments) || 1,
      paid_installments: 0,
      start_date: data.start_date,
      counts_towards_balance: data.counts_towards_balance,
    };
    setPurchases((prev) => [newPurchase, ...prev]);
  };

  return (
    <div
      style={{ minHeight: "100vh", padding: "32px 24px", maxWidth: "1200px", animation: "fadeIn 0.4s ease-out" }}
      className="mx-auto"
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.02em" }}>
            Cuotas & Tarjetas
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            {activePurchases.length} compras activas
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            background: "var(--accent-green)",
            border: "none",
            borderRadius: "8px",
            color: "#0f0f0f",
            fontSize: "14px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Nueva compra
        </button>
      </div>

      {/* Cards por tarjeta */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {CARDS.map((card) => {
          const latestStatement = CARD_STATEMENTS.filter(
            (s) => s.card_id === card.id
          ).sort((a, b) => b.period_month - a.period_month)[0];

          const activeForCard = purchases.filter(
            (p) => p.card_id === card.id && p.paid_installments < p.total_installments
          );

          const installmentTotal = activeForCard
            .filter((p) => p.counts_towards_balance)
            .reduce((s, p) => {
              const monthlyArs =
                p.currency === "ARS"
                  ? p.total_amount / p.total_installments
                  : (p.total_amount / p.total_installments) * CURRENT_CCL;
              return s + monthlyArs;
            }, 0);

          return (
            <div
              key={card.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "20px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Subtle color accent */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: card.color,
                  borderRadius: "14px 14px 0 0",
                }}
              />

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
                  <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                    {latestStatement
                      ? `$${new Intl.NumberFormat("es-AR").format(latestStatement.amount)}`
                      : "Sin datos"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Cuotas activas</span>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: card.color }}>
                    {activeForCard.length}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Cuota est. mensual</span>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent-blue)" }}>
                    ${new Intl.NumberFormat("es-AR").format(Math.round(installmentTotal))}
                  </span>
                </div>
              </div>

              <button
                style={{
                  marginTop: "16px",
                  width: "100%",
                  padding: "8px",
                  borderRadius: "8px",
                  border: `1px solid ${card.color}40`,
                  background: `${card.color}10`,
                  color: card.color,
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Cargar resumen del mes
              </button>
            </div>
          );
        })}
      </div>

      {/* Active installments table */}
      <div>
        <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>
          Cuotas activas
        </h2>

        {activePurchases.length === 0 ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "60px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
            <p style={{ fontSize: "16px", fontWeight: "600" }}>Sin cuotas activas</p>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "6px" }}>
              Todas las compras están saldadas
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div
              className="hidden md:block"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th>Tarjeta</th>
                    <th>Progreso</th>
                    <th style={{ textAlign: "right" }}>Cuota</th>
                    <th style={{ textAlign: "center" }}>¿Descuenta?</th>
                  </tr>
                </thead>
                <tbody>
                  {activePurchases.map((p) => {
                    const card = CARDS.find((c) => c.id === p.card_id);
                    const pct = Math.round((p.paid_installments / p.total_installments) * 100);
                    const monthlyAmount = p.total_amount / p.total_installments;

                    return (
                      <tr key={p.id}>
                        <td>
                          <span style={{ fontSize: "14px", fontWeight: "500" }}>
                            {p.description}
                          </span>
                        </td>
                        <td>
                          {card && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "3px 10px",
                                borderRadius: "100px",
                                fontSize: "12px",
                                fontWeight: 500,
                                background: `${card.color}20`,
                                color: card.color,
                              }}
                            >
                              {card.name}
                            </span>
                          )}
                        </td>
                        <td style={{ minWidth: "140px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                flex: 1,
                                height: "4px",
                                background: "var(--border)",
                                borderRadius: "2px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${pct}%`,
                                  background: card?.color ?? "var(--accent-green)",
                                  borderRadius: "2px",
                                }}
                              />
                            </div>
                            <span style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                              {p.paid_installments}/{p.total_installments}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "600", fontSize: "14px" }}>
                          ${new Intl.NumberFormat("es-AR").format(Math.round(monthlyAmount))}
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "4px" }}>
                            {p.currency}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "3px 10px",
                              borderRadius: "100px",
                              fontSize: "12px",
                              fontWeight: 600,
                              background: p.counts_towards_balance
                                ? "rgba(0,232,122,0.12)"
                                : "rgba(107,114,128,0.12)",
                              color: p.counts_towards_balance
                                ? "var(--accent-green)"
                                : "var(--text-muted)",
                            }}
                          >
                            {p.counts_towards_balance ? "Sí" : "No"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {activePurchases.map((p) => {
                const card = CARDS.find((c) => c.id === p.card_id);
                const pct = Math.round((p.paid_installments / p.total_installments) * 100);
                const monthlyAmount = p.total_amount / p.total_installments;

                return (
                  <div
                    key={p.id}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "14px 16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: "600" }}>{p.description}</p>
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                          {card?.name}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "15px", fontWeight: "700" }}>
                          ${new Intl.NumberFormat("es-AR").format(Math.round(monthlyAmount))}
                        </p>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>por cuota</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ flex: 1, height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: card?.color ?? "var(--accent-green)", borderRadius: "2px" }} />
                      </div>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {p.paid_installments}/{p.total_installments}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <NewPurchaseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
