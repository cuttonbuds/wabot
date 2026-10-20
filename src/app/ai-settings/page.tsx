"use client";

import { useState, useEffect, useRef } from "react";
import {
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Upload,
  FileCheck,
  FileUp,
} from "lucide-react";

const INPUT_CLASS =
  "w-full px-3 py-2 text-[13px] bg-[#f6f6f7] border border-[#e8e8eb] rounded-[10px] text-[#1b1b20] focus:outline-none focus:border-[#0066ff]";
const LABEL_CLASS = "text-[12px] font-medium text-[#666666] block mb-1";

const PRESETS = [
  { name: "OpenAI", url: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini" },
  { name: "Groq Cloud", url: "https://api.groq.com/openai/v1", defaultModel: "llama-3.3-70b-versatile" },
  { name: "OpenRouter", url: "https://openrouter.ai/api/v1", defaultModel: "openai/gpt-4o-mini" },
  { name: "DeepSeek", url: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat" },
  { name: "Ollama (Lokal)", url: "http://localhost:11434/v1", defaultModel: "llama3" },
];

const CATEGORY_OPTIONS = [
  { value: "Paket_Bimbel", label: "Paket Bimbingan" },
  { value: "Biaya", label: "Biaya & Nomor Rekening" },
  { value: "FAQ", label: "Tanya Jawab (FAQ)" },
  { value: "Beasiswa", label: "Info Beasiswa & Diskon" },
];

function Feedback({
  success,
  title,
  detail,
}: {
  success: boolean;
  title?: string;
  detail?: string;
}) {
  return (
    <div
      className={`p-3 rounded-[12px] border text-[12px] flex items-start gap-2 ${
        success
          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
          : "bg-rose-50 text-rose-800 border-rose-200"
      }`}
    >
      {success ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
      )}
      <div className="min-w-0">
        <div className="font-medium text-[13px]">{title}</div>
        {detail && <div className="mt-0.5">{detail}</div>}
      </div>
    </div>
  );
}

function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS}>
      {CATEGORY_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`rounded-[8px] bg-[#f6f6f7] animate-pulse ${className}`} />;
}

