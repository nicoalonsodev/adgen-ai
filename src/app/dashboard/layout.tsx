"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard/fabrica-de-contenido", icon: "factory", label: "Fábrica de Creativos", highlight: true },
  { href: "/dashboard/mis-creativos", icon: "gallery", label: "Mis Creativos", highlight: false },
  { href: "/dashboard/mi-negocio", icon: "building", label: "Mi ADN", highlight: false },
] as const;

type NavIconName = (typeof NAV_ITEMS)[number]["icon"];

function NavIcon({ name, highlight }: { name: NavIconName; highlight?: boolean }) {
  const size = highlight ? 20 : 18;

  if (name === "factory") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21h18" />
        <path d="M4 21V10l6 3V10l6 3V7h4v14" />
        <path d="M16 7V4h3v3" />
      </svg>
    );
  }

  if (name === "building") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 15l3-3 3 3 4-4" />
      <circle cx="8" cy="9" r="1" />
    </svg>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name ?? session?.user?.email ?? null;

  return (
    <div
      style={{
        width: 260,
        background: "#0E1218",
        borderRight: "1px solid #1F2631",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Logo */}
      <div style={{ paddingBottom: 32, borderBottom: "1px solid #1F2631" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
          <Image src="/henko-logo.png" alt="Henko" width={100} height={100} priority style={{ width: 100, height: 100, objectFit: "contain" }} />
          <div>
            <div style={{ color: "#E7ECF3", fontWeight: 600, fontSize: 16, lineHeight: 1.2 }}>
              Henko Creative Hub
            </div>
            <div style={{ color: "#7C889A", fontSize: 12 }}>Platform</div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ paddingTop: 20, flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {NAV_ITEMS.map(({ href, icon, label, highlight }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");

            if (highlight) {
              // Fábrica de Creativos — botón destacado
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "13px 16px",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 700,
                    textDecoration: "none",
                    transition: "all 200ms ease",
                    background: isActive
                      ? "linear-gradient(135deg, #00B5AD 0%, #00827C 100%)"
                      : "linear-gradient(135deg, rgba(0,181,173,0.18) 0%, rgba(0,130,124,0.12) 100%)",
                    color: isActive ? "#000" : "#00D4CB",
                    border: `1.5px solid ${isActive ? "transparent" : "rgba(0,181,173,0.35)"}`,
                    boxShadow: isActive
                      ? "0 4px 20px rgba(0,181,173,0.35)"
                      : "0 2px 12px rgba(0,181,173,0.12)",
                    letterSpacing: "0.01em",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.background = "linear-gradient(135deg, rgba(0,181,173,0.28) 0%, rgba(0,130,124,0.20) 100%)";
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,181,173,0.6)";
                      (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 20px rgba(0,181,173,0.22)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.background = "linear-gradient(135deg, rgba(0,181,173,0.18) 0%, rgba(0,130,124,0.12) 100%)";
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,181,173,0.35)";
                      (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 12px rgba(0,181,173,0.12)";
                    }
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <NavIcon name={icon} highlight />
                  </span>
                  <span>{label}</span>
                  {!isActive && (
                    <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, background: "rgba(0,181,173,0.2)", color: "#00D4CB", padding: "2px 7px", borderRadius: 20 }}>
                      IA
                    </span>
                  )}
                </Link>
              );
            }

            // Items normales
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 200ms ease",
                  ...(isActive
                    ? {
                        background: "#171E29",
                        color: "#DCE4EF",
                        border: "1px solid #2D394A",
                      }
                    : {
                        color: "#8C97A6",
                        background: "transparent",
                        border: "1px solid transparent",
                      }),
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLAnchorElement).style.background = "#141A23";
                    (e.currentTarget as HTMLAnchorElement).style.color = "#D3DBE7";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                    (e.currentTarget as HTMLAnchorElement).style.color = "#8C97A6";
                  }
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <NavIcon name={icon} />
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: "1px solid #1F2631", paddingTop: 16 }}>
        {userName && (
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #00B5AD, #00827C)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "#000",
                flexShrink: 0,
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#C8D3DF", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userName}
              </div>
            </div>
          </div>
        )}
        <div style={{ textAlign: "center" }}>
          <span style={{ color: "#667386", fontSize: 11 }}>Beta v0.1</span>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile top bar ───────────────────────────────────────────────────────────

function MobileTopBar({ onMenuOpen }: { onMenuOpen: () => void }) {
  return (
    <div
      style={{
        background: "#0D0D0D",
        borderBottom: "1px solid #1E1E1E",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Image src="/henko-logo.png" alt="Henko" width={36} height={36} style={{ width: 36, height: 36, objectFit: "contain" }} />
        <span style={{ color: "#E7ECF3", fontWeight: 600, fontSize: 15 }}>Henko Creative Hub</span>
      </div>
      <button
        type="button"
        onClick={onMenuOpen}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#888",
          padding: 4,
        }}
        aria-label="Abrir menú"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ─── Mobile drawer overlay ────────────────────────────────────────────────────

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 40,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 200ms ease",
        }}
      />
      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100%",
          width: 260,
          zIndex: 50,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 250ms ease",
        }}
      >
        <Sidebar onClose={onClose} />
      </div>
    </>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0A0A" }}>
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <div
        style={{ position: "fixed", left: 0, top: 0, height: "100%" }}
        className="hidden md:block"
      >
        <Sidebar />
      </div>

      {/* Mobile top bar + drawer */}
      <div className="md:hidden" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 30 }}>
        <MobileTopBar onMenuOpen={() => setMobileMenuOpen(true)} />
      </div>
      <MobileDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main content */}
      <div
        className="flex-1"
        style={{
          marginLeft: 0,
          paddingTop: 0,
          minHeight: "100vh",
          background: "#0A0A0A",
        }}
      >
        {/* Desktop: push content right of sidebar */}
        <div className="hidden md:block" style={{ marginLeft: 260 }}>
          {children}
        </div>
        {/* Mobile: top bar offset */}
        <div className="md:hidden" style={{ paddingTop: 53 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
