import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MisReunionesClient from "./MisReunionesClient";

export const dynamic = "force-dynamic";

export default async function MisReunionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("name, client_id").eq("id", user.id).single();
  if (!profile?.client_id) redirect("/portal");

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const serviceKey  = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");

  const res = await fetch(
    `${supabaseUrl}/rest/v1/meeting_requests?client_user_id=eq.${user.id}&order=created_at.desc&select=*`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" }
  );

  const requests = res.ok ? await res.json() : [];

  return <MisReunionesClient requests={requests} />;
}
