import { prisma } from "./prisma";
import {
  gatewaySendSeen,
  gatewayStartTyping,
  gatewayStopTyping,
  gatewaySendText,
  GatewayType,
} from "./gateway";
import { processCustomerMessageWithAi, validateAndCleanCustomerName } from "./ai-agent";
import { getPhoneNumberFromLid } from "./waha";


export interface WebhookMessagePayload {
  event?: string;
  gatewayType?: GatewayType;
  session?: string;
  from: string; // e.g. "628123456789@c.us" or "xxx@lid" or "xxx@s.whatsapp.net"
  fromMe?: boolean;
  body?: string;
  wahaMessageId?: string;
  pushName?: string;
  hasMedia?: boolean;
  type?: string; // 'chat', 'image', 'video', etc.
}

export type InboundMessagePayload = WebhookMessagePayload;

export interface PipelineExecutionResult {
  success: boolean;
  actionTaken:
    | "IGNORED_FROM_ME"
    | "IGNORED_GROUP_OR_BROADCAST"
    | "IGNORED_NON_TEXT"
    | "SAVED_MANUAL_TAKEOVER"
    | "AI_REPLIED"
    | "ERROR"
    | "DUPLICATE_IGNORED"
    | "IGNORED_UNKNOWN_SESSION";
  contactId?: number;
  customerMessage?: string;
  aiReplyMessage?: string;
  leadStage?: string;
  leadScore?: number;
  persona?: string;
  schoolOrigin?: string;
  targetCampusMajor?: string;
  error?: string;
}

/**
 * Validasi apakah pengirim adalah Chat Pribadi (@c.us atau @lid)
 * Mengabaikan Grup (@g.us), Broadcast, Newsletter, dan Status
 */
export function isDirectPersonalChat(from: string): boolean {
  if (!from) return false;
  const lowerFrom = from.toLowerCase().trim();

  // Tolak grup, channel, newsletter, status broadcast
  if (
    lowerFrom.includes("@g.us") ||
    lowerFrom.includes("@broadcast") ||
    lowerFrom.includes("@newsletter") ||
    lowerFrom.includes("status@")
  ) {
    return false;
  }

  // Terima hanya @c.us, @lid, @s.whatsapp.net, atau nomor telepon murni
  return (
    lowerFrom.endsWith("@c.us") ||
    lowerFrom.endsWith("@lid") ||
    lowerFrom.endsWith("@s.whatsapp.net") ||
    /^[0-9+]+$/.test(lowerFrom)
  );
}

/**
 * Mekanisme Eksekusi Bot Pipeline:
 * Webhook menerima data -> Cek bukan pesan bot sendiri (fromMe)
 * -> Cek hanya chat pribadi (@c.us / @lid) -> Cek pesan teks -> Cek/tambah kontak
 * -> Simpan pesan customer ke DB -> Cek status takeover
 * -> Olah AI Agent (LLM + System Prompt + Knowledge RAG)
 * -> SIMPAN PESAN AI & UPDATE KONTAK KE DATABASE (Prioritas Utama)
 * -> Kirim notifikasi WAHA (seen, typing, sendText) secara aman
 */
