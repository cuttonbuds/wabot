"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Megaphone,
  Users,
  Send,
  RefreshCw,
  Search,
  CheckCircle2,
  Check,
  Eye,
  Trash2,
  AlertTriangle,
  X,
  ExternalLink,
  Plus,
} from "lucide-react";

interface GroupItem {
  id: string;
  name: string;
  participantsCount?: number;
  pictureUrl?: string | null;
  desc?: string | null;
  isCommunity?: boolean;
}

interface CampaignRecord {
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
}

interface CampaignDetail extends CampaignRecord {
  logs?: Array<{
    id: number;
    campaignId: number;
    groupJid: string;
    groupName: string | null;
    status: "SENT" | "FAILED";
    errorMessage: string | null;
    sentAt: string;
  }>;
}

const INPUT_CLASS =
  "w-full px-3 py-2 text-[13px] bg-[#f6f6f7] border border-[#e8e8eb] rounded-[10px] text-[#1b1b20] focus:outline-none focus:border-[#0066ff]";
const LABEL_CLASS = "text-[12px] font-medium text-[#666666] block mb-1";

const TEMPLATES = [
  {
    title: "Pengumuman Webinar",
    content: `Halo Sobat Cerdas semua! 🌟\n\nKabar gembira! Lampung Cerdas akan mengadakan Webinar Eksklusif: "Bedah Strategi Lolos SNBP & SNBT 2025" bersama Mentor Berpengalaman.\n\n📅 Waktu: Sabtu Ini, Pukul 19.30 WIB\n📍 Live via Zoom Meeting (Gratis!)\n\nSlot terbatas khusus untuk member grup ini. Daftar sekarang dengan balas chat ini atau klik link pendaftaran berikut ya! Semangat meraih kampus impian! 🚀`,
  },
  {
    title: "Info Tryout Akbar",
    content: `PENGUMUMAN TRYOUT AKBAR NASIONAL 📝✨\n\nUntuk seluruh Sobat Cerdas yang sedang mempersiapkan diri menuju kampus impian, Tryout Akbar Gelombang ke-2 sudah dibuka!\n\nFitur & Benefit:\n✅ Soal terupdate sesuai kisi-kisi terbaru\n✅ Sistem IRT Nasional & Rasionalisasi Jurusan\n✅ Pembahasan lengkap video & PDF\n\nYuk ikutan dan ukur kesiapanmu sekarang. Hubungi admin atau pantau link pendaftaran di bio ya! 🎓`,
  },
  {
    title: "Reminder Kuota Bimbingan",
    content: `Halo semuanya! ✨\n\nSekadar mengingatkan bahwa kuota pendaftaran Bimbingan Intensif Lampung Cerdas Gelombang Early Bird tersisa beberapa seat lagi untuk bulan ini.\n\nDapatkan pendampingan mentor 1-on-1, bank soal ribuan, dan jaminan evaluasi belajar berkala.\n\nJangan sampai ketinggalan ya Sobat! Silakan chat admin untuk klaim promo khusus grup ini 😊`,
  },
];

