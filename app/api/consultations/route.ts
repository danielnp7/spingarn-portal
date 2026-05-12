import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

// GET /api/consultations — list for logged-in client
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) return NextResponse.json({ error: "No client linked" }, { status: 400 });

  const admin = adminClient();
  const { data, error } = await admin
    .from("consultations")
    .select("*")
    .eq("client_id", profile.client_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/consultations — create new consultation
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) return NextResponse.json({ error: "No client linked" }, { status: 400 });

  const body = await req.json();
  const { title, description, area, urgency } = body;

  if (!title || !description || !area) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const admin = adminClient();
  const { data, error } = await admin
    .from("consultations")
    .insert({
      client_id: profile.client_id,
      created_by_user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      area,
      urgency: urgency ?? "media",
      status: "submitted",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Trigger classification and notification non-blocking
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
  const cookie  = req.headers.get("cookie") ?? "";

  fetch(`${baseUrl}/api/consultations/${data.id}/classify`, {
    method: "POST",
    headers: { "Cookie": cookie },
  }).catch(() => {});

  fetch(`${baseUrl}/api/consultations/${data.id}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": cookie },
    body: JSON.stringify({ status: "submitted", toTeam: true }),
  }).catch(() => {});

  return NextResponse.json(data, { status: 201 });
}
