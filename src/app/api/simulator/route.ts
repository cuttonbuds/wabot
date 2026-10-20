import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth-server";
import { executeBotPipeline, InboundMessagePayload } from "@/lib/bot-pipeline";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/simulator
 * Runs the bot pipeline for a simulated inbound message, scoped strictly to the
 * logged-in user's own WhatsApp session. Replaces the previous pattern of calling
 * the public WAHA webhook from the browser (which is now HMAC-protected).
 */
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const from = typeof body.from === "string" ? body.from.trim() : "";
    const text = typeof body.body === "string" ? body.body.trim() : "";
    const pushName = typeof body.pushName === "string" ? body.pushName.trim() : "";

    if (!from) {
      return NextResponse.json(
        { success: false, error: "Nomor/JID pengirim simulasi wajib diisi." },
        { status: 400 }
      );
    }
    if (!text) {
      return NextResponse.json(
        { success: false, error: "Isi pesan simulasi wajib diisi." },
        { status: 400 }
      );
    }

    // Always use the caller's own session; never accept a session/userId from the client.
    const ownSession = await prisma.waSession.findUnique({
      where: { userId: user!.id },
    });

    if (!ownSession) {
      return NextResponse.json(
        { success: false, error: "Sesi WhatsApp untuk akun ini belum tersedia." },
        { status: 404 }
      );
    }

    const payload: InboundMessagePayload = {
      event: "message",
      session: ownSession.id,
      wahaMessageId: `sim_${user!.id.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      from,
      pushName,
      body: text,
      hasMedia: false,
      type: "chat",
      fromMe: false,
    };

    const result = await executeBotPipeline(payload);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("[Simulator Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
