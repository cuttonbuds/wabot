"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  MessageSquare,
  Phone,
  School,
  Target,
  Bot,
  User,
  RefreshCw,
  Flame,
  Tag,
  ArrowUpRight,
  CheckCircle2,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  X,
  FileDown,
} from "lucide-react";

const INPUT_CLASS =
  "w-full px-3 py-2 text-[13px] bg-[#f6f6f7] border border-[#e8e8eb] rounded-[10px] text-[#1b1b20] focus:outline-none focus:border-[#0066ff]";
const SELECT_CLASS =
  "px-3 py-2 text-[13px] bg-[#f6f6f7] border border-[#e8e8eb] rounded-[10px] text-[#1b1b20] focus:outline-none focus:border-[#0066ff]";

const LEAD_STAGES = [
  "NEW_LEAD",
  "DISCOVERY",
  "QUALIFIED",
  "CONSULTATION",
  "VALUE_PRESENTED",
  "OFFER",
  "HOT_LEAD",
  "PAYMENT_PENDING",
  "PAID",
];

function stageBadgeClass(stage: string) {
  const s = stage || "NEW_LEAD";
  if (s === "PAYMENT_PENDING" || s === "HOT_LEAD" || s === "OFFER") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (s === "PAID" || s === "QUALIFIED") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (s === "CONSULTATION" || s === "VALUE_PRESENTED") {
    return "bg-[#ebf3ff] text-[#0066ff] border-[#0066ff]/20";
  }
  return "bg-[#f6f6f7] text-[#666666] border-[#e8e8eb]";
}

