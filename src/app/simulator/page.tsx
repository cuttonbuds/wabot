"use client";

import { useState } from "react";
import {
  Smartphone,
  Send,
  Bot,
  User,
  CheckCheck,
  Zap,
  ArrowRight,
  Database,
  Eye,
  Activity,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Code2,
} from "lucide-react";

interface PipelineStep {
  id: number;
  title: string;
  desc: string;
  status: "idle" | "running" | "success" | "skipped";
  detail?: string;
}

export default function SimulatorPage() {
  const [messages, setMessages] = useState<
    { id: number; sender: "customer" | "ai"; text: string; time: string }[]
  >([
    {
      id: 1,
      sender: "ai",
      text: "Halo Sobat Cerdas! Selamat datang di Konsultan Edukasi Lampung Cerdas. Ada yang bisa Kak Cerdas bantu seputar program Lampung Cerdas? 😊",
      time: "Baru saja",
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [simPhoneNumber, setSimPhoneNumber] = useState("1234567890");
  const [simSenderName, setSimSenderName] = useState("Elsi (Siswa SMAN 1 Lampung Cerdas)");
  const [simulating, setSimulating] = useState(false);
  const [isTypingState, setIsTypingState] = useState(false);
  const [latestJsonTelemetry, setLatestJsonTelemetry] = useState<any>(null);
  const [simMobileTab, setSimMobileTab] = useState<"phone" | "pipeline" | "telemetry">("phone");

  const initialSteps: PipelineStep[] = [
    {
      id: 1,
      title: "1. Webhook Inbound",
      desc: "Menerima payload webhook dari WAHA Gateway",
      status: "idle",
    },
    {
      id: 2,
      title: "2. Text Message Validator",
      desc: "Memfilter apakah tipe pesan adalah teks (abaikan jika media/stiker)",
      status: "idle",
    },
    {
      id: 3,
      title: "3. Contact Sync & Lookup",
      desc: "Cek nomor di tabel Kontak (tambah jika baru, ambil data jika ada)",
      status: "idle",
    },
    {
      id: 4,
      title: "4. WAHA sendSeen API",
      desc: "Mengirim status centang biru / sudah dibaca ke WhatsApp",
      status: "idle",
    },
    {
      id: 5,
      title: "5. AI Agent & RAG Processing",
      desc: "LLM + System Prompt Persona + Knowledge Base Retrieval",
      status: "idle",
    },
    {
      id: 6,
      title: "6. Update Contact Telemetry",
      desc: "Menyimpan lead_stage, persona, lead_score, & next_action ke DB",
      status: "idle",
    },
    {
      id: 7,
      title: "7. WAHA startTyping API",
      desc: "Mengirim simulasi status sedang mengetik (Typing indicator)",
      status: "idle",
    },
    {
      id: 8,
      title: "8. WAHA sendText API",
      desc: "Mengirim pesan jawaban ke WhatsApp calon siswa",
      status: "idle",
    },
  ];

  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>(initialSteps);

  const updateStep = (
    index: number,
    status: "idle" | "running" | "success" | "skipped",
    detail?: string
  ) => {
    setPipelineSteps((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status, detail };
      return copy;
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || simulating) return;

    const textToSend = inputMessage.trim();
    setInputMessage("");

    // Add customer message to simulator screen
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: "customer",
        text: textToSend,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    setSimulating(true);

    // Reset Steps
    setPipelineSteps(initialSteps);

    // --- STEP 1: Webhook Inbound ---
    updateStep(0, "running", "Menerima payload JSON dari nomor " + simPhoneNumber);
    await new Promise((r) => setTimeout(r, 400));
    updateStep(0, "success", `Payload diterima dari ${simSenderName}`);

    // --- STEP 2: Cek Tipe Pesan ---
    updateStep(1, "running", "Memeriksa field messageType & hasMedia...");
    await new Promise((r) => setTimeout(r, 300));
    updateStep(1, "success", `Pesan teks valid: "${textToSend.substring(0, 35)}..."`);

    // --- STEP 3: Cek Kontak di Database ---
    updateStep(2, "running", "Mencari kontak di tabel `contacts`...");
    await new Promise((r) => setTimeout(r, 400));

    try {
      // Call the auth-protected simulator endpoint (not the public WAHA webhook).
      // The server resolves the session from the logged-in user; nothing tenant-related is sent.
      const res = await fetch("/api/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: simPhoneNumber,
          pushName: simSenderName,
          body: textToSend,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Simulator gagal (HTTP ${res.status})`);
      }
      const result = data.result;

      updateStep(2, "success", `Kontak terverifikasi: ID #${result?.contactId || "Active"}`);

      // --- STEP 4: Send Seen API ---
      updateStep(3, "running", "Memanggil WAHA API: POST /api/sendSeen...");
      await new Promise((r) => setTimeout(r, 300));
      updateStep(3, "success", "Pesan ditandai Seen (Centang Biru di WA siswa)");

      // --- STEP 5: AI Agent & RAG Processing ---
      updateStep(4, "running", "Mencari konteks di Knowledge Base & LLM JSON inference...");
      await new Promise((r) => setTimeout(r, 700));
      updateStep(
        4,
        "success",
        `Stage: [${result?.leadStage || "CONSULTATION"}], Persona: [${result?.persona || "OPTIMIZER"}], Score: ${result?.leadScore || 60}/100`
      );

      // --- STEP 6: Update Kontak DB ---
      updateStep(5, "running", "Menyimpan pembaruan lead_stage, persona, & telemetry ke DB...");
      await new Promise((r) => setTimeout(r, 300));
      updateStep(5, "success", `Updated: ${result?.leadStage || "CONSULTATION"}`);

      // Save latest JSON structure for inspector
      setLatestJsonTelemetry({
        customer_message: result?.aiReplyMessage || "",
        lead_stage: result?.leadStage || "CONSULTATION",
        lead_temperature: result?.leadScore > 75 ? "HOT" : "WARM",
        lead_score: result?.leadScore || 65,
        persona: result?.persona || "EKSPLORASI_UMUM",
        primary_goal: "SNBP",
        primary_problem: textToSend,
        primary_objection: null,
        intent: "ASK_INFO",
        next_action: "SEND_OFFER",
        follow_up_required: false,
        follow_up_time: null,
        proof_needed: false,
        proof_type: "NONE",
        offer_ready: true,
        payment_ready: false,
        human_handoff: false,
        handoff_reason: null,
        need_external_data: false,
        missing_data: [],
        affiliate_id: null,
      });

      // --- STEP 7: Start Typing API ---
      updateStep(6, "running", "Memanggil WAHA API: POST /api/startTyping...");
      setIsTypingState(true);
      await new Promise((r) => setTimeout(r, 1200));
      setIsTypingState(false);
      updateStep(6, "success", "Simulasi mengetik selesai (1.5s)");

      // --- STEP 8: Send Text API ---
      updateStep(7, "running", "Memanggil WAHA API: POST /api/sendText...");
      await new Promise((r) => setTimeout(r, 300));
      updateStep(7, "success", "Pesan balasan terkirim ke WhatsApp!");

      // Add AI reply to simulator screen
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: result?.aiReplyMessage || "Halo Sobat Cerdas! Ada yang bisa kami bantu seputar program Lampung Cerdas?",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      updateStep(4, "skipped", `Gagal memproses: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const samplePrompts = [
    "Halo Kak, mau tanya bimbel SNBT 2026 biayanya berapa ya dan bisa dicicil?",
    "Apakah ada beasiswa potongan biaya untuk siswa berprestasi ranking 1?",
    "Mau daftar program kedinasan IPDN, transfernya ke rekening mana ya?",
    "Mau tanya analisis rasionalisasi nilai rapor SNBP Lampung Cerdas.",
    "Bisa bicara dengan admin manusia? Saya mau konsultasi langsung.",
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#e8e8eb] rounded-[20px] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0066ff]/10 text-[#0066ff] text-[11.5px] sm:text-[12px] font-bold mb-1">
            <Zap className="w-3.5 h-3.5" />
            <span>Interactive Simulator</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1b1b20]">
            WhatsApp Bot & Pipeline Simulator
          </h1>
          <p className="text-[12.5px] sm:text-[13px] text-[#666666]">
            Uji alur 8-langkah mekanisme bot WhatsApp dan inspeksi output JSON kualifikasi AI secara *real-time*.
          </p>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex items-center bg-white p-1 rounded-[14px] border border-[#e8e8eb] shadow-xs">
        <button
          type="button"
          onClick={() => setSimMobileTab("phone")}
          className={`flex-1 py-2 text-[12px] font-bold rounded-[10px] transition-all flex items-center justify-center gap-1.5 ${
            simMobileTab === "phone"
              ? "bg-[#0066ff] text-white shadow-xs"
              : "text-[#666666] hover:text-[#1b1b20]"
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Chat WhatsApp</span>
        </button>
        <button
          type="button"
          onClick={() => setSimMobileTab("pipeline")}
          className={`flex-1 py-2 text-[12px] font-bold rounded-[10px] transition-all flex items-center justify-center gap-1.5 ${
            simMobileTab === "pipeline"
              ? "bg-[#0066ff] text-white shadow-xs"
              : "text-[#666666] hover:text-[#1b1b20]"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Pipeline (8-Step)</span>
        </button>
        <button
          type="button"
          onClick={() => setSimMobileTab("telemetry")}
          className={`flex-1 py-2 text-[12px] font-bold rounded-[10px] transition-all flex items-center justify-center gap-1.5 ${
            simMobileTab === "telemetry"
              ? "bg-[#0066ff] text-white shadow-xs"
              : "text-[#666666] hover:text-[#1b1b20]"
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Output JSON</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Col: Smartphone WhatsApp Mockup (5 Cols) */}
        <div
          className={`lg:col-span-5 flex-col items-center ${
            simMobileTab === "phone" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Sender Profile Config */}
          <div className="w-full max-w-[340px] sm:max-w-[360px] mb-3 bg-white p-3 rounded-[16px] border border-[#e8e8eb] shadow-xs space-y-2 text-[12px]">
            <div className="flex items-center justify-between">
              <div className="font-bold text-[#1b1b20] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0066ff]" />
                <span>Simulasi Calon Siswa (Sender Profile)</span>
              </div>
              <div className="flex items-center gap-1 text-[10.5px]">
                <button
                  type="button"
                  onClick={() => {
                    setSimPhoneNumber("6281278901234@c.us");
                    setSimSenderName("Elsi (SMAN 1 Bandar Lampung)");
                  }}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                    !simPhoneNumber.includes("@lid")
                      ? "bg-blue-100 text-[#0066ff]"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  Phone Mode
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimPhoneNumber("102938475612345@lid");
                    setSimSenderName("Calon Siswa Baru (WA LID)");
                  }}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                    simPhoneNumber.includes("@lid")
                      ? "bg-amber-100 text-amber-800 font-bold"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  LID Mode
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={simSenderName}
                onChange={(e) => setSimSenderName(e.target.value)}
                placeholder="Nama Siswa"
                className="px-2.5 py-1.5 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[8px] focus:outline-none focus:border-[#0066ff] text-[11.5px]"
              />
              <input
                type="text"
                value={simPhoneNumber}
                onChange={(e) => setSimPhoneNumber(e.target.value)}
                placeholder="628xxx@c.us atau xxx@lid"
                className="px-2.5 py-1.5 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[8px] focus:outline-none focus:border-[#0066ff] font-mono text-[11px]"
              />
            </div>
            {simPhoneNumber.includes("@lid") && (
              <span className="text-[10px] text-amber-700 font-semibold block">
                ⚡ Mode WhatsApp LID Aktif: Nomor HP asli disembunyikan oleh privasi WhatsApp.
              </span>
            )}
          </div>


          {/* Smartphone Frame */}
          <div className="w-full max-w-[340px] sm:max-w-[360px] bg-[#1b1b20] p-2.5 sm:p-3 rounded-[32px] sm:rounded-[36px] shadow-xl border-4 border-gray-800">
            {/* Phone Screen */}
            <div className="bg-[#efeae2] rounded-[24px] sm:rounded-[28px] overflow-hidden flex flex-col h-[480px] sm:h-[520px] relative border border-gray-300">
              {/* WhatsApp Header */}
              <div className="bg-[#008069] text-white p-3 flex items-center justify-between shadow-xs z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-[12px]">
                    LC
                  </div>
                  <div>
                    <div className="font-bold text-[13px] leading-tight">
                      CS Lampung Cerdas
                    </div>
                    <div className="text-[10px] text-white/80">
                      {isTypingState ? "sedang mengetik..." : "online"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Message Bubble Area */}
              <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
                {messages.map((m) => {
                  const isCustomer = m.sender === "customer";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isCustomer ? "items-end" : "items-start"
                        }`}
                    >
                      <div
                        className={`max-w-[85%] p-2.5 rounded-[12px] text-[12.5px] leading-relaxed shadow-xs ${isCustomer
                            ? "bg-[#dcf8c6] text-[#1b1b20] rounded-tr-none"
                            : "bg-white text-[#1b1b20] rounded-tl-none"
                          }`}
                      >
                        <p className="whitespace-pre-wrap">{m.text}</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-500">
                          <span>{m.time}</span>
                          {isCustomer && (
                            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isTypingState && (
                  <div className="flex items-start">
                    <div className="bg-white p-2.5 rounded-[12px] rounded-tl-none shadow-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="bg-[#f0f2f5] p-2 flex items-center gap-2 border-t border-gray-200"
              >
                <input
                  type="text"
                  placeholder="Ketik pesan siswa..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={simulating}
                  className="flex-1 px-3 py-2 bg-white rounded-[20px] text-[12px] focus:outline-none border border-gray-300"
                />
                <button
                  type="submit"
                  disabled={simulating || !inputMessage.trim()}
                  className="w-8 h-8 rounded-full bg-[#008069] text-white flex items-center justify-center disabled:opacity-50 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="w-full max-w-[340px] sm:max-w-[360px] mt-3 space-y-1.5">
            <div className="text-[11px] font-bold text-[#666666] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#0066ff]" />
              <span>Contoh Pertanyaan Cepat:</span>
            </div>
            <div className="space-y-1">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputMessage(p)}
                  className="w-full text-left text-[11px] p-1.5 bg-white rounded-[8px] border border-[#e8e8eb] hover:border-[#0066ff]/40 text-[#1b1b20] truncate transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Live 8-Step Pipeline Tracker & JSON Inspector (7 Cols) */}
        <div
          className={`lg:col-span-7 space-y-4 sm:space-y-5 ${
            simMobileTab !== "phone" ? "block" : "hidden lg:block"
          }`}
        >
          <div
            className={`bg-white border border-[#e8e8eb] rounded-[20px] p-4 sm:p-5 shadow-xs space-y-4 ${
              simMobileTab === "telemetry" ? "hidden lg:block" : "block"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#e8e8eb] pb-3">
              <h2 className="font-bold text-[14px] sm:text-[15px] text-[#1b1b20] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0066ff]" />
                <span>Pelacak Eksekusi 8-Langkah Bot Pipeline</span>
              </h2>
              {simulating && (
                <span className="badge-pill bg-[#0066ff]/10 text-[#0066ff] text-[10.5px] sm:text-[11px] font-bold animate-pulse">
                  Pipeline Berjalan...
                </span>
              )}
            </div>

            {/* Steps Container */}
            <div className="space-y-2.5">
              {pipelineSteps.map((step) => {
                const isRunning = step.status === "running";
                const isSuccess = step.status === "success";
                const isSkipped = step.status === "skipped";

                return (
                  <div
                    key={step.id}
                    className={`p-3 rounded-[14px] border transition-all flex items-start gap-3 ${isRunning
                        ? "bg-[#ebf3ff] border-[#0066ff] shadow-xs"
                        : isSuccess
                          ? "bg-white border-emerald-200"
                          : isSkipped
                            ? "bg-rose-50 border-rose-200"
                            : "bg-[#f6f6f7] border-[#e8e8eb] opacity-70"
                      }`}
                  >
                    <div className="mt-0.5">
                      {isRunning ? (
                        <div className="w-4 h-4 rounded-full border-2 border-[#0066ff] border-t-transparent animate-spin" />
                      ) : isSuccess ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold">
                          {step.id}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-[12.5px]">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-[#1b1b20]">
                          {step.title}
                        </div>
                        {step.status !== "idle" && (
                          <span
                            className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${isSuccess
                                ? "bg-emerald-100 text-emerald-800"
                                : isRunning
                                  ? "bg-[#0066ff] text-white"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                          >
                            {step.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-[#666666] mt-0.5">
                        {step.desc}
                      </p>
                      {step.detail && (
                        <div className="mt-1.5 p-1.5 rounded-[8px] bg-black/5 text-[#1b1b20] font-mono text-[11px] border border-black/5">
                          💡 {step.detail}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* JSON Telemetry Inspector Box */}
          {latestJsonTelemetry ? (
            <div
              className={`bg-[#1b1b20] text-emerald-400 p-4 rounded-[20px] shadow-xs space-y-2 text-[12px] font-mono ${
                simMobileTab === "pipeline" ? "hidden lg:block" : "block"
              }`}
            >
              <div className="flex items-center justify-between text-gray-400 border-b border-gray-700 pb-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#0066ff]" />
                  <span className="text-white font-bold">Output JSON AI Kualifikasi (Real-Time)</span>
                </div>
                <span className="text-emerald-400 font-bold">VALID JSON</span>
              </div>
              <pre className="whitespace-pre-wrap text-[11px] max-h-[220px] overflow-y-auto leading-relaxed">
                {JSON.stringify(latestJsonTelemetry, null, 2)}
              </pre>
            </div>
          ) : simMobileTab === "telemetry" ? (
            <div className="bg-white border border-[#e8e8eb] rounded-[20px] p-8 text-center text-[#666666] text-[13px]">
              Kirim pesan di tab Chat terlebih dahulu untuk melihat output JSON telemetri.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
