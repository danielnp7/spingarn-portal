import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  const results: Record<string, string> = {};

  results.anthropic_key = process.env.ANTHROPIC_API_KEY ? "present" : "MISSING";

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 20,
      messages: [{ role: "user", content: "Di solo: OK" }],
    });
    results.claude = msg.content[0].type === "text" ? msg.content[0].text : "no text";
  } catch (e) {
    results.claude = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(results);
}
