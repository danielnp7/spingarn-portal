import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { runCouncil } from "@/lib/council/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const COUNCIL_CREDIT_COST = 1;

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) return NextResponse.json({ error: "Sin perfil" }, { status: 403 });

  const admin = adminClient();

  const { data: session } = await admin
    .from("council_sessions").select("title, description, status, client_id")
    .eq("id", id).eq("user_id", user.id).single();

  if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  if (session.status !== "processing") return NextResponse.json({ ok: true });

  const { data: wallet } = await admin
    .from("client_wallet").select("balance_credits")
    .eq("client_id", profile.client_id).maybeSingle();

  try {
    const result = await runCouncil(session.title, session.description, async (event) => {
      if (event.type === "agent") {
        await admin.from("council_agent_responses").insert({
          session_id: id,
          agent_id: event.result.agent.id,
          agent_name: event.result.agent.name,
          agent_area: event.result.agent.area,
          response: event.result.response,
        });
      }
    });

    // Deduct credits after successful delivery
    const current = wallet?.balance_credits ?? 0;
    await admin.from("client_wallet").upsert({
      client_id: profile.client_id,
      balance_credits: current - COUNCIL_CREDIT_COST,
      updated_at: new Date().toISOString(),
    }, { onConflict: "client_id" });

    await admin.from("wallet_transactions").insert({
      client_id: profile.client_id,
      type: "debit",
      credits: COUNCIL_CREDIT_COST,
      amount_usd: 75 * COUNCIL_CREDIT_COST,
      description: `Consejo Consultivo: ${session.title}`,
    });

    await admin.from("council_sessions").update({
      status: "completed",
      council_response: result.councilResponse,
      completed_at: new Date().toISOString(),
    }).eq("id", id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[council/process]", err);
    await admin.from("council_sessions").update({ status: "failed" }).eq("id", id);
    return NextResponse.json({ error: "Error procesando" }, { status: 500 });
  }
}
