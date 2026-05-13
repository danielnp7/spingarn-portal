import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { runCouncil } from "@/lib/council/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

  // Create session as processing
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

  try {
    const result = await runCouncil(title.trim(), description.trim());

    // Save individual agent responses
    await admin.from("council_agent_responses").insert(
      result.agentResults.map(r => ({
        session_id: session.id,
        agent_id: r.agent.id,
        agent_name: r.agent.name,
        agent_area: r.agent.area,
        response: r.response,
      }))
    );

    // Update session with council response
    await admin.from("council_sessions").update({
      status: "completed",
      council_response: result.councilResponse,
      completed_at: new Date().toISOString(),
    }).eq("id", session.id);

    return NextResponse.json({
      session_id: session.id,
      council_response: result.councilResponse,
    });
  } catch (err) {
    await admin.from("council_sessions").update({ status: "failed" }).eq("id", session.id);
    console.error("[council] error:", err);
    return NextResponse.json({ error: "Error procesando el caso" }, { status: 500 });
  }
}