function StatusPill({ tone, children }: { tone: "ok" | "warn" | "bad"; children: React.ReactNode }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "warn"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-rose-50 text-rose-700 border-rose-200";
  return <span className={`badge-pill border ${cls}`}>{children}</span>;
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
  size?: "md" | "xl";
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-3 sm:p-4 z-50">
      <div
        className={`card-rounded shadow-[var(--shadow-modal)] p-4 sm:p-5 w-full max-h-[90vh] flex flex-col gap-4 ${
          size === "xl" ? "max-w-2xl" : "max-w-md"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-[#1b1b20] truncate">{title}</h3>
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

function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-[10px] bg-[#f6f6f7] animate-pulse" />
      ))}
    </div>
  );
}

export default function BroadcastPage() {
  // Session State
  const [sessionId, setSessionId] = useState<string>("");
  const [availableSessions, setAvailableSessions] = useState<
    Array<{ id: string; sessionName: string; status: string }>
  >([]);

  // Groups & Pagination State
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJids, setSelectedJids] = useState<Set<string>>(new Set());
  const [selectedGroupsMeta, setSelectedGroupsMeta] = useState<Record<string, { id: string; name: string }>>({});

  // Pagination parameters (sortOrder, limit, offset)
  const [limit, setLimit] = useState<number>(25);
  const [offset, setOffset] = useState<number>(0);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Manual Group Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualJid, setManualJid] = useState("");
  const [manualName, setManualName] = useState("");

  // Form State
  const [campaignTitle, setCampaignTitle] = useState("");
  const [message, setMessage] = useState("");
  const [delaySeconds, setDelaySeconds] = useState<number>(3);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  // History State
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedCampaignDetail, setSelectedCampaignDetail] = useState<CampaignDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch groups from API with pagination & session
  const fetchGroups = async (
    customSession?: string,
    customOffset?: number,
    customLimit?: number,
    customSort?: "desc" | "asc"
  ) => {
    setLoadingGroups(true);
    setGroupsError(null);
    const targetSession = (customSession !== undefined ? customSession : sessionId).trim();
    const curOffset = customOffset !== undefined ? customOffset : offset;
    const curLimit = customLimit !== undefined ? customLimit : limit;
    const curSort = customSort !== undefined ? customSort : sortOrder;

    try {
      const params = new URLSearchParams();
      if (targetSession) params.set("session", targetSession);
      params.set("limit", String(curLimit));
      params.set("offset", String(curOffset));
      params.set("sortOrder", curSort);

      const res = await fetch(`/api/broadcast/groups?${params.toString()}`);
      const data = await res.json();

      if (data.sessions && Array.isArray(data.sessions)) {
        setAvailableSessions(data.sessions);
      }
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      if (res.ok && data.success) {
        setGroups(data.groups || []);
      } else {
        setGroupsError(data.error || "Gagal memuat daftar grup WhatsApp.");
      }
    } catch (err: any) {
      setGroupsError(err.message || "Gagal menghubungi server");
    } finally {
      setLoadingGroups(false);
    }
  };

  // Pagination navigation helpers
  const handleNextPage = () => {
    const nextOffset = offset + limit;
    setOffset(nextOffset);
    fetchGroups(sessionId, nextOffset, limit, sortOrder);
  };

  const handlePrevPage = () => {
    const prevOffset = Math.max(0, offset - limit);
    setOffset(prevOffset);
    fetchGroups(sessionId, prevOffset, limit, sortOrder);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setOffset(0);
    fetchGroups(sessionId, 0, newLimit, sortOrder);
  };

  const handleSortChange = (newSort: "desc" | "asc") => {
    setSortOrder(newSort);
    setOffset(0);
    fetchGroups(sessionId, 0, limit, newSort);
  };

  // Fetch campaign history
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/broadcast/history");
      const data = await res.json();
      if (res.ok && data.success) {
        setCampaigns(data.campaigns || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchHistory();
  }, []);

  // Filtered groups by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.id.toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  // Toggle selection
  const toggleGroup = (group: GroupItem) => {
    const next = new Set(selectedJids);
    const nextMeta = { ...selectedGroupsMeta };
    if (next.has(group.id)) {
      next.delete(group.id);
      delete nextMeta[group.id];
    } else {
      next.add(group.id);
      nextMeta[group.id] = { id: group.id, name: group.name };
    }
    setSelectedJids(next);
    setSelectedGroupsMeta(nextMeta);
  };

  const handleSelectAll = () => {
    const allFilteredSelected =
      filteredGroups.length > 0 && filteredGroups.every((g) => selectedJids.has(g.id));
    const next = new Set(selectedJids);
    const nextMeta = { ...selectedGroupsMeta };

    if (allFilteredSelected) {
      filteredGroups.forEach((g) => {
        next.delete(g.id);
        delete nextMeta[g.id];
      });
    } else {
      filteredGroups.forEach((g) => {
        next.add(g.id);
        nextMeta[g.id] = { id: g.id, name: g.name };
      });
    }
    setSelectedJids(next);
    setSelectedGroupsMeta(nextMeta);
  };

  // Add manual group to list
  const handleAddManualGroup = (e: React.FormEvent) => {
    e.preventDefault();
    let clean = manualJid.trim();
    if (!clean) return;

    if (!clean.includes("@")) {
      clean = `${clean}@g.us`;
    }

    const newGroup: GroupItem = {
      id: clean,
      name: manualName.trim() || `Grup Manual (${clean.slice(0, 10)})`,
      participantsCount: 0,
    };

    setGroups((prev) => {
      if (prev.some((g) => g.id === clean)) return prev;
      return [newGroup, ...prev];
    });

    // Auto select
    setSelectedJids((prev) => new Set(prev).add(clean));
    setSelectedGroupsMeta((prev) => ({
      ...prev,
      [clean]: { id: clean, name: newGroup.name },
    }));

    setManualJid("");
    setManualName("");
    setShowManualModal(false);
  };

  // View campaign detail
  const handleViewDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/broadcast/history?id=${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedCampaignDetail(data.campaign);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Delete campaign
  const handleDeleteCampaign = async (id: number) => {
    if (!confirm("Hapus catatan riwayat broadcast ini?")) return;
    try {
      const res = await fetch(`/api/broadcast/history?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchHistory();
        if (selectedCampaignDetail?.id === id) {
          setSelectedCampaignDetail(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Send Broadcast
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedJids.size === 0) {
      alert("Silakan pilih minimal 1 grup WhatsApp tujuan.");
      return;
    }
    if (!message.trim()) {
      alert("Tuliskan pesan yang akan dibroadcast.");
      return;
    }

    const groupJidArray = Array.from(selectedJids);
    const groupNameMap: Record<string, string> = {};
    groupJidArray.forEach((jid) => {
      groupNameMap[jid] =
        selectedGroupsMeta[jid]?.name ||
        groups.find((g) => g.id === jid)?.name ||
        "Grup WhatsApp";
    });

    const isConfirmed = confirm(
      `Konfirmasi pengiriman:\n` +
      `Sesi WhatsApp: ${sessionId}\n` +
      `Pesan akan dikirim ke ${groupJidArray.length} grup WhatsApp terpilih dengan jeda aman ${delaySeconds} detik.\n\n` +
      `Lanjutkan pengiriman?`
    );
    if (!isConfirmed) return;

    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/broadcast/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: campaignTitle.trim() || undefined,
          message: message.trim(),
          groupJids: groupJidArray,
          groupNames: groupNameMap,
          delaySeconds,
          sessionId: sessionId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSendResult(data);
        setMessage("");
        setCampaignTitle("");
        fetchHistory();
      } else {
        alert(data.error || "Gagal mengirim broadcast.");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan koneksi saat mengirim broadcast.");
    } finally {
      setSending(false);
    }
  };

  const allFilteredSelected =
    filteredGroups.length > 0 && filteredGroups.every((g) => selectedJids.has(g.id));
  const canSend = !sending && selectedJids.size > 0 && message.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* Session selector + actions */}
      <div className="card-rounded p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-[#1b1b20]">Sesi WhatsApp</h2>
          <p className="text-[12px] text-[#666666]">
            Grup diambil dari sesi WAHA yang dipilih.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {availableSessions.length > 0 && (
            <select
              value={sessionId}
              onChange={(e) => {
                setSessionId(e.target.value);
                fetchGroups(e.target.value);
              }}
              className="px-3 py-2 text-[13px] bg-[#f6f6f7] border border-[#e8e8eb] rounded-[10px] text-[#1b1b20] focus:outline-none focus:border-[#0066ff]"
            >
              {availableSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sessionName} · {s.status}
                </option>
              ))}
            </select>
          )}

          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="ID sesi, contoh: bot"
            className="px-3 py-2 text-[13px] bg-[#f6f6f7] border border-[#e8e8eb] rounded-[10px] text-[#1b1b20] font-mono focus:outline-none focus:border-[#0066ff] w-36 sm:w-44"
          />
          <button
            type="button"
            onClick={() => fetchGroups(sessionId)}
            disabled={loadingGroups || !sessionId.trim()}
            className="btn-outline !py-2 !px-3 !text-[13px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingGroups ? "animate-spin" : ""}`} />
            <span>{loadingGroups ? "Memuat…" : "Muat Grup"}</span>
          </button>
          <Link href="/gateway" className="btn-outline !py-2 !px-3 !text-[13px]">
            <span>Gateway</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#999999]" />
          </Link>
        </div>
      </div>

      {/* Success Notification Result */}
      {sendResult && (
        <div className="p-3 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-900 text-[13px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Broadcast selesai. Berhasil {sendResult.successCount} grup, gagal {sendResult.failedCount} grup
              dari {sendResult.totalGroups}.
            </span>
          </div>
          <button
            onClick={() => setSendResult(null)}
            className="text-[12px] font-semibold text-emerald-700 hover:underline shrink-0 text-left"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Two Column Layout: Left (Group Selection) & Right (Compose Broadcast) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Left Column: Group Selection */}
        <section className="lg:col-span-5 card-rounded p-4 sm:p-5 flex flex-col lg:h-[700px]">
          <div className="space-y-3 pb-3 border-b border-[#f0f0f3]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-[#1b1b20]">Pilih Grup Target</h2>
              <span className="text-[12px] text-[#666666] tabular-nums">
                {selectedJids.size} dari {groups.length} dipilih
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" />
                <input
                  type="text"
                  placeholder="Cari nama grup…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${INPUT_CLASS} !pl-9`}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(true)}
                className="btn-outline !py-2 !px-3 !text-[13px] shrink-0"
                title="Tambah ID grup manual"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Manual</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[12px]">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[#0066ff] font-semibold hover:underline"
              >
                {allFilteredSelected ? "Batal pilih semua" : "Pilih semua di daftar"}
              </button>
              <span className="text-[#999999] tabular-nums">{filteredGroups.length} grup ditampilkan</span>
            </div>
          </div>

          {/* Groups Scroll List */}
          <div className="flex-1 overflow-y-auto pr-1 mt-2 space-y-1 min-h-[240px]">
            {loadingGroups ? (
              <SkeletonList />
            ) : groupsError ? (
              <div className="py-6 px-3 text-center bg-amber-50 rounded-[12px] border border-amber-200 mt-1">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                <p className="text-[13px] font-semibold text-[#1b1b20] mb-1">Gagal mengambil grup</p>
                <p className="text-[12px] text-[#666666] mb-3 leading-relaxed">{groupsError}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Link href="/gateway" className="btn-primary !py-1.5 !px-3 !text-[12px]">
                    <span>Buka WA Gateway</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <button
                    onClick={() => setShowManualModal(true)}
                    className="btn-outline !py-1.5 !px-3 !text-[12px]"
                  >
                    Tambah JID manual
                  </button>
                </div>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="py-12 text-center text-[13px] text-[#666666]">
                <Users className="w-6 h-6 mx-auto mb-2 text-[#d4d4d8]" />
                <p className="mb-3">Belum ada grup yang terdeteksi pada sesi ini.</p>
                <button
                  onClick={() => setShowManualModal(true)}
                  className="btn-outline !py-1.5 !px-3 !text-[12px]"
                >
                  Tambah grup manual (@g.us)
                </button>
              </div>
            ) : (
              filteredGroups.map((g) => {
                const isSelected = selectedJids.has(g.id);
                return (
                  <div
                    key={g.id}
                    onClick={() => toggleGroup(g)}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-[10px] cursor-pointer select-none border transition-colors ${
                      isSelected
                        ? "bg-[#ebf3ff] border-[#0066ff]/20"
                        : "hover:bg-[#f6f6f7] border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-[#0066ff] border-[#0066ff] text-white"
                            : "border-[#d4d4d8] bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#1b1b20] truncate">{g.name}</p>
                        <p className="text-[12px] text-[#999999] truncate">{g.id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-[12px]">
                      {g.isCommunity && (
                        <span className="px-1.5 py-0.5 rounded-[6px] bg-violet-50 text-violet-700 font-medium">
                          Komunitas
                        </span>
                      )}
                      {typeof g.participantsCount === "number" && g.participantsCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-[6px] bg-[#f6f6f7] text-[#666666] tabular-nums">
                          {g.participantsCount} member
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls Bar */}
          <div className="pt-3 mt-2 border-t border-[#f0f0f3] flex items-center justify-between gap-2 text-[12px] text-[#666666]">
            <span className="tabular-nums">
              Hal {Math.floor(offset / limit) + 1} · {groups.length} grup
            </span>

            <div className="flex items-center gap-1.5">
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="px-2 py-1 rounded-[8px] bg-[#f6f6f7] border border-[#e8e8eb] text-[12px] text-[#1b1b20] focus:outline-none"
                title="Jumlah per halaman"
              >
                <option value={10}>10 / hal</option>
                <option value={25}>25 / hal</option>
                <option value={50}>50 / hal</option>
                <option value={100}>100 / hal</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => handleSortChange(e.target.value as "desc" | "asc")}
                className="px-2 py-1 rounded-[8px] bg-[#f6f6f7] border border-[#e8e8eb] text-[12px] text-[#1b1b20] focus:outline-none"
                title="Urutan"
              >
                <option value="desc">Terbaru</option>
                <option value="asc">Terlama</option>
              </select>
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={offset === 0 || loadingGroups}
                className="btn-outline !py-1 !px-2.5 !text-[12px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={groups.length < limit || loadingGroups}
                className="btn-outline !py-1 !px-2.5 !text-[12px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>

          {/* Jeda Settings Footer */}
          <div className="pt-3 border-t border-[#f0f0f3] mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-[#666666]">Jeda antar grup</label>
              <span className="text-[12px] font-semibold text-[#1b1b20] tabular-nums">{delaySeconds} detik</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Number(e.target.value))}
              className="w-full accent-[#0066ff] cursor-pointer"
            />
            <p className="text-[12px] text-[#999999]">Rekomendasi 3–5 detik agar akun bot aman dari blokir.</p>
          </div>
        </section>

        {/* Right Column: Compose & Preview */}
        <form
          onSubmit={handleSendBroadcast}
          className="lg:col-span-7 card-rounded p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#f0f0f3]">
            <h2 className="text-[15px] font-semibold text-[#1b1b20]">Tulis Pesan Broadcast</h2>
            <span className="text-[12px] text-[#999999]">Format: *tebal*, _miring_</span>
          </div>

          <div>
            <label className={LABEL_CLASS}>Judul kampanye (internal)</label>
            <input
              type="text"
              placeholder="Contoh: Promo Flash Sale Bimbingan SNBT Gelombang 2"
              value={campaignTitle}
              onChange={(e) => setCampaignTitle(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Template cepat</label>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.title}
                  type="button"
                  onClick={() => {
                    setMessage(tmpl.content);
                    setCampaignTitle(tmpl.title);
                  }}
                  className="btn-outline !py-1 !px-2.5 !text-[12px]"
                >
                  {tmpl.title}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[12px] font-medium text-[#666666]">Isi pesan WhatsApp</label>
              <span className="text-[12px] text-[#999999] tabular-nums">{message.length} karakter</span>
            </div>
            <textarea
              rows={9}
              placeholder="Ketik pesan yang ingin dibroadcast ke seluruh grup terpilih…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`${INPUT_CLASS} leading-relaxed`}
              required
            />
          </div>

          {message.trim() && (
            <div className="p-3 rounded-[12px] bg-[#f6f6f7] border border-[#e8e8eb] space-y-1.5">
              <div className="text-[12px] text-[#666666]">Pratinjau di grup WhatsApp</div>
              <div className="bg-white p-3 rounded-[10px] rounded-tl-none border border-[#e8e8eb] text-[13px] whitespace-pre-wrap text-[#1b1b20] leading-relaxed max-w-[90%]">
                {message}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-[#f0f0f3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[12px] text-[#666666]">
              Sesi <span className="font-semibold text-[#1b1b20]">{sessionId || "-"}</span> · Target{" "}
              <span className="font-semibold text-[#1b1b20] tabular-nums">{selectedJids.size} grup</span>
            </div>

            <button
              type="submit"
              disabled={!canSend}
              className="btn-primary !py-2 !px-4 !text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {sending
                  ? `Mengirim ke ${selectedJids.size} grup…`
                  : `Kirim Broadcast (${selectedJids.size})`}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* History & Logs Section */}
      <section className="card-rounded p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#f0f0f3]">
          <h2 className="text-[15px] font-semibold text-[#1b1b20]">Riwayat Broadcast</h2>
          <button
            onClick={fetchHistory}
            disabled={loadingHistory}
            className="text-[12px] font-semibold text-[#0066ff] hover:underline inline-flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${loadingHistory ? "animate-spin" : ""}`} />
            Segarkan
          </button>
        </div>

        {loadingHistory ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded-[8px] bg-[#f6f6f7] animate-pulse" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-[#666666]">
            <Megaphone className="w-6 h-6 mx-auto mb-2 text-[#d4d4d8]" />
            <p>Belum ada riwayat broadcast.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] min-w-[640px]">
              <thead>
                <tr className="bg-[#f6f6f7] text-[12px] font-medium text-[#666666]">
                  <th className="py-2.5 px-3 rounded-l-[8px]">Waktu</th>
                  <th className="py-2.5 px-3">Judul</th>
                  <th className="py-2.5 px-3">Pesan</th>
                  <th className="py-2.5 px-3 text-center">Grup</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right rounded-r-[8px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f3]">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f6f6f7]/60 transition-colors">
                    <td className="py-2.5 px-3 text-[12px] text-[#666666] whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#1b1b20]">{c.title}</td>
                    <td className="py-2.5 px-3 text-[#666666] max-w-xs truncate">{c.message}</td>
                    <td className="py-2.5 px-3 text-center tabular-nums">
                      <span className="text-emerald-700 font-semibold">{c.successCount}</span>
                      <span className="text-[#999999]"> / {c.totalGroups}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusPill
                        tone={c.status === "COMPLETED" ? "ok" : c.status === "PARTIAL" ? "warn" : "bad"}
                      >
                        {c.status}
                      </StatusPill>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewDetail(c.id)}
                          disabled={loadingDetail}
                          className="btn-outline !py-1 !px-2.5 !text-[12px]"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Rincian</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(c.id)}
                          className="p-1.5 rounded-[8px] text-[#999999] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus riwayat"
                          aria-label="Hapus riwayat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Manual Add Group Modal */}
      {showManualModal && (
        <Modal title="Tambah Grup Manual" onClose={() => setShowManualModal(false)}>
          <form onSubmit={handleAddManualGroup} className="space-y-3">
            <div>
              <label className={LABEL_CLASS}>Group JID / Chat ID</label>
              <input
                type="text"
                placeholder="Contoh: 120363024840809228@g.us"
                value={manualJid}
                onChange={(e) => setManualJid(e.target.value)}
                className={`${INPUT_CLASS} font-mono`}
                required
              />
              <p className="text-[12px] text-[#999999] mt-1">JID grup WhatsApp berakhiran @g.us</p>
            </div>

            <div>
              <label className={LABEL_CLASS}>Nama label grup (opsional)</label>
              <input
                type="text"
                placeholder="Contoh: Komunitas Pejuang PTN 2025"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#f0f0f3]">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="btn-outline !py-2 !px-4 !text-[13px]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!manualJid.trim()}
                className="btn-primary !py-2 !px-4 !text-[13px] disabled:opacity-50"
              >
                Tambahkan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Campaign Detail Modal */}
      {selectedCampaignDetail && (
        <Modal
          title={selectedCampaignDetail.title}
          desc={new Date(selectedCampaignDetail.createdAt).toLocaleString("id-ID")}
          size="xl"
          onClose={() => setSelectedCampaignDetail(null)}
        >
          <div className="p-3 bg-[#f6f6f7] rounded-[10px] text-[13px] text-[#1b1b20] max-h-36 overflow-y-auto whitespace-pre-wrap border border-[#e8e8eb]">
            <span className="block text-[12px] text-[#666666] mb-1">Isi pesan</span>
            {selectedCampaignDetail.message}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <h4 className="text-[13px] font-semibold text-[#1b1b20] mb-1">
              Status per grup ({selectedCampaignDetail.logs?.length || 0})
            </h4>
            <div className="divide-y divide-[#f0f0f3] text-[13px]">
              {selectedCampaignDetail.logs?.map((l) => (
                <div key={l.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1b1b20] truncate">{l.groupName || l.groupJid}</p>
                    <p className="text-[12px] text-[#999999] truncate">{l.groupJid}</p>
                    {l.errorMessage && (
                      <p className="text-[12px] text-rose-600 mt-0.5">{l.errorMessage}</p>
                    )}
                  </div>
                  <StatusPill tone={l.status === "SENT" ? "ok" : "bad"}>
                    {l.status === "SENT" ? "Terkirim" : "Gagal"}
                  </StatusPill>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#f0f0f3] flex justify-end">
            <button
              onClick={() => setSelectedCampaignDetail(null)}
              className="btn-outline !py-2 !px-4 !text-[13px]"
            >
              Tutup
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
