import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role, client_id").eq("id", user.id).single();
  if (!profile || profile.role !== "cliente") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get advisor profiles
  const { data: advisors } = await supabase
    .from("profiles")
    .select("id, name, role")
    .in("role", ["admin", "partner2", "manager"])
    .order("name");

  if (!advisors || advisors.length === 0) {
    return NextResponse.json([]);
  }

  // Fetch emails from auth.users via admin client
  const admin = adminClient();
  let emailMap: Record<string, string> = {};
  try {
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    emailMap = Object.fromEntries(
      (authData?.users ?? []).map(u => [u.id, u.email ?? ""])
    );
  } catch (e) {
    console.error("listUsers error", e);
  }

  const result = advisors.map(a => ({
    id: a.id,
    name: a.name,
    email: emailMap[a.id] ?? "",
    role: a.role,
  }));

  return NextResponse.json(result);
}
