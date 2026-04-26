import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Libre_Baskerville } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { TrustHelpRail } from "@/components/trust-help-rail";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

const serif = Libre_Baskerville({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Operon AI — Scientific Planning Copilot",
  description:
    "Operon AI turns scientific hypotheses into grounded, lab-executable experiment plans for the AI Scientist challenge.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 min-w-0 bg-[#F7F6F2]">
          <div className="flex min-h-screen">
            <main className="flex-1 min-w-0 overflow-y-auto bg-[#F7F6F2]">{children}</main>
            <TrustHelpRail />
          </div>
        </div>
      </body>
    </html>
  );
}