function TempBadge({ temp }: { temp?: string | null }) {
  const t = temp || "COLD";
  const hot = t === "VERY_HOT" || t === "HOT";
  const warm = t === "WARM";
  const tone = hot
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : warm
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-[#ebf3ff] text-[#0066ff] border-[#0066ff]/20";
  return (
    <span className={`badge-pill border ${tone}`}>
      {hot && <Flame className="w-3 h-3" />}
      {t}
    </span>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[12px] font-medium text-[#666666] block mb-1">{label}</label>
      {children}
      {hint && <span className="text-[12px] text-[#999999] mt-1 block">{hint}</span>}
    </div>
  );
}

function Modal({
  title,
  desc,
  onClose,
  size = "md",
  children,
}: {
  title: string;
  desc?: string;
  onClose: () => void;
  size?: "md" | "lg";
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-3 sm:p-4 z-50">
      <div
        className={`card-rounded shadow-[var(--shadow-modal)] p-4 sm:p-5 w-full max-h-[90vh] overflow-y-auto space-y-4 ${
          size === "lg" ? "max-w-lg" : "max-w-md"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-[#1b1b20]">{title}</h3>
            {desc && <p className="text-[12px] text-[#666666] mt-0.5">{desc}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1.5 -mt-1 rounded-[8px] text-[#666666] hover:bg-[#f6f6f7] shrink-0"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {[0, 1, 2, 3, 4, 5].map((c) => (
            <td key={c} className="py-3.5 px-4">
              <div className="h-4 rounded-[6px] bg-[#f6f6f7] animate-pulse" />
              {c < 4 && <div className="h-3 w-2/3 rounded-[6px] bg-[#f6f6f7] animate-pulse mt-2" />}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState("all");
  const [filterHandling, setFilterHandling] = useState("all");

  // New Lead Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newLid, setNewLid] = useState("");
  const [newName, setNewName] = useState("");
  const [newSchool, setNewSchool] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newStage, setNewStage] = useState("NEW_LEAD");
  const [adding, setAdding] = useState(false);

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<"file" | "paste">("file");
  const [pasteText, setPasteText] = useState("");
  const [parsedContacts, setParsedContacts] = useState<Array<{ name: string; phone: string; valid: boolean }>>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    createdCount: number;
    updatedCount: number;
    total: number;
    errors?: Array<{ index: number; name: string; rawPhone: string; reason: string }>;
  } | null>(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchContacts = async () => {
    try {
      const url = new URL("/api/contacts", window.location.origin);
      if (filterHandling !== "all")
        url.searchParams.set("handlingStatus", filterHandling);
      if (searchQuery) url.searchParams.set("q", searchQuery);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        let list = data.contacts || [];
        if (filterStage !== "all") {
          list = list.filter((c: any) => c.leadStage === filterStage || c.leadStatus === filterStage);
        }
        setContacts(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [filterStage, filterHandling, searchQuery]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim() && !newLid.trim()) return;

    setAdding(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: newPhone.trim() || undefined,
          whatsappLid: newLid.trim() || undefined,
          customerName: newName.trim(),
          schoolOrigin: newSchool.trim(),
          targetCampusMajor: newTarget.trim(),
          leadStatus: "Cold",
          leadStage: newStage,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewPhone("");
        setNewLid("");
        setNewName("");
        setNewSchool("");
        setNewTarget("");
        fetchContacts();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };

  // Helper to format/validate phone number on client
  const formatPhoneClient = (raw: string) => {
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("08")) {
      digits = "62" + digits.slice(1);
    } else if (digits.startsWith("8") && digits.length >= 9 && digits.length <= 13) {
      digits = "62" + digits;
    }
    return digits;
  };

  // Helper to parse CSV / Text lines into [{ name, phone, valid }]
  const parseRawContactsData = (rawText: string) => {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    // Check if first line looks like header
    let startIndex = 0;
    const firstLineLower = lines[0].toLowerCase();
    if (
      firstLineLower.includes("nama") ||
      firstLineLower.includes("name") ||
      firstLineLower.includes("phone") ||
      firstLineLower.includes("nomor") ||
      firstLineLower.includes("hp") ||
      firstLineLower.includes("telepon") ||
      firstLineLower.includes("wa")
    ) {
      startIndex = 1;
    }

    const results: Array<{ name: string; phone: string; valid: boolean }> = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      let parts: string[] = [];
      if (line.includes("\t")) {
        parts = line.split("\t");
      } else if (line.includes(";")) {
        parts = line.split(";");
      } else if (line.includes(",")) {
        parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      } else if (line.includes("|")) {
        parts = line.split("|");
      } else {
        const spaceParts = line.split(/\s+/);
        if (spaceParts.length >= 2) {
          const last = spaceParts[spaceParts.length - 1];
          if (/\d{6,}/.test(last)) {
            parts = [spaceParts.slice(0, -1).join(" "), last];
          } else {
            parts = [spaceParts[0], spaceParts.slice(1).join(" ")];
          }
        } else {
          parts = [line];
        }
      }

      parts = parts.map((p) => p.replace(/^["']|["']$/g, "").trim());

      let name = "";
      let phone = "";

      if (parts.length >= 2) {
        const p0Digits = parts[0].replace(/\D/g, "");
        const p1Digits = parts[1].replace(/\D/g, "");

        if (p1Digits.length >= 8 && p0Digits.length < 8) {
          name = parts[0];
          phone = parts[1];
        } else if (p0Digits.length >= 8 && p1Digits.length < 8) {
          name = parts[1];
          phone = parts[0];
        } else {
          name = parts[0];
          phone = parts[1];
        }
      } else if (parts.length === 1) {
        const digits = parts[0].replace(/\D/g, "");
        if (digits.length >= 8) {
          phone = parts[0];
        } else {
          name = parts[0];
        }
      }

      const cleanPhone = formatPhoneClient(phone);
      const isValid = Boolean(cleanPhone && cleanPhone.length >= 8 && cleanPhone.length <= 20);

      if (name || phone) {
        results.push({
          name,
          phone: cleanPhone || phone,
          valid: isValid,
        });
      }
    }

    return results;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseRawContactsData(text);
        setParsedContacts(parsed);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (text: string) => {
    setPasteText(text);
    setImportResult(null);
    const parsed = parseRawContactsData(text);
    setParsedContacts(parsed);
  };

  const handleDownloadTemplate = () => {
    const csvContent = "nama,nomor_hp\nBudi Santoso,081234567890\nSiti Rahma,628987654321\nAndi Pratama,085712345678\nDewi Lestari,081398765432";
    const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "template_import_kontak.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExecuteImport = async () => {
    const validContacts = parsedContacts.filter((c) => c.valid);
    if (validContacts.length === 0) {
      alert("Tidak ada kontak yang valid untuk diimpor. Harap periksa format nomor telepon.");
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: validContacts }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImportResult(data);
        fetchContacts();
      } else {
        alert(data.error || "Gagal mengimpor kontak");
      }
    } catch (err: any) {
      alert(err.message || "Gagal menghubungi server");
    } finally {
      setImporting(false);
    }
  };

  const handleExportCSV = () => {
    if (contacts.length === 0) {
      alert("Tidak ada data kontak untuk diekspor.");
      return;
    }

    const headers = [
      "Nama Calon Siswa",
      "Nomor WhatsApp",
      "WhatsApp LID",
      "Target Kampus / Jurusan",
      "Asal Sekolah",
      "Lead Stage",
      "Lead Status",
      "Temperature",
      "Score",
      "Persona",
      "Next Action",
      "Handler",
      "Terakhir Interaksi",
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = contacts.map((c) => [
      escapeCsv(c.customerName || "-"),
      escapeCsv(c.phoneNumber ? `+${c.phoneNumber}` : "-"),
      escapeCsv(c.whatsappLid || "-"),
      escapeCsv(c.targetCampusMajor || "-"),
      escapeCsv(c.schoolOrigin || "-"),
      escapeCsv(c.leadStage || c.leadStatus || "NEW_LEAD"),
      escapeCsv(c.leadStatus || "Cold"),
      escapeCsv(c.leadTemperature || "COLD"),
      escapeCsv(c.leadScore || 0),
      escapeCsv(c.persona || "UNKNOWN"),
      escapeCsv(c.nextAction || "-"),
      escapeCsv(c.handlingStatus === "AI_HANDLED" ? "AI Agent" : "Staff Takeover"),
      escapeCsv(c.lastInteractionAt ? new Date(c.lastInteractionAt).toLocaleString("id-ID") : "-"),
    ]);

    const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["﻿" + csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `kontak_crm_lampung_cerdas_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isLidNumber = (num: string | null | undefined) => {
    if (!num) return false;
    const clean = num.replace(/[^0-9]/g, "");
    if (num.toLowerCase().includes("@lid")) return true;
    if (clean.startsWith("628") || clean.startsWith("08")) return clean.length > 13;
    return clean.length >= 14;
  };

  const [syncingLids, setSyncingLids] = useState(false);
  const [syncingSingleId, setSyncingSingleId] = useState<number | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleSyncLids = async (singleContactId?: number) => {
    if (singleContactId) {
      setSyncingSingleId(singleContactId);
    } else {
      setSyncingLids(true);
    }
    setSyncResult(null);

    try {
      const res = await fetch("/api/contacts/sync-lids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(singleContactId ? { contactId: singleContactId } : {}),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.updatedCount > 0) {
          setSyncResult(
            `Sinkronisasi berhasil: ${data.updatedCount} nomor HP asli diperbarui.`
          );
        } else {
          setSyncResult(
            `${data.totalChecked} kontak LID dicek. WAHA belum menerima pemetaan nomor HP untuk kontak ini.`
          );
        }
        fetchContacts();
        setTimeout(() => setSyncResult(null), 6000);
      } else {
        alert(data.error || "Gagal sinkronisasi LID");
      }
    } catch (e: any) {
      alert(e.message || "Gagal menghubungi server");
    } finally {
      setSyncingLids(false);
      setSyncingSingleId(null);
    }
  };

  const validCount = parsedContacts.filter((c) => c.valid).length;
  const invalidCount = parsedContacts.length - validCount;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleExportCSV}
          className="btn-outline !py-1.5 !px-3 !text-[13px]"
          title="Download seluruh data kontak dalam format CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setShowImportModal(true);
            setImportResult(null);
            setParsedContacts([]);
            setPasteText("");
            setFileName("");
          }}
          className="btn-outline !py-1.5 !px-3 !text-[13px]"
          title="Import kontak via file CSV atau tempel teks"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Import</span>
        </button>

        <button
          type="button"
          onClick={() => handleSyncLids()}
          disabled={syncingLids}
          className="btn-outline !py-1.5 !px-3 !text-[13px]"
          title="Tarik nomor HP asli dari WAHA untuk semua kontak LID"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncingLids ? "animate-spin" : ""}`} />
          <span>{syncingLids ? "Sinkronisasi…" : "Sync LID"}</span>
        </button>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary !py-1.5 !px-3 !text-[13px]"
        >
          <Plus className="w-4 h-4" />
          <span>Lead Manual</span>
        </button>
      </div>

      {syncResult && (
        <div className="p-3 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncResult}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="card-rounded p-3 flex flex-col md:flex-row md:items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" />
          <input
            type="text"
            placeholder="Cari nama siswa, nomor WhatsApp, sekolah…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT_CLASS} !pl-9`}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className={`${SELECT_CLASS} shrink-0`}
          >
            <option value="all">Semua Lead Stage</option>
            {LEAD_STAGES.map((s) => (
              <option key={s} value={s}>
                {s === "PAID" ? "PAID (Enrolled)" : s}
              </option>
            ))}
          </select>

          <select
            value={filterHandling}
            onChange={(e) => setFilterHandling(e.target.value)}
            className={`${SELECT_CLASS} shrink-0`}
          >
            <option value="all">Semua Handler</option>
            <option value="AI_HANDLED">Dikelola AI</option>
            <option value="MANUAL_TAKEOVER">Staff CS Takeover</option>
          </select>

          <button
            onClick={fetchContacts}
            className="btn-outline !py-2 !px-2.5 shrink-0"
            title="Muat ulang"
            aria-label="Muat ulang"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="card-rounded overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#f0f0f3]">
          <h2 className="text-[15px] font-semibold text-[#1b1b20]">Daftar Leads</h2>
          {!loading && (
            <span className="text-[12px] text-[#666666] tabular-nums">{contacts.length} kontak</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-[#f6f6f7] border-b border-[#e8e8eb] text-[12px] font-medium text-[#666666]">
                <th className="py-2.5 px-4">Calon Siswa</th>
                <th className="py-2.5 px-4">Target & Sekolah</th>
                <th className="py-2.5 px-4">Kualifikasi</th>
                <th className="py-2.5 px-4">Persona & Next Action</th>
                <th className="py-2.5 px-4">Handler</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f3] text-[13px]">
              {loading ? (
                <SkeletonRows />
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-[13px] text-[#666666]">
                    Belum ada calon siswa yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => {
                  const isPhoneReal = contact.phoneNumber && !isLidNumber(contact.phoneNumber);
                  const displayLid = contact.whatsappLid || (isLidNumber(contact.phoneNumber) ? contact.phoneNumber : null);
                  const isAi = contact.handlingStatus === "AI_HANDLED";
                  const rowSyncing = syncingLids || syncingSingleId === contact.id;

                  return (
                    <tr key={contact.id} className="hover:bg-[#f6f6f7]/60 transition-colors">
                      {/* Calon Siswa & WhatsApp / LID */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-[#1b1b20]">
                          {contact.customerName || "Siswa Tanpa Nama"}
                        </div>
                        <div className="space-y-1 mt-1 text-[12px]">
                          {isPhoneReal && (
                            <div className="flex items-center gap-1.5 text-[#1b1b20]">
                              <Phone className="w-3 h-3 text-[#999999] shrink-0" />
                              <span>+{contact.phoneNumber}</span>
                            </div>
                          )}
                          {displayLid && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-[6px]">
                                LID {displayLid}
                              </span>
                              {!isPhoneReal && (
                                <span className="text-[#999999]">No. HP belum terdata</span>
                              )}
                            </div>
                          )}
                          {!isPhoneReal && !displayLid && (
                            <span className="text-[#999999]">Tidak ada nomor</span>
                          )}
                        </div>
                      </td>

                      {/* Target & Sekolah */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-1.5 text-[#1b1b20]">
                          <Target className="w-3.5 h-3.5 text-[#999999] shrink-0" />
                          <span className="truncate max-w-[200px]">{contact.targetCampusMajor || "-"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[12px] text-[#666666] mt-1">
                          <School className="w-3.5 h-3.5 text-[#999999] shrink-0" />
                          <span className="truncate max-w-[200px]">{contact.schoolOrigin || "-"}</span>
                        </div>
                      </td>

                      {/* Stage, Temperature & Score */}
                      <td className="py-3 px-4 align-top space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`badge-pill border ${stageBadgeClass(contact.leadStage)}`}>
                            {contact.leadStage || contact.leadStatus || "NEW_LEAD"}
                          </span>
                          <TempBadge temp={contact.leadTemperature} />
                        </div>
                        <div className="text-[12px] text-[#666666]">
                          Score <span className="font-semibold text-[#1b1b20] tabular-nums">{contact.leadScore || 0}/100</span>
                        </div>
                      </td>

                      {/* Persona & Next Action */}
                      <td className="py-3 px-4 align-top space-y-1.5">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-[#f6f6f7] border border-[#e8e8eb] text-[12px] font-medium text-[#1b1b20]">
                          <Tag className="w-3 h-3 text-[#999999]" />
                          <span>{contact.persona || "UNKNOWN"}</span>
                        </div>
                        {contact.nextAction && (
                          <div className="text-[12px] text-[#0066ff]">{contact.nextAction}</div>
                        )}
                      </td>

                      {/* Handler */}
                      <td className="py-3 px-4 align-top">
                        <span
                          className={`badge-pill border ${
                            isAi
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {isAi ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          <span>{isAi ? "AI Agent" : "Staff Takeover"}</span>
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isPhoneReal && displayLid && (
                            <button
                              onClick={() => handleSyncLids(contact.id)}
                              disabled={rowSyncing}
                              title="Sinkronisasi nomor HP dari WAHA LID"
                              className="btn-outline !py-1 !px-2.5 !text-[12px]"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${rowSyncing ? "animate-spin" : ""}`} />
                              <span>Sync</span>
                            </button>
                          )}
                          <Link
                            href={`/inbox?contactId=${contact.id}`}
                            className="btn-outline !py-1 !px-2.5 !text-[12px]"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat</span>
                            <ArrowUpRight className="w-3 h-3 text-[#999999]" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <Modal title="Tambah Calon Siswa" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddLead} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nomor HP / WhatsApp" hint="Format: 628xxx">
                <input
                  type="text"
                  placeholder="Contoh: 6281278901234"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="WhatsApp LID (opsional)" hint="Dari webhook WAHA (@lid)">
                <input
                  type="text"
                  placeholder="Contoh: 123456789012345"
                  value={newLid}
                  onChange={(e) => setNewLid(e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
            </div>

            <Field label="Nama Lengkap Siswa">
              <input
                type="text"
                placeholder="Contoh: Rizky Pratama"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Asal Sekolah">
              <input
                type="text"
                placeholder="Contoh: SMAN 1 Bandar Lampung"
                value={newSchool}
                onChange={(e) => setNewSchool(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Target Kampus / Jurusan">
              <input
                type="text"
                placeholder="Contoh: Kedokteran UNILA / IPDN"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Lead Stage Awal">
              <select
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                className={`${SELECT_CLASS} w-full`}
              >
                <option value="NEW_LEAD">NEW_LEAD (Prospek Baru)</option>
                <option value="DISCOVERY">DISCOVERY (Eksplorasi)</option>
                <option value="QUALIFIED">QUALIFIED (Tertarget)</option>
                <option value="CONSULTATION">CONSULTATION (Konsultasi)</option>
                <option value="HOT_LEAD">HOT_LEAD (Minat Tinggi)</option>
              </select>
            </Field>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn-outline !py-2 !px-4 !text-[13px]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={adding || !newPhone.trim()}
                className="btn-primary !py-2 !px-4 !text-[13px]"
              >
                {adding ? "Menyimpan…" : "Simpan Lead"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Import Contacts Modal */}
      {showImportModal && (
        <Modal
          title="Import Kontak"
          desc="Upload file CSV atau tempel teks dari Excel / Google Sheets."
          size="lg"
          onClose={() => setShowImportModal(false)}
        >
          {/* Tab Selector */}
          <div className="flex items-center gap-1 p-1 bg-[#f6f6f7] rounded-[10px]">
            {(
              [
                { key: "file", label: "Upload CSV", icon: FileSpreadsheet },
                { key: "paste", label: "Tempel Teks", icon: FileText },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const active = importTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setImportTab(t.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[13px] font-medium rounded-[8px] transition-colors ${
                    active ? "bg-white text-[#0066ff]" : "text-[#666666] hover:text-[#1b1b20]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {importTab === "file" && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-[#d4d4d8] hover:border-[#0066ff] bg-[#f6f6f7] rounded-[12px] p-6 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-6 h-6 text-[#0066ff] mx-auto mb-2" />
                <div className="text-[13px] font-semibold text-[#1b1b20]">
                  {fileName ? fileName : "Klik untuk memilih file CSV"}
                </div>
                <div className="text-[12px] text-[#666666] mt-1">Format .csv, maks. 2.000 kontak</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#666666]">Belum punya format CSV?</span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1 font-semibold text-[#0066ff] hover:underline"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download template</span>
                </button>
              </div>
            </div>
          )}

          {importTab === "paste" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium text-[#666666]">
                  Satu kontak per baris (nama, nomor HP)
                </label>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-[12px] font-semibold text-[#0066ff] hover:underline inline-flex items-center gap-1"
                >
                  <FileDown className="w-3 h-3" />
                  <span>Template</span>
                </button>
              </div>
              <textarea
                rows={6}
                placeholder={`Contoh format:\nBudi Santoso, 081234567890\nSiti Rahma, 628987654321\nAndi Wijaya, 085712345678`}
                value={pasteText}
                onChange={(e) => handlePasteChange(e.target.value)}
                className={`${INPUT_CLASS} font-mono !text-[12px]`}
              />
              <span className="text-[12px] text-[#999999] block">
                Pemisah boleh koma, titik koma, tab, atau spasi.
              </span>
            </div>
          )}

          {/* Preview Section */}
          {parsedContacts.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-[#f0f0f3]">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold text-[#1b1b20]">
                  Pratinjau ({parsedContacts.length} kontak)
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="badge-pill bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {validCount} valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="badge-pill bg-rose-50 text-rose-700 border border-rose-200">
                      {invalidCount} tidak valid
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-36 overflow-y-auto border border-[#e8e8eb] rounded-[10px] text-[12px]">
                <table className="w-full text-left">
                  <thead className="bg-[#f6f6f7] text-[#666666] font-medium sticky top-0 border-b border-[#e8e8eb]">
                    <tr>
                      <th className="py-1.5 px-3">Nama</th>
                      <th className="py-1.5 px-3">Nomor HP</th>
                      <th className="py-1.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f3]">
                    {parsedContacts.slice(0, 10).map((c, idx) => (
                      <tr key={idx} className={c.valid ? "bg-white" : "bg-rose-50/40"}>
                        <td className="py-1.5 px-3 text-[#1b1b20] truncate max-w-[140px]">
                          {c.name || <span className="text-[#999999]">Tanpa nama</span>}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-[#1b1b20]">
                          {c.phone ? `+${c.phone}` : "-"}
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          {c.valid ? (
                            <span className="text-emerald-700 font-medium">Siap impor</span>
                          ) : (
                            <span className="text-rose-700 font-medium">Nomor tidak valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedContacts.length > 10 && (
                  <div className="p-2 text-center text-[12px] text-[#999999] bg-[#f6f6f7] border-t border-[#e8e8eb]">
                    + {parsedContacts.length - 10} kontak lainnya ikut diproses
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import Result Feedback */}
          {importResult && (
            <div
              className={`p-3 rounded-[12px] border text-[12px] ${
                importResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-[13px]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Import selesai</span>
              </div>
              <div className="mt-1 space-y-0.5 pl-6">
                <div>{importResult.createdCount} kontak baru ditambahkan.</div>
                <div>{importResult.updatedCount} kontak yang sudah ada diperbarui namanya.</div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="text-amber-800">
                    {importResult.errors.length} kontak dilewati karena format nomor tidak valid.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0f0f3]">
            <button
              type="button"
              onClick={() => setShowImportModal(false)}
              className="btn-outline !py-2 !px-4 !text-[13px]"
            >
              {importResult ? "Tutup" : "Batal"}
            </button>

            <button
              type="button"
              disabled={importing || validCount === 0}
              onClick={handleExecuteImport}
              className="btn-primary !py-2 !px-4 !text-[13px]"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses…</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Mulai Import ({validCount})</span>
                </>
              )}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
