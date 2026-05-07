import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

const BUCKET = "client-files";
const EXPIRES_IN = 3600; // 1 hour

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) return NextResponse.json({ error: "No client" }, { status: 403 });

  const filename = req.nextUrl.searchParams.get("path");
  if (!filename) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  // Server builds the full path — client never needs to know the client_id prefix
  const path = `${profile.client_id}/${filename}`;

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, EXPIRES_IN);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}
