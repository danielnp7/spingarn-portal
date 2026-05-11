import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { userIds, title, body, href } = await request.json();
  if (!userIds?.length || !title) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const vapidPublic  = (process.env.VAPID_PUBLIC_KEY  ?? "").replace(/\s/g, "");
  const vapidPrivate = (process.env.VAPID_PRIVATE_KEY ?? "").replace(/\s/g, "");

  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ skipped: true, reason: "VAPID keys not configured" });
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const serviceKey  = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");

  const subsRes = await fetch(
    `${supabaseUrl}/rest/v1/push_subscriptions?user_id=in.(${userIds.join(",")})&select=endpoint,p256dh,auth`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const subs: { endpoint: string; p256dh: string; auth: string }[] = subsRes.ok ? await subsRes.json() : [];

  if (!subs.length) return NextResponse.json({ sent: 0 });

  const webpush = await import("web-push");
  webpush.default.setVapidDetails(
    `mailto:${process.env.RESEND_FROM_EMAIL ?? "portal@spingarn.ec"}`,
    vapidPublic,
    vapidPrivate
  );

  const payload = JSON.stringify({ title, body, href: href ?? "/portal" });
  let sent = 0;

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.default.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch {
        await fetch(
          `${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
          { method: "DELETE", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
        );
      }
    })
  );

  return NextResponse.json({ sent });
}
