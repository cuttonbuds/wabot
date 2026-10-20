/**
 * WAHA (WhatsApp HTTP API) Gateway Service Client
 * Specs based on WAHA API documentation with X-Api-Key header support
 */

const DEFAULT_WAHA_URL = (process.env.WAHA_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const DEFAULT_SESSION = process.env.WAHA_SESSION_NAME || "default";

/**
 * Returns request headers with Content-Type and X-Api-Key if configured
 */
export function getWahaHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  const apiKey = process.env.WAHA_API_KEY?.trim();
  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  }

  return headers;
}

/**
 * Resolves the base URL used for incoming webhooks.
 * Prioritizes WEBHOOK_BASE_URL, APP_URL, or NEXT_PUBLIC_APP_URL in .env,
 * falling back dynamically to request headers or origin.
 */
export function getWebhookBaseUrl(req?: any): string {
  const envUrl =
    process.env.WEBHOOK_BASE_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (envUrl?.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  if (req) {
    try {
      const headers = "headers" in req ? req.headers : null;
      const proto = headers?.get("x-forwarded-proto") || "http";
      const host = headers?.get("x-forwarded-host") || headers?.get("host");
      if (host) {
        return `${proto}://${host}`.replace(/\/+$/, "");
      }
      if (req.nextUrl?.origin) {
        return req.nextUrl.origin.replace(/\/+$/, "");
      }
    } catch {}
  }

  return "http://localhost:3000";
}

/**
 * Builds the webhook URL for a given session.
 * NOTE: `userId` is intentionally NOT included in the URL anymore. The webhook handler
 * resolves the tenant strictly from the (HMAC-verified) session name. The parameter is
 * kept in the signature for call-site compatibility only.
 */
export function buildWebhookUrl(
  sessionName: string,
  _userId?: string,
  req?: any
): string {
  const baseUrl = getWebhookBaseUrl(req);
  return `${baseUrl}/api/waha/webhook?session=${encodeURIComponent(sessionName)}`;
}

/**
 * Builds the webhook config entry registered on a WAHA session, including the HMAC key
 * so that WAHA signs every delivery (X-Webhook-Hmac / X-Webhook-Hmac-Algorithm).
 */
export function buildWebhookConfig(webhookUrl: string): Record<string, any> {
  const hmacKey = process.env.WAHA_WEBHOOK_HMAC_KEY?.trim();
  if (!hmacKey) {
    console.warn(
      "[WAHA] WAHA_WEBHOOK_HMAC_KEY belum diset. Webhook akan didaftarkan TANPA hmac dan akan ditolak oleh /api/waha/webhook."
    );
  }
  const entry: Record<string, any> = {
    url: webhookUrl,
    events: ["message"],
  };
  if (hmacKey) {
    entry.hmac = { key: hmacKey };
  }
  return entry;
}

/**
 * 1. Generate QR untuk scan
 * GET /api/{session}/auth/qr (fallback /api/sessions/{session}/auth/qr)
 */
export interface WahaQrResult {
  raw: string;
  dataUrl: string;
  base64?: string;
  proxyUrl: string;
}

/**
 * 1. Generate QR untuk scan
 * GET /api/{session}/auth/qr (fallback /api/sessions/{session}/auth/qr)
 */
export async function getWahaQr(session: string = DEFAULT_SESSION): Promise<WahaQrResult | null> {
  const cleanSession = encodeURIComponent(session);
  const proxyUrl = `/api/waha/qr?session=${cleanSession}`;

  // Try /api/{session}/auth/qr
  try {
    const res = await fetch(`${DEFAULT_WAHA_URL}/api/${cleanSession}/auth/qr`, {
      headers: getWahaHeaders({ Accept: "application/json, image/png" }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await res.json();
        const base64 = json.data || json.qr || json.raw || "";
        if (base64) {
          const mime = json.mimetype || "image/png";
          const dataUrl = base64.startsWith("data:") ? base64 : `data:${mime};base64,${base64}`;
          return { raw: dataUrl, dataUrl, base64, proxyUrl };
        }
      } else {
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 0) {
          const base64 = Buffer.from(buffer).toString("base64");
          const dataUrl = `data:image/png;base64,${base64}`;
          return { raw: dataUrl, dataUrl, base64, proxyUrl };
        }
      }
    }
  } catch (err: any) {
    console.warn(`[WAHA] getWahaQr /api/${cleanSession}/auth/qr error:`, err.message);
  }

  // Fallback /api/sessions/{session}/auth/qr
  try {
    const res = await fetch(`${DEFAULT_WAHA_URL}/api/sessions/${cleanSession}/auth/qr`, {
      headers: getWahaHeaders({ Accept: "application/json, image/png" }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await res.json();
        const base64 = json.data || json.qr || json.raw || "";
        if (base64) {
          const mime = json.mimetype || "image/png";
          const dataUrl = base64.startsWith("data:") ? base64 : `data:${mime};base64,${base64}`;
          return { raw: dataUrl, dataUrl, base64, proxyUrl };
        }
      } else {
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 0) {
          const base64 = Buffer.from(buffer).toString("base64");
          const dataUrl = `data:image/png;base64,${base64}`;
          return { raw: dataUrl, dataUrl, base64, proxyUrl };
        }
      }
    }
  } catch (err: any) {
    console.warn(`[WAHA] getWahaQr fallback error:`, err.message);
  }

  return null;
}

/**
 * Buat sesi baru di WAHA jika belum terdaftar
 * POST /api/sessions
 * Body: { "name": "{{name_session}}", "config": { "webhooks": [...] } }
 */
export async function createWahaSession(
  name: string,
  webhookUrl?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const cleanName = name.trim();
  try {
    const bodyPayload: any = { name: cleanName };

    if (webhookUrl) {
      bodyPayload.config = {
        webhooks: [buildWebhookConfig(webhookUrl)],
      };
    }

    const res = await fetch(`${DEFAULT_WAHA_URL}/api/sessions`, {
      method: "POST",
      headers: getWahaHeaders(),
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => null);

    if (res.ok || res.status === 201) {
      return { success: true, data };
    }

    // Session might already exist
    if (res.status === 409 || data?.message?.toLowerCase().includes("already exists")) {
      return { success: true, data };
    }

    return { success: false, error: data?.message || `HTTP ${res.status}` };
  } catch (err: any) {
    console.warn(`[WAHA] createWahaSession error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Pastikan session terdaftar di WAHA.
 * Jika belum terdaftar, buat sesi baru dengan:
 * POST /api/sessions
 * Body: { "name": "{{name_session}}" }
 * dan jalankan startWahaSession.
 */
export async function ensureWahaSession(
  session: string = DEFAULT_SESSION,
  webhookUrl?: string
): Promise<{ created: boolean; info: any | null }> {
  const cleanSession = session.trim();
  let info = await getWahaSession(cleanSession);

  // Jika session belum terdaftar di WAHA (null / 404)
  if (!info) {
    console.log(`[WAHA] Sesi '${cleanSession}' belum terdaftar di WAHA. Membuat sesi via POST /api/sessions...`);
    const createRes = await createWahaSession(cleanSession, webhookUrl);
    if (createRes.success) {
      // Jalankan sesi baru agar engine aktif dan menghasilkan QR Code
      await startWahaSession(cleanSession);
      await new Promise((r) => setTimeout(r, 1200));
      info = await getWahaSession(cleanSession);
      return { created: true, info };
    }
  }

  return { created: false, info };
}

/**
 * 2. Get Informasi Akun Terhubung
 * GET /api/sessions/{session}/me
 */
export async function getWahaMe(session: string = DEFAULT_SESSION): Promise<any | null> {
  const cleanSession = encodeURIComponent(session.trim());
  try {
    const res = await fetch(`${DEFAULT_WAHA_URL}/api/sessions/${cleanSession}/me`, {
      method: "GET",
      headers: getWahaHeaders(),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const text = await res.text();
      if (!text || !text.trim()) return null;
      return JSON.parse(text);
    }
  } catch (err: any) {
    console.warn(`[WAHA] getWahaMe error: ${err.message}`);
  }
  return null;
}

/**
 * 3. Stop Koneksi WAHA
 * POST /api/sessions/{session}/stop
 */
export async function stopWahaSession(session: string = DEFAULT_SESSION): Promise<{ success: boolean; error?: string }> {
  const cleanSession = encodeURIComponent(session);
  try {
    const res = await fetch(`${DEFAULT_WAHA_URL}/api/sessions/${cleanSession}/stop`, {
      method: "POST",
      headers: getWahaHeaders(),
      signal: AbortSignal.timeout(8000),
    });

    return { success: res.ok };
  } catch (err: any) {
    console.warn(`[WAHA] stopWahaSession error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Start Koneksi WAHA
 * POST /api/sessions/{session}/start or POST /api/sessions/start
 */
export async function startWahaSession(session: string = DEFAULT_SESSION): Promise<{ success: boolean; error?: string }> {
  const cleanSession = encodeURIComponent(session);
  try {
    const res = await fetch(`${DEFAULT_WAHA_URL}/api/sessions/${cleanSession}/start`, {
      method: "POST",
      headers: getWahaHeaders(),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) return { success: true };
  } catch {}

  // Fallback to POST /api/sessions/start with body { name: session }
  try {
    const res = await fetch(`${DEFAULT_WAHA_URL}/api/sessions/start`, {
      method: "POST",
      headers: getWahaHeaders(),
      body: JSON.stringify({ name: session }),
      signal: AbortSignal.timeout(10000),
    });
    return { success: res.ok };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Restart Koneksi WAHA
 */
export async function restartWahaSession(session: string = DEFAULT_SESSION): Promise<{ success: boolean; error?: string }> {
  const cleanSession = encodeURIComponent(session);
  try {
    const res = await fetch(`${DEFAULT_WAHA_URL}/api/sessions/${cleanSession}/restart`, {
      method: "POST",
      headers: getWahaHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { success: true };
  } catch {}

  // Fallback: Stop then Start
  try {
    await stopWahaSession(session);
    await new Promise((r) => setTimeout(r, 1000));
    return await startWahaSession(session);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get Sesi Info
 * GET /api/sessions/{session}
 */
export async function getWahaSession(session: string = DEFAULT_SESSION): Promise<any | null> {
  const cleanSession = encodeURIComponent(session);
  try {
    const res = await fetch(`${DEFAULT_WAHA_URL}/api/sessions/${cleanSession}`, {
      method: "GET",
      headers: getWahaHeaders(),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

/**
 * Get All Sessions
 * GET /api/sessions?all=true
 */
export async function getAllWahaSessions(): Promise<any[]> {
  try {
    const res = await fetch(`${DEFAULT_WAHA_URL}/api/sessions?all=true`, {
      method: "GET",
      headers: getWahaHeaders(),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.warn("[WAHA] getAllWahaSessions error:", err.message);
  }
  return [];
}

/**
 * 4. Send Text Message
 * POST /api/sendText
 * Body: { "chatId": "", "text": "", "linkPreview": true, "linkPreviewHighQuality": false, "session": "" }
 */
export function extractWahaMessageId(idVal: any): string {
  if (!idVal) return `waha_${Date.now()}`;
  if (typeof idVal === "string") return idVal;
  if (typeof idVal === "object") {
    return idVal._serialized || idVal.id || JSON.stringify(idVal);
  }
  return String(idVal);
}

export async function sendText(
  chatId: string,
  text: string,
  session: string = DEFAULT_SESSION,
  customApiUrl?: string | null,
  customApiKey?: string | null
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const baseUrl = (customApiUrl || DEFAULT_WAHA_URL).replace(/\/+$/, "");
    const headers = getWahaHeaders(customApiKey ? { "X-Api-Key": customApiKey } : {});
    const formattedChatId = formatChatId(chatId);
    const payload = {
      chatId: formattedChatId,
      text,
      linkPreview: true,
      linkPreviewHighQuality: false,
      session,
    };

    let res = await fetch(`${baseUrl}/api/sendText`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });

    // Fallback: If sending to @c.us failed with 500/bad request, try @lid
    if (!res.ok && formattedChatId.endsWith("@c.us")) {
      const lidCandidate = formattedChatId.replace(/@c\.us$/, "@lid");
      try {
        const retryRes = await fetch(`${baseUrl}/api/sendText`, {
          method: "POST",
          headers,
          body: JSON.stringify({ ...payload, chatId: lidCandidate }),
          signal: AbortSignal.timeout(8000),
        });
        if (retryRes.ok) {
          res = retryRes;
        }
      } catch {}
    }

    if (res.ok) {
      const data = await res.json();
      return { success: true, messageId: extractWahaMessageId(data.id) };
    }

    const errData = await res.json().catch(() => ({}));
    return {
      success: false,
      error: errData.message || res.statusText || "Gagal mengirim pesan via WAHA",
    };
  } catch (err: any) {
    const isTimeout = err.name === "TimeoutError" || err.message?.includes("timeout");
    console.warn(`[WAHA] sendText error for ${chatId}:`, err.message);
    return {
      success: false,
      error: isTimeout
        ? "Timeout: Gateway WAHA tidak merespons. Pastikan sesi WhatsApp terhubung."
        : `Gagal mengirim pesan: ${err.message}`,
    };
  }
}

/**
 * 5. Send Seen (Centang Biru)
 * POST /api/sendSeen
 * Body: { "chatId": "", "messageIds": [""], "participant": null, "session": "default" }
 */
export async function sendSeen(
  chatId: string,
  messageId?: string,
  session: string = DEFAULT_SESSION,
  customApiUrl?: string | null,
  customApiKey?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = (customApiUrl || DEFAULT_WAHA_URL).replace(/\/+$/, "");
    const headers = getWahaHeaders(customApiKey ? { "X-Api-Key": customApiKey } : {});
    const formattedChatId = formatChatId(chatId);
    const payload = {
      chatId: formattedChatId,
      messageIds: messageId ? [messageId] : [],
      participant: null,
      session,
    };

    const res = await fetch(`${baseUrl}/api/sendSeen`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    return { success: res.ok };
  } catch (err: any) {
    console.warn(`[WAHA] sendSeen fallback for ${chatId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 6. Send Typing Status
 * POST /api/startTyping
 * Body: { "chatId": "", "session": "default" }
 */
export async function startTyping(
  chatId: string,
  session: string = DEFAULT_SESSION,
  customApiUrl?: string | null,
  customApiKey?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = (customApiUrl || DEFAULT_WAHA_URL).replace(/\/+$/, "");
    const headers = getWahaHeaders(customApiKey ? { "X-Api-Key": customApiKey } : {});
    const payload = {
      chatId: formatChatId(chatId),
      session,
    };

    const res = await fetch(`${baseUrl}/api/startTyping`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    return { success: res.ok };
  } catch (err: any) {
    console.warn(`[WAHA] startTyping error for ${chatId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Stop Typing Status
 * POST /api/stopTyping
 * Body: { "chatId": "", "session": "default" }
 */
export async function stopTyping(
  chatId: string,
  session: string = DEFAULT_SESSION,
  customApiUrl?: string | null,
  customApiKey?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = (customApiUrl || DEFAULT_WAHA_URL).replace(/\/+$/, "");
    const headers = getWahaHeaders(customApiKey ? { "X-Api-Key": customApiKey } : {});
    const payload = {
      chatId: formatChatId(chatId),
      session,
    };

    const res = await fetch(`${baseUrl}/api/stopTyping`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    return { success: res.ok };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Helper to ensure standard WhatsApp chatId format (628xxx@c.us or xxx@lid)
 */
export function formatChatId(phoneOrChatId: string): string {
  if (!phoneOrChatId) return "";
  let clean = phoneOrChatId.trim();

  // Strip multi-device suffix like :0@s.whatsapp.net or :1@c.us
  clean = clean.replace(/:\d+@/, "@");

  if (clean.includes("@")) {
    // Standardize @s.whatsapp.net to @c.us
    if (clean.endsWith("@s.whatsapp.net")) {
      return clean.replace(/@s\.whatsapp\.net$/, "@c.us");
    }
    return clean;
  }

  const digits = clean.replace(/[^0-9]/g, "");
  return `${digits}@c.us`;
}

/**
 * Helper to check if a phone string is a WhatsApp LID (@lid) vs real phone number
 */
export function isWhatsAppLid(num: string | null | undefined): boolean {
  if (!num) return false;
  const clean = num.replace(/[^0-9]/g, "");
  if (num.toLowerCase().includes("@lid")) return true;
  // Indonesian standard phone numbers: 628... or 08... (10 to 13 digits)
  if (clean.startsWith("628") || clean.startsWith("08")) {
    return clean.length > 13;
  }
  // Generic WhatsApp LIDs are 14-16 digits
  return clean.length >= 14;
}

/**
 * 7. Resolve real phone number from WhatsApp LID (@lid)
 * GET /api/{session}/lids/{lid} (fallback /api/sessions/{session}/lids/{lid})
 */
export async function getPhoneNumberFromLid(
  lid: string,
  session: string = DEFAULT_SESSION,
  customApiUrl?: string | null,
  customApiKey?: string | null
): Promise<{ phoneNumber?: string; name?: string; pushName?: string; raw?: any } | null> {
  const baseUrl = (customApiUrl || DEFAULT_WAHA_URL).replace(/\/+$/, "");
  const cleanLid = encodeURIComponent(lid.replace(/[^0-9]/g, ""));
  const cleanSession = encodeURIComponent(session.trim());
  const headers = getWahaHeaders(customApiKey ? { "X-Api-Key": customApiKey } : {});

  // 1. Try GET /api/{session}/lids/{lid}
  try {
    const res = await fetch(`${baseUrl}/api/${cleanSession}/lids/${cleanLid}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      const resolvedPhone =
        data.phoneNumber ||
        data.phone ||
        data.pn ||
        (typeof data.id === "string" && data.id.includes("@c.us") ? data.id.split("@")[0] : null) ||
        (typeof data.id === "object" && data.id?.user ? data.id.user : null) ||
        data.number;

      if (resolvedPhone) {
        return {
          phoneNumber: String(resolvedPhone).replace(/[^0-9]/g, ""),
          name: data.name || data.pushName,
          pushName: data.pushName,
          raw: data,
        };
      }
    }
  } catch (err: any) {
    console.warn(`[WAHA] getPhoneNumberFromLid error for ${lid}:`, err.message);
  }

  // 2. Fallback GET /api/sessions/{session}/lids/{lid}
  try {
    const res = await fetch(`${baseUrl}/api/sessions/${cleanSession}/lids/${cleanLid}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      const resolvedPhone =
        data.phoneNumber ||
        data.phone ||
        data.pn ||
        (typeof data.id === "string" && data.id.includes("@c.us") ? data.id.split("@")[0] : null) ||
        (typeof data.id === "object" && data.id?.user ? data.id.user : null) ||
        data.number;

      if (resolvedPhone) {
        return {
          phoneNumber: String(resolvedPhone).replace(/[^0-9]/g, ""),
          name: data.name || data.pushName,
          pushName: data.pushName,
          raw: data,
        };
      }
    }
  } catch {}

  // 3. Fallback GET /api/contacts?session={session}&contactId={lid}@lid
  try {
    const res = await fetch(`${baseUrl}/api/contacts?session=${cleanSession}&contactId=${cleanLid}@lid`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      const resolvedPhone =
        data.phoneNumber ||
        data.phone ||
        data.pn ||
        (typeof data.id === "string" && data.id.includes("@c.us") ? data.id.split("@")[0] : null) ||
        (typeof data.id === "object" && data.id?.user ? data.id.user : null);

      if (resolvedPhone) {
        return {
          phoneNumber: String(resolvedPhone).replace(/[^0-9]/g, ""),
          name: data.name || data.pushName,
          pushName: data.pushName,
          raw: data,
        };
      }
    }
  } catch {}

  return null;
}

export interface WahaGroupItem {
  id: string;
  name: string;
  participantsCount?: number;
  pictureUrl?: string | null;
  desc?: string | null;
  isCommunity?: boolean;
  announce?: boolean;
}

export interface GetWahaGroupsOptions {
  limit?: number;
  offset?: number;
  sortOrder?: "asc" | "desc";
  excludeParticipants?: boolean;
}

/**
 * 8. Fetch WhatsApp Groups for a session
 * Uses GET /api/{session}/groups with pagination (limit, offset, sortOrder) and excludeParticipants
 */
export async function getWahaGroups(
  session: string = DEFAULT_SESSION,
  customApiUrl?: string | null,
  customApiKey?: string | null,
  options?: GetWahaGroupsOptions
): Promise<{ success: boolean; groups: WahaGroupItem[]; error?: string; rawStatus?: string; total?: number }> {
  try {
    const baseUrl = (customApiUrl || DEFAULT_WAHA_URL).replace(/\/+$/, "");
    const headers = getWahaHeaders(customApiKey ? { "X-Api-Key": customApiKey } : {});
    const cleanSession = encodeURIComponent(session || DEFAULT_SESSION);

    // Build URL with query parameters
    const url = new URL(`${baseUrl}/api/${cleanSession}/groups`);
    if (options?.limit !== undefined) url.searchParams.set("limit", String(options.limit));
    if (options?.offset !== undefined) url.searchParams.set("offset", String(options.offset));
    if (options?.sortOrder) url.searchParams.set("sortOrder", options.sortOrder);
    
    // Always exclude participants by default to keep response lightweight
    if (options?.excludeParticipants !== false) {
      url.searchParams.set("excludeParticipants", "true");
    }

    console.log(`[WAHA] Fetching groups from: ${url.toString()}`);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(15000),
    });

    const bodyText = await res.text();
    let bodyJson: any = null;
    try {
      bodyJson = JSON.parse(bodyText);
    } catch {}

    if (res.ok) {
      // WAHA can return either an Array of groups or a Dictionary object keyed by JID
      let rawList: any[] = [];
      if (Array.isArray(bodyJson)) {
        rawList = bodyJson;
      } else if (bodyJson && typeof bodyJson === "object") {
        rawList = Object.values(bodyJson);
      }

      const groups: WahaGroupItem[] = rawList.map((g: any) => {
        const rawId = typeof g.id === "object" ? g.id?._serialized || g.id?.user : g.id;
        const id = String(rawId || "").includes("@") ? String(rawId) : `${rawId}@g.us`;
        const name = g.subject || g.name || "Grup WhatsApp";

        // Size / participants count (without loading heavy participants array)
        const participantsCount =
          typeof g.size === "number"
            ? g.size
            : Array.isArray(g.participants)
            ? g.participants.length
            : typeof g.participantsCount === "number"
            ? g.participantsCount
            : undefined;

        return {
          id,
          name,
          participantsCount,
          pictureUrl: g.picture || g.pictureUrl || null,
          desc: g.desc || null,
          isCommunity: Boolean(g.isCommunity),
          announce: Boolean(g.announce),
        };
      });

      return { success: true, groups, total: groups.length };
    }

    // Handle Unprocessable Entity (e.g. Session FAILED or SCAN_QR)
    const errorMsg =
      bodyJson?.error ||
      bodyJson?.message ||
      `Gateway merespons HTTP ${res.status}: ${res.statusText}`;

    const sessionStatus = bodyJson?.status;
    const hint = sessionStatus
      ? `Sesi '${session}' di WAHA berstatus ${sessionStatus}. Gateway membutuhkan status WORKING. Silakan buka menu WA Gateway untuk scan QR atau hubungkan sesi.`
      : errorMsg;

    return {
      success: false,
      groups: [],
      error: hint,
      rawStatus: sessionStatus || String(res.status),
    };
  } catch (err: any) {
    console.error("[WAHA] getWahaGroups error:", err);
    return {
      success: false,
      groups: [],
      error: err.message || "Gagal menghubungi WhatsApp Gateway",
    };
  }
}




