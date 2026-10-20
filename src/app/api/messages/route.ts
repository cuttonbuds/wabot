import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gatewaySendText } from "@/lib/gateway";
import { requireAuthUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { contactId, messageBody } = body;

    if (!contactId || !messageBody || !messageBody.trim()) {
      return NextResponse.json(
        { error: "contactId dan messageBody diperlukan" },
        { status: 400 }
      );
    }

    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        userId: user!.id,
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Kontak tidak ditemukan" }, { status: 404 });
    }

    // Get user's dedicated WhatsApp session
    const userSession = await prisma.waSession.findUnique({
      where: { userId: user!.id },
    });
    if (!userSession) {
      return NextResponse.json(
        { error: "Sesi WhatsApp untuk akun ini belum tersedia." },
        { status: 404 }
      );
    }
    const sessionName = userSession.id;

    // Resolve target chatId: check if this contact is communicating via WhatsApp LID or Phone
    let targetChatId = contact.phoneNumber;
    if ((contact as any).whatsappLid) {
      const lidDigits = (contact as any).whatsappLid.replace(/[^0-9]/g, "");
      targetChatId = `${lidDigits}@lid`;
    } else if (!targetChatId.includes("@")) {
      const lidMessage = await prisma.message.findFirst({
        where: {
          contactId: contact.id,
          wahaMessageId: { contains: "@lid" },
        },
      });
      if (lidMessage) {
        targetChatId = `${contact.phoneNumber}@lid`;
      } else {
        targetChatId = `${contact.phoneNumber}@c.us`;
      }
    }

    // Send via WAHA Gateway using this user's dedicated bot session
    const gatewayRes = await gatewaySendText(targetChatId, messageBody.trim(), {
      userId: user!.id,
      sessionId: sessionName,
    });


    // Ensure messageId is strictly a unique string (never an Object)
    const cleanMessageId =
      typeof gatewayRes.messageId === "string"
        ? gatewayRes.messageId
        : (gatewayRes.messageId as any)?._serialized ||
          (gatewayRes.messageId as any)?.id ||
          `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Save message to Database
    const message = await prisma.message.create({
      data: {
        contactId: contact.id,
        wahaMessageId: cleanMessageId,
        senderType: "agent",
        messageBody: messageBody.trim(),
      },
    });

    // Update contact interaction
    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastInteractionAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message,
      delivered: gatewayRes.success,
      deliveryNotice: gatewayRes.error || null,
    });
  } catch (error: any) {
    console.error("[Messages API Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
