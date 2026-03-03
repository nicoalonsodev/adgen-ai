"use client";

import { TokensDisplay } from "./tokens-display";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-neutral-400 mt-1">Resumen de tu cuenta y configuración del negocio.</p>
        </div>

        {/* Tokens */}
        <TokensDisplay />

        {/* Accesos rápidos */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NavCard
            href="/dashboard/mi-negocio"
            title="Mi ADN"
            description="Configurá el perfil, tono de marca, beneficios y más."
          />
          <NavCard
            href="/dashboard/fabrica-de-contenido"
            title="Fábrica de Contenido"
            description="Generá copy e imágenes para tus campañas."
          />
          <NavCard
            href="/dashboard/meta-studio-v2"
            title="Meta Studio"
            description="Creá creatividades para Meta con IA."
          />
        </div>
      </div>
    </main>
  );
}

function NavCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 hover:bg-neutral-900/70 transition"
    >
      <div className="text-sm font-semibold text-neutral-100">{title}</div>
      <div className="mt-1 text-xs text-neutral-400">{description}</div>
    </a>
  );
}
