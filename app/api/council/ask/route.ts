import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const COUNCIL_CREDIT_COST = 1;

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) return NextResponse.json({ error: "Sin perfil de cliente" }, { status: 403 });

  const { title, description } = await req.json();
  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Título y descripción son requeridos" }, { status: 400 });
  }

  const admin = adminClient();

  const { data: wallet } = await admin
    .from("client_wallet").select("balance_credits, reserved_credits")
    .eq("client_id", profile.client_id).maybeSingle();

  const available = (wallet?.balance_credits ?? 0) - (wallet?.reserved_credits ?? 0);
  if (available < COUNCIL_CREDIT_COST) {
    return NextResponse.json({ error: "Créditos insuficientes", available, needed: COUNCIL_CREDIT_COST, shortfall: COUNCIL_CREDIT_COST - available }, { status: 402 });
  }

  const { data: session, error: sessionError } = await admin.from("council_sessions").insert({
    client_id: profile.client_id,
    user_id: user.id,
    title: title.trim(),
    description: description.trim(),
    status: "processing",
  }).select().single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Error creando sesión" }, { status: 500 });
  }

  return NextResponse.json({ session_id: session.id });
}
