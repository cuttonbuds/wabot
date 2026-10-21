import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";
import AppLayoutWrapper from "@/components/AppLayoutWrapper";
import {
  readPublicEnvFromProcess,
  serializePublicEnvScript,
} from "@/lib/public-env";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Opt the whole app into request-time rendering so the public config below
  // reflects the environment the server is running in, not the one it was
  // built in. See src/lib/public-env.ts.
  await connection();
  const publicEnv = readPublicEnvFromProcess();

  return (
    <html lang="id" className="h-full bg-[#f6f6f7] antialiased">
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: serializePublicEnvScript(publicEnv) }}
        />
      </head>
      <body className="min-h-full bg-[#f6f6f7] text-[#1b1b20]">
        <AppLayoutWrapper>{children}</AppLayoutWrapper>
      </body>
    </html>
  );
}