export default function AiSettingsPage() {
  const [config, setConfig] = useState<any>({
    providerBaseUrl: "https://api.openai.com/v1",
    apiKey: "",
    modelName: "gpt-4o-mini",
    temperature: 0.6,
    maxTokens: 600,
    systemPrompt: "",
  });

  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Connection Test & Models State
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success?: boolean;
    message?: string;
    error?: string;
  }>({ tested: false });
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Test Playground State
  const [testQuestion, setTestQuestion] = useState("Berapa biaya paket intensif SNBT dan apakah ada beasiswa?");
  const [testingAiChat, setTestingAiChat] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Document Creation & Upload State
  const [docTab, setDocTab] = useState<"upload" | "manual">("upload");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Paket_Bimbel");
  const [newContent, setNewContent] = useState("");
  const [addingDoc, setAddingDoc] = useState(false);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{
    success?: boolean;
    message?: string;
    wordCount?: number;
    error?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/ai/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/ai/knowledge");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchDocuments();
  }, []);

  // Handle Test Connection & Load Models
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus({ tested: false });

    try {
      const res = await fetch("/api/ai/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerBaseUrl: config.providerBaseUrl,
          apiKey: config.apiKey,
          modelName: config.modelName,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setConnectionStatus({
          tested: true,
          success: true,
          message: data.message || "Koneksi API Key berhasil terhubung!",
        });
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models);
        }
      } else {
        setConnectionStatus({
          tested: true,
          success: false,
          error: data.error || "Gagal terhubung ke provider API.",
        });
      }
    } catch (err: any) {
      setConnectionStatus({
        tested: true,
        success: false,
        error: err.message || "Terjadi kesalahan jaringan.",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Handle Test AI Response Sandbox
  const handleTestChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuestion.trim()) return;

    setTestingAiChat(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/ai/test-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: testQuestion }),
      });

      if (res.ok) {
        const data = await res.json();
        setTestResult(data.result);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setTestingAiChat(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch("/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingConfig(false);
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadFeedback(null);
      // If title is empty, prefill with file name
      if (!newTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setNewTitle(cleanName);
      }
    }
  };

  // Handle File Upload
  const handleUploadFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploadingFile(true);
    setUploadFeedback(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("title", newTitle.trim());
    formData.append("category", newCategory);

    try {
      const res = await fetch("/api/ai/knowledge/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUploadFeedback({
          success: true,
          message: `Dokumen "${data.document.title}" berhasil diekstrak!`,
          wordCount: data.wordCount,
        });
        setSelectedFile(null);
        setNewTitle("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchDocuments();
      } else {
        setUploadFeedback({
          success: false,
          error: data.error || "Gagal mengunggah dan mengekstrak file.",
        });
      }
    } catch (err: any) {
      setUploadFeedback({
        success: false,
        error: err.message || "Terjadi kesalahan jaringan saat mengunggah file.",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle Manual Document Submission
  const handleAddManualDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setAddingDoc(true);
    try {
      const res = await fetch("/api/ai/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory,
          content: newContent.trim(),
        }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewContent("");
        fetchDocuments();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingDoc(false);
    }
  };

  const handleDeleteDoc = async (id: number) => {
    if (!confirm("Hapus dokumen materi ini?")) return;
    try {
      const res = await fetch(`/api/ai/knowledge?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchDocuments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-5">
      {savedSuccess && (
        <div className="p-3 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Pengaturan AI tersimpan.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Left Col: LLM Provider Settings & Sandbox */}
        <div className="space-y-4 sm:space-y-5">
          <form onSubmit={handleSaveConfig} className="card-rounded p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#f0f0f3]">
              <div>
                <h2 className="text-[15px] font-semibold text-[#1b1b20]">Provider LLM</h2>
                <p className="text-[12px] text-[#666666]">Endpoint OpenAI-compatible dan API key milik sendiri</p>
              </div>
              {connectionStatus.tested && (
                <span
                  className={`badge-pill border shrink-0 ${
                    connectionStatus.success
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  {connectionStatus.success ? "Terhubung" : "Gagal koneksi"}
                </span>
              )}
            </div>

            {loadingConfig ? (
              <div className="space-y-4">
                <SkeletonBlock className="h-7 w-2/3" />
                <SkeletonBlock className="h-9" />
                <SkeletonBlock className="h-9" />
                <div className="grid grid-cols-2 gap-3">
                  <SkeletonBlock className="h-9" />
                  <SkeletonBlock className="h-9" />
                </div>
                <SkeletonBlock className="h-32" />
                <SkeletonBlock className="h-10" />
              </div>
            ) : (
              <>
                {/* Quick Provider Presets */}
                <div>
                  <label className={LABEL_CLASS}>Preset provider</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESETS.map((p) => {
                      const active = config.providerBaseUrl === p.url;
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => {
                            setConfig({
                              ...config,
                              providerBaseUrl: p.url,
                              modelName: p.defaultModel,
                            });
                            setConnectionStatus({ tested: false });
                          }}
                          className={`px-2.5 py-1 rounded-[8px] text-[12px] font-medium border transition-colors ${
                            active
                              ? "bg-[#ebf3ff] text-[#0066ff] border-[#0066ff]/30"
                              : "bg-white text-[#1b1b20] border-[#e8e8eb] hover:bg-[#f6f6f7]"
                          }`}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLASS}>API Base URL</label>
                  <input
                    type="text"
                    value={config.providerBaseUrl}
                    onChange={(e) => {
                      setConfig({ ...config, providerBaseUrl: e.target.value });
                      setConnectionStatus({ tested: false });
                    }}
                    placeholder="https://api.openai.com/v1"
                    className={`${INPUT_CLASS} font-mono`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[12px] font-medium text-[#666666]">API Key</label>
                    <span className="text-[12px] text-[#999999]">Dienkripsi saat disimpan</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => {
                        setConfig({ ...config, apiKey: e.target.value });
                        setConnectionStatus({ tested: false });
                      }}
                      placeholder="sk-..."
                      className={`${INPUT_CLASS} font-mono flex-1`}
                    />
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testingConnection || !config.apiKey?.trim()}
                      className="btn-outline !py-2 !px-3 !text-[13px] shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? "animate-spin" : ""}`} />
                      <span>{testingConnection ? "Memeriksa…" : "Cek koneksi & muat model"}</span>
                    </button>
                  </div>

                  {connectionStatus.tested && (
                    <div className="mt-2">
                      <Feedback
                        success={Boolean(connectionStatus.success)}
                        title={connectionStatus.success ? connectionStatus.message : connectionStatus.error}
                      />
                    </div>
                  )}
                </div>

                {/* Model Selection & Temperature */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[12px] font-medium text-[#666666]">Nama model</label>
                      {availableModels.length > 0 && (
                        <span className="text-[12px] text-[#0066ff] tabular-nums">
                          {availableModels.length} model dimuat
                        </span>
                      )}
                    </div>

                    {availableModels.length > 0 ? (
                      <div className="space-y-1.5">
                        <select
                          value={config.modelName}
                          onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                          className={INPUT_CLASS}
                        >
                          {availableModels.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Atau ketik model custom…"
                          value={config.modelName}
                          onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                          className={`${INPUT_CLASS} font-mono !bg-white`}
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={config.modelName}
                        onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                        placeholder="gpt-4o-mini"
                        className={`${INPUT_CLASS} font-mono`}
                      />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[12px] font-medium text-[#666666]">Temperature</label>
                      <span className="text-[12px] font-semibold text-[#1b1b20] tabular-nums">
                        {config.temperature}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.temperature}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          temperature: parseFloat(e.target.value),
                        })
                      }
                      className="w-full mt-2.5 accent-[#0066ff]"
                    />
                    <div className="flex justify-between text-[12px] text-[#999999] mt-1">
                      <span>0 presisi</span>
                      <span>1 kreatif</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLASS}>System prompt (persona konsultan)</label>
                  <textarea
                    rows={6}
                    value={config.systemPrompt}
                    onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                    className={`${INPUT_CLASS} font-mono !text-[12px] leading-relaxed`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingConfig}
                  className="btn-primary w-full !py-2 !text-[13px]"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingConfig ? "Menyimpan…" : "Simpan Pengaturan AI"}</span>
                </button>
              </>
            )}
          </form>

          {/* RAG Sandbox */}
          <section className="card-rounded p-4 sm:p-5 space-y-3">
            <div className="pb-3 border-b border-[#f0f0f3]">
              <h2 className="text-[15px] font-semibold text-[#1b1b20]">Uji Respon AI</h2>
              <p className="text-[12px] text-[#666666]">Simulasikan pertanyaan siswa dengan knowledge base aktif</p>
            </div>

            <form onSubmit={handleTestChat} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={testQuestion}
                onChange={(e) => setTestQuestion(e.target.value)}
                placeholder="Contoh: Berapa biaya paket SNBT dan bagaimana cara daftarnya?"
                className={`${INPUT_CLASS} flex-1`}
              />
              <button
                type="submit"
                disabled={testingAiChat || !testQuestion.trim()}
                className="btn-primary !py-2 !px-3 !text-[13px] shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testingAiChat ? "Menguji…" : "Kirim"}</span>
              </button>
            </form>

            {testingAiChat && (
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-1/2" />
                <SkeletonBlock className="h-16" />
              </div>
            )}

            {testResult && (
              <div className="p-3 rounded-[12px] bg-[#f6f6f7] border border-[#e8e8eb] space-y-2 text-[13px]">
                <div className="flex items-center justify-between gap-2 text-[12px] pb-2 border-b border-[#e8e8eb]">
                  <span className="text-[#666666] truncate">Model {config.modelName}</span>
                  <span className="badge-pill bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                    {testResult.structuredOutput?.lead_stage || "CONSULTATION"}
                  </span>
                </div>
                <p className="text-[#1b1b20] whitespace-pre-wrap leading-relaxed">{testResult.replyMessage}</p>
                {testResult.ragSourcesUsed?.length > 0 && (
                  <div className="text-[12px] text-[#666666] pt-1">
                    Sumber RAG: {testResult.ragSourcesUsed.join(", ")}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Right Col: Knowledge Base */}
        <div className="space-y-4 sm:space-y-5">
          <section className="card-rounded p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#f0f0f3]">
              <div>
                <h2 className="text-[15px] font-semibold text-[#1b1b20]">Tambah Materi</h2>
                <p className="text-[12px] text-[#666666]">Unggah PDF/DOCX/TXT atau ketik manual</p>
              </div>

              <div className="flex bg-[#f6f6f7] p-1 rounded-[10px] text-[12px] font-medium shrink-0">
                {(
                  [
                    { key: "upload", label: "Upload File", icon: Upload },
                    { key: "manual", label: "Ketik Manual", icon: Plus },
                  ] as const
                ).map((t) => {
                  const Icon = t.icon;
                  const active = docTab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setDocTab(t.key)}
                      className={`px-3 py-1 rounded-[8px] transition-colors flex items-center gap-1.5 ${
                        active ? "bg-white text-[#0066ff]" : "text-[#666666] hover:text-[#1b1b20]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {docTab === "upload" ? (
              <form onSubmit={handleUploadFileSubmit} className="space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed rounded-[12px] p-6 text-center cursor-pointer transition-colors ${
                    selectedFile
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-[#d4d4d8] bg-[#f6f6f7] hover:border-[#0066ff]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="space-y-1">
                      <FileCheck className="w-6 h-6 text-emerald-600 mx-auto" />
                      <div className="text-[13px] font-semibold text-[#1b1b20] truncate">{selectedFile.name}</div>
                      <div className="text-[12px] text-[#666666]">
                        {(selectedFile.size / 1024).toFixed(1)} KB · klik untuk mengganti
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <FileUp className="w-6 h-6 text-[#0066ff] mx-auto" />
                      <div className="text-[13px] font-semibold text-[#1b1b20]">Pilih file PDF, DOCX, atau TXT</div>
                      <p className="text-[12px] text-[#666666]">
                        Teks brosur, rincian biaya, atau silabus akan diekstrak ke knowledge base.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLASS}>Judul dokumen</label>
                    <input
                      type="text"
                      placeholder="Contoh: Brosur Program SNBT 2026"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Kategori</label>
                    <CategorySelect value={newCategory} onChange={setNewCategory} />
                  </div>
                </div>

                {uploadFeedback && (
                  <Feedback
                    success={Boolean(uploadFeedback.success)}
                    title={uploadFeedback.success ? uploadFeedback.message : uploadFeedback.error}
                    detail={
                      uploadFeedback.wordCount
                        ? `${uploadFeedback.wordCount} kata dimuat ke knowledge base.`
                        : undefined
                    }
                  />
                )}

                <button
                  type="submit"
                  disabled={uploadingFile || !selectedFile}
                  className="btn-primary w-full !py-2 !text-[13px]"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploadingFile ? "Mengekstrak dokumen…" : "Ekstrak & Simpan"}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleAddManualDoc} className="space-y-3">
                <div>
                  <label className={LABEL_CLASS}>Judul materi / topik</label>
                  <input
                    type="text"
                    placeholder="Contoh: Paket Bimbel UTBK SNBT Gelombang 2"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Kategori</label>
                  <CategorySelect value={newCategory} onChange={setNewCategory} />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Rincian konten</label>
                  <textarea
                    rows={4}
                    placeholder="Tuliskan detail fasilitas, harga, jadwal, syarat pendaftaran…"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <button
                  type="submit"
                  disabled={addingDoc || !newTitle.trim() || !newContent.trim()}
                  className="btn-primary w-full !py-2 !text-[13px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>{addingDoc ? "Menambahkan…" : "Tambah Dokumen"}</span>
                </button>
              </form>
            )}
          </section>

          {/* Document List */}
          <section className="card-rounded p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#f0f0f3]">
              <h2 className="text-[15px] font-semibold text-[#1b1b20]">Knowledge Base Aktif</h2>
              {!loadingDocs && (
                <span className="text-[12px] text-[#666666] tabular-nums">{documents.length} dokumen</span>
              )}
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {loadingDocs ? (
                [0, 1, 2].map((i) => <SkeletonBlock key={i} className="h-16" />)
              ) : documents.length === 0 ? (
                <p className="text-[13px] text-[#666666] py-6 text-center">Belum ada materi. Tambahkan dokumen di atas.</p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-[12px] border border-[#e8e8eb] flex items-start justify-between gap-3 hover:bg-[#f6f6f7]/60 transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="badge-pill bg-[#ebf3ff] text-[#0066ff] shrink-0">{doc.category}</span>
                        <h3 className="text-[13px] font-semibold text-[#1b1b20] truncate">{doc.title}</h3>
                      </div>
                      <p className="text-[12px] text-[#666666] line-clamp-2">{doc.content}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-1.5 rounded-[8px] text-[#999999] hover:text-rose-600 hover:bg-rose-50 shrink-0 transition-colors"
                      title="Hapus dokumen"
                      aria-label="Hapus dokumen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
