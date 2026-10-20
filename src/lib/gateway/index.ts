import { prisma } from "../prisma";
import { GatewayConfig, GatewayType, IGatewayAdapter } from "./types";
import { WahaGatewayAdapter } from "./waha.adapter";

export * from "./types";
export * from "./waha.adapter";

const wahaAdapter = new WahaGatewayAdapter();

/**
 * Returns the WAHA gateway adapter instance.
 */
export function getGatewayAdapter(_type?: string | GatewayType | null): IGatewayAdapter {
  return wahaAdapter;
}

/**
 * Resolves the gateway configuration and adapter for a given user or session ID from the database.
 */
export async function resolveUserGatewayConfig(
  identifier?: { userId?: string; sessionId?: string }
): Promise<{ adapter: IGatewayAdapter; config: GatewayConfig }> {
  let sessionRecord: any = null;

  try {
    if (identifier?.userId) {
      sessionRecord = await prisma.waSession.findUnique({
        where: { userId: identifier.userId },
      });

      // If a sessionId was also given, it MUST be the one owned by this user.
      if (sessionRecord && identifier.sessionId && identifier.sessionId !== sessionRecord.id) {
        throw new Error(
          `Sesi '${identifier.sessionId}' bukan milik user ini. Akses lintas tenant ditolak.`
        );
      }
    } else if (identifier?.sessionId) {
      sessionRecord = await prisma.waSession.findUnique({
        where: { id: identifier.sessionId },
      });
    }
  } catch (err: any) {
    console.warn("[Gateway] Failed to load session record from db:", err.message);
    throw err;
  }

  // No cross-tenant fallback: if we cannot find a session for this identifier, fail loudly.
  if (!sessionRecord) {
    throw new Error(
      "Sesi WhatsApp tidak ditemukan untuk user/sesi ini. Pastikan sesi sudah dibuat di halaman Gateway."
    );
  }

  const config: GatewayConfig = {
    gatewayType: "WAHA",
    apiUrl: sessionRecord.apiUrl,
    apiKey: sessionRecord.apiKey,
    sessionId: sessionRecord.id,
    userId: sessionRecord.userId,
  };

  return { adapter: wahaAdapter, config };
}

/**
 * Unified helper to send text message via WAHA gateway.
 */
export async function gatewaySendText(
  to: string,
  text: string,
  options?: { userId?: string; sessionId?: string; gatewayType?: GatewayType }
) {
  const { adapter, config } = await resolveUserGatewayConfig(options);
  return await adapter.sendText(to, text, config);
}

/**
 * Unified helper to mark seen if supported.
 */
export async function gatewaySendSeen(
  to: string,
  messageId?: string,
  options?: { userId?: string; sessionId?: string }
) {
  const { adapter, config } = await resolveUserGatewayConfig(options);
  if (adapter.sendSeen) {
    await adapter.sendSeen(to, messageId, config);
  }
}

/**
 * Unified helper to start typing if supported.
 */
export async function gatewayStartTyping(
  to: string,
  options?: { userId?: string; sessionId?: string }
) {
  const { adapter, config } = await resolveUserGatewayConfig(options);
  if (adapter.startTyping) {
    await adapter.startTyping(to, config);
  }
}

/**
 * Unified helper to stop typing if supported.
 */
export async function gatewayStopTyping(
  to: string,
  options?: { userId?: string; sessionId?: string }
) {
  const { adapter, config } = await resolveUserGatewayConfig(options);
  if (adapter.stopTyping) {
    await adapter.stopTyping(to, config);
  }
}

import { getWahaGroups } from "../waha";

/**
 * Unified helper to retrieve WhatsApp groups for the user's active session.
 */
export async function gatewayGetGroups(
  options?: {
    userId?: string;
    sessionId?: string;
    limit?: number;
    offset?: number;
    sortOrder?: "asc" | "desc";
    excludeParticipants?: boolean;
  }
) {
  const { config } = await resolveUserGatewayConfig(options);
  return await getWahaGroups(config.sessionId, config.apiUrl, config.apiKey, {
    limit: options?.limit,
    offset: options?.offset,
    sortOrder: options?.sortOrder,
    excludeParticipants: options?.excludeParticipants,
  });
}


