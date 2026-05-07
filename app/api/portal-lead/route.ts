import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, client_id")
      .eq("id", user.id)
      .single();

    const { data: clientRow } = profile?.client_id
      ? await supabase.from("clients").select("name").eq("id", profile.client_id).single()
      : { data: null };

    const clientName = clientRow?.name ?? profile?.name ?? "Cliente";

    const { conversation }: { conversation: { role: string; content: string }[] } = await req.json();

    const transcript = conversation
      .map(m => `${m.role === "user" ? "Cliente" : "Asesor IA"}: ${m.content}`)
      .join("\n\n");

    const to = (process.env.LEAD_RECIPIENT ?? "dnarvaez@spingarn.ec").split(",");

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@spingarn.ec",
      to,
      subject: `Nuevo lead desde el portal — ${clientName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #C8007A; padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">Nueva Oportunidad de Negocio</h1>
            <p style="color: #FFD6EE; margin: 4px 0 0; font-size: 14px;">Portal de Clientes · Spingarn Hub</p>
          </div>
          <div style="background: #fff; border: 1px solid #f0f0f0; border-top: none; padding: 28px 32px; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 8px;"><strong>Cliente:</strong> ${clientName}</p>
            <p style="margin: 0 0 24px;"><strong>Fecha:</strong> ${new Date().toLocaleString("es-EC")}</p>
            <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 0 0 24px;" />
            <h2 style="font-size: 15px; color: #333; margin: 0 0 16px;">Conversación con el Asesor IA</h2>
            <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 13px; color: #444; line-height: 1.6;">
${transcript}
            </div>
            <div style="margin-top: 24px; padding: 16px; background: #FFF0F8; border-radius: 8px; border-left: 3px solid #C8007A;">
              <p style="margin: 0; font-size: 13px; color: #7D0049;"><strong>Acción requerida:</strong> Contactar al cliente para dar seguimiento a esta oportunidad.</p>
            </div>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("portal-lead error", err);
    return NextResponse.json({ error: "Error al enviar" }, { status: 500 });
  }
}
