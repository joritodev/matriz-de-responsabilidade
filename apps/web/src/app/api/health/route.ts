import { NextResponse } from "next/server";
import { getEnv } from "@/lib/db";
import { pingDatabase } from "@/lib/queries";

export async function GET() {
  const env = getEnv();
  let db = false;
  try {
    db = await pingDatabase();
  } catch {
    db = false;
  }
  const ok = db;
  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      role: env.processRole,
      db,
      whatsappEnabled: env.whatsappEnabled,
      aiEnabled: env.aiEnabled,
      tz: env.tz,
    },
    { status: ok ? 200 : 503 },
  );
}
