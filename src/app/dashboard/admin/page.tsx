"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  plan: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  banned: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRelative(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days}d`;
  return formatDate(iso);
}

function Avatar({ name, email }: { name: string | null; email: string }) {
  const letter = (name ?? email).charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #00B5AD, #00827C)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 700,
        color: "#000",
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}

// ─── Form de alta ─────────────────────────────────────────────────────────────

function CreateUserForm({ onCreated }: { onCreated: (u: AdminUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al crear usuario");
        return;
      }

      setSuccess(true);
      setEmail("");
      setPassword("");
      setFullName("");
      onCreated(data.user);

      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#111720",
    border: "1px solid #1F2D3D",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#DCE4EF",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    color: "#8C97A6",
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 6,
    display: "block",
  };

  return (
    <div
      style={{
        background: "#0E1218",
        border: "1px solid #1F2631",
        borderRadius: 14,
        padding: "24px",
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "#E7ECF3", fontSize: 16, fontWeight: 600, margin: 0 }}>
          Dar de alta cuenta
        </h2>
        <p style={{ color: "#667386", fontSize: 13, margin: "4px 0 0" }}>
          Crea un nuevo usuario con acceso a la plataforma.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={labelStyle}>Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#00B5AD")}
              onBlur={(e) => (e.target.style.borderColor = "#1F2D3D")}
            />
          </div>

          {/* Nombre */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={labelStyle}>Nombre completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre (opcional)"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#00B5AD")}
              onBlur={(e) => (e.target.style.borderColor = "#1F2D3D")}
            />
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={labelStyle}>Contraseña *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#00B5AD")}
              onBlur={(e) => (e.target.style.borderColor = "#1F2D3D")}
            />
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              color: "#F87171",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              background: "rgba(0,181,173,0.1)",
              border: "1px solid rgba(0,181,173,0.3)",
              borderRadius: 8,
              color: "#00D4CB",
              fontSize: 13,
            }}
          >
            ✓ Usuario creado exitosamente
          </div>
        )}

        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 24px",
              background: loading
                ? "rgba(0,181,173,0.3)"
                : "linear-gradient(135deg, #00B5AD 0%, #00827C 100%)",
              border: "none",
              borderRadius: 8,
              color: loading ? "#00827C" : "#000",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 200ms ease",
            }}
          >
            {loading ? "Creando..." : "Crear cuenta"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Tabla de usuarios ────────────────────────────────────────────────────────

function UsersTable({ users, onToggleBan }: { users: AdminUser[]; onToggleBan: (userId: string, ban: boolean) => Promise<void> }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleToggle(u: AdminUser) {
    setLoadingId(u.id);
    await onToggleBan(u.id, !u.banned);
    setLoadingId(null);
  }
  if (users.length === 0) {
    return (
      <div
        style={{
          background: "#0E1218",
          border: "1px solid #1F2631",
          borderRadius: 14,
          padding: "48px 24px",
          textAlign: "center",
          color: "#667386",
          fontSize: 14,
        }}
      >
        No hay cuentas registradas.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#0E1218",
        border: "1px solid #1F2631",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.5fr 100px 140px 140px 90px",
          padding: "12px 20px",
          borderBottom: "1px solid #1A2130",
          background: "#0A0F18",
        }}
      >
        {["Usuario", "Email", "Plan", "Registro", "Último acceso", ""].map((h, i) => (
          <span
            key={i}
            style={{ color: "#667386", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {users.map((u, i) => (
        <div
          key={u.id}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.5fr 100px 140px 140px 90px",
            padding: "14px 20px",
            alignItems: "center",
            borderBottom: i < users.length - 1 ? "1px solid #131B27" : "none",
            transition: "background 150ms ease",
            opacity: u.banned ? 0.6 : 1,
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#0D1420")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
        >
          {/* Usuario */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Avatar name={u.full_name} email={u.email} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#DCE4EF",
                  fontSize: 14,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {u.full_name ?? "Sin nombre"}
              </div>
              <div style={{ color: "#667386", fontSize: 11 }}>
                {u.banned ? (
                  <span style={{ color: "#F87171" }}>● Inhabilitado</span>
                ) : u.email_confirmed ? (
                  <span style={{ color: "#00B5AD" }}>● Confirmado</span>
                ) : (
                  <span style={{ color: "#F59E0B" }}>● Sin confirmar</span>
                )}
              </div>
            </div>
          </div>

          {/* Email */}
          <div
            style={{
              color: "#8C97A6",
              fontSize: 13,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {u.email}
          </div>

          {/* Plan */}
          <div>
            <span
              style={{
                display: "inline-block",
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                background:
                  u.plan === "pro"
                    ? "rgba(0,181,173,0.15)"
                    : "rgba(100,116,139,0.15)",
                color: u.plan === "pro" ? "#00D4CB" : "#94A3B8",
                border: `1px solid ${u.plan === "pro" ? "rgba(0,181,173,0.3)" : "rgba(100,116,139,0.2)"}`,
                textTransform: "capitalize",
              }}
            >
              {u.plan ?? "free"}
            </span>
          </div>

          {/* Registro */}
          <div style={{ color: "#8C97A6", fontSize: 13 }}>
            {formatDate(u.created_at)}
          </div>

          {/* Último acceso */}
          <div style={{ color: "#8C97A6", fontSize: 13 }}>
            {formatRelative(u.last_sign_in_at)}
          </div>

          {/* Acción */}
          <div>
            <button
              onClick={() => handleToggle(u)}
              disabled={loadingId === u.id}
              title={u.banned ? "Habilitar usuario" : "Inhabilitar usuario"}
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                cursor: loadingId === u.id ? "not-allowed" : "pointer",
                border: "1px solid",
                transition: "all 150ms ease",
                ...(u.banned
                  ? {
                      background: "rgba(0,181,173,0.1)",
                      color: "#00D4CB",
                      borderColor: "rgba(0,181,173,0.3)",
                    }
                  : {
                      background: "rgba(239,68,68,0.1)",
                      color: "#F87171",
                      borderColor: "rgba(239,68,68,0.3)",
                    }),
              }}
            >
              {loadingId === u.id ? "..." : u.banned ? "Habilitar" : "Inhabilitar"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cargar usuarios");
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function handleCreated(newUser: AdminUser) {
    setUsers((prev) => [newUser, ...prev]);
  }

  async function handleToggleBan(userId: string, ban: boolean) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ban }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, banned: ban } : u))
      );
    }
  }

  return (
    <div style={{ padding: "32px 32px 48px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: "#E7ECF3", fontSize: 24, fontWeight: 700, margin: 0 }}>
          Administración de Cuentas
        </h1>
        <p style={{ color: "#667386", fontSize: 14, margin: "6px 0 0" }}>
          {loading ? "Cargando..." : `${users.length} cuenta${users.length !== 1 ? "s" : ""} registrada${users.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Form de alta */}
      <div style={{ marginBottom: 28 }}>
        <CreateUserForm onCreated={handleCreated} />
      </div>

      {/* Tabla */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ color: "#C4CFD9", fontSize: 15, fontWeight: 600, margin: 0 }}>
            Cuentas activas
          </h2>
          <button
            onClick={loadUsers}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              background: "transparent",
              border: "1px solid #1F2D3D",
              borderRadius: 8,
              color: "#8C97A6",
              fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 150ms ease",
            }}
            onMouseEnter={(e) => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.borderColor = "#00B5AD";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#1F2D3D";
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            Actualizar
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 16px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10,
              color: "#F87171",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              background: "#0E1218",
              border: "1px solid #1F2631",
              borderRadius: 14,
              padding: "48px 24px",
              textAlign: "center",
              color: "#667386",
              fontSize: 14,
            }}
          >
            Cargando cuentas...
          </div>
        ) : (
          <UsersTable users={users} onToggleBan={handleToggleBan} />
        )}
      </div>
    </div>
  );
}
