"use client";

import { useState } from "react";
import { Save, RefreshCw, Plus, Trash2, Upload } from "lucide-react";
import { CATEGORIES, CURRENT_CCL } from "@/lib/mock-data";
import type { Category } from "@/types/database";

const EMOJI_OPTIONS = ["🏠", "🛒", "🚗", "💊", "🎮", "📦", "💼", "🎁", "📈", "✈️", "🍔", "📱", "💻", "👕", "⚡"];
const COLOR_OPTIONS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#6b7280", "#00e87a", "#0ea5e9", "#f472b6", "#fb923c",
];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "24px",
        marginBottom: "16px",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "700" }}>{title}</h2>
        {description && (
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function SaveButton({ onClick, saved }: { onClick: () => void; saved: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 16px",
        background: saved ? "rgba(0,232,122,0.15)" : "var(--accent-green)",
        border: saved ? "1px solid rgba(0,232,122,0.3)" : "none",
        borderRadius: "8px",
        color: saved ? "var(--accent-green)" : "#0f0f0f",
        fontSize: "13px",
        fontWeight: "700",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <Save size={14} />
      {saved ? "Guardado" : "Guardar"}
    </button>
  );
}

export default function ConfiguracionPage() {
  const [budget, setBudget] = useState("800000");
  const [budgetSaved, setBudgetSaved] = useState(false);

  const [ccl, setCcl] = useState(String(CURRENT_CCL));
  const [cclManual, setCclManual] = useState(false);
  const [cclSaved, setCclSaved] = useState(false);
  const [cclUpdating, setCclUpdating] = useState(false);

  const [email, setEmail] = useState("fabririguetto@gmail.com");
  const [notifActive, setNotifActive] = useState(true);
  const [emailSaved, setEmailSaved] = useState(false);

  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("📦");
  const [newCatColor, setNewCatColor] = useState("#6366f1");
  const [newCatType, setNewCatType] = useState<"expense" | "income">("expense");

  const [importDragging, setImportDragging] = useState(false);
  const [importDone, setImportDone] = useState(false);

  const handleSaveBudget = () => {
    setBudgetSaved(true);
    setTimeout(() => setBudgetSaved(false), 2000);
  };

  const handleUpdateCCL = async () => {
    setCclUpdating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setCcl("1548");
    setCclUpdating(false);
    setCclSaved(true);
    setTimeout(() => setCclSaved(false), 2000);
  };

  const handleSaveCCL = () => {
    setCclSaved(true);
    setTimeout(() => setCclSaved(false), 2000);
  };

  const handleSaveEmail = () => {
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 2000);
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName,
      type: newCatType,
      color: newCatColor,
      emoji: newCatEmoji,
      created_at: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, newCat]);
    setNewCatName("");
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div
      style={{ minHeight: "100vh", padding: "32px 24px", maxWidth: "800px", animation: "fadeIn 0.4s ease-out" }}
      className="mx-auto"
    >
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.02em" }}>
          Configuración
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
          Personalizá tu experiencia financiera
        </p>
      </div>

      {/* 1. Presupuesto */}
      <Section title="Presupuesto mensual" description="Define cuánto querés gastar por mes en ARS">
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Monto ARS
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => { setBudget(e.target.value); setBudgetSaved(false); }}
              placeholder="800000"
            />
          </div>
          <SaveButton onClick={handleSaveBudget} saved={budgetSaved} />
        </div>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
          Presupuesto actual:{" "}
          <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>
            ${new Intl.NumberFormat("es-AR").format(parseInt(budget) || 0)}
          </span>
        </p>
      </Section>

      {/* 2. Tipo de cambio */}
      <Section title="Tipo de cambio CCL" description="Se usa para convertir entre ARS y USD en todos los registros">
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              CCL actual
            </label>
            <input
              type="number"
              value={ccl}
              onChange={(e) => { setCcl(e.target.value); setCclSaved(false); }}
              disabled={!cclManual}
              style={{ opacity: cclManual ? 1 : 0.5 }}
            />
          </div>

          <button
            onClick={handleUpdateCCL}
            disabled={cclUpdating}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              background: "#202020",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--accent-blue)",
              fontSize: "13px",
              fontWeight: "600",
              cursor: cclUpdating ? "wait" : "pointer",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: cclUpdating ? "spin 1s linear infinite" : "none",
              }}
            />
            {cclUpdating ? "Actualizando..." : "Actualizar ahora"}
          </button>

          <SaveButton onClick={handleSaveCCL} saved={cclSaved} />
        </div>

        {/* Manual override toggle */}
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#202020",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "12px 14px",
          }}
        >
          <div>
            <p style={{ fontSize: "13px", fontWeight: "500" }}>Override manual</p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              Desactivá el auto-fetch y usá tu propio valor
            </p>
          </div>
          <button
            onClick={() => setCclManual(!cclManual)}
            style={{
              width: "44px",
              height: "24px",
              borderRadius: "12px",
              border: "none",
              background: cclManual ? "var(--accent-green)" : "var(--border)",
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
                left: cclManual ? "23px" : "3px",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "white",
                transition: "left 0.2s ease",
              }}
            />
          </button>
        </div>
      </Section>

      {/* 3. Notificaciones */}
      <Section title="Notificaciones semanales" description="Recibís un resumen cada lunes a las 9am">
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailSaved(false); }}
              placeholder="tu@email.com"
            />
          </div>
          <SaveButton onClick={handleSaveEmail} saved={emailSaved} />
        </div>

        <div
          style={{
            marginTop: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#202020",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "12px 14px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <p style={{ fontSize: "13px", fontWeight: "500" }}>Notificaciones</p>
              <span
                style={{
                  display: "inline-flex",
                  padding: "2px 8px",
                  borderRadius: "100px",
                  fontSize: "11px",
                  fontWeight: 600,
                  background: notifActive ? "rgba(0,232,122,0.12)" : "rgba(107,114,128,0.12)",
                  color: notifActive ? "var(--accent-green)" : "var(--text-muted)",
                }}
              >
                {notifActive ? "Activo" : "Inactivo"}
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              Próximo envío: lunes 1 sep · 09:00
            </p>
          </div>
          <button
            onClick={() => setNotifActive(!notifActive)}
            style={{
              width: "44px",
              height: "24px",
              borderRadius: "12px",
              border: "none",
              background: notifActive ? "var(--accent-green)" : "var(--border)",
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
                left: notifActive ? "23px" : "3px",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "white",
                transition: "left 0.2s ease",
              }}
            />
          </button>
        </div>
      </Section>

      {/* 4. Categorías */}
      <Section title="Categorías" description="Personalizá las categorías de gastos e ingresos">
        {/* Existing categories */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
          {categories.map((cat) => (
            <div
              key={cat.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                background: "#202020",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: cat.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "18px" }}>{cat.emoji}</span>
              <span style={{ flex: 1, fontSize: "14px", fontWeight: "500" }}>{cat.name}</span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "100px",
                  background: cat.type === "expense" ? "rgba(239,68,68,0.12)" : "rgba(0,232,122,0.12)",
                  color: cat.type === "expense" ? "var(--error)" : "var(--accent-green)",
                  fontWeight: 600,
                }}
              >
                {cat.type === "expense" ? "Gasto" : "Ingreso"}
              </span>
              <button
                onClick={() => handleDeleteCategory(cat.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--error)",
                  cursor: "pointer",
                  padding: "4px",
                  opacity: 0.5,
                  flexShrink: 0,
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Add new category */}
        <div
          style={{
            background: "#202020",
            border: "1px dashed var(--border)",
            borderRadius: "10px",
            padding: "16px",
          }}
        >
          <p style={{ fontSize: "13px", fontWeight: "600", marginBottom: "14px" }}>
            Agregar categoría
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {/* Emoji picker */}
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Emoji
              </label>
              <select
                value={newCatEmoji}
                onChange={(e) => setNewCatEmoji(e.target.value)}
                style={{ width: "70px", textAlign: "center", fontSize: "18px" }}
              >
                {EMOJI_OPTIONS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div style={{ flex: 1, minWidth: "140px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Nombre
              </label>
              <input
                type="text"
                placeholder="Ej: Viajes"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              />
            </div>

            {/* Type */}
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Tipo
              </label>
              <div style={{ display: "flex", gap: "4px" }}>
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNewCatType(t)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: `1px solid ${newCatType === t ? (t === "expense" ? "var(--error)" : "var(--accent-green)") : "var(--border)"}`,
                      background: newCatType === t
                        ? t === "expense" ? "rgba(239,68,68,0.1)" : "rgba(0,232,122,0.1)"
                        : "transparent",
                      color: newCatType === t
                        ? t === "expense" ? "var(--error)" : "var(--accent-green)"
                        : "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    {t === "expense" ? "Gasto" : "Ingreso"}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Color
              </label>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", maxWidth: "120px" }}>
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewCatColor(c)}
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: c,
                      border: newCatColor === c ? "2px solid white" : "2px solid transparent",
                      cursor: "pointer",
                      transition: "border 0.1s ease",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleAddCategory}
            style={{
              marginTop: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              background: "var(--accent-green)",
              border: "none",
              borderRadius: "8px",
              color: "#0f0f0f",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            <Plus size={14} />
            Agregar categoría
          </button>
        </div>
      </Section>

      {/* 5. Importar Excel */}
      <Section title="Importar datos" description="Importá tu historial desde un archivo Excel (.xlsx)">
        <div
          onDragOver={(e) => { e.preventDefault(); setImportDragging(true); }}
          onDragLeave={() => setImportDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setImportDragging(false);
            const file = e.dataTransfer.files[0];
            if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
              setImportDone(true);
            }
          }}
          style={{
            border: `2px dashed ${importDragging ? "var(--accent-green)" : importDone ? "var(--accent-green)" : "var(--border)"}`,
            borderRadius: "12px",
            padding: "40px 24px",
            textAlign: "center",
            background: importDragging ? "rgba(0,232,122,0.04)" : "transparent",
            transition: "all 0.2s ease",
          }}
        >
          {importDone ? (
            <>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>✅</div>
              <p style={{ fontSize: "15px", fontWeight: "700", color: "var(--accent-green)" }}>
                Archivo importado correctamente
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
                Los datos fueron procesados y registrados
              </p>
            </>
          ) : (
            <>
              <Upload size={32} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: "15px", fontWeight: "600" }}>
                Arrastrá tu Excel acá
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px", marginBottom: "16px" }}>
                O seleccioná un archivo desde tu dispositivo
              </p>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 20px",
                  background: "var(--surface-2, #202020)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                <Upload size={14} />
                Seleccionar Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) setImportDone(true);
                  }}
                />
              </label>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "12px" }}>
                Formatos soportados: .xlsx · .xls
              </p>
            </>
          )}
        </div>
      </Section>
    </div>
  );
}
