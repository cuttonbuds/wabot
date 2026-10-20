"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  MessageSquare,
  Bot,
  GraduationCap,
  ArrowRight,
  RefreshCw,
  PlayCircle,
  QrCode,
  Sparkles,
} from "lucide-react";

interface Metrics {
  totalContacts: number;
  totalMessages: number;
  aiHandledCount: number;
  manualTakeoverCount: number;
  aiAutomationRate: number;
}

interface FunnelItem {
  stage: string;
  count: number;
  color: string;
}

interface RecentMessage {
  id: number;
  senderType: string;
  messageBody: string;
  createdAt: string;
  contact?: {
    customerName?: string | null;
    phoneNumber?: string | null;
    leadStage?: string | null;
  } | null;
}

interface AnalyticsResponse {
  metrics: Metrics;
  funnel: FunnelItem[];
  recentMessages: RecentMessage[];
}

const QUICK_LINKS = [
  { href: "/inbox", label: "Live Chat", desc: "Ambil alih percakapan", icon: MessageSquare },
  { href: "/simulator", label: "Simulator", desc: "Uji alur bot", icon: PlayCircle },
  { href: "/gateway", label: "WA Gateway", desc: "Status koneksi dan QR", icon: QrCode },
  { href: "/ai-settings", label: "AI & Knowledge", desc: "Prompt dan materi", icon: Sparkles },
];

async function fetchAnalytics(): Promise<AnalyticsResponse> {
  const res = await fetch("/api/analytics");
  if (!res.ok) {
    throw new Error(
      res.status === 401 ? "Sesi login berakhir. Silakan masuk kembali." : "Gagal memuat data analitik."
    );
  }
  return res.json();
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}

export default function DashboardOverview() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchAnalytics()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Gagal memuat data analitik.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  const metrics = data?.metrics;
  const funnel = data?.funnel || [];
  const recent = data?.recentMessages || [];
  const enrolled = funnel.find((f) => f.stage.startsWith("Terdaftar"))?.count;
  const maxCount = Math.max(...funnel.map((f) => f.count), 1);

  const kpis: Array<{
    label: string;
    value: number | string | undefined;
    sub?: string;
    icon: typeof Users;
    tone: string;
  }> = [
    {
      label: "Total Calon Siswa",
      value: metrics?.totalContacts,
      icon: Users,
      tone: "text-[#0066ff] bg-[#ebf3ff]",
    },
    {
      label: "Terdaftar (Paid)",
      value: enrolled,
      icon: GraduationCap,
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Ditangani AI",
      value: metrics ? `${metrics.aiAutomationRate}%` : undefined,
      sub: metrics ? `${metrics.aiHandledCount} AI, ${metrics.manualTakeoverCount} manual` : undefined,
      icon: Bot,
      tone: "text-violet-600 bg-violet-50",
    },
    {
      label: "Total Pesan",
      value: metrics?.totalMessages,
      icon: MessageSquare,
      tone: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-[12px] bg-rose-50 border border-rose-200 text-[13px] text-rose-800">
          <span>{error}</span>
          <button onClick={retry} className="btn-outline !py-1 !px-2.5 !text-[12px]">
            <RefreshCw className="w-3.5 h-3.5" /> Coba lagi
          </button>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card-rounded p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-medium text-[#666666] truncate">{k.label}</span>
                <span
                  className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${k.tone}`}
                >
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-[26px] font-bold text-[#1b1b20] tabular-nums leading-none">
                {loading ? (
                  <span className="inline-block h-7 w-16 rounded bg-[#eeeeef] animate-pulse" />
                ) : k.value === undefined ? (
                  <span className="text-[#999999]">-</span>
                ) : (
                  k.value
                )}
              </div>
              {k.sub && !loading && <p className="mt-1.5 text-[11.5px] text-[#666666]">{k.sub}</p>}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Funnel */}
        <section className="lg:col-span-2 card-rounded p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-[#1b1b20]">Funnel Konversi</h2>
              <p className="text-[12px] text-[#666666]">Dari chat pertama hingga pendaftaran</p>
            </div>
            <Link
              href="/contacts"
              className="text-[12.5px] font-semibold text-[#0066ff] hover:underline inline-flex items-center gap-1"
            >
              Lihat leads <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 rounded-[8px] bg-[#f6f6f7] animate-pulse" />
              ))}
            </div>
          ) : funnel.length === 0 ? (
            <p className="text-[13px] text-[#666666] py-6 text-center">Belum ada data funnel.</p>
          ) : (
            <ul className="space-y-3">
              {funnel.map((item) => {
                const pct = Math.round((item.count / maxCount) * 100);
                return (
                  <li key={item.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-[#1b1b20] truncate mr-2">{item.stage}</span>
                      <span className="font-semibold text-[#1b1b20] tabular-nums shrink-0">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f0f0f3] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Right column */}
        <div className="space-y-4 sm:space-y-5">
          <section className="card-rounded p-4 sm:p-5">
            <h2 className="text-[15px] font-semibold text-[#1b1b20] mb-3">Aktivitas Terbaru</h2>
            {loading ? (
              <div className="space-y-2.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 rounded-[8px] bg-[#f6f6f7] animate-pulse" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="text-[13px] text-[#666666]">Belum ada pesan masuk.</p>
            ) : (
              <ul className="divide-y divide-[#f0f0f3]">
                {recent.slice(0, 5).map((m) => (
                  <li key={m.id} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="font-semibold text-[#1b1b20] truncate">
                        {m.contact?.customerName || m.contact?.phoneNumber || "Kontak"}
                      </span>
                      <span className="text-[#999999] shrink-0">{formatRelative(m.createdAt)}</span>
                    </div>
                    <p className="text-[12px] text-[#666666] truncate">
                      <span
                        className={m.senderType === "customer" ? "text-[#1b1b20]" : "text-[#0066ff]"}
                      >
                        {m.senderType === "customer" ? "Siswa" : "AI"}:
                      </span>{" "}
                      {m.messageBody}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card-rounded p-2">
            {QUICK_LINKS.map((q) => {
              const Icon = q.icon;
              return (
                <Link
                  key={q.href}
                  href={q.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-[#f6f6f7] transition-colors group"
                >
                  <span className="w-8 h-8 rounded-[8px] bg-[#f6f6f7] group-hover:bg-white text-[#666666] group-hover:text-[#0066ff] flex items-center justify-center shrink-0 transition-colors">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-[#1b1b20]">{q.label}</span>
                    <span className="block text-[11.5px] text-[#666666] truncate">{q.desc}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#d4d4d8] group-hover:text-[#0066ff] shrink-0" />
                </Link>
              );
            })}
          </section>
        </div>
      </div>
    </div>
  );
}