export async function executeBotPipeline(
  payload: WebhookMessagePayload
): Promise<PipelineExecutionResult> {
  try {
    // 1. Cek apakah ini pesan dari bot sendiri (fromMe), jika ya abaikan
    if (payload.fromMe) {
      return { success: true, actionTaken: "IGNORED_FROM_ME" };
    }

    // 2. Cek apakah ini chat pribadi (@c.us atau @lid), jika grup/broadcast abaikan
    if (!isDirectPersonalChat(payload.from)) {
      console.log(`[Pipeline] Ignored non-personal chat (Group/Broadcast): ${payload.from}`);
      return { success: true, actionTaken: "IGNORED_GROUP_OR_BROADCAST" };
    }

    // 3. Cek apakah ini pesan teks atau bukan, jika bukan abaikan
    const isTextMessage =
      payload.type === "chat" || (!payload.hasMedia && typeof payload.body === "string");
    const messageText = payload.body?.trim();

    if (!isTextMessage || !messageText) {
      console.log("[Pipeline] Ignored non-text / media message:", payload.type);
      return { success: true, actionTaken: "IGNORED_NON_TEXT" };
    }

    // Normalize multi-device JID suffix (e.g. "628117371015:0@s.whatsapp.net" -> "628117371015@c.us")
    const normalizedFrom = payload.from.replace(/:\d+@/, "@");
    const isLid =
      normalizedFrom.toLowerCase().includes("@lid") ||
      (payload as any).type === "lid";
    const rawFromDigits = normalizedFrom.split("@")[0].replace(/[^0-9]/g, "");

    if (!rawFromDigits) {
      return { success: false, actionTaken: "ERROR", error: "Invalid sender identifier in from payload" };
    }

    const extractedLid = isLid ? rawFromDigits : (payload as any).lid || null;
    let extractedPhone = !isLid ? rawFromDigits : null;

    // Idempotency check: pastikan wahaMessageId belum pernah diproses
    if (payload.wahaMessageId) {
      const existingMessage = await prisma.message.findUnique({
        where: { wahaMessageId: payload.wahaMessageId },
      });
      if (existingMessage) {
        return { success: true, actionTaken: "DUPLICATE_IGNORED" };
      }
    }

    // Resolve which user owns this bot session, STRICTLY from the session record.
    // No fallback to other tenants' contacts or to "the most recent CONNECTED session".
    if (!payload.session) {
      console.warn("[Pipeline] Ignored message without session identifier.");
      return { success: true, actionTaken: "IGNORED_UNKNOWN_SESSION" };
    }

    // WAHA session name === WaSession.id (see /api/waha/session: targetSession = session.id)
    const sessionRecord = await prisma.waSession.findUnique({
      where: { id: payload.session },
    });

    if (!sessionRecord?.userId) {
      console.warn(`[Pipeline] Ignored message for unknown session '${payload.session}'.`);
      return { success: true, actionTaken: "IGNORED_UNKNOWN_SESSION" };
    }

    const resolvedUserId: string = sessionRecord.userId;

    const activeSessionId = sessionRecord.id;

    // If sender is a WhatsApp LID, hit GET /api/{session}/lids/{lid} to resolve real phone number
    if (isLid && extractedLid) {
      try {
        const lidInfo = await getPhoneNumberFromLid(
          extractedLid,
          activeSessionId,
          sessionRecord.apiUrl
        );
        if (lidInfo?.phoneNumber) {
          extractedPhone = lidInfo.phoneNumber;
          console.log(`[WAHA] Resolved LID ${extractedLid} -> Phone: ${extractedPhone}`);
        }
        if (lidInfo?.pushName && !payload.pushName) {
          payload.pushName = lidInfo.pushName;
        }
      } catch (err: any) {
        console.warn(`[WAHA] Error resolving phone from LID ${extractedLid}:`, err.message);
      }
    }


    // 4. Cek data di kontak user terkait (mencocokkan via phoneNumber atau whatsappLid)
    const matchConditions: any[] = [];
    if (extractedLid) matchConditions.push({ whatsappLid: extractedLid });
    if (extractedPhone) matchConditions.push({ phoneNumber: extractedPhone });
    matchConditions.push({ phoneNumber: rawFromDigits });

    let contact = (await prisma.contact.findFirst({
      where: {
        userId: resolvedUserId,
        OR: matchConditions,
      },
    })) as any;

    const cleanPushName = validateAndCleanCustomerName(payload.pushName);

    if (!contact) {
      contact = (await (prisma.contact as any).create({
        data: {
          userId: resolvedUserId,
          phoneNumber: extractedPhone || rawFromDigits,
          whatsappLid: extractedLid,
          customerName:
            cleanPushName ||
            (extractedPhone
              ? `Siswa (+${extractedPhone})`
              : `Siswa (WA LID: ${rawFromDigits.slice(-6)})`),
          leadStatus: "Cold",
          leadStage: "NEW_LEAD",
          leadTemperature: "COLD",
          leadScore: 10,
          persona: "UNKNOWN",
          handlingStatus: "AI_HANDLED",
          sentiment: "Neutral",
          lastCustomerMessageAt: new Date(),
          lastInteractionAt: new Date(),
        },
      })) as any;
      console.log(
        `[Pipeline] New personal contact created for user ${resolvedUserId}: ${contact.phoneNumber} (LID: ${contact.whatsappLid || "-"}, ID: ${contact.id})`
      );
    } else {
      const isPlaceholder =
        !contact.customerName ||
        contact.customerName.startsWith("Siswa (+") ||
        contact.customerName.startsWith("Siswa (WA LID:");

      const updateData: any = {
        lastCustomerMessageAt: new Date(),
        lastInteractionAt: new Date(),
        customerName: isPlaceholder && cleanPushName ? cleanPushName : contact.customerName,
      };

      if (extractedLid && !contact.whatsappLid) {
        updateData.whatsappLid = extractedLid;
      }
      if (extractedPhone && (!contact.phoneNumber || contact.phoneNumber === contact.whatsappLid)) {
        updateData.phoneNumber = extractedPhone;
      }

      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: updateData,
      });
    }


    // 5. SIMPAN PESAN MASUK DARI CUSTOMER KE DATABASE DB (messages)
    await prisma.message.create({
      data: {
        contactId: contact.id,
        wahaMessageId: payload.wahaMessageId || `in_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        senderType: "customer",
        messageBody: messageText,
      },
    });

    // 6. Cek handlingStatus: Jika sedang diambil alih oleh Staff (MANUAL_TAKEOVER), simpan pesan tapi JANGAN balas via AI
    if (contact.handlingStatus === "MANUAL_TAKEOVER") {
      console.log(`[Pipeline] Contact ${contact.id} (${contact.phoneNumber || contact.whatsappLid}) is in MANUAL_TAKEOVER mode. Skipping AI reply.`);
      return {
        success: true,
        actionTaken: "SAVED_MANUAL_TAKEOVER",
        contactId: contact.id,
        customerMessage: messageText,
      };
    }


    // 7. Ambil riwayat pesan terakhir untuk konteks percakapan AI
    const recentMessages = await prisma.message.findMany({
      where: { contactId: contact.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    recentMessages.reverse();

    // 8. Olah datanya di AI AGENT (LLM + System Message + Product Knowledge RAG + Entity Extraction)
    const aiResult = await processCustomerMessageWithAi(
      messageText,
      contact,
      recentMessages,
      resolvedUserId
    );

    const s = aiResult.structuredOutput;

    // Map lead_temperature / stage to legacy leadStatus
    let legacyLeadStatus = contact.leadStatus || "Cold";
    if (s.lead_stage === "PAID") {
      legacyLeadStatus = "Enrolled";
    } else if (s.lead_temperature === "VERY_HOT" || s.lead_stage === "PAYMENT_PENDING" || s.lead_stage === "HOT_LEAD") {
      legacyLeadStatus = "Hot";
    } else if (s.lead_temperature === "WARM" || s.lead_stage === "CONSULTATION" || s.lead_stage === "QUALIFIED") {
      legacyLeadStatus = "Warm";
    }

    // 9. SIMPAN BALASAN PESAN AI KE DATABASE DB (messages) SEBELUM PENGIRIMAN WAHA
    const aiMessageId = `ai_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await prisma.message.create({
      data: {
        contactId: contact.id,
        wahaMessageId: aiMessageId,
        senderType: "ai",
        messageBody: aiResult.replyMessage,
      },
    });

    const cleanExtractedName = validateAndCleanCustomerName(s.extracted_name);
    const isContactNamePlaceholder =
      !contact.customerName ||
      contact.customerName.startsWith("Siswa (+") ||
      contact.customerName.startsWith("Siswa (WA LID:");

    let resolvedCustomerName = contact.customerName;
    if (cleanExtractedName) {
      resolvedCustomerName = cleanExtractedName;
    } else if (isContactNamePlaceholder && cleanPushName) {
      resolvedCustomerName = cleanPushName;
    }

    // 10. OUTPUT UPDATE KE KONTAK CRM (Nama, Asal Sekolah, Target Kampus, Stage, Score, Persona, Telemetri)
    const updatePayload: any = {
      leadStatus: legacyLeadStatus,
      leadStage: s.lead_stage || contact.leadStage || "NEW_LEAD",
      leadTemperature: s.lead_temperature || contact.leadTemperature || "COLD",
      leadScore: typeof s.lead_score === "number" ? s.lead_score : contact.leadScore || 0,
      persona: s.persona || contact.persona || "UNKNOWN",
      primaryGoal: s.primary_goal || contact.primaryGoal,
      primaryProblem: s.primary_problem || contact.primaryProblem,
      primaryObjection: s.primary_objection || contact.primaryObjection,
      intent: s.intent || contact.intent,
      nextAction: s.next_action || contact.nextAction,
      followUpRequired: s.follow_up_required ?? contact.followUpRequired ?? false,
      proofNeeded: s.proof_needed ?? contact.proofNeeded ?? false,
      proofType: s.proof_type || contact.proofType,
      offerReady: s.offer_ready ?? contact.offerReady ?? false,
      paymentReady: s.payment_ready ?? contact.paymentReady ?? false,
      humanHandoff: s.human_handoff ?? contact.humanHandoff ?? false,
      handoffReason: s.handoff_reason || contact.handoffReason,
      needExternalData: s.need_external_data ?? contact.needExternalData ?? false,
      missingData: s.missing_data ? JSON.stringify(s.missing_data) : contact.missingData,
      affiliateId: s.affiliate_id || contact.affiliateId,
      handlingStatus: s.human_handoff ? "MANUAL_TAKEOVER" : contact.handlingStatus,
      customerName: resolvedCustomerName,
      schoolOrigin: s.extracted_school || contact.schoolOrigin,
      targetCampusMajor: s.extracted_target || contact.targetCampusMajor,
      lastInteractionAt: new Date(),
    };

    const updatedContact = (await (prisma.contact as any).update({
      where: { id: contact.id },
      data: updatePayload,
    })) as any;

    console.log(
      `[Pipeline] Contact #${contact.id} updated -> Stage: ${updatedContact.leadStage}, Temp: ${updatedContact.leadTemperature}, School: ${updatedContact.schoolOrigin}, Target: ${updatedContact.targetCampusMajor}`
    );

    // 11. PENGIRIMAN KE WHATSAPP VIA GATEWAY WAHA
    // Safe execution: kegagalan network gateway tidak boleh menggagalkan simpan data DB
    const outgoingRecipient = normalizedFrom;
    try {
      await gatewaySendSeen(outgoingRecipient, payload.wahaMessageId, {
        userId: resolvedUserId,
        sessionId: activeSessionId,
      });
      await gatewayStartTyping(outgoingRecipient, {
        userId: resolvedUserId,
        sessionId: activeSessionId,
      });
      await new Promise((resolve) => setTimeout(resolve, 800));
      await gatewayStopTyping(outgoingRecipient, {
        userId: resolvedUserId,
        sessionId: activeSessionId,
      });
      const sendResult = await gatewaySendText(outgoingRecipient, aiResult.replyMessage, {
        userId: resolvedUserId,
        sessionId: activeSessionId,
      });
      console.log(`[Pipeline] AI Reply sent to ${outgoingRecipient} via session ${activeSessionId}:`, sendResult);
    } catch (gatewayError) {
      console.warn("[Pipeline] Live Gateway delivery notice:", gatewayError);
    }

    return {
      success: true,
      actionTaken: "AI_REPLIED",
      contactId: contact.id,
      customerMessage: messageText,
      aiReplyMessage: aiResult.replyMessage,
      leadStage: updatedContact.leadStage,
      leadScore: updatedContact.leadScore,
      persona: updatedContact.persona,
      schoolOrigin: updatedContact.schoolOrigin,
      targetCampusMajor: updatedContact.targetCampusMajor,
    };
  } catch (error: any) {
    console.error("[Pipeline Error]", error);
    return {
      success: false,
      actionTaken: "ERROR",
      error: error.message || "Unknown error executing pipeline",
    };
  }
}
