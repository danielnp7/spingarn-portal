import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

const BUCKET = "client-files";

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function getClientId(): Promise<{ clientId: string | null; error?: NextResponse }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { clientId: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) return { clientId: null, error: NextResponse.json({ error: "No client" }, { status: 403 }) };

  return { clientId: profile.client_id };
}

// GET — list files for this client
export async function GET() {
  const { clientId, error } = await getClientId();
  if (error) return error;

  const admin = adminClient();

  // Ensure bucket exists (private)
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.find(b => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: false });
  }

  const { data: files, error: listError } = await admin.storage.from(BUCKET).list(clientId!, {
    sortBy: { column: "created_at", order: "desc" },
  });

  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  return NextResponse.json({ files: files ?? [] });
}

// POST — upload a file
export async function POST(req: NextRequest) {
  const { clientId, error } = await getClientId();
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const MAX_MB = 20;
  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `El archivo no puede superar ${MAX_MB} MB` }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${clientId}/${Date.now()}_${safeName}`;

  const admin = adminClient();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  return NextResponse.json({ ok: true, path, name: file.name, size: file.size });
}

// DELETE — remove a file (only if belongs to this client)
export async function DELETE(req: NextRequest) {
  const { clientId, error } = await getClientId();
  if (error) return error;

  const { path: filename } = await req.json();
  if (!filename) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  // Server constructs the full path to prevent path traversal
  const path = `${clientId}/${filename}`;

  const admin = adminClient();
  const { error: deleteError } = await admin.storage.from(BUCKET).remove([path]);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
