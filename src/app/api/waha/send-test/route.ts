import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatChatId } from "@/lib/waha";
import {
  gatewaySendText,
  gatewaySendSeen,
  gatewayStartTyping,
  gatewayStopTyping,
} from "@/lib/gateway";
import { requireAuthUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { action, phoneNumber, text, session } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Nomor WhatsApp tujuan wajib diisi" },
        { status: 400 }
      );
    }

    const chatId = formatChatId(phoneNumber);

    // Only the dedicated session owned by this user may be used. No shared/default fallback.
    const dbSession = await prisma.waSession.findUnique({
      where: { userId: user!.id },
    });

    if (!dbSession) {
      return NextResponse.json(
        { success: false, error: "Sesi WhatsApp untuk akun ini belum tersedia." },
        { status: 404 }
      );
    }

    const requestedSession = typeof session === "string" ? session.trim() : "";
    if (requestedSession && requestedSession !== dbSession.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Anda hanya dapat mengirim pesan melalui sesi milik akun Anda sendiri.",
        },
        { status: 403 }
      );
    }

    const targetSession = dbSession.id;

    if (dbSession.status !== "CONNECTED") {
      return NextResponse.json(
        {
          success: false,
          action: action || "sendText",
          chatId,
          error: `Sesi "${targetSession}" saat ini berstatus ${dbSession.status}. Silakan scan QR Code WhatsApp terlebih dahulu sampai terhubung (CONNECTED) sebelum melakukan tes kirim pesan.`,
          sessionStatus: dbSession.status,
        },
        { status: 400 }
      );
    }

    if (action === "seen") {
      await gatewaySendSeen(chatId, undefined, {
        userId: user!.id,
        sessionId: targetSession,
      });
      return NextResponse.json({
        success: true,
        action: "sendSeen",
        chatId,
        message: "Status Seen (Centang Biru) berhasil dikirim via WAHA",
      });
    }

    if (action === "typing") {
      await gatewayStartTyping(chatId, {
        userId: user!.id,
        sessionId: targetSession,
      });
      await new Promise((r) => setTimeout(r, 2000));
      await gatewayStopTyping(chatId, {
        userId: user!.id,
        sessionId: targetSession,
      });
      return NextResponse.json({
        success: true,
        action: "startTyping",
        chatId,
        message: "Status Typing (2 detik) berhasil dikirim via WAHA",
      });
    }

    // Default: Send Text
    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: "Isi pesan teks wajib diisi" },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const result = await gatewaySendText(chatId, text.trim(), {
      userId: user!.id,
      sessionId: targetSession,
    });
    const latencyMs = Date.now() - startTime;

    if (result.success) {
      return NextResponse.json({
        success: true,
        action: "sendText",
        chatId,
        messageId: result.messageId,
        latencyMs,
        message: `Pesan berhasil dikirim via WAHA ke ${chatId}`,
      });
    } else {
      return NextResponse.json({
        success: false,
        action: "sendText",
        chatId,
        error: result.error || "Gagal mengirim pesan via WAHA",
        latencyMs,
      });
    }

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
