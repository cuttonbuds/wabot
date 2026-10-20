import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    let { providerBaseUrl, apiKey } = body;

    // If not provided in body, load this user's own config (never another tenant's)
    if (!providerBaseUrl || !apiKey) {
      const config = await prisma.aiConfiguration.findUnique({
        where: { userId: user!.id },
      });
      providerBaseUrl = providerBaseUrl || config?.providerBaseUrl || "https://api.openai.com/v1";
      apiKey = apiKey !== undefined ? apiKey : config?.apiKey || "";
    }

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "API Key belum diisi. Masukkan API Key terlebih dahulu.",
        },
        { status: 400 }
      );
    }

    const cleanBaseUrl = providerBaseUrl.trim().replace(/\/+$/, "");

    // 1. Try fetching models list from /models endpoint
    try {
      const modelsRes = await fetch(`${cleanBaseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
      });

      if (modelsRes.ok) {
        const data = await modelsRes.json();
        let modelList: string[] = [];

        if (Array.isArray(data.data)) {
          modelList = data.data
            .map((m: any) => m.id)
            .filter((id: any) => typeof id === "string" && id.length > 0)
            .sort();
        } else if (Array.isArray(data)) {
          modelList = data.map((m: any) => m.id || m.name || m).filter(Boolean);
        }

        return NextResponse.json({
          success: true,
          message: `Koneksi berhasil! Ditemukan ${modelList.length} model dari provider.`,
          models: modelList,
        });
      } else if (modelsRes.status === 401) {
        return NextResponse.json(
          {
            success: false,
            error: "Autentikasi gagal (401 Unauthorized): API Key tidak valid atau sudah kedaluwarsa.",
          },
          { status: 401 }
        );
      }
    } catch (modelsErr: any) {
      console.warn("[Test LLM] /models endpoint check error, fallback to chat completion test", modelsErr.message);
    }

    // 2. Fallback: Test chat completions with a minimal ping prompt
    try {
      const chatRes = await fetch(`${cleanBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: body.modelName || "gpt-4o-mini",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });

      if (chatRes.ok) {
        return NextResponse.json({
          success: true,
          message: "Koneksi berhasil terhubung ke LLM Provider!",
          models: [body.modelName || "gpt-4o-mini"],
        });
      } else {
        const errData = await chatRes.json().catch(() => ({}));
        const errMsg =
          errData.error?.message ||
          `Provider mengembalikan status error ${chatRes.status} (${chatRes.statusText})`;

        return NextResponse.json(
          {
            success: false,
            error: errMsg,
          },
          { status: chatRes.status }
        );
      }
    } catch (chatErr: any) {
      return NextResponse.json(
        {
          success: false,
          error: `Gagal terhubung ke Base URL: ${chatErr.message || "Pastikan URL provider benar dan dapat dijangkau."}`,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
