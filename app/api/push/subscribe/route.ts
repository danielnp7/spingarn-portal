import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { endpoint, p256dh, auth } = await request.json();
    if (!endpoint || !p256dh || !auth)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({ user_id: user.id, endpoint, p256dh, auth }, { onConflict: "user_id,endpoint" });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
