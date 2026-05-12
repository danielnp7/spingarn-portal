import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) return NextResponse.json({ error: "No client linked" }, { status: 400 });

  const admin = adminClient();
  const { data: consultation, error } = await admin
    .from("consultations")
    .select("*")
    .eq("id", id)
    .eq("client_id", profile.client_id)
    .single();

  if (error || !consultation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch related data
  const [{ data: approvals }, { data: response }, { data: wallet }] = await Promise.all([
    admin.from("consultation_approvals").select("*").eq("consultation_id", id).order("approved_at", { ascending: false }),
    admin.from("consultation_responses").select("*").eq("consultation_id", id).eq("status", "sent").maybeSingle(),
    admin.from("client_wallet").select("*").eq("client_id", profile.client_id).maybeSingle(),
  ]);

  return NextResponse.json({ consultation, approvals: approvals ?? [], response, wallet });
}
