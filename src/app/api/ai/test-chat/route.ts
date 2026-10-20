import { NextRequest, NextResponse } from "next/server";
import { processCustomerMessageWithAi } from "@/lib/ai-agent";
import { requireAuthUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { question } = body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        { error: "Pertanyaan wajib diisi" },
        { status: 400 }
      );
    }

    const mockContact = {
      id: 999,
      phoneNumber: "6281299998888",
      customerName: "Calon Siswa Test",
      schoolOrigin: "SMAN 1 Bandar Lampung",
      targetCampusMajor: "Kedokteran UNILA",
      leadStatus: "Warm",
      userId: user!.id,
    };

    // Always scope the AI run to the logged-in tenant's config and knowledge base
    const result = await processCustomerMessageWithAi(
      question.trim(),
      mockContact,
      [],
      user!.id
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("[AI Test Chat Error]", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
