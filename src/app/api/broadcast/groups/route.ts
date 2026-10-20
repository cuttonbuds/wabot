import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { gatewayGetGroups, gatewaySendText } from "@/lib/gateway";
import {
  createBroadcastCampaign,
  recordBroadcastLog,
  updateBroadcastCampaign,
} from "@/lib/broadcast";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/broadcast/groups?session={session}
 * Retrieves all WhatsApp groups for the given session ID using GET /api/{session}/groups
 */
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const url = new URL(req.url);
    const sessionQuery = url.searchParams.get("session") || url.searchParams.get("sessionId");
    const limitQuery = url.searchParams.get("limit");
    const offsetQuery = url.searchParams.get("offset");
    const sortOrderQuery = url.searchParams.get("sortOrder") as "asc" | "desc" | null;

    const limit = limitQuery ? Math.max(1, parseInt(limitQuery, 10)) : 50;
    const offset = offsetQuery ? Math.max(0, parseInt(offsetQuery, 10)) : 0;
    const sortOrder = sortOrderQuery === "asc" ? "asc" : "desc";

    // Only the session owned by the logged-in user is ever used. No cross-tenant lookup.
    const ownSession = await prisma.waSession.findUnique({
      where: { userId: user!.id },
      select: { id: true, sessionName: true, status: true },
    });

    if (!ownSession) {
      return NextResponse.json(
        {
          success: false,
          error: "Sesi WhatsApp untuk akun ini belum tersedia. Buat sesi di halaman Gateway terlebih dahulu.",
          sessions: [],
          groups: [],
        },
        { status: 404 }
      );
    }

    const explicitSession = sessionQuery?.trim();
    if (explicitSession && explicitSession !== ownSession.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Anda hanya dapat mengakses grup dari sesi milik akun Anda sendiri.",
          sessions: [ownSession],
          groups: [],
        },
        { status: 403 }
      );
    }

    const activeSessionId = ownSession.id;

    const result = await gatewayGetGroups({
      userId: user!.id,
      sessionId: activeSessionId,
      limit,
      offset,
      sortOrder,
      excludeParticipants: true,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Gagal mengambil daftar grup WhatsApp dari Gateway.",
          sessionId: activeSessionId,
          sessions: [ownSession],
          groups: [],
          limit,
          offset,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: activeSessionId,
      sessions: [ownSession],
      groups: result.groups,
      total: result.groups.length,
      limit,
      offset,
      sortOrder,
    });
  } catch (error: any) {
    console.error("[Broadcast Groups GET Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error", groups: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/broadcast/groups
 * Executes a broadcast message to multiple WhatsApp groups with configurable anti-ban delay
 */
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const {
      title,
      message,
      groupJids,
      groupNames = {},
      delaySeconds = 3,
      sessionId: customSessionId,
    } = body;


    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Pesan broadcast tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (!Array.isArray(groupJids) || groupJids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pilih minimal 1 grup WhatsApp tujuan." },
        { status: 400 }
      );
    }

    const campaignTitle = (title || "").trim() || `Broadcast Grup - ${new Date().toLocaleDateString("id-ID")}`;
    const cleanDelay = Math.min(Math.max(Number(delaySeconds) || 3, 1), 30);

    // 1. Create campaign entry
    const campaignId = await createBroadcastCampaign({
      userId: user!.id,
      title: campaignTitle,
      message: message.trim(),
      totalGroups: groupJids.length,
      delaySeconds: cleanDelay,
    });

    // Resolve the caller's own session. A mismatching sessionId from the client is rejected.
    const ownSession = await prisma.waSession.findUnique({
      where: { userId: user!.id },
      select: { id: true },
    });
    if (!ownSession) {
      return NextResponse.json(
        { success: false, error: "Sesi WhatsApp untuk akun ini belum tersedia." },
        { status: 404 }
      );
    }
    const requestedSessionId = typeof customSessionId === "string" ? customSessionId.trim() : "";
    if (requestedSessionId && requestedSessionId !== ownSession.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Anda hanya dapat broadcast melalui sesi milik akun Anda sendiri.",
        },
        { status: 403 }
      );
    }
    const sessionId = ownSession.id;

    let successCount = 0;
    let failedCount = 0;
    const executionDetails: Array<{
      groupJid: string;
      groupName: string;
      status: "SENT" | "FAILED";
      error?: string;
    }> = [];

    // 2. Iterate and send to each group
    for (let i = 0; i < groupJids.length; i++) {
      const jid = groupJids[i];
      const gName = groupNames[jid] || "Grup WhatsApp";

      try {
        const sendResult = await gatewaySendText(jid, message.trim(), {
          userId: user!.id,
          sessionId,
        });

        if (sendResult.success) {
          successCount++;
          await recordBroadcastLog({
            campaignId,
            groupJid: jid,
            groupName: gName,
            status: "SENT",
          });
          executionDetails.push({ groupJid: jid, groupName: gName, status: "SENT" });
        } else {
          failedCount++;
          const errReason = sendResult.error || "Gagal mengirim pesan via Gateway";
          await recordBroadcastLog({
            campaignId,
            groupJid: jid,
            groupName: gName,
            status: "FAILED",
            errorMessage: errReason,
          });
          executionDetails.push({
            groupJid: jid,
            groupName: gName,
            status: "FAILED",
            error: errReason,
          });
        }
      } catch (err: any) {
        failedCount++;
        const errReason = err?.message || "Kesalahan jaringan gateway";
        await recordBroadcastLog({
          campaignId,
          groupJid: jid,
          groupName: gName,
          status: "FAILED",
          errorMessage: errReason,
        });
        executionDetails.push({
          groupJid: jid,
          groupName: gName,
          status: "FAILED",
          error: errReason,
        });
      }

      // Anti-ban delay between groups (only if there are more groups remaining)
      if (i < groupJids.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, cleanDelay * 1000));
      }
    }

    // 3. Update campaign summary status
    const finalStatus =
      failedCount === 0 ? "COMPLETED" : successCount === 0 ? "FAILED" : "PARTIAL";

    await updateBroadcastCampaign(campaignId, {
      status: finalStatus,
      successCount,
      failedCount,
    });

    return NextResponse.json({
      success: true,
      message: `Broadcast selesai. Berhasil ke ${successCount} grup, gagal: ${failedCount}.`,
      campaignId,
      status: finalStatus,
      totalGroups: groupJids.length,
      successCount,
      failedCount,
      details: executionDetails,
    });
  } catch (error: any) {
    console.error("[Broadcast Groups POST Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memproses broadcast grup" },
      { status: 500 }
    );
  }
}
