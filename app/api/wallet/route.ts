import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) return NextResponse.json({ balance_credits: 0, reserved_credits: 0 });

  const { data: wallet } = await supabase
    .from("client_wallet")
    .select("balance_credits, reserved_credits")
    .eq("client_id", profile.client_id)
    .maybeSingle();

  return NextResponse.json({
    balance_credits: wallet?.balance_credits ?? 0,
    reserved_credits: wallet?.reserved_credits ?? 0,
  });
}
