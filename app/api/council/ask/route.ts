import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { runCouncil } from "@/lib/council/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export const COUNCIL_CREDIT_COST = 1;

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

const enc = new TextEncoder();
function sse(event: string, data: object): Uint8Array {
  return enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) return new Response(JSON.stringify({ error: "Sin perfil de cliente" }), { status: 403 });

  const { title, description } = await req.json();
  if (!title?.trim() || !description?.trim()) {
    return new Response(JSON.stringify({ error: "Título y descripción son requeridos" }), { status: 400 });
  }

  const admin = adminClient();

  // Check wallet balance before starting
  const { data: wallet } = await admin
    .from("client_wallet")
    .select("balance_credits, reserved_credits")
    .eq("client_id", profile.client_id)
    .maybeSingle();

  const available = (wallet?.balance_credits ?? 0) - (wallet?.reserved_credits ?? 0);
  if (available < COUNCIL_CREDIT_COST) {
    return new Response(JSON.stringify({
      error: "Créditos insuficientes",
      available,
      needed: COUNCIL_CREDIT_COST,
      shortfall: COUNCIL_CREDIT_COST - available,
    }), { status: 402 });
  }

  const { data: session, error: sessionError } = await admin.from("council_sessions").insert({
    client_id: profile.client_id,
    user_id: user.id,
    title: title.trim(),
    description: description.trim(),
    status: "processing",
  }).select().single();

  if (sessionError || !session) {
    return new Response(JSON.stringify({ error: "Error creando sesión" }), { status: 500 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sse("session", { session_id: session.id }));

      try {
        const result = await runCouncil(title.trim(), description.trim(), (event) => {
          if (event.type === "agent") {
            const { agent, response } = event.result;
            controller.enqueue(sse("agent", {
              agent_id: agent.id,
              agent_name: agent.name,
              agent_area: agent.area,
              agent_emoji: agent.emoji,
              response,
            }));
          } else if (event.type === "synthesis") {
            controller.enqueue(sse("synthesis", { response: event.response }));
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
          description: `Consejo Consultivo: ${title.trim()}`,
        });

        // Persist agent responses and session
        await admin.from("council_agent_responses").insert(
          result.agentResults.map(r => ({
            session_id: session.id,
            agent_id: r.agent.id,
            agent_name: r.agent.name,
            agent_area: r.agent.area,
            response: r.response,
          }))
        );

        await admin.from("council_sessions").update({
          status: "completed",
          council_response: result.councilResponse,
          completed_at: new Date().toISOString(),
        }).eq("id", session.id);

        controller.enqueue(sse("done", { session_id: session.id }));
      } catch (err) {
        console.error("[council/stream]", err);
        await admin.from("council_sessions").update({ status: "failed" }).eq("id", session.id);
        controller.enqueue(sse("error", { message: "Error procesando el caso" }));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
