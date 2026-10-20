"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePolling } from "@/hooks/usePolling";
import {
  BarChart3,
  MessageSquare,
  PlayCircle,
  QrCode,
  Sparkles,
  Zap,
  Users,
  Megaphone,
  LogOut,
  X,
} from "lucide-react";

interface SidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: BarChart3 },
  { href: "/inbox", label: "Live Chat", icon: MessageSquare },
  { href: "/contacts", label: "Leads CRM", icon: Users },
  { href: "/broadcast", label: "Broadcast Grup", icon: Megaphone },
  { href: "/automation", label: "Auto Follow-Up", icon: Zap },
  { href: "/ai-settings", label: "AI & Knowledge", icon: Sparkles },
  { href: "/simulator", label: "Simulator", icon: PlayCircle },
  { href: "/gateway", label: "WA Gateway", icon: QrCode },
];

const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  CONNECTED: { dot: "bg-emerald-500", label: "WhatsApp terhubung" },
  SCAN_QR: { dot: "bg-amber-500", label: "Perlu scan QR" },
  STARTING: { dot: "bg-amber-500", label: "Sesi sedang dimulai" },
  DISCONNECTED: { dot: "bg-rose-500", label: "WhatsApp terputus" },
};

export default function Sidebar({ isMobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [waStatus, setWaStatus] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Cheap status check: DB-only endpoint, every 30s, paused while the tab is hidden.
  usePolling(
    async () => {
      try {
        const res = await fetch("/api/waha/session?light=1");
        if (res.ok) {
          const data = await res.json();
          setWaStatus(data.session?.status || null);
        }
      } catch {}
    },
    30000
  );

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (data?.user?.email) setUserEmail(data.user.email);
      })
      .catch(() => {});
  }, [supabase]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const status = (waStatus && STATUS_STYLE[waStatus]) || null;

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`bg-white border-r border-[#e8e8eb] flex flex-col shrink-0 h-screen select-none z-50
          fixed inset-y-0 left-0 w-64 max-w-[85vw] md:static md:translate-x-0
          transition-transform duration-200 ease-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Brand */}
        <div className="h-14 px-4 border-b border-[#e8e8eb] flex items-center justify-between">
          <Link href="/" onClick={() => onClose?.()} className="flex items-center gap-2.5 min-w-0">
            <Image
              src="/logo.png"
              alt="Lampung Cerdas"
              width={28}
              height={28}
              priority
              className="w-7 h-7 rounded-[8px] object-contain shrink-0"
            />
            <div className="min-w-0 leading-tight">
              <div className="font-bold text-[13.5px] text-[#1b1b20] truncate">Lampung Cerdas</div>
              <div className="text-[10.5px] text-[#999999] truncate">AI Sales Agent</div>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1.5 rounded-[8px] text-[#666666] hover:bg-[#f6f6f7]"
            aria-label="Tutup menu"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose?.()}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-[#ebf3ff] text-[#0066ff] font-semibold"
                    : "text-[#1b1b20] hover:bg-[#f6f6f7]"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? "text-[#0066ff]" : "text-[#666666]"}`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer: gateway status + account */}
        <div className="p-3 border-t border-[#e8e8eb] space-y-2">
          <Link
            href="/gateway"
            onClick={() => onClose?.()}
            className="flex items-center gap-2 px-2 py-1.5 rounded-[8px] text-[12px] text-[#666666] hover:bg-[#f6f6f7] transition-colors"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${status ? status.dot : "bg-[#d4d4d8]"}`}
            />
            <span className="truncate">{status ? status.label : "Memeriksa status WA…"}</span>
          </Link>

          <div className="flex items-center justify-between gap-2 px-2">
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-[#1b1b20] truncate">
                {userEmail || "Admin"}
              </div>
              <div className="text-[10.5px] text-[#999999]">Staff Lampung Cerdas</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-[8px] text-[#666666] hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
              title="Keluar"
              aria-label="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
