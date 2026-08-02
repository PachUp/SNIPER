import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConsentGate from "@/components/ConsentGate";
import { LanguageProvider } from "@/components/LanguageProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SNIPER",
  description: "Precision stock portfolio builder",
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
        </LanguageProvider>
      </body>
    </html>
  );
}
