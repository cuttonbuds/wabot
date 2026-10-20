import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const DEFAULT_FALLBACK_USER_ID = "2dddb6d7-eb94-4056-9fe3-e13dca2f4e71";

export async function getAuthenticatedUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (err) {
    console.warn("[Auth Server] Error fetching auth user:", err);
    return null;
  }
}

/**
 * Require an authenticated user for API Route handlers.
 * Returns either { user, errorResponse: null } or { user: null, errorResponse: NextResponse }
 */
export async function requireAuthUser() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 }
      ),
    };
  }

  // Ensure this user has basic records initialized
  await ensureUserInitialized(user.id, user.email);

  return { user, errorResponse: null };
}

/**
 * Initializes default session and AI config for a user if they don't already exist.
 */
export async function ensureUserInitialized(userId: string, email?: string) {
  try {
    // 1. Check & initialize dedicated WaSession for this user
    const existingSession = await prisma.waSession.findUnique({
      where: { userId },
    });

    if (!existingSession) {
      const sessionSlug = `usr_${userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`;
      const cleanName = email ? email.split("@")[0] : "Bot";

      await prisma.waSession.create({
        data: {
          id: sessionSlug,
          userId,
          sessionName: `WA Bot (${cleanName})`,
          status: "SCAN_QR",
        },
      });
      console.log(`[Multi-Tenancy] Initialized WaSession '${sessionSlug}' for user ${userId}`);
    }

    // 2. Check & initialize dedicated AiConfiguration for this user
    const existingAi = await prisma.aiConfiguration.findUnique({
      where: { userId },
    });

    if (!existingAi) {
      const defaultPrompt = `Kamu adalah Kak Cerdas, Konsultan Edukasi & Sales Resmi dari Lembaga Bimbingan "Lampung Cerdas".
Tugasmu adalah menyapa siswa/orang tua dengan ramah, hangat, santun, dan penuh semangat ("Halo Kak!", "Halo Sobat Cerdas!").

Panduan Komunikasi:
1. Pahami kebutuhan calon siswa (target kampus, jalur seleksi SNBP/SNBT/Kedinasan/Mandiri, atau kebutuhan beasiswa).
2. Berikan informasi paket program Lampung Cerdas yang paling relevan secara akurat berdasarkan Knowledge Base.
3. Selalu arahkan ke solusi bimbingan terbaik dan ajak untuk mendaftar atau konsultasi lebih lanjut dengan ramah.
4. Jika ditanya harga, jelaskan manfaat & fasilitas lengkapnya terlebih dahulu.
5. Format jawaban terstruktur, ramah, dan ringkas siap baca di WhatsApp.`;

      await prisma.aiConfiguration.create({
        data: {
          userId,
          providerBaseUrl: "https://api.openai.com/v1",
          apiKey: "",
          modelName: "gpt-4o-mini",
          temperature: 0.6,
          maxTokens: 600,
          systemPrompt: defaultPrompt,
        },
      });
      console.log(`[Multi-Tenancy] Initialized AiConfiguration for user ${userId}`);
    }
  } catch (err: any) {
    console.warn(`[Multi-Tenancy] ensureUserInitialized notice for ${userId}:`, err.message);
  }
}
