import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth-server";
import { getPhoneNumberFromLid, isWhatsAppLid } from "@/lib/waha";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/contacts/sync-lids
 * Resolves real phone numbers for all contacts that only have WhatsApp LID.
 * Body: { contactId?: number } (Optional: sync single contact or all contacts)
 */
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const targetContactId = body.contactId ? parseInt(body.contactId, 10) : undefined;

    // Get user's active session configuration
    const userSession = await prisma.waSession.findUnique({
      where: { userId: user!.id },
    });
    const sessionName = userSession?.id || "bot";
    const apiUrl = userSession?.apiUrl;
    const apiKey = userSession?.apiKey;

    // Query contacts belonging to this user
    const whereClause: any = {
      userId: user!.id,
    };

    if (targetContactId) {
      whereClause.id = targetContactId;
    }

    const allUserContacts = await prisma.contact.findMany({
      where: whereClause,
      include: {
        messages: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Filter contacts that have or represent WhatsApp LID
    const lidContacts = allUserContacts.filter((c) => {
      if (targetContactId && c.id === targetContactId) return true;
      return (
        Boolean(c.whatsappLid) ||
        isWhatsAppLid(c.phoneNumber) ||
        c.phoneNumber.includes("@lid") ||
        (c.customerName && c.customerName.includes("WA LID:"))
      );
    });

    let updatedCount = 0;
    const results: any[] = [];

    for (const contact of lidContacts) {
      const lidToResolve =
        contact.whatsappLid?.replace(/[^0-9]/g, "") ||
        (isWhatsAppLid(contact.phoneNumber) ? contact.phoneNumber.replace(/[^0-9]/g, "") : null);

      if (!lidToResolve) {
        results.push({
          id: contact.id,
          phone: contact.phoneNumber,
          success: false,
          message: "Bukan format LID",
        });
        continue;
      }

      // 1. Ensure whatsappLid is saved on the contact record if missing
      if (!contact.whatsappLid) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { whatsappLid: lidToResolve },
        });
      }

      try {
        // 2. Query WAHA for mapping LID -> Real Phone
        const resolved = await getPhoneNumberFromLid(lidToResolve, sessionName, apiUrl, apiKey);

        if (resolved?.phoneNumber && resolved.phoneNumber !== lidToResolve) {
          const cleanPhone = resolved.phoneNumber.replace(/[^0-9]/g, "");

          // 3. Check if a contact with this real phone already exists for this user
          const existingPhoneContact = await prisma.contact.findUnique({
            where: {
              userId_phoneNumber: {
                userId: user!.id,
                phoneNumber: cleanPhone,
              },
            },
          });

          if (existingPhoneContact && existingPhoneContact.id !== contact.id) {
            // Merge: Move messages from LID contact to the real phone contact
            await prisma.message.updateMany({
              where: { contactId: contact.id },
              data: { contactId: existingPhoneContact.id },
            });

            // Update existing contact's whatsappLid
            await prisma.contact.update({
              where: { id: existingPhoneContact.id },
              data: {
                whatsappLid: lidToResolve,
                customerName:
                  existingPhoneContact.customerName ||
                  contact.customerName ||
                  resolved.name,
              },
            });

            // Remove redundant LID contact
            await prisma.contact.delete({
              where: { id: contact.id },
            });

            updatedCount++;
            results.push({
              id: existingPhoneContact.id,
              mergedFromId: contact.id,
              oldPhone: contact.phoneNumber,
              newPhone: cleanPhone,
              lid: lidToResolve,
              status: "MERGED",
              success: true,
            });
          } else {
            // Update current contact
            const updatePayload: any = {
              phoneNumber: cleanPhone,
              whatsappLid: lidToResolve,
            };
            if (
              resolved.name &&
              (!contact.customerName ||
                contact.customerName.startsWith("Siswa (WA LID:") ||
                contact.customerName.startsWith("Siswa (+"))
            ) {
              updatePayload.customerName = resolved.name;
            }

            await prisma.contact.update({
              where: { id: contact.id },
              data: updatePayload,
            });

            updatedCount++;
            results.push({
              id: contact.id,
              oldPhone: contact.phoneNumber,
              newPhone: cleanPhone,
              lid: lidToResolve,
              status: "UPDATED",
              success: true,
            });
          }
        } else {
          results.push({
            id: contact.id,
            lid: lidToResolve,
            phone: contact.phoneNumber,
            success: false,
            message: "Nomor HP belum tersimpan di store WAHA. Pesan tetap terkirim via LID.",
          });
        }
      } catch (err: any) {
        results.push({
          id: contact.id,
          lid: lidToResolve,
          success: false,
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalChecked: lidContacts.length,
      updatedCount,
      results,
    });
  } catch (error: any) {
    console.error("[Sync LIDs Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
