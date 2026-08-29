import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConsentGate from "@/components/ConsentGate";
import HowToPrelude from "@/components/HowToPrelude";
import { LanguageProvider } from "@/components/LanguageProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SNIPER",
  description:
    "Build a stock portfolio with clear buy, sell, and exit levels — no experience needed.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="bg-black font-sans text-terminal-text antialiased">
        <LanguageProvider>
          {children}
          <ConsentGate />
          <HowToPrelude />
        </LanguageProvider>
      </body>
    </html>
  );
}
