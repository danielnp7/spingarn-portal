import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("client_id, role").eq("id", user.id).single();
  if (!profile?.client_id) return NextResponse.json({ error: "Sin perfil" }, { status: 403 });

  const admin = adminClient();

  const { data: session } = await admin
    .from("council_sessions")
    .select("*")
    .eq("id", id)
    .eq("client_id", profile.client_id)
    .single();

  if (!session) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Agent deliberations only visible to partner1
  let agentResponses = null;
  if (profile.role === "partner1") {
    const { data } = await admin
      .from("council_agent_responses")
      .select("agent_id, agent_name, agent_area, response, created_at")
      .eq("session_id", id)
      .order("created_at");
    agentResponses = data;
  }

  return NextResponse.json({ session, agentResponses });
}
