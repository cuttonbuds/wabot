import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { gatewaySendText } from "@/lib/gateway";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { validateAndCleanCustomerName } from "@/lib/ai-agent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Constant-time string comparison to avoid leaking the secret via timing.
 */
function safeEqual(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Generates personalized follow-up text using rule instruction and student context
 */
function buildPersonalizedFollowUpMessage(
  rule: { ruleName: string; aiPromptInstruction?: string | null; targetLeadStatus: string },
  target: {
    customerName?: string | null;
    schoolOrigin?: string | null;
    targetCampusMajor?: string | null;
    primaryGoal?: string | null;
    primaryProblem?: string | null;
    leadStage?: string | null;
  }
): string {
  const cleanName = validateAndCleanCustomerName(target.customerName);
  const greetingName = cleanName ? `Kak ${cleanName}` : "Sobat Cerdas";
  const goalTarget = target.targetCampusMajor || target.primaryGoal || "kampus & jurusan impian";
  const school = target.schoolOrigin ? ` dari ${target.schoolOrigin}` : "";

  // If custom instruction is provided, weave it naturally
  const instruction = (rule.aiPromptInstruction || "").trim();

  if (instruction) {
    return `Halo ${greetingName}! ✨

Semoga kabarnya selalu sehat dan tetap semangat ya${school}!

${instruction}

Kira-kira gimana progres persiapan menuju ${goalTarget}? Jika ada kendala atau butuh informasi lebih lanjut seputar program bimbingan intensif Lampung Cerdas, langsung kabari Kak Cerdas di sini ya 😊`;
  }

  // Default intelligent templates based on stage / status
  if (rule.targetLeadStatus === "Hot" || target.leadStage === "HOT_LEAD" || target.leadStage === "OFFER") {
    return `Halo ${greetingName}! ✨

Gimana persiapannya menuju ${goalTarget}? Kami ingin menginfokan bahwa slot kuota bimbingan prioritas dan promo konsultasi rasionalisasi jurusan 1-on-1 di Lampung Cerdas masih kami keep khusus untuk Kakak.

Kira-kira apakah ada hal yang masih ingin Kakak diskusikan dengan tim kami sebelum kuota gelombang ini ditutup? 😊`;
  }

  if (rule.targetLeadStatus === "Pending_Payment" || target.leadStage === "PAYMENT_PENDING") {
    return `Halo ${greetingName}! ✨

Kak Cerdas mau konfirmasi kembali terkait pendaftaran program bimbingan ${goalTarget}. Apakah ada kendala pada rincian rekening pembayaran atau formulirnya?

Boleh kabari Kak Cerdas jika butuh bantuan atau ingin dibuatkan invoice/jadwal baru ya! 😊`;
  }

  return `Halo ${greetingName}! ✨

Gimana kabarnya hari ini? Kak Cerdas mau tanya, untuk persiapan menuju ${goalTarget} apakah sudah ada rencana belajar yang terstruktur?

Di Lampung Cerdas, kami menyediakan bimbingan komprehensif, latihan soal terupdate, serta pendampingan mentor hingga lolos. Kalau Kakak mau konsultasi jurusan atau tanya seputar paket belajar, boleh banget langsung balas chat ini ya! 😊`;
}

async function executeFollowUpScanner(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const secretParam =
      url.searchParams.get("secret") ||
      url.searchParams.get("key") ||
      url.searchParams.get("token");
    const authHeader = req.headers.get("authorization");
    const customHeader =
      req.headers.get("x-cron-secret") ||
      req.headers.get("x-api-key") ||
      req.headers.get("x-secret-key");

    // The cron secret MUST come from the environment. No built-in defaults.
    const envSecret = process.env.CRON_SECRET?.trim();
    if (!envSecret) {
      console.error("[FollowUp Trigger] CRON_SECRET belum diset di environment.");
      return NextResponse.json(
        {
          error: "Server Misconfigured",
          message:
            "CRON_SECRET belum dikonfigurasi di server. Hubungi administrator untuk mengatur environment variable ini.",
        },
        { status: 500 }
      );
    }

    const bearerToken = authHeader?.replace(/^Bearer\s+/i, "").trim();
    const providedSecret = (secretParam || bearerToken || customHeader || "").trim();

    const isSecretAuthorized = safeEqual(providedSecret, envSecret);

    // Check user login session (if triggered from internal web UI)
    const user = isSecretAuthorized ? null : await getAuthenticatedUser();

    // If neither authenticated user session nor valid secret is provided, reject with 401
    if (!user && !isSecretAuthorized) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message:
            "Akses ditolak. Sertakan CRON_SECRET yang valid (header Authorization: Bearer <secret> atau ?secret=) atau login ke sistem.",
        },
        { status: 401 }
      );
    }

    // Determine filter scope for rules:
    // - Authenticated via cron secret: process ALL active rules (every tenant). userId query is ignored.
    // - Authenticated via login session: only this user's rules.
    const whereRules: { isActive: boolean; userId?: string } = { isActive: true };
    if (user) {
      whereRules.userId = user.id;
    }

    const rules = await prisma.followUpRule.findMany({
      where: whereRules,
      orderBy: { createdAt: "desc" },
    });

    if (rules.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada aturan follow-up yang aktif saat ini.",
        totalRulesChecked: 0,
        processedCount: 0,
        details: [],
        executedAt: new Date().toISOString(),
      });
    }

    const results = [];
    const now = new Date();

    for (const rule of rules) {
      const thresholdTime = new Date(
        now.getTime() - rule.inactivityHours * 60 * 60 * 1000
      );

      // Find this rule owner's dedicated session. Without one, skip the rule entirely
      // (never fall back to a shared/default session belonging to someone else).
      const userSession = await prisma.waSession.findUnique({
        where: { userId: rule.userId },
      });
      if (!userSession) {
        console.warn(`[FollowUp Trigger] Rule '${rule.ruleName}' dilewati: user ${rule.userId} belum punya sesi WA.`);
        continue;
      }
      const activeSession = userSession.id;

      // Find eligible contacts belonging to this rule's user
      // Matches either leadStatus or leadStage, handlingStatus AI_HANDLED, and inactive for >= inactivityHours
      const targets = await prisma.contact.findMany({
        where: {
          userId: rule.userId,
          handlingStatus: "AI_HANDLED",
          OR: [
            { leadStatus: rule.targetLeadStatus },
            { leadStage: rule.targetLeadStatus },
          ],
          lastInteractionAt: { lt: thresholdTime },
        },
        take: 10,
        orderBy: { lastInteractionAt: "asc" },
      });

      for (const target of targets) {
        // Prioritize real phone number, fallback to whatsappLid
        const recipient = target.phoneNumber || target.whatsappLid;
        if (!recipient) continue;

        // Clean customer name for greeting
        const cleanName = validateAndCleanCustomerName(target.customerName);
        const followUpText = buildPersonalizedFollowUpMessage(rule, target);

        // Send via active Gateway with this user's dedicated bot session
        let gatewaySuccess = true;
        let gatewayError: string | null = null;

        try {
          await gatewaySendText(recipient, followUpText, {
            userId: rule.userId,
            sessionId: activeSession,
          });
        } catch (err: any) {
          gatewaySuccess = false;
          gatewayError = err?.message || "Gagal mengirim pesan via WhatsApp Gateway";
          console.warn(`[FollowUp Trigger] Gateway send failed for ${recipient}:`, err?.message);
        }

        // Record in messages database
        await prisma.message.create({
          data: {
            contactId: target.id,
            senderType: "ai",
            messageBody: followUpText,
            isFollowUp: true,
          },
        });

        // Update interaction time so they won't be spammed immediately
        await prisma.contact.update({
          where: { id: target.id },
          data: { lastInteractionAt: new Date() },
        });

        results.push({
          contactId: target.id,
          phone: recipient,
          customerName: cleanName || target.customerName || "Siswa",
          rule: rule.ruleName,
          status: gatewaySuccess ? "SENT" : "QUEUED_WITH_GATEWAY_NOTICE",
          gatewayNotice: gatewayError,
        });

        // Anti-ban micro delay between target sends (1.5 seconds)
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    return NextResponse.json({
      success: true,
      message: `Follow-up scanner berhasil dijalankan. Memproses ${results.length} prospek siswa.`,
      totalRulesChecked: rules.length,
      processedCount: results.length,
      details: results,
      executedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[FollowUp Trigger Error]", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error?.message || "Terjadi kesalahan saat menjalankan follow-up scanner.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return executeFollowUpScanner(req);
}

export async function POST(req: NextRequest) {
  return executeFollowUpScanner(req);
}
