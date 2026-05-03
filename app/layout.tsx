import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FractalMind — Spatial AI Knowledge Synthesizer",
  description:
    "An infinite-canvas thinking environment where ideas grow, branch, and synthesize. Powered by an AI that thinks in graphs.",
  applicationName: "FractalMind",
  keywords: [
    "AI",
    "knowledge graph",
    "mind map",
    "spatial thinking",
    "GPT",
    "ontology",
    "creativity",
  ],
  authors: [{ name: "FractalMind" }],
  openGraph: {
    title: "FractalMind",
    description:
      "Grow a living mind-map of concepts on an infinite canvas, powered by AI.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#08080b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} dark`}>
      <body className="bg-ink-950 text-neutral-100 antialiased selection:bg-violet-500/40 selection:text-white">
        {children}
      </body>
    </html>
  );
}
