"use client";

import { useMemo, useState } from "react";

type IngestOk = {
  ok: true;
  profile: any;
};

type IngestErr = {
  ok: false;
  error: string;
  details?: unknown;
};

export default function IngestPage() {
  const [text, setText] = useState<string>(
    `Somos una marca de botellas térmicas premium. Nuestro producto mantiene frío/caliente por horas.
Vendemos online, apuntamos a personas activas que trabajan y entrenan. Queremos un tono cercano pero confiable.
Oferta actual: 50% OFF + envío gratis.`
  );
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);

  const filePreview = useMemo(() => {
    if (!file) return null;
    return `${file.name} · ${Math.round(file.size / 1024)} KB`;
  }, [file]);

  const confidence = profile?.gaps?.confidence;
  const questions: string[] = profile?.gaps?.questions ?? [];
  const missingFields: string[] = profile?.gaps?.missingFields ?? [];

  const canSubmit = useMemo(() => {
    if (loading) return false;
    const hasText = text.trim().length > 0;
    const hasFile = !!file;
    return hasText || hasFile;
  }, [loading, text, file]);

  async function ingest() {
    setLoading(true);
    setError(null);
    setProfile(null);

    try {
      const fd = new FormData();
      if (text.trim()) fd.append("text", text.trim());
      if (file) fd.append("file", file);

      const res = await fetch("/api/knowledge/ingest", {
        method: "POST",
        body: fd,
      });

      const data = (await res.json()) as IngestOk | IngestErr;

      if (!res.ok || (data as any)?.ok === false) {
        setError((data as IngestErr)?.error ?? "Error en ingest");
        return;
      }

      setProfile((data as IngestOk).profile);
      // MVP: guardarlo local para usarlo después en copy/meta-images
      localStorage.setItem("businessProfile", JSON.stringify((data as IngestOk).profile));
    } catch (e: any) {
      setError(e?.message ?? "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function copyJson() {
    if (!profile) return;
    await navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
  }

  function downloadJson() {
    if (!profile) return;
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business-profile-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Ingestión de negocio → BusinessProfile
            </h1>
            <p className="mt-1 text-neutral-400">
              Pegá texto y/o subí un archivo. La IA lo convierte en un perfil estructurado para generar anuncios sin prompts.
            </p>
          </div>
          <a
            href="/dashboard"
            className="text-sm underline underline-offset-4 text-neutral-300 hover:text-white"
          >
            Volver
          </a>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Input */}
          <section className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-neutral-200">Texto (opcional)</label>
                  <span className="text-xs text-neutral-500">Cuanto más contexto, mejor</span>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={10}
                  className="mt-2 w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
                  placeholder="Contanos sobre tu negocio, tu producto/oferta, público y estilo..."
                />
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-neutral-200">Archivo (opcional)</div>
                    <div className="text-xs text-neutral-500">PDF / DOCX / TXT</div>
                  </div>

                  {file && (
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-xs rounded-lg border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800 transition"
                    >
                      Quitar
                    </button>
                  )}
                </div>

                <div className="mt-3">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.md,.json,.csv"
                    className="block w-full text-xs text-neutral-300 file:mr-3 file:rounded-lg file:border file:border-neutral-700 file:bg-neutral-900/40 file:px-3 file:py-1.5 file:text-xs file:text-neutral-200 hover:file:bg-neutral-800"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {filePreview && <div className="mt-2 text-xs text-neutral-400">{filePreview}</div>}
                </div>
              </div>

              <button
                onClick={ingest}
                disabled={!canSubmit}
                className="w-full rounded-xl bg-white text-neutral-950 px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {loading ? "Procesando..." : "Generar BusinessProfile"}
              </button>

              {error && (
                <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="text-xs text-neutral-500">
                Tip: este perfil se usa después para generar ángulos, copys e imágenes automáticamente.
              </div>
            </div>
          </section>

          {/* Output */}
          <section className="lg:col-span-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-neutral-200">Resultado</h2>
                <p className="text-xs text-neutral-500">
                  {profile ? "BusinessProfile generado" : "Aún no hay resultado"}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyJson}
                  disabled={!profile}
                  className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800 transition disabled:opacity-50"
                >
                  Copiar JSON
                </button>
                <button
                  type="button"
                  onClick={downloadJson}
                  disabled={!profile}
                  className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800 transition disabled:opacity-50"
                >
                  Descargar JSON
                </button>
              </div>
            </div>

            {!profile && !loading && (
              <div className="mt-4 text-sm text-neutral-500">
                Subí info y generá el perfil. Acá vas a ver:
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>Resumen estructurado del negocio</li>
                  <li>Ángulos recomendados para anuncios</li>
                  <li>Preguntas que faltan (gaps) para mejorar resultados</li>
                </ul>
              </div>
            )}

            {profile && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
                    <div className="text-xs text-neutral-400">Confianza</div>
                    <div className="mt-1 text-lg font-semibold">
                      {typeof confidence === "number" ? `${Math.round(confidence * 100)}%` : "—"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3 md:col-span-2">
                    <div className="text-xs text-neutral-400">Faltantes detectados</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {missingFields.length ? (
                        missingFields.slice(0, 10).map((f, i) => (
                          <span
                            key={i}
                            className="text-xs rounded-full border border-neutral-700 bg-neutral-900/40 px-2 py-1"
                          >
                            {f}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-neutral-500">No hay faltantes relevantes</span>
                      )}
                      {missingFields.length > 10 && (
                        <span className="text-xs text-neutral-500">+{missingFields.length - 10} más</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
                  <div className="text-sm font-medium text-neutral-200">
                    Preguntas para mejorar el perfil
                  </div>
                  <div className="mt-2 text-sm text-neutral-300 space-y-1">
                    {questions.length ? (
                      questions.map((q, i) => <div key={i}>• {q}</div>)
                    ) : (
                      <div className="text-neutral-500">
                        No hay preguntas pendientes. El perfil está bastante completo.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
                  <div className="text-sm font-medium text-neutral-200">BusinessProfile (JSON)</div>
                  <pre className="mt-3 max-h-[520px] overflow-auto rounded-xl border border-neutral-800 bg-neutral-950/50 p-3 text-xs text-neutral-300">
                    {JSON.stringify(profile, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {loading && (
              <div className="mt-4 text-sm text-neutral-400 animate-pulse">
                Procesando documento y normalizando información…
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
