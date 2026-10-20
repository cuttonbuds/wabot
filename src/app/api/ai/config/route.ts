import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    let config = await prisma.aiConfiguration.findUnique({
      where: { userId: user!.id },
    });

    if (!config) {
      config = await prisma.aiConfiguration.create({
        data: {
          userId: user!.id,
          providerBaseUrl: "https://api.openai.com/v1",
          apiKey: "",
          modelName: "gpt-4o-mini",
          temperature: 0.6,
          maxTokens: 600,
          systemPrompt:
            "Kamu adalah Kak Cerdas, Konsultan Edukasi resmi dari Lembaga Bimbingan Lampung Cerdas.",
        },
      });
    }

    return NextResponse.json({ config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const body = await req.json();

    const config = await prisma.aiConfiguration.upsert({
      where: { userId: user!.id },
      update: {
        providerBaseUrl: body.providerBaseUrl,
        apiKey: body.apiKey !== undefined ? body.apiKey : undefined,
        modelName: body.modelName,
        temperature:
          body.temperature !== undefined
            ? parseFloat(body.temperature)
            : undefined,
        maxTokens:
          body.maxTokens !== undefined
            ? parseInt(body.maxTokens, 10)
            : undefined,
        systemPrompt: body.systemPrompt,
      },
      create: {
        userId: user!.id,
        providerBaseUrl: body.providerBaseUrl || "https://api.openai.com/v1",
        apiKey: body.apiKey || "",
        modelName: body.modelName || "gpt-4o-mini",
        temperature: parseFloat(body.temperature) || 0.6,
        maxTokens: parseInt(body.maxTokens, 10) || 600,
        systemPrompt: body.systemPrompt || "",
      },
    });

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
