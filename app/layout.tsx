import type { Metadata } from "next";
import "./globals.css";
import ConsentGate from "@/components/ConsentGate";
import { LanguageProvider } from "@/components/LanguageProvider";

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
    <html lang="en">
      <body className="bg-terminal-bg text-terminal-text font-mono antialiased">
        <LanguageProvider>
          {children}
          <ConsentGate />
        </LanguageProvider>
      </body>
    </html>
  );
}
