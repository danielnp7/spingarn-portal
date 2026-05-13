import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

export async function POST(req: NextRequest) {
  const { name, company, email, password } = await req.json();

  if (!name || !company || !email || !password || password.length < 8) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const admin = adminClient();

  // Check if email already registered
  const { data: existing } = await admin.auth.admin.listUsers();
  const alreadyExists = existing?.users?.some(u => u.email === email.trim().toLowerCase());
  if (alreadyExists) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese correo" }, { status: 409 });
  }

  // Create auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  });
  if (authErr || !authData.user) {
    return NextResponse.json({ error: authErr?.message ?? "Error al crear usuario" }, { status: 500 });
  }

  const userId = authData.user.id;

  try {
    // Create client record
    const { data: client, error: clientErr } = await admin
      .from("clients")
      .insert({ name: company.trim() })
      .select()
      .single();
    if (clientErr || !client) throw new Error(clientErr?.message ?? "Error al crear empresa");

    // Create wallet
    await admin.from("client_wallet").insert({
      client_id: client.id,
      balance_credits: 0,
      reserved_credits: 0,
      used_credits: 0,
      credit_unit_usd: 75,
    });

    // Create profile linked to client
    const { error: profileErr } = await admin.from("profiles").insert({
      id: userId,
      name: name.trim(),
      role: "cliente",
      client_id: client.id,
    });
    if (profileErr) throw new Error(profileErr.message);

    // Send welcome email (non-blocking)
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Spingarn <hub@spingarn.ec>",
        to: email.trim().toLowerCase(),
        subject: "Bienvenido a Spingarn",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#C8007A">Bienvenido, ${name.trim()}!</h2>
            <p>Tu cuenta en el portal de clientes Spingarn ha sido creada exitosamente para <strong>${company.trim()}</strong>.</p>
            <p>Ya puedes acceder a todos nuestros servicios: consultas, proyectos, documentos y más.</p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/portal"
               style="display:inline-block;margin-top:16px;padding:12px 24px;background:#C8007A;color:white;border-radius:8px;text-decoration:none;font-weight:600">
              Ir a mi portal →
            </a>
            <p style="margin-top:24px;color:#6B7280;font-size:12px">Spingarn Integrated Business Consulting</p>
          </div>
        `,
      });
    } catch { /* non-critical */ }

    return NextResponse.json({ ok: true, userId, clientId: client.id }, { status: 201 });

  } catch (err) {
    // Rollback: delete auth user if something failed
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error inesperado" }, { status: 500 });
  }
}
