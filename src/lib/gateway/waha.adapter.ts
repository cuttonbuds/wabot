import {
  getWahaSession,
  getWahaQr,
  getWahaMe,
  sendText as wahaSendText,
  sendSeen as wahaSendSeen,
  startTyping as wahaStartTyping,
  stopTyping as wahaStopTyping,
  stopWahaSession,
  restartWahaSession,
} from "../waha";
import {
  GatewayConfig,
  GatewayQrResult,
  GatewayStatusResult,
  IGatewayAdapter,
  SendResult,
} from "./types";

export class WahaGatewayAdapter implements IGatewayAdapter {
  type = "WAHA" as const;

  async getStatus(config: GatewayConfig): Promise<GatewayStatusResult> {
    const sessionName = config.sessionId || process.env.WAHA_SESSION_NAME || "default";
    try {
      const session = await getWahaSession(sessionName);
      if (!session) {
        return { isConnected: false, status: "DISCONNECTED" };
      }

      let status: GatewayStatusResult["status"] = "DISCONNECTED";
      if (session.status === "WORKING") {
        status = "CONNECTED";
      } else if (session.status === "SCAN_QR") {
        status = "SCAN_QR";
      } else if (session.status === "STARTING") {
        status = "STARTING";
      } else if (session.status === "STOPPED") {
        status = "STOPPED";
      } else if (session.status === "FAILED") {
        status = "FAILED";
      }

      let phone: string | undefined;
      let pushName: string | undefined;

      if (status === "CONNECTED") {
        const me = await getWahaMe(sessionName);
        if (me) {
          phone = me.id?.user || (typeof me.id === "string" ? me.id.split("@")[0] : undefined);
          pushName = me.pushName || me.name;
        }
      }

      return {
        isConnected: status === "CONNECTED",
        status,
        phone,
        pushName,
        raw: session,
      };
    } catch (err: any) {
      return {
        isConnected: false,
        status: "DISCONNECTED",
        raw: err.message,
      };
    }
  }

  async getQr(config: GatewayConfig): Promise<GatewayQrResult | null> {
    const sessionName = config.sessionId || process.env.WAHA_SESSION_NAME || "default";
    const qrRes = await getWahaQr(sessionName);
    if (!qrRes) return null;
    return {
      qr: qrRes.dataUrl || qrRes.raw,
      raw: qrRes.raw,
    };
  }

  async sendText(to: string, text: string, config: GatewayConfig): Promise<SendResult> {
    const sessionName = config.sessionId || process.env.WAHA_SESSION_NAME || "default";
    return await wahaSendText(to, text, sessionName, config.apiUrl, config.apiKey);
  }

  async sendSeen(to: string, messageId?: string, config?: GatewayConfig): Promise<void> {
    const sessionName = config?.sessionId || process.env.WAHA_SESSION_NAME || "default";
    await wahaSendSeen(to, messageId, sessionName, config?.apiUrl, config?.apiKey);
  }

  async startTyping(to: string, config?: GatewayConfig): Promise<void> {
    const sessionName = config?.sessionId || process.env.WAHA_SESSION_NAME || "default";
    await wahaStartTyping(to, sessionName, config?.apiUrl, config?.apiKey);
  }

  async stopTyping(to: string, config?: GatewayConfig): Promise<void> {
    const sessionName = config?.sessionId || process.env.WAHA_SESSION_NAME || "default";
    await wahaStopTyping(to, sessionName, config?.apiUrl, config?.apiKey);
  }

  async logout(config: GatewayConfig): Promise<{ success: boolean; error?: string }> {
    const sessionName = config.sessionId || process.env.WAHA_SESSION_NAME || "default";
    return await stopWahaSession(sessionName);
  }

  async restart(config: GatewayConfig): Promise<{ success: boolean; error?: string }> {
    const sessionName = config.sessionId || process.env.WAHA_SESSION_NAME || "default";
    return await restartWahaSession(sessionName);
  }
}
