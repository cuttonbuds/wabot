"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

interface TopHeaderProps {
  onOpenMobileMenu?: () => void;
}

const PAGE_INFO: Record<string, { title: string; desc: string }> = {
  "/": { title: "Overview", desc: "Ringkasan performa penjualan dan otomasi AI" },
  "/inbox": { title: "Live Chat", desc: "Pantau dan ambil alih percakapan calon siswa" },
  "/contacts": { title: "Leads CRM", desc: "Direktori calon siswa dan tahapan konversi" },
  "/broadcast": { title: "Broadcast Grup", desc: "Kirim pesan ke beberapa grup WhatsApp" },
  "/automation": { title: "Auto Follow-Up", desc: "Aturan follow-up otomatis untuk prospek tidak aktif" },
  "/ai-settings": { title: "AI & Knowledge Base", desc: "Parameter LLM dan materi bimbingan" },
  "/simulator": { title: "Simulator", desc: "Uji alur pipeline bot tanpa WhatsApp sungguhan" },
  "/gateway": { title: "WA Gateway", desc: "Koneksi sesi WhatsApp dan QR code" },
};

export default function TopHeader({ onOpenMobileMenu }: TopHeaderProps) {
  const pathname = usePathname();
  const page = PAGE_INFO[pathname] || PAGE_INFO["/"];

  return (
    <header className="h-14 bg-white border-b border-[#e8e8eb] px-3 sm:px-6 flex items-center gap-3 sticky top-0 z-30 shrink-0">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="md:hidden p-2 -ml-1 rounded-[8px] text-[#1b1b20] hover:bg-[#f6f6f7] transition-colors shrink-0"
        aria-label="Buka menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="min-w-0">
        <h1 className="font-semibold text-[15px] text-[#1b1b20] leading-tight truncate">
          {page.title}
        </h1>
        <p className="text-[11.5px] text-[#666666] hidden sm:block truncate">{page.desc}</p>
      </div>
    </header>
  );
}
