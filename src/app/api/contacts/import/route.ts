import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/**
 * Normalizes Indonesian and international phone numbers:
 * - Removes spaces, dashes, symbols
 * - Converts 08xx -> 628xx
 * - Converts 8xx (if 9+ digits) -> 628xx
 * - Leaves standard international numbers clean
 */
function normalizePhoneNumber(rawPhone: string): string | null {
  if (!rawPhone) return null;
  let digits = rawPhone.toString().replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("08")) {
    digits = "62" + digits.slice(1);
  } else if (digits.startsWith("8") && digits.length >= 9 && digits.length <= 13) {
    digits = "62" + digits;
  }

  if (digits.length < 8 || digits.length > 20) {
    return null;
  }

  return digits;
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const rawContacts = Array.isArray(body?.contacts) ? body.contacts : [];

    if (rawContacts.length === 0) {
      return NextResponse.json(
        { error: "Daftar kontak kosong. Harap kirimkan minimal 1 kontak." },
        { status: 400 }
      );
    }

    if (rawContacts.length > 2000) {
      return NextResponse.json(
        { error: "Maksimal import 2.000 kontak per batch." },
        { status: 400 }
      );
    }

    let createdCount = 0;
    let updatedCount = 0;
    const errors: Array<{ index: number; name: string; rawPhone: string; reason: string }> = [];

    // Process in batches
    for (let i = 0; i < rawContacts.length; i++) {
      const item = rawContacts[i];
      const rawName = (item.name || item.customerName || item.nama || "").toString().trim();
      const rawPhone = (item.phone || item.phoneNumber || item.nomor_hp || item.no_hp || item.nomor || "").toString().trim();

      const cleanPhone = normalizePhoneNumber(rawPhone);

      if (!cleanPhone) {
        errors.push({
          index: i + 1,
          name: rawName,
          rawPhone,
          reason: !rawPhone ? "Nomor telepon kosong" : "Format nomor telepon tidak valid (min. 8 digit)",
        });
        continue;
      }

      try {
        const existing = await prisma.contact.findUnique({
          where: {
            userId_phoneNumber: {
              userId: user!.id,
              phoneNumber: cleanPhone,
            },
          },
        });

        if (existing) {
          // Update name if new name is provided and different
          if (rawName && rawName !== existing.customerName) {
            await prisma.contact.update({
              where: { id: existing.id },
              data: {
                customerName: rawName,
              },
            });
          }
          updatedCount++;
        } else {
          // Create new contact
          await prisma.contact.create({
            data: {
              userId: user!.id,
              phoneNumber: cleanPhone,
              customerName: rawName || null,
              leadStatus: "Cold",
              leadStage: "NEW_LEAD",
              leadTemperature: "COLD",
              handlingStatus: "AI_HANDLED",
            },
          });
          createdCount++;
        }
      } catch (err: any) {
        errors.push({
          index: i + 1,
          name: rawName,
          rawPhone,
          reason: err?.message || "Gagal menyimpan ke database",
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: rawContacts.length,
      successCount: createdCount + updatedCount,
      createdCount,
      updatedCount,
      errorCount: errors.length,
      errors: errors.slice(0, 50), // Return max 50 errors in response
    });
  } catch (error: any) {
    console.error("Error in /api/contacts/import:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error saat import kontak." },
      { status: 500 }
    );
  }
}
