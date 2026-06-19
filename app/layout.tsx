import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { ScoutProvider } from "@/components/scout-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap"
});

export const metadata: Metadata = {
  title: {
    default: "GenLayer Scout",
    template: "%s - GenLayer Scout"
  },
  description:
    "Local experiment, evidence, and contribution tracking for GenLayer builders."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable}`}>
        <ScoutProvider>
          <AppShell>{children}</AppShell>
        </ScoutProvider>
      </body>
    </html>
  );
}
