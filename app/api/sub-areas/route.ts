import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

const AREA_NAME_TO_SLUG: Record<string, string> = {
  "Aviación y Regulatorio":         "aviacion",
  "Contratación Pública":           "contratacion_publica",
  "Laboral y Seguridad Social":     "laboral",
  "M&A y Energía":                  "ma_energia",
  "Propiedad Intelectual":          "propiedad_intelectual",
  "Protección de Datos Personales": "datos_personales",
  "Tax and Finance":                "tax_finance",
  "Tax And Finance":                "tax_finance",
  "Tecnología y Telecomunicaciones":"tecnologia",
};

export async function GET() {
  const admin = adminClient();
  const { data, error } = await admin
    .from("sub_areas")
    .select("id, name, area:areas(name)")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map((s: { id: string; name: string; area: { name: string } | null }) => ({
      id: s.id,
      name: s.name,
      area_slug: AREA_NAME_TO_SLUG[s.area?.name ?? ""] ?? "tax_finance",
    }))
  );
}
