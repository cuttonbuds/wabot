import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { executeBotPipeline, InboundMessagePayload } from "@/lib/bot-pipeline";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Verifies the WAHA webhook signature.
 * WAHA signs the raw request body with HMAC (default SHA-512) using the key configured
 * in the session webhook config (`hmac.key`) and sends:
 *   X-Webhook-Hmac:           <hex digest>
 *   X-Webhook-Hmac-Algorithm: sha512
 */
function verifyWahaHmac(rawRequestBody: string, req: NextRequest, key: string): boolean {
  const signature = req.headers.get("x-webhook-hmac")?.trim().toLowerCase();
  if (!signature) return false;

  const algorithmHeader = (req.headers.get("x-webhook-hmac-algorithm") || "sha512")
    .trim()
    .toLowerCase();
  // Only accept the algorithm family WAHA actually uses; refuse anything weaker.
  if (algorithmHeader !== "sha512") return false;

  let expected: string;
  try {
    expected = createHmac("sha512", key).update(rawRequestBody, "utf8").digest("hex");
  } catch {
    return false;
  }

  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length === 0 || sigBuf.length !== expBuf.length) return false;
  return timingSafeEqual(sigBuf, expBuf);
}

/**
 * WAHA Inbound Webhook Handler
 * Format WAHA: { event: 'message' | 'message.any', payload: { id, from, body, hasMedia, type, fromMe, _data: { notifyName } } }
 *
 * Security:
 * - Request body is authenticated via HMAC-SHA512 (WAHA_WEBHOOK_HMAC_KEY).
 * - Tenant is resolved ONLY from the (verified) session name; any `userId` in query/body is ignored.
 */
export async function POST(req: NextRequest) {
  try {
    const hmacKey = process.env.WAHA_WEBHOOK_HMAC_KEY?.trim();
    if (!hmacKey) {
      console.error("[Webhook] WAHA_WEBHOOK_HMAC_KEY belum diset. Webhook ditolak.");
      return NextResponse.json(
        {
          error: "Webhook Not Configured",
          message:
            "WAHA_WEBHOOK_HMAC_KEY belum dikonfigurasi di server. Set environment variable ini dan daftarkan ulang webhook di WAHA dengan hmac.key yang sama.",
        },
        { status: 503 }
      );
    }

    // Read the RAW body first; the HMAC is computed over the exact bytes WAHA sent.
    const rawRequestBody = await req.text();

    if (!verifyWahaHmac(rawRequestBody, req, hmacKey)) {
      console.warn("[Webhook] Signature HMAC tidak valid atau tidak ada. Request ditolak.");
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid webhook signature." },
        { status: 401 }
      );
    }

    let data: any;
    try {
      data = rawRequestBody ? JSON.parse(rawRequestBody) : {};
    } catch {
      return NextResponse.json({ error: "Bad Request", message: "Invalid JSON body." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const querySession = searchParams.get("session")?.trim();

    const event = data.event || "message";

    // Ignore non-message events (presence, ack, lifecycle)
    if (
      event === "session.status" ||
      event === "presence.update" ||
      event === "message.ack" ||
      event === "message.reaction" ||
      event === "message.revoked" ||
      event === "engine.start"
    ) {
      return NextResponse.json({ received: true, event });
    }

    const payloadData = data.payload || data;
    const resolvedSession = querySession || data.session || payloadData.session;

    // Extract sender JID / phone from multiple possible structures
    const rawFrom =
      payloadData.from ||
      payloadData.chatId ||
      payloadData.key?.remoteJid ||
      payloadData.author ||
      payloadData.participant ||
      data.from ||
      "";

    // Extract text body from multiple possible structures (Baileys / NOWEB / WEBJS)
    const rawBody =
      payloadData.body ||
      payloadData.text ||
      payloadData.message?.conversation ||
      payloadData.message?.extendedTextMessage?.text ||
      payloadData.message?.imageMessage?.caption ||
      payloadData.message?.videoMessage?.caption ||
      payloadData.message?.documentMessage?.caption ||
      payloadData._data?.body ||
      "";

    const rawFromMe = Boolean(
      payloadData.fromMe ??
      payloadData.key?.fromMe ??
      payloadData._data?.id?.fromMe ??
      false
    );

    const rawPushName =
      payloadData.pushName ||
      payloadData.notifyName ||
      payloadData._data?.notifyName ||
      payloadData.senderName ||
      "";

    const rawMessageId =
      payloadData.id ||
      payloadData.key?.id ||
      payloadData.messageId ||
      payloadData.wahaMessageId ||
      `waha_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const payload: InboundMessagePayload = {
      event,
      session: resolvedSession,
      wahaMessageId: typeof rawMessageId === "object" ? rawMessageId._serialized || rawMessageId.id : String(rawMessageId),
      from: String(rawFrom),
      pushName: String(rawPushName),
      body: String(rawBody),
      hasMedia: Boolean(
        payloadData.hasMedia ||
        payloadData.message?.imageMessage ||
        payloadData.message?.videoMessage ||
        payloadData.message?.documentMessage
      ),
      type: payloadData.type || (payloadData.hasMedia ? "media" : "chat"),
      fromMe: rawFromMe,
    };

    if (!payload.from) {
      return NextResponse.json({ received: true, ignored: "Missing sender 'from' in payload" });
    }

    if (!payload.session) {
      return NextResponse.json({ received: true, ignored: "Missing session in payload" });
    }

    // Tenant resolution happens inside the pipeline strictly from the session record.
    // Never trust userId from query string or body.
    const result = await executeBotPipeline(payload);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("[Webhook Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
