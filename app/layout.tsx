import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConsentGate from "@/components/ConsentGate";
import HowToPrelude from "@/components/HowToPrelude";
import { LanguageProvider } from "@/components/LanguageProvider";
import { AccountsProvider } from "@/components/AccountsProvider";
import SaveBookPrompt from "@/components/SaveBookPrompt";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
  // Keyboard on iPhone resizes layout so modals/inputs stay visible.
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "SNIPER",
  description:
    "Build a stock portfolio with clear buy, sell, and exit levels — no experience needed.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SNIPER",
  },
  formatDetection: {
    telephone: false,
  },
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
          <AccountsProvider>
            {children}
            <ConsentGate />
            <HowToPrelude />
            <SaveBookPrompt />
          </AccountsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
