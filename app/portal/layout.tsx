import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PortalNav from "./PortalNav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, client_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "cliente") redirect("/login");

  const { data: client } = profile.client_id
    ? await supabase.from("clients").select("name").eq("id", profile.client_id).single()
    : { data: null };

  return (
    <div className="min-h-screen flex flex-col">
      <PortalNav userName={profile.name} clientName={client?.name ?? ""} userId={user.id} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {children}
      </main>
      <footer className="text-center text-xs text-gray-400 py-6 border-t border-gray-100">
        © {new Date().getFullYear()} Spingarn Integrated Business Consulting
      </footer>
    </div>
  );
}
