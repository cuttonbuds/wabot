"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";

export default function AppLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/auth");

  if (isAuthPage) {
    return <main className="min-h-screen bg-[#f6f6f7]">{children}</main>;
  }

  return (
    <div className="min-h-screen flex bg-[#f6f6f7] text-[#1b1b20] overflow-x-hidden">
      {/* Sidebar (Desktop Permanent + Mobile Off-Canvas Drawer) */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-[1400px] mx-auto p-3 sm:p-5 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
