import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getWahaSession,
  getWahaQr,
  getWahaMe,
  startWahaSession,
  stopWahaSession,
  restartWahaSession,
  createWahaSession,
  ensureWahaSession,
  syncWahaWebhookConfig,
  getWahaHeaders,
  buildWebhookUrl,
} from "@/lib/waha";
import { requireAuthUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    // 1. Ambil sesi khusus milik user ini (terisolasi berdasarkan userId)
    let session = await prisma.waSession.findUnique({
      where: { userId: user!.id },
    });

    if (!session) {
      // Buat ID sesi baru eksklusif untuk user ini
      const sessionSlug = `usr_${user!.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`;
      const cleanName = user!.email ? user!.email.split("@")[0] : "Bot";

      session = await prisma.waSession.create({
        data: {
          id: sessionSlug,
          userId: user!.id,
          sessionName: `WA Bot (${cleanName})`,
          gatewayType: "WAHA",
          status: "SCAN_QR",
        },
      });
    }

    const targetSession = session.id;

    // Lightweight mode (?light=1): return the stored session only, without touching WAHA.
    // Used by the sidebar status indicator so background polling stays cheap.
    if (req.nextUrl.searchParams.get("light") === "1") {
      return NextResponse.json({
        session: {
          id: session.id,
          sessionName: session.sessionName,
          status: session.status,
          updatedAt: session.updatedAt,
        },
        light: true,
      });
    }

    // ==========================================
    // HANDLE WAHA GATEWAY
    // ==========================================
    let wahaConnected = false;
    try {
      const pingRes = await fetch(
        `${(session as any).apiUrl || process.env.WAHA_BASE_URL || "http://localhost:3000"}/api/sessions`,
        {
          method: "GET",
          headers: getWahaHeaders(),
          signal: AbortSignal.timeout(4000),
        }
      );
      wahaConnected = pingRes.ok || pingRes.status === 401;
    } catch {
      wahaConnected = false;
    }

    const webhookUrl = buildWebhookUrl(targetSession, user!.id, req);
    if (wahaConnected) {
      await ensureWahaSession(targetSession, webhookUrl);
    }

    let meInfo = await getWahaMe(targetSession);
    let liveQrDataUrl: string | null = null;
    const qrProxyUrl = `/api/waha/qr?session=${encodeURIComponent(targetSession)}`;

    try {
      const liveInfo = await getWahaSession(targetSession);
      let liveStatus = session.status;

      if (meInfo) {
        liveStatus = "CONNECTED";
      } else if (liveInfo) {
        if (liveInfo.status === "WORKING") {
          liveStatus = "CONNECTED";
          if (!meInfo) meInfo = await getWahaMe(targetSession);
        } else if (liveInfo.status === "SCAN_QR_CODE" || liveInfo.status === "SCAN_QR") {
          liveStatus = "SCAN_QR";
          const qrData = await getWahaQr(targetSession);
          liveQrDataUrl = qrData?.dataUrl || qrData?.raw || null;
        } else if (liveInfo.status === "STOPPED") {
          liveStatus = "DISCONNECTED";
        } else if (liveInfo.status === "STARTING") {
          liveStatus = "STARTING";
        }
      }

      if (
        liveStatus !== session.status ||
        (liveQrDataUrl && liveQrDataUrl !== session.qrCodeRaw)
      ) {
        session = await prisma.waSession.update({
          where: { id: session.id },
          data: {
            status: liveStatus,
            qrCodeRaw: liveQrDataUrl || (liveStatus === "CONNECTED" ? null : session.qrCodeRaw),
          },
        });
      }
    } catch (err: any) {
      console.warn(
        `[API Session] Error checking live session ${targetSession}:`,
        err.message
      );
    }

    if (!liveQrDataUrl && session.qrCodeRaw?.startsWith("data:image")) {
      liveQrDataUrl = session.qrCodeRaw;
    }

    return NextResponse.json({
      session,
      me: meInfo,
      qr: liveQrDataUrl,
      qrUrl: qrProxyUrl,
      webhookUrl,
      wahaConnected,
      gatewayConnected: wahaConnected,
      activeGateway: "WAHA",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const action = body.action;

    let session = await prisma.waSession.findUnique({
      where: { userId: user!.id },
    });

    if (!session) {
      const sessionSlug = `usr_${user!.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`;
      session = await prisma.waSession.create({
        data: {
          id: sessionSlug,
          userId: user!.id,
          sessionName: `WA Bot (${user!.email ? user!.email.split("@")[0] : "Default"})`,
          gatewayType: "WAHA",
          status: "SCAN_QR",
        },
      });
    }

    // ==========================================
    // ACTION: UPDATE GATEWAY CONFIGURATION
    // ==========================================
    if (action === "update_gateway_config") {
      const aUrl =
        typeof body.apiUrl !== "undefined"
          ? body.apiUrl?.trim() || null
          : (session as any).apiUrl;
      const aKey =
        typeof body.apiKey !== "undefined"
          ? body.apiKey?.trim() || null
          : (session as any).apiKey;
      const sName = body.sessionName?.trim() || session.sessionName;

      await prisma.$executeRaw`UPDATE wa_sessions SET gateway_type = 'WAHA', api_url = ${aUrl}, api_key = ${aKey}, session_name = ${sName}, updated_at = NOW() WHERE id = ${session.id}`;

      session = await prisma.waSession.findUnique({
        where: { id: session.id },
      });

      return NextResponse.json({
        success: true,
        message: "Konfigurasi WAHA berhasil disimpan.",
        session,
      });
    }

    const targetSession = session.id;
    let newStatus = session.status;
    let qrCodeRaw = session.qrCodeRaw;
    let meInfo = null;
    let responseMsg = "";

    // ==========================================
    // DISPATCH ACTIONS TO WAHA
    // ==========================================
    const webhookUrl = buildWebhookUrl(targetSession, user!.id, req);
    let webhookSyncNote = "";

    if (action === "create" || action === "register") {
      const createRes = await createWahaSession(targetSession, webhookUrl);
      if (!createRes.success) {
        return NextResponse.json(
          {
            success: false,
            error: `Gagal mendaftarkan sesi '${targetSession}' ke WAHA: ${createRes.error}`,
          },
          { status: 400 }
        );
      }

      // createWahaSession treats "already exists" as success; make sure such a
      // pre-existing session gets the current webhook URL + HMAC key.
      const sync = await syncWahaWebhookConfig(targetSession, webhookUrl);
      if (sync.updated) webhookSyncNote = " Webhook & HMAC key diperbarui di WAHA.";

      await startWahaSession(targetSession);
      await new Promise((r) => setTimeout(r, 1200));

      meInfo = await getWahaMe(targetSession);
      if (meInfo) {
        newStatus = "CONNECTED";
        qrCodeRaw = null;
        responseMsg = `Sesi Anda '${targetSession}' berhasil didaftarkan dan terhubung!`;
      } else {
        newStatus = "SCAN_QR";
        const qrData = await getWahaQr(targetSession);
        qrCodeRaw = qrData?.dataUrl || qrData?.raw || null;
        responseMsg = `Sesi Anda '${targetSession}' berhasil dibuat di WAHA. Silakan scan QR code.`;
      }
    } else if (action === "start") {
      const ensured = await ensureWahaSession(targetSession, webhookUrl, { syncWebhook: true });
      if (ensured.webhookUpdated) webhookSyncNote = " Webhook & HMAC key diperbarui di WAHA.";
      await startWahaSession(targetSession);
      await new Promise((r) => setTimeout(r, 800));

      meInfo = await getWahaMe(targetSession);
      if (meInfo) {
        newStatus = "CONNECTED";
        qrCodeRaw = null;
        responseMsg = `Sesi bot Anda (${targetSession}) terhubung.`;
      } else {
        newStatus = "SCAN_QR";
        const qrData = await getWahaQr(targetSession);
        qrCodeRaw = qrData?.dataUrl || qrData?.raw || null;
        responseMsg = `Sesi bot Anda (${targetSession}) dimulai. Silakan scan QR code.`;
      }
    } else if (action === "restart") {
      const ensured = await ensureWahaSession(targetSession, webhookUrl, { syncWebhook: true });
      if (ensured.webhookUpdated) {
        // PUT /api/sessions already stopped and restarted the session with the
        // new webhook config; a second restart would only add downtime.
        webhookSyncNote = " Webhook & HMAC key diperbarui di WAHA.";
      } else {
        await restartWahaSession(targetSession);
      }
      await new Promise((r) => setTimeout(r, 1200));

      meInfo = await getWahaMe(targetSession);
      if (meInfo) {
        newStatus = "CONNECTED";
        qrCodeRaw = null;
        responseMsg = `Sesi bot Anda (${targetSession}) terhubung.`;
      } else {
        newStatus = "SCAN_QR";
        const qrData = await getWahaQr(targetSession);
        qrCodeRaw = qrData?.dataUrl || qrData?.raw || null;
        responseMsg = `Sesi bot Anda (${targetSession}) berhasil direstart. Silakan scan QR code baru.`;
      }
    } else if (action === "stop") {
      await stopWahaSession(targetSession);
      newStatus = "DISCONNECTED";
      qrCodeRaw = null;
      responseMsg = `Sesi bot Anda (${targetSession}) berhasil dihentikan.`;
    } else if (action === "qr") {
      const ensured = await ensureWahaSession(targetSession, webhookUrl, { syncWebhook: true });
      if (ensured.webhookUpdated) webhookSyncNote = " Webhook & HMAC key diperbarui di WAHA.";
      meInfo = await getWahaMe(targetSession);
      if (meInfo) {
        newStatus = "CONNECTED";
        qrCodeRaw = null;
        responseMsg = `Sesi '${targetSession}' sudah terhubung.`;
      } else {
        const qrData = await getWahaQr(targetSession);
        qrCodeRaw = qrData?.dataUrl || qrData?.raw || qrCodeRaw;
        responseMsg = "QR Code sesi Anda berhasil diperbarui.";
      }
    } else if (action === "check_me") {
      meInfo = await getWahaMe(targetSession);
      if (meInfo) {
        newStatus = "CONNECTED";
        qrCodeRaw = null;
        responseMsg = `Sesi '${targetSession}' terhubung dengan akun ${meInfo.pushName || meInfo.id}.`;
      } else {
        responseMsg = `Sesi '${targetSession}' belum terhubung (belum scan QR).`;
      }
    } else if (action === "connected_sim") {
      newStatus = "CONNECTED";
      qrCodeRaw = null;
      responseMsg = `Status bot Anda diubah ke Connected (Simulasi).`;
    } else if (action === "update_name" && body.sessionName) {
      session = await prisma.waSession.update({
        where: { id: session.id },
        data: { sessionName: body.sessionName.trim() },
      });
      responseMsg = "Nama bot berhasil diperbarui.";
    }

    session = await prisma.waSession.update({
      where: { id: session.id },
      data: {
        status: newStatus,
        qrCodeRaw,
        updatedAt: new Date(),
      },
    });

    if (newStatus === "CONNECTED" && !meInfo) {
      meInfo = await getWahaMe(targetSession);
    }

    return NextResponse.json({
      success: true,
      message: responseMsg + webhookSyncNote,
      session,
      me: meInfo,
      qr: qrCodeRaw,
      qrUrl: `/api/waha/qr?session=${encodeURIComponent(targetSession)}`,
      webhookUrl,
      activeGateway: "WAHA",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

