"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const sb = createClient();
    const { error: authError } = await sb.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "40px", justifyContent: "center" }}>
          <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="16" fill="#00e87a" />
            <text x="16" y="22" textAnchor="middle" fontSize="18" fontWeight="800"
              fontFamily="system-ui, sans-serif" fill="#0f0f0f" letterSpacing="-1">G</text>
          </svg>
          <span style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "-0.02em" }}>
            <span style={{ color: "var(--text-primary)" }}>gas</span>
            <span style={{ color: "var(--accent-green)" }}>tos</span>
          </span>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "32px",
          }}
        >
          <h1 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "6px" }}>Iniciar sesión</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "28px" }}>
            Acceso privado a tu control financiero
          </p>

          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: "8px",
                padding: "10px 14px",
                fontSize: "13px",
                color: "var(--error)",
                marginBottom: "20px",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "8px",
                padding: "13px",
                background: loading ? "#1d4731" : "var(--accent-green)",
                border: "none",
                borderRadius: "8px",
                color: "#0f0f0f",
                fontSize: "15px",
                fontWeight: "700",
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "all 0.15s ease",
              }}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
