"use client";

import { useState, useEffect } from "react";
import {
  Zap,
  Clock,
  Play,
  Plus,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Filter,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

export default function AutomationPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<any>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // New Rule Form
  const [ruleName, setRuleName] = useState("");
  const [targetLeadStatus, setTargetLeadStatus] = useState("Warm");
  const [inactivityHours, setInactivityHours] = useState(3);
  const [promptInstruction, setPromptInstruction] = useState("");
  const [addingRule, setAddingRule] = useState(false);

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/followup/rules");
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggleRule = async (id: number, currentActive: boolean) => {
    try {
      const res = await fetch("/api/followup/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });
      if (res.ok) {
        fetchRules();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim() || !promptInstruction.trim()) return;

    setAddingRule(true);
    try {
      const res = await fetch("/api/followup/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleName: ruleName.trim(),
          targetLeadStatus,
          inactivityHours,
          aiPromptInstruction: promptInstruction.trim(),
        }),
      });

      if (res.ok) {
        setRuleName("");
        setPromptInstruction("");
        fetchRules();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingRule(false);
    }
  };

  const handleTriggerScanner = async () => {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const res = await fetch("/api/followup/trigger", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setTriggerResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#e8e8eb] rounded-[20px] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-[11.5px] sm:text-[12px] font-bold mb-1">
            <Zap className="w-3.5 h-3.5" />
            <span>Edu-Sales Automation Sequence</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1b1b20]">
            Automated Follow-Up Prospek Siswa
          </h1>
          <p className="text-[12.5px] sm:text-[13px] text-[#666666]">
            Kirimkan follow-up personal secara otomatis saat calon siswa pasif tanpa risiko terkena blokir nomor.
          </p>
        </div>

        <button
          onClick={handleTriggerScanner}
          disabled={triggering}
          className="btn-primary !py-2 !px-4 !text-[12.5px] sm:!text-[13px] w-full sm:w-auto justify-center shrink-0"
        >
          <Play className="w-4 h-4" />
          <span>{triggering ? "Memindai Prospek..." : "Jalankan Scanner Follow-Up"}</span>
        </button>
      </div>

      {/* Trigger Notification Result */}
      {triggerResult && (
        <div className="p-3.5 sm:p-4 rounded-[16px] bg-emerald-50 border border-emerald-200 text-emerald-900 text-[12.5px] sm:text-[13px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              <strong>Scanner Berhasil:</strong> Memproses {triggerResult.processedCount} prospek siswa tidak aktif sesuai aturan.
            </span>
          </div>
          <span className="font-bold text-emerald-800 text-[11px] sm:text-[12px] shrink-0">
            Status: TERKIRIM VIA QUEUE
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Col: Rules List (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-[#e8e8eb] rounded-[20px] p-5 shadow-xs">
            <h2 className="font-bold text-[15px] text-[#1b1b20] mb-3 flex items-center gap-2 border-b border-[#e8e8eb] pb-3">
              <Clock className="w-4 h-4 text-[#0066ff]" />
              <span>Daftar Aturan Follow-Up Aktif ({rules.length})</span>
            </h2>

            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-[16px] border transition-all ${
                    rule.isActive
                      ? "bg-white border-[#e8e8eb] shadow-xs"
                      : "bg-[#f6f6f7] border-[#e8e8eb] opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full ${
                            rule.targetLeadStatus === "Hot"
                              ? "bg-rose-100 text-rose-700"
                              : rule.targetLeadStatus === "Warm"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          Target: {rule.targetLeadStatus}
                        </span>
                        <span className="text-[11px] text-[#666666] font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#0066ff]" />
                          Inaktif &gt; {rule.inactivityHours} Jam
                        </span>
                      </div>
                      <h3 className="font-bold text-[14px] text-[#1b1b20] mt-1">
                        {rule.ruleName}
                      </h3>
                    </div>

                    <button
                      onClick={() => handleToggleRule(rule.id, rule.isActive)}
                      className="text-[#0066ff] hover:opacity-80 p-1"
                      title="Aktifkan/Nonaktifkan"
                    >
                      {rule.isActive ? (
                        <ToggleRight className="w-7 h-7 text-[#0066ff]" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-gray-400" />
                      )}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-[10px] bg-[#f6f6f7] text-[12px] text-[#1b1b20] leading-relaxed">
                    <span className="font-bold text-[#666666] block text-[10.5px] uppercase mb-0.5">
                      Instruksi Copywriting AI:
                    </span>
                    {rule.aiPromptInstruction}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Add New Rule & Anti-Ban Guide (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Add Rule Form */}
          <form
            onSubmit={handleAddRule}
            className="bg-white border border-[#e8e8eb] rounded-[20px] p-5 shadow-xs space-y-4"
          >
            <h3 className="font-bold text-[14.5px] text-[#1b1b20] flex items-center gap-2 border-b border-[#e8e8eb] pb-3">
              <Plus className="w-4 h-4 text-[#0066ff]" />
              <span>Buat Aturan Follow-Up Baru</span>
            </h3>

            <div className="space-y-3 text-[13px]">
              <div>
                <label className="font-bold text-[#1b1b20] block mb-1">
                  Nama Aturan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Follow Up 6 Jam Calon Siswa SNBT"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[10px] focus:border-[#0066ff] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1b1b20] block mb-1">
                    Target Stage
                  </label>
                  <select
                    value={targetLeadStatus}
                    onChange={(e) => setTargetLeadStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[10px] font-semibold text-[#1b1b20] focus:outline-none"
                  >
                    <option value="Cold">Cold</option>
                    <option value="Warm">Warm</option>
                    <option value="Hot">Hot</option>
                    <option value="Pending_Payment">Pending Payment</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1b1b20] block mb-1">
                    Jeda Inaktif (Jam)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={inactivityHours}
                    onChange={(e) => setInactivityHours(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[10px] font-semibold text-[#1b1b20] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1b1b20] block mb-1">
                  Instruksi Gaya Pesan Follow-Up AI
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Tanyakan kesiapan berkas pendaftaran dan tawarkan slot konsultasi gratis..."
                  value={promptInstruction}
                  onChange={(e) => setPromptInstruction(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[10px] focus:border-[#0066ff] focus:outline-none text-[12.5px]"
                />
              </div>

              <button
                type="submit"
                disabled={addingRule || !ruleName.trim() || !promptInstruction.trim()}
                className="btn-primary w-full !text-[13px]"
              >
                <Plus className="w-4 h-4" />
                <span>{addingRule ? "Menyimpan..." : "Simpan Aturan Follow-Up"}</span>
              </button>
            </div>
          </form>

          {/* Anti-Ban Protection Card */}
          <div className="bg-white border border-[#e8e8eb] rounded-[20px] p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-[14px] text-[#1b1b20] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Mekanisme Anti-Ban Guardrail</span>
            </h3>
            <ul className="space-y-2 text-[12px] text-[#666666]">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0066ff] mt-1.5 shrink-0" />
                <span><strong>Random Micro Delay:</strong> Jeda acak antar pengiriman pesan agar mirip interaksi manusia alami.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0066ff] mt-1.5 shrink-0" />
                <span><strong>Dynamic AI Copywriting:</strong> Setiap teks pesan follow-up disusun unik berbasis nama dan histori siswa, menghindari template spam berulang.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0066ff] mt-1.5 shrink-0" />
                <span><strong>Opt-Out Guardrail:</strong> Otomatis menonaktifkan follow-up jika siswa dialihkan ke Manual Takeover.</span>
              </li>
            </ul>
          </div>

          {/* Cron Trigger Webhook URL Card */}
          <div className="bg-white border border-[#e8e8eb] rounded-[20px] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[14px] text-[#1b1b20] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#0066ff]" />
                <span>Cron Job Webhook URL</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                GET / POST
              </span>
            </div>
            <p className="text-[12px] text-[#666666]">
              Pasang URL ini pada cron job eksternal (misal: <strong>cron-job.org</strong>, <strong>EasyCron</strong>, atau <strong>Netlify Scheduled Functions</strong>) untuk menjalankan auto follow-up berkala (misal: tiap 15 atau 30 menit).
              Ganti <code>&lt;CRON_SECRET&gt;</code> dengan nilai environment variable <code>CRON_SECRET</code> di server Anda. Secret tidak pernah ditampilkan di halaman ini.
            </p>

            <div className="p-2.5 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[12px] flex items-center justify-between gap-2">
              <code className="text-[11px] font-mono text-[#0066ff] truncate select-all">
                https://botlc.netlify.app/api/followup/trigger?secret=&lt;CRON_SECRET&gt;
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    "https://botlc.netlify.app/api/followup/trigger?secret=<CRON_SECRET>"
                  );
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2500);
                }}
                className="p-1.5 text-gray-500 hover:text-[#0066ff] bg-white border border-[#e8e8eb] rounded-[8px] shrink-0 transition-colors shadow-2xs"
                title="Salin Webhook URL"
              >
                {copiedUrl ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
