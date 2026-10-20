import { NextRequest, NextResponse } from "next/server";
import { getWahaHeaders } from "@/lib/waha";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_WAHA_URL = (process.env.WAHA_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    // Only the session owned by the logged-in user may be scanned.
    const ownSession = await prisma.waSession.findUnique({
      where: { userId: user!.id },
    });

    if (!ownSession) {
      return NextResponse.json(
        { error: "Sesi WhatsApp untuk akun ini belum tersedia." },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedSession = searchParams.get("session")?.trim();
    if (requestedSession && requestedSession !== ownSession.id) {
      return NextResponse.json(
        { error: "Forbidden. Anda hanya dapat mengakses QR sesi milik akun Anda sendiri." },
        { status: 403 }
      );
    }

    const session = ownSession.id;
    const cleanSession = encodeURIComponent(session);

    // 1. Try /api/{session}/auth/qr
    try {
      const res = await fetch(`${DEFAULT_WAHA_URL}/api/${cleanSession}/auth/qr`, {
        headers: getWahaHeaders({ Accept: "image/png, application/json" }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const json = await res.json();
          const base64 = json.data || json.qr || json.raw;
          if (base64) {
            const buffer = Buffer.from(base64, "base64");
            return new NextResponse(buffer, {
              status: 200,
              headers: {
                "Content-Type": json.mimetype || "image/png",
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                Pragma: "no-cache",
                Expires: "0",
              },
            });
          }
        } else {
          const buffer = await res.arrayBuffer();
          if (buffer.byteLength > 0) {
            return new NextResponse(buffer, {
              status: 200,
              headers: {
                "Content-Type": "image/png",
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                Pragma: "no-cache",
                Expires: "0",
              },
            });
          }
        }
      }
    } catch (err: any) {
      console.warn(`[WAHA QR Proxy] Primary endpoint failed:`, err.message);
    }

    // 2. Fallback to /api/sessions/{session}/auth/qr
    try {
      const res = await fetch(`${DEFAULT_WAHA_URL}/api/sessions/${cleanSession}/auth/qr`, {
        headers: getWahaHeaders({ Accept: "image/png, application/json" }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const json = await res.json();
          const base64 = json.data || json.qr || json.raw;
          if (base64) {
            const buffer = Buffer.from(base64, "base64");
            return new NextResponse(buffer, {
              status: 200,
              headers: {
                "Content-Type": json.mimetype || "image/png",
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                Pragma: "no-cache",
                Expires: "0",
              },
            });
          }
        } else {
          const buffer = await res.arrayBuffer();
          if (buffer.byteLength > 0) {
            return new NextResponse(buffer, {
              status: 200,
              headers: {
                "Content-Type": "image/png",
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                Pragma: "no-cache",
                Expires: "0",
              },
            });
          }
        }
      }
    } catch (err: any) {
      console.warn(`[WAHA QR Proxy] Fallback endpoint failed:`, err.message);
    }

    return NextResponse.json(
      {
        error: "QR Code tidak tersedia. Sesi mungkin sudah terhubung atau sedang dimuat.",
        session,
      },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
