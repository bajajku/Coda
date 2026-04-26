import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AnimatedBackdrop from "@/components/layout/AnimatedBackdrop";
import Navbar from "@/components/layout/Navbar";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Celestial Archive — AI Content Studio",
  description: "Generate videos, quizzes, flashcards, and mind maps from your notes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable} ${jetbrains.variable}`}
      style={{ height: "100%" }}
    >
      <body
        className="min-h-full m-0"
        style={{ background: "var(--cosmic-base)", color: "var(--text-primary)" }}
        suppressHydrationWarning
      >
        <AnimatedBackdrop>
          <Navbar />
          <main className="pt-20 pb-12 min-h-screen">{children}</main>
        </AnimatedBackdrop>
      </body>
    </html>
  );
}
