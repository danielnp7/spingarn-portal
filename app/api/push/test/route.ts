import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const vapidPublic  = (process.env.VAPID_PUBLIC_KEY  ?? "").replace(/\s/g, "");
  const vapidPrivate = (process.env.VAPID_PRIVATE_KEY ?? "").replace(/\s/g, "");

  const diag: Record<string, unknown> = {
    vapidPublicConfigured: !!vapidPublic,
    vapidPrivateConfigured: !!vapidPrivate,
    vapidPublicPrefix: vapidPublic.slice(0, 12) + "...",
  };

  const admin = adminClient();
  const { data: subs } = await admin
    .from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", user.id);

  diag.subscriptionsFound = subs?.length ?? 0;

  if (!subs?.length || !vapidPublic || !vapidPrivate)
    return NextResponse.json({ ...diag, error: "Missing subs or VAPID keys" });

  const webpush = await import("web-push");
  webpush.default.setVapidDetails(`mailto:hub@spingarn.ec`, vapidPublic, vapidPrivate);

  const results = await Promise.allSettled(
    subs.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.default.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: "Test desde portal", body: "VAPID del portal OK", href: "/portal", tag: "portal-test" }),
        );
        return { endpoint: sub.endpoint.slice(0, 40) + "...", result: "sent" };
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return { endpoint: sub.endpoint.slice(0, 40) + "...", result: "error", status: e.statusCode, message: e.message };
      }
    })
  );

  diag.sendResults = results.map(r => r.status === "fulfilled" ? r.value : r.reason);
  return NextResponse.json(diag);
}
