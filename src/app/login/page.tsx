"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Bot,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState("admin@wabot.id");
  const [password, setPassword] = useState("1234567890");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(true);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes("your-project-id") || url.includes("placeholder")) {
      setIsSupabaseConfigured(false);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    if (!isSupabaseConfigured) {
      setTimeout(() => {
        setSuccessMessage("Mode Demo: Supabase URL belum diisi di .env. Mengarahkan ke Dashboard...");
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      }, 500);
      return;
    }

    try {
      if (isLoginTab) {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setErrorMessage(
            error.message === "Invalid login credentials"
              ? "Email atau kata sandi tidak cocok. Silakan periksa kembali."
              : error.message
          );
        } else if (data.user) {
          setSuccessMessage("Login berhasil! Mengalihkan ke Dashboard...");
          setTimeout(() => {
            window.location.href = "/";
          }, 400);
        }
      } else {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          setErrorMessage(error.message);
        } else {
          setSuccessMessage(
            "Registrasi berhasil! Jika verifikasi email aktif, silakan cek inbox Anda, atau coba masuk sekarang."
          );
          setIsLoginTab(true);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan autentikasi.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (accEmail: string, accPass: string) => {
    setEmail(accEmail);
    setPassword(accPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5 sm:space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] bg-white border border-[#e8e8eb] p-1 shadow-md shadow-black/5 mb-1 overflow-hidden">
            <img
              src="/logo.png"
              alt="Lampung Cerdas Bot Sales WA"
              className="w-full h-full object-contain rounded-[14px]"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1b1b20] tracking-tight">
            Lampung Cerdas
          </h1>
          <p className="text-[12.5px] sm:text-[13.5px] text-[#666666] font-medium">
            WhatsApp AI Sales & CS Automation Platform
          </p>
        </div>

        {/* Not Configured Notice Banner */}
        {!isSupabaseConfigured && (
          <div className="p-3.5 sm:p-4 rounded-[16px] bg-amber-50 border border-amber-200 text-amber-900 text-[11.5px] sm:text-[12px] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Info Konfigurasi .env:</span> Supabase URL belum terhubung. Anda dapat langsung klik Masuk untuk pengujian mode lokal.
            </div>
          </div>
        )}

        {/* Auth Card */}
        <div className="bg-white border border-[#e8e8eb] rounded-[20px] sm:rounded-[24px] p-4 sm:p-8 shadow-xs space-y-4 sm:space-y-5">
          {/* Tab Switcher */}
          <div className="flex bg-[#f6f6f7] p-1 rounded-[12px] border border-[#e8e8eb]">
            <button
              type="button"
              onClick={() => {
                setIsLoginTab(true);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-[13px] font-bold rounded-[10px] transition-all ${isLoginTab
                ? "bg-white text-[#0066ff] shadow-xs"
                : "text-[#666666] hover:text-[#1b1b20]"
                }`}
            >
              Masuk Akun
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLoginTab(false);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-[13px] font-bold rounded-[10px] transition-all ${!isLoginTab
                ? "bg-white text-[#0066ff] shadow-xs"
                : "text-[#666666] hover:text-[#1b1b20]"
                }`}
            >
              Daftar Baru
            </button>
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-[12px] bg-rose-50 border border-rose-200 text-rose-800 text-[12.5px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12.5px] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4 text-[13px]">
            <div>
              <label className="font-bold text-[#1b1b20] block mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
                <input
                  type="email"
                  placeholder="admin@wabot.id"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[12px] focus:outline-none focus:border-[#0066ff] text-[13px]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-[#1b1b20] block mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
                <input
                  type="password"
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#f6f6f7] border border-[#e8e8eb] rounded-[12px] focus:outline-none focus:border-[#0066ff] text-[13px]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-2.5 !rounded-[12px] !text-[14px] shadow-sm mt-2"
            >
              <span>{loading ? "Memproses..." : isLoginTab ? "Masuk ke Dashboard" : "Buat Akun Baru"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[12px] text-[#666666]">
          Lampung Cerdas &copy; 2026 • Sistem Konsultan Edukasi & Sales AI
        </p>
      </div>
    </div>
  );
}
