import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const userId = user!.id;

    const where = { userId };

    // Run every aggregate in parallel instead of 12 sequential round-trips.
    const [
      totalContacts,
      totalMessages,
      aiHandledCount,
      manualTakeoverCount,
      coldCount,
      warmCount,
      hotCount,
      pendingPaymentCount,
      enrolledCount,
      positiveCount,
      neutralCount,
      negativeCount,
      recentMessages,
    ] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.message.count({ where: { contact: where } }),
      prisma.contact.count({ where: { ...where, handlingStatus: "AI_HANDLED" } }),
      prisma.contact.count({ where: { ...where, handlingStatus: "MANUAL_TAKEOVER" } }),
      // Funnel distribution: map lead_stage and legacy leadStatus
      prisma.contact.count({
        where: {
          ...where,
          OR: [{ leadStatus: "Cold" }, { leadStage: { in: ["NEW_LEAD", "DISCOVERY"] } }],
        },
      }),
      prisma.contact.count({
        where: {
          ...where,
          OR: [
            { leadStatus: "Warm" },
            { leadStage: { in: ["QUALIFIED", "CONSULTATION", "VALUE_PRESENTED", "PROOF"] } },
          ],
        },
      }),
      prisma.contact.count({
        where: {
          ...where,
          OR: [{ leadStatus: "Hot" }, { leadStage: { in: ["OFFER", "OBJECTION", "HOT_LEAD"] } }],
        },
      }),
      prisma.contact.count({
        where: {
          ...where,
          OR: [{ leadStatus: "Pending_Payment" }, { leadStage: "PAYMENT_PENDING" }],
        },
      }),
      prisma.contact.count({
        where: { ...where, OR: [{ leadStatus: "Enrolled" }, { leadStage: "PAID" }] },
      }),
      // Sentiment distribution
      prisma.contact.count({ where: { ...where, sentiment: "Positive" } }),
      prisma.contact.count({ where: { ...where, sentiment: "Neutral" } }),
      prisma.contact.count({ where: { ...where, sentiment: "Negative" } }),
      // Recent activity
      prisma.message.findMany({
        where: { contact: where },
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          contact: {
            select: {
              customerName: true,
              phoneNumber: true,
              leadStatus: true,
              leadStage: true,
              targetCampusMajor: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      metrics: {
        totalContacts,
        totalMessages,
        aiHandledCount,
        manualTakeoverCount,
        aiAutomationRate:
          totalContacts > 0
            ? Math.round((aiHandledCount / totalContacts) * 100)
            : 100,
      },
      funnel: [
        { stage: "Chat Masuk (Cold)", count: coldCount, color: "#94a3b8" },
        { stage: "Tanya Program (Warm)", count: warmCount, color: "#f59e0b" },
        { stage: "Minat Paket (Hot)", count: hotCount, color: "#f97316" },
        { stage: "Menunggu Transfer", count: pendingPaymentCount, color: "#8b5cf6" },
        { stage: "Terdaftar (Paid)", count: enrolledCount, color: "#0066ff" },
      ],
      sentiment: {
        positive: positiveCount,
        neutral: neutralCount,
        negative: negativeCount,
      },
      recentMessages,
    });
  } catch (error: any) {
    console.error("[Analytics Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
