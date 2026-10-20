import { prisma } from "./prisma";

export interface BroadcastCampaignRecord {
  id: number;
  userId: string;
  title: string;
  message: string;
  totalGroups: number;
  successCount: number;
  failedCount: number;
  status: "SENDING" | "COMPLETED" | "PARTIAL" | "FAILED";
  delaySeconds: number;
  createdAt: string;
  logs?: BroadcastLogRecord[];
}

export interface BroadcastLogRecord {
  id: number;
  campaignId: number;
  groupJid: string;
  groupName: string | null;
  status: "SENT" | "FAILED";
  errorMessage: string | null;
  sentAt: string;
}

/**
 * Creates a new broadcast campaign in the database
 */
export async function createBroadcastCampaign(data: {
  userId: string;
  title: string;
  message: string;
  totalGroups: number;
  delaySeconds?: number;
}): Promise<number> {
  const result: any[] = await prisma.$queryRawUnsafe(
    `INSERT INTO broadcast_campaigns (user_id, title, message, total_groups, status, delay_seconds, created_at)
     VALUES ($1, $2, $3, $4, 'SENDING', $5, NOW())
     RETURNING id`,
    data.userId,
    data.title,
    data.message,
    data.totalGroups,
    data.delaySeconds || 3
  );

  return Number(result[0]?.id);
}

/**
 * Updates campaign results upon completion
 */
export async function updateBroadcastCampaign(
  id: number,
  data: {
    status: "SENDING" | "COMPLETED" | "PARTIAL" | "FAILED";
    successCount: number;
    failedCount: number;
  }
) {
  await prisma.$executeRawUnsafe(
    `UPDATE broadcast_campaigns
     SET status = $1, success_count = $2, failed_count = $3
     WHERE id = $4`,
    data.status,
    data.successCount,
    data.failedCount,
    id
  );
}

/**
 * Records individual group send result
 */
export async function recordBroadcastLog(data: {
  campaignId: number;
  groupJid: string;
  groupName?: string | null;
  status: "SENT" | "FAILED";
  errorMessage?: string | null;
}) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO broadcast_logs (campaign_id, group_jid, group_name, status, error_message, sent_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    data.campaignId,
    data.groupJid,
    data.groupName || null,
    data.status,
    data.errorMessage || null
  );
}

/**
 * Gets campaign history for a user
 */
export async function getBroadcastCampaigns(userId: string): Promise<BroadcastCampaignRecord[]> {
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, user_id, title, message, total_groups, success_count, failed_count, status, delay_seconds, created_at
     FROM broadcast_campaigns
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    userId
  );

  return rows.map((r) => ({
    id: Number(r.id),
    userId: String(r.user_id),
    title: String(r.title),
    message: String(r.message),
    totalGroups: Number(r.total_groups || 0),
    successCount: Number(r.success_count || 0),
    failedCount: Number(r.failed_count || 0),
    status: r.status,
    delaySeconds: Number(r.delay_seconds || 3),
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

/**
 * Gets campaign details along with its individual logs
 */
export async function getBroadcastCampaignWithLogs(
  campaignId: number,
  userId: string
): Promise<BroadcastCampaignRecord | null> {
  const campaigns: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, user_id, title, message, total_groups, success_count, failed_count, status, delay_seconds, created_at
     FROM broadcast_campaigns
     WHERE id = $1 AND user_id = $2`,
    campaignId,
    userId
  );

  if (campaigns.length === 0) return null;
  const c = campaigns[0];

  const logsRaw: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, campaign_id, group_jid, group_name, status, error_message, sent_at
     FROM broadcast_logs
     WHERE campaign_id = $1
     ORDER BY sent_at ASC`,
    campaignId
  );

  const logs: BroadcastLogRecord[] = logsRaw.map((l) => ({
    id: Number(l.id),
    campaignId: Number(l.campaign_id),
    groupJid: String(l.group_jid),
    groupName: l.group_name ? String(l.group_name) : null,
    status: l.status,
    errorMessage: l.error_message ? String(l.error_message) : null,
    sentAt: new Date(l.sent_at).toISOString(),
  }));

  return {
    id: Number(c.id),
    userId: String(c.user_id),
    title: String(c.title),
    message: String(c.message),
    totalGroups: Number(c.total_groups || 0),
    successCount: Number(c.success_count || 0),
    failedCount: Number(c.failed_count || 0),
    status: c.status,
    delaySeconds: Number(c.delay_seconds || 3),
    createdAt: new Date(c.created_at).toISOString(),
    logs,
  };
}

/**
 * Deletes a campaign and its cascading logs
 */
export async function deleteBroadcastCampaign(campaignId: number, userId: string): Promise<boolean> {
  const count = await prisma.$executeRawUnsafe(
    `DELETE FROM broadcast_campaigns WHERE id = $1 AND user_id = $2`,
    campaignId,
    userId
  );
  return count > 0;
}
