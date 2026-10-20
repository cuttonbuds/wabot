import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const rules = await prisma.followUpRule.findMany({
      where: { userId: user!.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ rules });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { ruleName, targetLeadStatus, inactivityHours, aiPromptInstruction } =
      body;

    if (!ruleName || !targetLeadStatus || !inactivityHours || !aiPromptInstruction) {
      return NextResponse.json(
        { error: "Semua kolom aturan follow-up wajib diisi" },
        { status: 400 }
      );
    }

    const rule = await prisma.followUpRule.create({
      data: {
        userId: user!.id,
        ruleName,
        targetLeadStatus,
        inactivityHours: parseInt(inactivityHours, 10),
        aiPromptInstruction,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, rule });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { id, isActive } = body;

    const ruleId = parseInt(id, 10);
    if (isNaN(ruleId)) {
      return NextResponse.json({ error: "Invalid rule ID" }, { status: 400 });
    }

    const existing = await prisma.followUpRule.findFirst({
      where: { id: ruleId, userId: user!.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const rule = await prisma.followUpRule.update({
      where: { id: ruleId },
      data: { isActive },
    });

    return NextResponse.json({ success: true, rule });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
