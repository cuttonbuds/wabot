import type { Metadata } from "next";
import "./globals.css";
import AppLayoutWrapper from "@/components/AppLayoutWrapper";

export const metadata: Metadata = {
  title: "WhatsApp AI Sales & CS Agent - Lampung Cerdas",
  description:
    "Platform Otomasi WhatsApp Sales & CS Berbasis AI untuk Program Lampung Cerdas",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full bg-[#f6f6f7] antialiased">
      <body className="min-h-full bg-[#f6f6f7] text-[#1b1b20]">
        <AppLayoutWrapper>{children}</AppLayoutWrapper>
      </body>
    </html>
  );
}
