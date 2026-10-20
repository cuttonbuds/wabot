import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const contactId = parseInt(id, 10);
    if (isNaN(contactId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        userId: user!.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const contactId = parseInt(id, 10);
    if (isNaN(contactId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const existing = await prisma.contact.findFirst({
      where: { id: contactId, userId: user!.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const body = await req.json();

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: {
        customerName: body.customerName,
        phoneNumber: body.phoneNumber ? body.phoneNumber.replace(/[^0-9]/g, "") : undefined,
        whatsappLid: typeof body.whatsappLid !== "undefined" ? (body.whatsappLid ? body.whatsappLid.replace(/[^0-9]/g, "") : null) : undefined,
        schoolOrigin: body.schoolOrigin,
        targetCampusMajor: body.targetCampusMajor,
        leadStatus: body.leadStatus,
        handlingStatus: body.handlingStatus,
        sentiment: body.sentiment,
      },
    });


    return NextResponse.json({ contact: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const contactId = parseInt(id, 10);
    if (isNaN(contactId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const existing = await prisma.contact.findFirst({
      where: { id: contactId, userId: user!.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await prisma.contact.delete({ where: { id: contactId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
