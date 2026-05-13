import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

const BUCKET = "client-files";

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

type RawMsg = {
  id: string; consultation_id: string; sender_type: string; sender_name: string | null;
  content: string | null; files: { name: string; url: string; size: number; type: string }[];
  created_at: string; read_by_hub_at: string | null; read_by_client_at: string | null;
};

async function signFiles(admin: ReturnType<typeof adminClient>, messages: RawMsg[]) {
  return Promise.all(messages.map(async (msg) => {
    const files = (msg.files ?? []).map(f => ({ ...f, signedUrl: null as string | null }));
    await Promise.all(files.map(async (f, i) => {
      const { data } = await admin.storage.from(BUCKET).createSignedUrl(f.url, 3600);
      files[i].signedUrl = data?.signedUrl ?? null;
    }));
    return { ...msg, files };
  }));
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();

  // Verify user belongs to the consultation's client
  const { data: profile } = await admin.from("profiles").select("client_id").eq("id", user.id).single();
  const { data: consultation } = await admin.from("consultations").select("client_id").eq("id", id).single();
  if (!profile?.client_id || profile.client_id !== consultation?.client_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("consultation_messages")
    .select("*")
    .eq("consultation_id", id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark hub messages as read by client
  const unread = (data ?? []).filter(m => m.sender_type === "hub" && !m.read_by_client_at).map(m => m.id);
  if (unread.length > 0) {
    await admin.from("consultation_messages")
      .update({ read_by_client_at: new Date().toISOString() })
      .in("id", unread);
  }

  return NextResponse.json(await signFiles(admin, data ?? []));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const [{ data: profile }, { data: consultation }] = await Promise.all([
    admin.from("profiles").select("name, client_id").eq("id", user.id).single(),
    admin.from("consultations").select("id, client_id, title").eq("id", id).single(),
  ]);
  if (!profile?.client_id || profile.client_id !== consultation?.client_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const content = (formData.get("content") as string | null)?.trim() ?? "";
  const fileEntries = formData.getAll("files") as File[];

  const uploadedFiles: { name: string; url: string; size: number; type: string }[] = [];
  for (const file of fileEntries) {
    if (!(file instanceof File) || file.size === 0) continue;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${profile.client_id}/consultas/${id}/mensajes/${Date.now()}_${safeName}`;
    const { error: upErr } = await admin.storage.from(BUCKET).upload(
      path, Buffer.from(await file.arrayBuffer()),
      { contentType: file.type || "application/octet-stream", upsert: false }
    );
    if (!upErr) uploadedFiles.push({ name: file.name, url: path, size: file.size, type: file.type });
  }

  if (!content && uploadedFiles.length === 0) {
    return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  }

  const { data: msg, error } = await admin
    .from("consultation_messages")
    .insert({
      consultation_id: id,
      sender_type: "client",
      sender_name: profile.name ?? "Cliente",
      content: content || null,
      files: uploadedFiles,
      read_by_client_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Email notification to hub assigned team (non-blocking)
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data: assigned } = await admin
      .from("consultations").select("assigned_to").eq("id", id).single();
    const notifyIds = assigned?.assigned_to ? [assigned.assigned_to] : [];

    if (notifyIds.length > 0) {
      const { data: hubUsers } = await admin.auth.admin.listUsers();
      const emails = (hubUsers?.users ?? [])
        .filter(u => notifyIds.includes(u.id) && u.email)
        .map(u => u.email!);
      if (emails.length > 0) {
        await resend.emails.send({
          from: "Spingarn Hub <hub@spingarn.ec>",
          to: emails,
          subject: `Respuesta del cliente — ${consultation?.title ?? "consulta"}`,
          html: `<p>El cliente respondió a tu solicitud de información en la consulta <strong>${consultation?.title ?? ""}</strong>.</p>
                 ${content ? `<p><em>"${content}"</em></p>` : ""}
                 <p><a href="${process.env.NEXT_PUBLIC_HUB_URL ?? ""}/consultas/${id}">Ver en hub →</a></p>`,
        });
      }
    }
  } catch { /* non-critical */ }

  return NextResponse.json({ ok: true, message: msg });
}
