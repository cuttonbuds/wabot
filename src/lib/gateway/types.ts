export type GatewayType = "WAHA";

export interface GatewayConfig {
  gatewayType?: GatewayType;
  apiUrl?: string | null;
  apiKey?: string | null;
  sessionId?: string;
  userId?: string;
}

export interface GatewayStatusResult {
  isConnected: boolean;
  status: "CONNECTED" | "SCAN_QR" | "STARTING" | "STOPPED" | "FAILED" | "DISCONNECTED";
  phone?: string;
  pushName?: string;
  raw?: any;
}

export interface GatewayQrResult {
  qr: string | null;
  raw?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IGatewayAdapter {
  type: GatewayType;
  getStatus(config: GatewayConfig): Promise<GatewayStatusResult>;
  getQr(config: GatewayConfig): Promise<GatewayQrResult | null>;
  sendText(to: string, text: string, config: GatewayConfig): Promise<SendResult>;
  sendSeen?(to: string, messageId?: string, config?: GatewayConfig): Promise<void>;
  startTyping?(to: string, config?: GatewayConfig): Promise<void>;
  stopTyping?(to: string, config?: GatewayConfig): Promise<void>;
  logout(config: GatewayConfig): Promise<{ success: boolean; error?: string }>;
  restart?(config: GatewayConfig): Promise<{ success: boolean; error?: string }>;
}

