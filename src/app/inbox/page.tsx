"use client";

import { useState, useEffect, useRef } from "react";
import { usePolling } from "@/hooks/usePolling";
import {
  Search,
  Bot,
  User,
  Send,
  ShieldAlert,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Phone,
  School,
  Target,
  RefreshCw,
  Clock,
  CheckCheck,
  Award,
  Zap,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";

export default function InboxPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [filterHandling, setFilterHandling] = useState<string>("all");
  const [filterLead, setFilterLead] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [replyText, setReplyText] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [mobileView, setMobileView] = useState<"contacts" | "chat" | "profile">("contacts");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendNotice, setSendNotice] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Track scroll position only to show/hide manual "Pesan Terbaru" button
  const handleChatScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBottom(distanceFromBottom > 150);
  };

  // Fetch contacts list
  const fetchContacts = async () => {
    try {
      const url = new URL("/api/contacts", window.location.origin);
      if (filterHandling !== "all") url.searchParams.set("handlingStatus", filterHandling);
      if (filterLead !== "all") url.searchParams.set("leadStatus", filterLead);
      if (searchQuery) url.searchParams.set("q", searchQuery);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);

        // Auto select first contact ONLY on initial load when selectedId is null
        setSelectedId((curr) => {
          if (curr === null && data.contacts?.length > 0) {
            return data.contacts[0].id;
          }
          return curr;
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch single contact detail + messages
  const fetchContactDetail = async (id: number, silent = false) => {
    try {
      const res = await fetch(`/api/contacts/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedContact(data.contact);

        const newMsgs = data.contact.messages || [];
        // Only update messages state if count or latest ID changed (prevents constant re-renders & auto-scroll jumps)
        setMessages((prev) => {
          if (
            prev.length === newMsgs.length &&
            prev[prev.length - 1]?.id === newMsgs[newMsgs.length - 1]?.id
          ) {
            return prev;
          }
          return newMsgs;
        });
      }
    } catch (e) {
      if (!silent) console.error(e);
    }
  };

  // 1. Initial Load and Contacts List Polling (paused while the tab is hidden)
  usePolling(fetchContacts, 8000, true, [filterHandling, filterLead, searchQuery]);

  // 2. Fetch Detail when selectedId changes (resets states and loads chat without force-scrolling)
  useEffect(() => {
    if (selectedId) {
      setSendError(null);
      setSendNotice(null);
      setShowScrollBottom(false);
      fetchContactDetail(selectedId);
    }
  }, [selectedId]);

  // 3. Periodic Background Message Polling for the active selected chat (paused while hidden)
  usePolling(
    () => {
      if (selectedId) return fetchContactDetail(selectedId, true);
    },
    3000,
    selectedId !== null,
    [selectedId]
  );

  // Handle Toggle Human Takeover
  const toggleHandlingStatus = async () => {
    if (!selectedContact) return;
    const newStatus =
      selectedContact.handlingStatus === "AI_HANDLED"
        ? "MANUAL_TAKEOVER"
        : "AI_HANDLED";

    try {
      const res = await fetch(`/api/contacts/${selectedContact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handlingStatus: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedContact(data.contact);
        fetchContacts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Manual Message Send
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedContact) return;

    const textToSend = replyText.trim();
    setSending(true);
    setSendError(null);
    setSendNotice(null);

    // Auto-switch to MANUAL_TAKEOVER if sending manual message from dashboard
    if (selectedContact.handlingStatus !== "MANUAL_TAKEOVER") {
      fetch(`/api/contacts/${selectedContact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handlingStatus: "MANUAL_TAKEOVER" }),
      })
        .then(() => {
          setSelectedContact((prev: any) =>
            prev ? { ...prev, handlingStatus: "MANUAL_TAKEOVER" } : prev
          );
          fetchContacts();
        })
        .catch(() => {});
    }

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContact.id,
          messageBody: textToSend,
        }),
      });

      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setReplyText("");
        setShowScrollBottom(false);

        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 50);

        fetchContacts();

        if (data.delivered === false && data.deliveryNotice) {
          setSendNotice(data.deliveryNotice);
        }
      } else {
        setSendError(data.error || "Gagal mengirim pesan ke WhatsApp");
      }
    } catch (e: any) {
      console.error(e);
      setSendError(e.message || "Gagal menghubungi server");
    } finally {
      setSending(false);
    }
  };

  // Handle Save Profile
  const handleUpdateProfile = async (field: string, value: any) => {
    if (!selectedContact) return;
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/contacts/${selectedContact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedContact(data.contact);
        fetchContacts();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="h-[calc(100vh-105px)] flex flex-col space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-white p-3 sm:p-3.5 rounded-[16px] border border-[#e8e8eb] shadow-xs shrink-0">
        <div className="flex items-center gap-2 flex-1 w-full sm:max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
            <input
              type="text"
              placeholder="Cari nama, no. WA, sekolah, target..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-[12.5px] sm:text-[13px] bg-[#f6f6f7] border border-[#e8e8eb] rounded-[10px] focus:outline-none focus:border-[#0066ff]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0 w-full sm:w-auto">
          <select
            value={filterHandling}
            onChange={(e) => setFilterHandling(e.target.value)}
            className="px-2.5 py-1.5 text-[11.5px] sm:text-[12.5px] font-semibold bg-[#f6f6f7] border border-[#e8e8eb] rounded-[10px] text-[#1b1b20] focus:outline-none shrink-0"
          >
            <option value="all">Semua Penanganan</option>
            <option value="AI_HANDLED">🤖 Auto AI</option>
            <option value="MANUAL_TAKEOVER">👤 Staff CS</option>
          </select>

          <select
            value={filterLead}
            onChange={(e) => setFilterLead(e.target.value)}
            className="px-2.5 py-1.5 text-[11.5px] sm:text-[12.5px] font-semibold bg-[#f6f6f7] border border-[#e8e8eb] rounded-[10px] text-[#1b1b20] focus:outline-none shrink-0"
          >
            <option value="all">Semua Stage</option>
            <option value="Cold">❄️ Cold</option>
            <option value="Warm">🌤️ Warm</option>
            <option value="Hot">🔥 Hot</option>
            <option value="Pending_Payment">💳 Pending</option>
            <option value="Enrolled">🎓 Enrolled</option>
          </select>

          <button
            onClick={fetchContacts}
            className="btn-outline !py-1.5 !px-2.5 sm:!px-3 !text-[12px] shrink-0"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Inbox Workspace */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 min-h-0">
        {/* Left Col: Contact List (4 cols) */}
        <div
          className={`md:col-span-4 bg-white border border-[#e8e8eb] rounded-[20px] shadow-xs flex flex-col overflow-hidden ${
            mobileView === "contacts" ? "flex h-full" : "hidden md:flex"
          }`}
        >
          <div className="p-3.5 border-b border-[#e8e8eb] flex items-center justify-between shrink-0">
            <h2 className="text-[14px] sm:text-[14.5px] font-bold text-[#1b1b20]">
              Percakapan Calon Siswa ({contacts.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#f0f0f3]">
            {loading ? (
              <div className="p-8 text-center text-[#666666] text-[13px]">
                Memuat data chat...
              </div>
            ) : contacts.length === 0 ? (
              <div className="p-8 text-center text-[#666666] text-[13px]">
                Tidak ada percakapan ditemukan.
              </div>
            ) : (
              contacts.map((c) => {
                const isSelected = selectedId === c.id;
                const lastMsg = c.messages?.[0]?.messageBody || "Belum ada pesan";

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedId(c.id);
                      setMobileView("chat");
                    }}
                    className={`p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#ebf3ff] border-l-4 border-l-[#0066ff]"
                        : "hover:bg-[#f6f6f7]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#0066ff]/15 text-[#0066ff] font-bold text-[12px] flex items-center justify-center">
                          {c.customerName ? c.customerName.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[13.5px] text-[#1b1b20] leading-tight truncate">
                            {c.customerName || (c.phoneNumber !== c.whatsappLid ? `+${c.phoneNumber}` : `WA LID: ${c.whatsappLid || c.phoneNumber}`)}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-[#666666] flex-wrap">
                            {c.phoneNumber && c.phoneNumber !== c.whatsappLid && (
                              <span>+{c.phoneNumber}</span>
                            )}
                            {c.whatsappLid && (
                              <span className="text-[9.5px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                                LID: {c.whatsappLid.slice(-6)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lead Status Badge */}
                      <span
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          c.leadStatus === "Hot"
                            ? "bg-rose-100 text-rose-700"
                            : c.leadStatus === "Warm"
                            ? "bg-amber-100 text-amber-700"
                            : c.leadStatus === "Pending_Payment"
                            ? "bg-purple-100 text-purple-700"
                            : c.leadStatus === "Enrolled"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {c.leadStatus}
                      </span>
                    </div>


                    <p className="text-[12px] text-[#666666] line-clamp-1 mt-1">
                      {lastMsg}
                    </p>

                    <div className="flex items-center justify-between mt-2 text-[10.5px]">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          c.handlingStatus === "AI_HANDLED"
                            ? "text-[#0066ff]"
                            : "text-amber-600 font-bold"
                        }`}
                      >
                        {c.handlingStatus === "AI_HANDLED" ? (
                          <>
                            <Bot className="w-3 h-3" /> Auto AI
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3" /> Staff Takeover
                          </>
                        )}
                      </span>
                      <span className="text-[#999999] flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(c.lastInteractionAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center Col: Live Chat Thread (5 cols) */}
        <div
          className={`md:col-span-5 bg-white border border-[#e8e8eb] rounded-[20px] shadow-xs flex flex-col overflow-hidden ${
            mobileView === "chat" ? "flex h-full" : "hidden md:flex"
          }`}
        >
          {selectedContact ? (
            <>
              {/* Chat Header with Takeover Button & Mobile Nav */}
              <div className="p-3 sm:p-3.5 bg-white border-b border-[#e8e8eb] flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setMobileView("contacts")}
                    className="md:hidden p-1.5 -ml-1 text-gray-600 hover:text-[#1b1b20] rounded-[8px] hover:bg-gray-100 shrink-0"
                    title="Kembali ke daftar kontak"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0066ff] text-white font-bold flex items-center justify-center text-[12px] sm:text-[13px] shrink-0">
                    {selectedContact.customerName
                      ? selectedContact.customerName.charAt(0).toUpperCase()
                      : "S"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[13.5px] sm:text-[14px] text-[#1b1b20] leading-tight truncate">
                      {selectedContact.customerName || (selectedContact.phoneNumber !== selectedContact.whatsappLid ? `+${selectedContact.phoneNumber}` : `WA LID: ${selectedContact.whatsappLid}`)}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10.5px] text-[#666666] truncate mt-0.5">
                      {selectedContact.phoneNumber && selectedContact.phoneNumber !== selectedContact.whatsappLid && (
                        <span>+{selectedContact.phoneNumber}</span>
                      )}
                      {selectedContact.whatsappLid && (
                        <span className="font-mono bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded text-[9.5px]">
                          LID: {selectedContact.whatsappLid}
                        </span>
                      )}
                      <span>•</span>
                      <span className="truncate">{selectedContact.targetCampusMajor || "Belum ada target kampus"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Mobile View Profile Button */}
                  <button
                    type="button"
                    onClick={() => setMobileView("profile")}
                    className="md:hidden p-1.5 rounded-[8px] text-[#0066ff] bg-blue-50 hover:bg-blue-100 transition-colors"
                    title="Buka Profil Siswa"
                  >
                    <GraduationCap className="w-4 h-4" />
                  </button>

                  {/* Takeover Switch */}
                  <button
                    onClick={toggleHandlingStatus}
                    className={`btn-outline !py-1.5 !px-2.5 sm:!px-3 !text-[11px] sm:!text-[12px] font-bold ${
                      selectedContact.handlingStatus === "MANUAL_TAKEOVER"
                        ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600"
                        : "bg-[#ebf3ff] text-[#0066ff] border-[#0066ff]/30 hover:bg-[#0066ff] hover:text-white"
                    }`}
                  >
                    {selectedContact.handlingStatus === "MANUAL_TAKEOVER" ? (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Kembalikan ke AI</span>
                        <span className="sm:hidden">Ke AI</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ambil Alih (Takeover)</span>
                        <span className="sm:hidden">Takeover</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div
                ref={chatContainerRef}
                onScroll={handleChatScroll}
                className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 bg-[#fbfbfc] relative"
              >
                {/* Takeover notice banner */}
                {selectedContact.handlingStatus === "MANUAL_TAKEOVER" && (
                  <div className="p-2.5 rounded-[12px] bg-amber-50 border border-amber-200 text-amber-800 text-[11.5px] flex items-center gap-2 font-medium">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Mode Takeover Aktif: Respon otomatis AI dinonaktifkan. Anda menangani chat ini langsung.</span>
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#666666] space-y-2">
                    <div className="w-12 h-12 rounded-full bg-[#f0f0f3] flex items-center justify-center text-[#999999]">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="text-[13px] font-medium">Belum ada riwayat pesan.</p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isAi = m.senderType === "ai";
                    const isCustomer = m.senderType === "customer";
                    const isAgent = m.senderType === "agent";

                    return (
                      <div
                        key={m.id || idx}
                        className={`flex flex-col ${
                          isCustomer ? "items-start" : "items-end"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[10.5px] font-bold text-[#666666]">
                            {isCustomer ? (
                              <span className="text-[#1b1b20]">
                                {selectedContact.customerName || "Siswa"}
                              </span>
                            ) : isAi ? (
                              <span className="text-[#0066ff] flex items-center gap-1">
                                <Bot className="w-3 h-3" /> Kak Cerdas (AI)
                              </span>
                            ) : (
                              <span className="text-amber-600 flex items-center gap-1">
                                <User className="w-3 h-3" /> Staff CS (Manual)
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div
                          className={`p-3 sm:p-3.5 rounded-[16px] text-[12.5px] sm:text-[13px] leading-relaxed max-w-[85%] whitespace-pre-wrap shadow-xs ${
                            isCustomer
                              ? "bg-white text-[#1b1b20] border border-[#e8e8eb] rounded-tl-xs"
                              : isAi
                              ? "bg-[#0066ff] text-white rounded-tr-xs"
                              : "bg-[#1b1b20] text-white rounded-tr-xs"
                          }`}
                        >
                          {m.messageBody}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Floating "Pesan Terbaru" scroll button */}
                {showScrollBottom && (
                  <button
                    type="button"
                    onClick={() => {
                      if (chatContainerRef.current) {
                        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                        setShowScrollBottom(false);
                      }
                    }}
                    className="sticky bottom-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-[#1b1b20] text-white text-[11.5px] font-bold rounded-full shadow-lg border border-gray-700 flex items-center gap-1.5 hover:bg-[#2d2d35] transition-all animate-fade-in"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Pesan Terbaru</span>
                  </button>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-white border-t border-[#e8e8eb] shrink-0 space-y-2">
                {sendError && (
                  <div className="p-2.5 rounded-[10px] bg-rose-50 border border-rose-200 text-rose-800 text-[12px] flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="truncate">{sendError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSendError(null)}
                      className="text-rose-600 font-bold hover:underline shrink-0 text-[11px] ml-2"
                    >
                      Tutup
                    </button>
                  </div>
                )}

                {sendNotice && (
                  <div className="p-2 rounded-[10px] bg-amber-50 border border-amber-200 text-amber-800 text-[11.5px] flex items-center justify-between">
                    <span className="truncate">Tersimpan di sistem. Catatan WA: {sendNotice}</span>
                    <button
                      type="button"
                      onClick={() => setSendNotice(null)}
                      className="text-amber-600 font-bold hover:underline shrink-0 text-[11px] ml-2"
                    >
                      OK
                    </button>
                  </div>
                )}

                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder={
                      selectedContact.handlingStatus === "MANUAL_TAKEOVER"
                        ? "Ketik pesan balasan manual CS..."
                        : "Ketik balasan (otomatis ambil alih dari AI)..."
                    }
                    disabled={sending}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-[13px] bg-[#f6f6f7] border border-[#e8e8eb] rounded-[12px] focus:outline-none focus:border-[#0066ff] disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="btn-primary !p-2.5 !rounded-[12px] disabled:opacity-50 shrink-0 flex items-center justify-center min-w-[38px] min-h-[38px]"
                    title="Kirim pesan balasan"
                  >
                    {sending ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-[#666666]">
              Pilih percakapan di sebelah kiri untuk melihat pesan
            </div>
          )}
        </div>

        {/* Right Col: Student CRM Profile & Lead Qualification (3 cols) */}
        <div
          className={`md:col-span-3 space-y-3 sm:space-y-4 overflow-y-auto ${
            mobileView === "profile" ? "block h-full" : "hidden md:block"
          }`}
        >
          {/* Mobile Back Button to Chat */}
          <button
            type="button"
            onClick={() => setMobileView("chat")}
            className="md:hidden flex items-center gap-2 text-[12px] font-bold text-[#0066ff] bg-white p-2.5 rounded-[12px] border border-[#e8e8eb] w-full shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Percakapan Chat</span>
          </button>

          {selectedContact ? (
            <div className="bg-white border border-[#e8e8eb] rounded-[20px] p-4 shadow-xs space-y-4">
              <div className="border-b border-[#e8e8eb] pb-3">
                <h3 className="font-bold text-[14.5px] text-[#1b1b20] flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#0066ff]" />
                  <span>Kualifikasi Calon Siswa</span>
                </h3>
                <p className="text-[11px] text-[#666666]">
                  Data profil siswa diekstrak otomatis oleh AI
                </p>
              </div>

              {/* Qualification Telemetry Badges */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-[10px] bg-[#f6f6f7] border border-[#e8e8eb]">
                  <span className="text-[#666666] block text-[10px] font-bold uppercase">Lead Stage</span>
                  <span className="font-bold text-[#0066ff] block truncate">
                    {selectedContact.leadStage || "DISCOVERY"}
                  </span>
                </div>

                <div className="p-2 rounded-[10px] bg-[#f6f6f7] border border-[#e8e8eb]">
                  <span className="text-[#666666] block text-[10px] font-bold uppercase">Temperature</span>
                  <span className={`font-bold block ${
                    selectedContact.leadTemperature === "HOT" || selectedContact.leadTemperature === "VERY_HOT"
                      ? "text-rose-600"
                      : selectedContact.leadTemperature === "WARM"
                      ? "text-amber-600"
                      : "text-blue-600"
                  }`}>
                    {selectedContact.leadTemperature || "COLD"}
                  </span>
                </div>

                <div className="p-2 rounded-[10px] bg-[#f6f6f7] border border-[#e8e8eb]">
                  <span className="text-[#666666] block text-[10px] font-bold uppercase">Lead Score</span>
                  <span className="font-bold text-[#1b1b20] block">
                    {selectedContact.leadScore ?? 40}/100
                  </span>
                </div>

                <div className="p-2 rounded-[10px] bg-[#f6f6f7] border border-[#e8e8eb]">
                  <span className="text-[#666666] block text-[10px] font-bold uppercase">Persona</span>
                  <span className="font-bold text-[#1b1b20] block truncate">
                    {selectedContact.persona || "EKSPLORASI"}
                  </span>
                </div>
              </div>

              {/* Editable Profile Fields */}
              <div className="space-y-3 text-[12.5px]">
                <div>
                  <label className="font-bold text-[#1b1b20] block mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#0066ff]" />
                    <span>Nama Siswa</span>
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedContact.customerName || ""}
                    key={`name_${selectedContact.id}_${selectedContact.customerName}`}
                    onBlur={(e) => handleUpdateProfile("customerName", e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[8px] focus:outline-none focus:border-[#0066ff] text-[12px] font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1b1b20] block mb-1 flex items-center gap-1.5 justify-between">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#0066ff]" />
                      <span>Nomor HP Asli Siswa</span>
                    </div>
                    {selectedContact.phoneNumber === selectedContact.whatsappLid && (
                      <span className="text-[10px] text-amber-700 font-bold">LID Mode</span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 6281278901234"
                    defaultValue={
                      selectedContact.phoneNumber && selectedContact.phoneNumber !== selectedContact.whatsappLid
                        ? selectedContact.phoneNumber
                        : ""
                    }
                    key={`phone_${selectedContact.id}_${selectedContact.phoneNumber}`}
                    onBlur={(e) => handleUpdateProfile("phoneNumber", e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[8px] focus:outline-none focus:border-[#0066ff] text-[12px] font-mono"
                  />
                  <span className="text-[10px] text-[#888] mt-0.5 block">
                    Ketik nomor HP jika calon siswa membagikannya di chat.
                  </span>
                </div>

                {selectedContact.whatsappLid && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#1b1b20] flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-amber-500/20 text-amber-700 font-mono text-[9px] flex items-center justify-center font-bold">@</span>
                        <span>WhatsApp LID (Device ID)</span>
                      </label>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/contacts/sync-lids", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ contactId: selectedContact.id }),
                            });
                            const data = await res.json();
                            if (res.ok && data.updatedCount > 0) {
                              fetchContactDetail(selectedContact.id);
                              fetchContacts();
                            } else {
                              alert(data.results?.[0]?.message || "Nomor HP belum tersedia di server WAHA untuk LID ini.");
                            }
                          } catch (e: any) {
                            alert(e.message || "Gagal sinkronisasi");
                          }
                        }}
                        className="text-[10px] text-[#0066ff] hover:underline font-bold"
                      >
                        Cek No. HP di WAHA
                      </button>
                    </div>
                    <input
                      type="text"
                      value={`${selectedContact.whatsappLid}@lid`}
                      readOnly
                      className="w-full px-3 py-1.5 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[8px] text-[11px] text-[#666666] font-mono cursor-not-allowed"
                    />
                    <span className="text-[10px] text-amber-700 mt-0.5 block">
                      ID privasi WAHA untuk pengiriman balasan chat WhatsApp.
                    </span>
                  </div>
                )}


                <div>
                  <label className="font-bold text-[#1b1b20] block mb-1 flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-[#0066ff]" />
                    <span>Asal Sekolah / Jurusan Asal</span>
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedContact.schoolOrigin || ""}
                    key={`school_${selectedContact.id}_${selectedContact.schoolOrigin}`}
                    onBlur={(e) => handleUpdateProfile("schoolOrigin", e.target.value)}
                    placeholder="Contoh: SMAN 1 Bandar Lampung"
                    className="w-full px-3 py-1.5 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[8px] focus:outline-none focus:border-[#0066ff] text-[12px] font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1b1b20] block mb-1 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-[#0066ff]" />
                    <span>Target Kampus / Jurusan Impian</span>
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedContact.targetCampusMajor || ""}
                    key={`target_${selectedContact.id}_${selectedContact.targetCampusMajor}`}
                    onBlur={(e) => handleUpdateProfile("targetCampusMajor", e.target.value)}
                    placeholder="Contoh: Kedokteran UNILA (SNBP)"
                    className="w-full px-3 py-1.5 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[8px] focus:outline-none focus:border-[#0066ff] text-[12px] font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1b1b20] block mb-1">
                    Stage Lead Manual
                  </label>
                  <select
                    value={selectedContact.leadStatus || "Cold"}
                    onChange={(e) => handleUpdateProfile("leadStatus", e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[8px] text-[12px] font-bold text-[#1b1b20] focus:outline-none"
                  >
                    <option value="Cold">❄️ Cold Lead</option>
                    <option value="Warm">🌤️ Warm Lead</option>
                    <option value="Hot">🔥 Hot Lead</option>
                    <option value="Pending_Payment">💳 Pending Payment</option>
                    <option value="Enrolled">🎓 Enrolled (Terdaftar)</option>
                  </select>
                </div>
              </div>

              {savingProfile && (
                <div className="text-[11px] text-[#0066ff] font-bold text-center">
                  Menyimpan perubahan...
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
