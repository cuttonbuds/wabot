"use client";

import { useState, useEffect, useRef } from "react";
import { usePolling } from "@/hooks/usePolling";
import {
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
  Power,
  ShieldCheck,
  Globe,
  Copy,
  Check,
  Send,
  Eye,
  Phone,
  CheckCircle2,
  Activity,
  Save,
  Layers,
  Smartphone,
  AlertTriangle,
  Loader2,
  UserCheck,
  Key,
  CheckCircle,
} from "lucide-react";

export default function GatewayPage() {
  const [session, setSession] = useState<any>(null);
  const [meInfo, setMeInfo] = useState<any>(null);
  const [sessionName, setSessionName] = useState<string>("");
  const [serverWebhookUrl, setServerWebhookUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState(false);
  const [wahaOnline, setWahaOnline] = useState<boolean | null>(null);

  // WAHA Provider Settings State
  const [apiUrl, setApiUrl] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [formInitialized, setFormInitialized] = useState(false);

  // QR Code state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [countdown, setCountdown] = useState<number>(20);

  // Test Sender State
  const [targetPhone, setTargetPhone] = useState("6281278901234");
  const [testText, setTestText] = useState(
    "Halo Sobat Cerdas! Ini adalah pesan uji coba dari sistem bot CS Lampung Cerdas."
  );
  const [sendingTest, setSendingTest] = useState(false);
  const [testResponse, setTestResponse] = useState<any>(null);

  // 1. Fetch active session from server for current authenticated user
  const fetchSession = async (isSilent = false) => {
    if (!isSilent) setActionLoading(true);
    try {
      const url = "/api/waha/session";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setMeInfo(data.me || null);
        if (data.webhookUrl) setServerWebhookUrl(data.webhookUrl);
        setWahaOnline(data.wahaConnected !== false && data.gatewayConnected !== false);

        // Sync form state ONLY on first initial load
        if (!formInitialized) {
          setApiUrl(data.session?.apiUrl || "");
          setApiKey(data.session?.apiKey || "");
          setSessionName(data.session?.sessionName || "");
          setFormInitialized(true);
        }

        // QR Code Handling
        if (data.session?.status === "SCAN_QR" || data.session?.status === "DISCONNECTED") {
          if (data.qr) {
            setQrCode(data.qr);
          } else if (data.qrUrl) {
            setQrCode(data.qrUrl);
          }
        } else if (data.session?.status === "CONNECTED") {
          setQrCode(null);
        }
      } else {
        setWahaOnline(false);
      }
    } catch (e) {
      console.error(e);
      setWahaOnline(false);
    } finally {
      setLoading(false);
      if (!isSilent) setActionLoading(false);
    }
  };

  // 2. Countdown timer for QR refresh UI (visual only)
  useEffect(() => {
    if (session?.status !== "SCAN_QR") return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 20 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.status]);

  // 3. Background status polling every 10 seconds (paused while the tab is hidden).
  //    First run is a visible load; subsequent ticks are silent.
  const hasLoadedOnce = useRef(false);
  usePolling(() => {
    const silent = hasLoadedOnce.current;
    hasLoadedOnce.current = true;
    return fetchSession(silent);
  }, 10000);

  // Update Bot Session Name
  const handleUpdateSessionName = async (newName: string) => {
    if (!newName.trim()) return;
    setActionLoading(true);

    try {
      const res = await fetch("/api/waha/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_name", sessionName: newName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Save WAHA Gateway Configuration
  const handleSaveGatewayConfig = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/waha/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_gateway_config",
          gatewayType: "WAHA",
          apiUrl: apiUrl.trim() || null,
          apiKey: apiKey.trim() || null,
          sessionName: sessionName.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setConfigSaveSuccess(true);
        setTimeout(() => setConfigSaveSuccess(false), 2500);
        await fetchSession(true);
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menyimpan konfigurasi WAHA.");
      }
    } catch (err: any) {
      alert(err.message || "Gagal menghubungi server.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSessionAction = async (action: string) => {
    setActionLoading(true);
    setCountdown(20);
    try {
      const res = await fetch("/api/waha/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setSession(data.session);
        setMeInfo(data.me || null);
        if (data.webhookUrl) setServerWebhookUrl(data.webhookUrl);
        if (data.qr) {
          setQrCode(data.qr);
        } else if (action === "start" || action === "restart" || action === "qr") {
          setQrCode(
            data.qrUrl ||
              `/api/waha/qr?session=${encodeURIComponent(data.session.id)}&t=${Date.now()}`
          );
        } else {
          setQrCode(null);
        }
      } else {
        alert(data.error || "Aksi sesi gagal dijalankan.");
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Gagal menghubungi server WAHA.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefreshQr = async () => {
    setCountdown(20);
    setQrLoading(true);
    await handleSessionAction("qr");
    setQrLoading(false);
  };

  const handleSendTestChat = async (actionType: "sendText" | "seen" | "typing") => {
    if (!targetPhone.trim()) return;
    setSendingTest(true);
    setTestResponse(null);

    try {
      const res = await fetch("/api/waha/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          phoneNumber: targetPhone.trim(),
          text: testText.trim(),
          session: session?.id || "bot",
          gatewayType: "WAHA",
        }),
      });

      const data = await res.json();
      setTestResponse({
        timestamp: new Date().toLocaleTimeString(),
        status: res.status,
        gateway: "WAHA",
        ...data,
      });
    } catch (err: any) {
      setTestResponse({
        timestamp: new Date().toLocaleTimeString(),
        success: false,
        gateway: "WAHA",
        error: err.message || "Gagal menghubungi server backend.",
      });
    } finally {
      setSendingTest(false);
    }
  };

  const activeSessionId = session?.id || "bot";

  // Dedicated Webhook URL for WAHA (tenant is resolved server-side from the session; no userId in URL)
  const webhookUrl =
    serverWebhookUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/api/waha/webhook?session=${encodeURIComponent(activeSessionId)}`
      : `http://localhost:3000/api/waha/webhook?session=${encodeURIComponent(activeSessionId)}`);

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#e8e8eb] rounded-[20px] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#0066ff] text-[11.5px] sm:text-[12px] font-bold mb-1">
            <QrCode className="w-3.5 h-3.5" />
            <span>WAHA Gateway & WhatsApp Control</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1b1b20]">
            Kelola Gateway WhatsApp (WAHA)
          </h1>
          <p className="text-[12.5px] sm:text-[13px] text-[#666666]">
            Atur koneksi API WAHA, monitor status sesi, scan QR code, dan lakukan uji coba pengiriman pesan otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {wahaOnline !== null && (
            <span
              className={`flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold px-2.5 py-1 rounded-full border ${
                wahaOnline
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  wahaOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span>
                WAHA: {wahaOnline ? "Online" : "Offline / Unreachable"}
              </span>
            </span>
          )}

          {saveSuccess && (
            <span className="flex items-center gap-1 text-[11.5px] sm:text-[12px] font-bold text-emerald-700 bg-emerald-50 px-2.5 sm:px-3 py-1.5 rounded-[10px] border border-emerald-200 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sesi Tersimpan!
            </span>
          )}
          <button
            onClick={() => fetchSession()}
            disabled={actionLoading}
            className="btn-outline !py-1.5 sm:!py-2 !px-3 sm:!px-3.5 !text-[12px] sm:!text-[13px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${actionLoading ? "animate-spin text-[#0066ff]" : ""}`} />
            <span>Segarkan Status</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* KONFIGURASI SERVER WAHA                                  */}
      {/* ======================================================== */}
      <div className="bg-white border border-[#e8e8eb] rounded-[20px] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e8e8eb] pb-3">
          <div>
            <span className="font-bold text-[15px] text-[#1b1b20] block">
              Konfigurasi Endpoint WAHA (WhatsApp HTTP API)
            </span>
            <span className="text-[12px] text-[#666]">
              Sesuaikan URL server WAHA dan API Key jika menggunakan instance custom.
            </span>
          </div>
          {configSaveSuccess && (
            <span className="text-emerald-700 font-bold text-[11.5px] flex items-center gap-1 animate-fade-in bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5" /> Konfigurasi WAHA Berhasil Disimpan!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-semibold text-[#444] block mb-1">
              Base URL Server WAHA
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:3000 (atau URL WAHA Anda)"
              className="w-full px-3 py-1.5 bg-[#f9f9fa] border border-[#e8e8eb] rounded-[8px] text-[12.5px] font-mono focus:outline-none focus:border-[#0066ff]"
            />
            <span className="text-[10.5px] text-[#888] mt-0.5 block">
              Kosongkan untuk menggunakan default lokal dari .env (<code>WAHA_BASE_URL</code>).
            </span>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#444] block mb-1">
              API Key WAHA (Opsional)
            </label>
            <div className="relative">
              <Key className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="X-Api-Key jika diatur di WAHA"
                className="w-full pl-8 pr-3 py-1.5 bg-[#f9f9fa] border border-[#e8e8eb] rounded-[8px] text-[12.5px] font-mono focus:outline-none focus:border-[#0066ff]"
              />
            </div>
            <span className="text-[10.5px] text-[#888] mt-0.5 block">
              Dikirim via header <code>X-Api-Key</code> saat melakukan request ke WAHA.
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleSaveGatewayConfig}
            disabled={actionLoading}
            className="btn-primary !py-2 !px-4 !text-[12.5px] shadow-sm flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Konfigurasi WAHA</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PENGATURAN SESI & SCAN QR CODE                           */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Col: Session Control & QR Code (6 Cols) */}
        <div className="lg:col-span-6 bg-white border border-[#e8e8eb] rounded-[20px] p-4 sm:p-6 shadow-xs flex flex-col items-center text-center space-y-4">
          {/* Session Selector & Persistence Bar */}
          <div className="w-full text-left space-y-2 border-b border-[#e8e8eb] pb-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[14px] text-[#1b1b20] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#0066ff]" />
                <span>Nama Sesi Aktif:</span>
              </label>

              <span
                className={`badge-pill text-[11px] border ${
                  session?.status === "CONNECTED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : session?.status === "SCAN_QR"
                    ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                    : session?.status === "STARTING"
                    ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {session?.status === "CONNECTED" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <span>CONNECTED</span>
                  </>
                ) : session?.status === "SCAN_QR" ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-amber-600" />
                    <span>SCAN QR CODE</span>
                  </>
                ) : session?.status === "STARTING" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                    <span>MEMULAI SESI...</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                    <span>DISCONNECTED</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Contoh: CS Lampung Cerdas 1"
                className="flex-1 px-3 py-1.5 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[10px] text-[13px] font-bold text-[#0066ff] focus:outline-none focus:border-[#0066ff]"
              />
              <button
                type="button"
                onClick={() => handleUpdateSessionName(sessionName)}
                disabled={actionLoading || !sessionName.trim() || sessionName === session?.sessionName}
                className="btn-primary !py-1.5 !px-3 !text-[12px] shrink-0"
                title="Simpan nama bot"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Nama</span>
              </button>
            </div>

            {/* Dedicated User Session Indicator */}
            <div className="pt-2 border-t border-[#f0f0f2] space-y-2">
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-[#666666] font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0066ff]" />
                  <span>ID Sesi Terisolasi:</span>
                </span>
                <span className="font-mono font-bold bg-[#f6f6f7] border border-[#e8e8eb] px-2.5 py-0.5 rounded-[6px] text-[#0066ff]">
                  {session?.id || "Memuat..."}
                </span>
              </div>
              <p className="text-[11px] text-[#888]">
                Sesi ini terikat eksklusif ke akun Anda dan terhubung ke engine WAHA.
              </p>
            </div>
          </div>

          {/* Connected Account Card if info available */}
          {meInfo && (
            <div className="w-full p-3.5 rounded-[14px] bg-emerald-50 border border-emerald-200 text-left text-[12px] text-emerald-900 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[13px] shadow-xs">
                  WA
                </div>
                <div>
                  <div className="font-bold text-[13.5px] text-emerald-950">
                    {meInfo.pushName || meInfo.name || "CS Lampung Cerdas"}
                  </div>
                  <div className="text-[11.5px] text-emerald-700 font-medium">
                    +{meInfo.id?.user || (typeof meInfo.id === "string" ? meInfo.id.replace(/[^0-9]/g, "") : "Nomor WhatsApp Terhubung")}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10.5px] font-bold bg-emerald-200/70 text-emerald-800 px-2.5 py-0.5 rounded-full inline-block mb-0.5">
                  Online Aktif
                </span>
                <div className="text-[10px] text-emerald-600 font-mono">
                  Gateway: WAHA
                </div>
              </div>
            </div>
          )}

          {/* QR Container / Connection Display */}
          <div className="w-full max-w-sm flex flex-col items-center justify-center p-4 my-1">
            {session?.status === "CONNECTED" ? (
              <div className="w-full py-8 px-4 bg-emerald-50/50 border border-emerald-200 rounded-[20px] text-center space-y-3 shadow-xs">
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-12 h-12" />
                </div>
                <div>
                  <div className="font-extrabold text-[16px] text-emerald-900">
                    Nomor WhatsApp Terhubung
                  </div>
                  <p className="text-[12px] text-emerald-700 mt-1 max-w-xs mx-auto">
                    Sesi <strong>{session?.id}</strong> siap menerima pesan masuk via webhook & mengirim balasan otomatis AI.
                  </p>
                </div>
              </div>
            ) : session?.status === "STARTING" ? (
              <div className="w-64 h-64 bg-[#f6f6f7] border-2 border-dashed border-[#0066ff]/40 rounded-[20px] flex flex-col items-center justify-center p-6 text-center space-y-3">
                <Loader2 className="w-10 h-10 text-[#0066ff] animate-spin" />
                <div className="font-bold text-[13.5px] text-[#1b1b20]">
                  Sedang Memulai Sesi WAHA...
                </div>
                <p className="text-[11.5px] text-[#666]">
                  Menghubungkan ke service WAHA backend.
                </p>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center space-y-3.5">
                {/* QR Box with Scanner Frame Accent */}
                <div className="relative p-3 bg-white border-2 border-[#e8e8eb] rounded-[20px] shadow-sm flex items-center justify-center">
                  {/* Corner Guides */}
                  <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#0066ff] rounded-tl" />
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#0066ff] rounded-tr" />
                  <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#0066ff] rounded-bl" />
                  <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#0066ff] rounded-br" />

                  {/* QR Image or Loader */}
                  {qrCode ? (
                    <div className="relative group">
                      <img
                        src={qrCode}
                        alt={`Scan QR Sesi ${session?.id || sessionName}`}
                        className="w-56 h-56 object-contain rounded-[12px]"
                      />
                    </div>
                  ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center text-center p-4 bg-gray-50 rounded-[12px] space-y-2">
                      <Loader2 className="w-8 h-8 text-[#0066ff] animate-spin" />
                      <span className="text-[12px] text-gray-500 font-medium">
                        Memuat QR Code dari WAHA...
                      </span>
                    </div>
                  )}
                </div>

                {/* Countdown & Refresh Toolbar */}
                <div className="flex items-center justify-between w-full max-w-[240px] px-1 text-[11.5px]">
                  <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                    <span>Auto-refresh:</span>
                    <strong className="font-mono text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                      {countdown}s
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshQr}
                    disabled={actionLoading || qrLoading}
                    className="text-[#0066ff] hover:text-[#0052cc] font-bold flex items-center gap-1 transition-colors"
                    title="Segarkan QR Code sekarang"
                  >
                    <RefreshCw className={`w-3 h-3 ${qrLoading ? "animate-spin" : ""}`} />
                    <span>Perbarui QR</span>
                  </button>
                </div>

                {/* Step by Step Scan Instructions */}
                <div className="w-full bg-[#f8f9fa] border border-[#e8e8eb] rounded-[14px] p-3.5 text-left space-y-2 text-[11.5px]">
                  <div className="font-bold text-[#1b1b20] flex items-center gap-1.5 text-[12px]">
                    <Smartphone className="w-4 h-4 text-[#0066ff]" />
                    <span>Langkah Scan QR WhatsApp:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[#444] pl-0.5">
                    <li>Buka aplikasi WhatsApp di HP Anda.</li>
                    <li>
                      Ketuk <strong>Menu (⋮)</strong> atau <strong>Pengaturan</strong> &gt; <strong>Perangkat Tertaut</strong>.
                    </li>
                    <li>
                      Ketuk tombol <strong>Tautkan Perangkat</strong>.
                    </li>
                    <li>Arahkan kamera HP ke QR code di atas.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Session Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 w-full pt-1">
            <button
              type="button"
              onClick={() => handleSessionAction("check_me")}
              disabled={actionLoading}
              className="btn-outline !text-[12px] !py-2 !px-3"
              title="Cek profil akun WhatsApp terhubung"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cek Info Akun (/me)</span>
            </button>
            {session?.status === "CONNECTED" ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSessionAction("restart")}
                  disabled={actionLoading}
                  className="btn-outline !text-[12.5px] !py-2 !px-3"
                  title="Putuskan koneksi dan minta QR baru"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restart Sesi & Ambil QR Baru</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSessionAction("stop")}
                  disabled={actionLoading}
                  className="btn-secondary !text-[12.5px] !py-2 !px-3"
                  title="Hentikan koneksi sesi WAHA"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Stop Sesi</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSessionAction("restart")}
                  disabled={actionLoading}
                  className="btn-primary !text-[12.5px] !py-2 !px-3.5 shadow-sm"
                  title="Minta QR Code baru dari WAHA"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Minta QR Baru (Restart)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSessionAction("connected_sim")}
                  disabled={actionLoading}
                  className="btn-outline !text-[12.5px] !py-2 !px-3 text-emerald-700 hover:text-emerald-800"
                  title="Set status ke Connected untuk mode pengujian lokal"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Set Connected (Simulasi)</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Col: Live Chat Message Sender & Tester (6 Cols) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Send Test Chat Card */}
          <div className="bg-white border border-[#e8e8eb] rounded-[20px] p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-[14.5px] text-[#1b1b20] flex items-center justify-between border-b border-[#e8e8eb] pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-[#0066ff]" />
                <span>Tes Kirim Pesan WhatsApp</span>
              </div>
              <span className="text-[11.5px] font-mono text-[#0066ff] bg-blue-50 px-2.5 py-0.5 rounded-full">
                Sesi: {session?.id || sessionName}
              </span>
            </h3>

            {/* Warning if session is not connected */}
            {session?.status !== "CONNECTED" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-[12px] text-amber-800 text-[12px] flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Sesi WhatsApp Belum Terhubung</span>
                  Sesi <code>{session?.id || sessionName}</code> berstatus <strong>{session?.status || "SCAN_QR"}</strong>.
                  Harap scan QR code di samping kiri terlebih dahulu hingga terhubung agar pesan WhatsApp dapat dikirim ke nomor penerima.
                </div>
              </div>
            )}

            <div className="space-y-3 text-[13px]">
              <div>
                <label className="font-bold text-[#1b1b20] block mb-1">
                  Nomor WhatsApp Tujuan (chatId)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
                  <input
                    type="text"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    placeholder="Contoh: 628123456789"
                    className="w-full pl-9 pr-3 py-2 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[10px] focus:outline-none focus:border-[#0066ff] font-bold text-[13px]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1b1b20] block mb-1">
                  Isi Pesan Teks (text)
                </label>
                <textarea
                  rows={3}
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Ketik pesan yang akan dikirim ke WhatsApp..."
                  className="w-full p-3 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[10px] focus:outline-none focus:border-[#0066ff] text-[12.5px] leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSendTestChat("sendText")}
                  disabled={sendingTest || !targetPhone.trim() || !testText.trim()}
                  className="btn-primary !text-[12.5px] !py-2 !px-3.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingTest ? "Mengirim..." : "Kirim Teks via WAHA"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendTestChat("seen")}
                  disabled={sendingTest || !targetPhone.trim()}
                  className="btn-outline !text-[12.5px] !py-2 !px-3"
                  title="Kirim status centang biru"
                >
                  <Eye className="w-3.5 h-3.5 text-[#0066ff]" />
                  <span>Tes Seen</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendTestChat("typing")}
                  disabled={sendingTest || !targetPhone.trim()}
                  className="btn-outline !text-[12.5px] !py-2 !px-3"
                  title="Kirim status sedang mengetik"
                >
                  <Activity className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tes Typing</span>
                </button>
              </div>
            </div>

            {/* Test Response Inspector */}
            {testResponse && (
              <div className="mt-3 p-3.5 rounded-[12px] bg-[#1b1b20] text-emerald-400 font-mono text-[11.5px] space-y-1.5 overflow-x-auto">
                <div className="flex items-center justify-between text-gray-400 border-b border-gray-700 pb-1 text-[10.5px]">
                  <span>RESPONS WAHA ({testResponse.timestamp})</span>
                  <span className={testResponse.success ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {testResponse.success ? "200 OK" : `STATUS: ${testResponse.status || "ERROR"}`}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap">{JSON.stringify(testResponse, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Webhook Endpoint Card */}
          <div className="bg-white border border-[#e8e8eb] rounded-[20px] p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-[14px] text-[#1b1b20] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#0066ff]" />
                <span>URL Webhook Masuk (WAHA)</span>
              </div>
              <span className="text-[11px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                Multi-Tenant
              </span>
            </h3>
            <div className="flex items-center gap-2 bg-[#f6f6f7] p-2.5 rounded-[12px] border border-[#e8e8eb]">
              <code className="text-[12px] font-mono text-[#0066ff] flex-1 truncate">
                {webhookUrl}
              </code>
              <button
                onClick={handleCopyWebhook}
                className="btn-outline !py-1 !px-2.5 !text-[12px] shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Tersalin" : "Salin"}</span>
              </button>
            </div>
            <div className="text-[11.5px] text-[#666666] space-y-1">
              <p>
                Webhook didaftarkan secara otomatis ke sesi WAHA ketika sesi dibuat/dimulai.
              </p>
              <p className="bg-blue-50 text-blue-800 p-2 rounded border border-blue-200 font-mono text-[11px]">
                Event yang didengar: <code>message</code>. Setiap pesan masuk dari WhatsApp akan otomatis diteruskan ke AI Bot Pipeline untuk direspon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
