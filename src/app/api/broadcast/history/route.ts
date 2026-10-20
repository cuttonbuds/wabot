import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth-server";
import {
  getBroadcastCampaigns,
  getBroadcastCampaignWithLogs,
  deleteBroadcastCampaign,
} from "@/lib/broadcast";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/broadcast/history
 * Optional query parameter: ?id=123 (fetches detailed campaign with logs)
 */
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const url = new URL(req.url);
    const campaignIdParam = url.searchParams.get("id");

    if (campaignIdParam) {
      const campaignId = parseInt(campaignIdParam, 10);
      if (isNaN(campaignId)) {
        return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
      }

      const campaign = await getBroadcastCampaignWithLogs(campaignId, user!.id);
      if (!campaign) {
        return NextResponse.json({ error: "Kampanye tidak ditemukan" }, { status: 404 });
      }

      return NextResponse.json({ success: true, campaign });
    }

    const campaigns = await getBroadcastCampaigns(user!.id);
    return NextResponse.json({ success: true, campaigns });
  } catch (error: any) {
    console.error("[Broadcast History GET Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/broadcast/history?id=123
 */
export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const url = new URL(req.url);
    const campaignIdParam = url.searchParams.get("id");

    if (!campaignIdParam) {
      return NextResponse.json({ error: "Parameter ID wajib disertakan" }, { status: 400 });
    }

    const campaignId = parseInt(campaignIdParam, 10);
    const deleted = await deleteBroadcastCampaign(campaignId, user!.id);

    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    console.error("[Broadcast History DELETE Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
