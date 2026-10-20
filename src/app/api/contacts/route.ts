import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const leadStatus = searchParams.get("leadStatus");
    const handlingStatus = searchParams.get("handlingStatus");
    const query = searchParams.get("q");

    const where: any = {
      userId: user!.id,
    };

    if (leadStatus && leadStatus !== "all") {
      where.leadStatus = leadStatus;
    }
    if (handlingStatus && handlingStatus !== "all") {
      where.handlingStatus = handlingStatus;
    }
    if (query) {
      where.AND = [
        {
          OR: [
            { customerName: { contains: query, mode: "insensitive" } },
            { phoneNumber: { contains: query } },
            { whatsappLid: { contains: query } },
            { targetCampusMajor: { contains: query, mode: "insensitive" } },
            { schoolOrigin: { contains: query, mode: "insensitive" } },
          ],
        },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { lastInteractionAt: "desc" },
    });

    return NextResponse.json({ contacts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const cleanPhone = body.phoneNumber?.replace(/[^0-9]/g, "");
    const cleanLid = body.whatsappLid?.replace(/[^0-9]/g, "") || null;

    if (!cleanPhone && !cleanLid) {
      return NextResponse.json({ error: "Nomor WhatsApp atau WhatsApp LID wajib diisi" }, { status: 400 });
    }

    const contactPhone = cleanPhone || cleanLid;

    const contact = await prisma.contact.upsert({
      where: {
        userId_phoneNumber: {
          userId: user!.id,
          phoneNumber: contactPhone,
        },
      },
      update: {
        whatsappLid: cleanLid,
        customerName: body.customerName,
        schoolOrigin: body.schoolOrigin,
        targetCampusMajor: body.targetCampusMajor,
        leadStatus: body.leadStatus || "Cold",
        handlingStatus: body.handlingStatus || "AI_HANDLED",
      },
      create: {
        userId: user!.id,
        phoneNumber: contactPhone,
        whatsappLid: cleanLid,
        customerName: body.customerName,
        schoolOrigin: body.schoolOrigin,
        targetCampusMajor: body.targetCampusMajor,
        leadStatus: body.leadStatus || "Cold",
        handlingStatus: body.handlingStatus || "AI_HANDLED",
      },
    });


    return NextResponse.json({ contact });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
