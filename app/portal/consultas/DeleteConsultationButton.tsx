"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteConsultationButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`¿Eliminar la consulta "${title}"? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    const res = await fetch(`/api/consultations/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const json = await res.json();
      alert(json.error ?? "Error al eliminar");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); handleDelete(); }}
      disabled={loading}
      className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-all"
      title="Eliminar consulta cancelada"
    >
      {loading ? "…" : "Eliminar"}
    </button>
  );
}
