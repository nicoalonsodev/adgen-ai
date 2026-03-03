"use client";

import { useEffect, useMemo, useState } from "react";

type TokensResponse = {
  user_id: string;
  total_tokens_monthly: number;
  tokens_used: number;
  tokens_remaining: number;
  reset_date?: string;
};

export function TokensDisplay() {
  const [tokens, setTokens] = useState<TokensResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const userId =
          (typeof window !== "undefined" && localStorage.getItem("user_id")) ||
          undefined;

        const url = userId
          ? `/api/user/tokens?userId=${encodeURIComponent(userId)}`
          : "/api/user/tokens";

        const response = await fetch(url, { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "No se pudieron cargar los tokens");
        }

        setTokens(data as TokensResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    void fetchTokens();
  }, []);

  const percentage = useMemo(() => {
    if (!tokens || !tokens.total_tokens_monthly) return 0;
    const value = (tokens.tokens_used / tokens.total_tokens_monthly) * 100;
    return Math.max(0, Math.min(100, value));
  }, [tokens]);

  if (loading) {
    return (
      <div className="rounded-lg p-4 text-sm" style={{ background: "#1A1A1A", color: "#86868B" }}>
        Cargando tokens...
      </div>
    );
  }

  if (error || !tokens) {
    return (
      <div className="rounded-lg p-4 text-sm" style={{ background: "#2A0A0A", color: "#FF453A" }}>
        {error ?? "No hay datos de tokens"}
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-6"
      style={{
        background: "linear-gradient(90deg, #2563EB 0%, #1D4ED8 100%)",
        color: "white",
      }}
    >
      <h3 className="text-sm font-semibold opacity-90">Tokens mensuales</h3>
      <div className="mt-4">
        <div className="flex justify-between mb-2">
          <span className="text-2xl font-bold">{tokens.tokens_remaining}</span>
          <span className="text-sm opacity-75">de {tokens.total_tokens_monthly}</span>
        </div>
        <div className="w-full rounded-full h-2" style={{ background: "rgba(255,255,255,0.2)" }}>
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${percentage}%`, background: "white" }}
          />
        </div>
      </div>
    </div>
  );
}
