import type { Metadata, Viewport } from "next";
import { Hind } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/components/lang";
import { SwRegister } from "@/components/SwRegister";
import { BRAND } from "@/lib/brand";

const hind = Hind({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-hind",
});

export const metadata: Metadata = {
  title: { default: BRAND, template: `%s · ${BRAND}` },
  description: "Order from your distributor in a minute: your prices, today's stock and schemes.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0F6B4A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={hind.variable}>
      <body className="font-sans">
        <LangProvider>{children}</LangProvider>
        <SwRegister />
      </body>
    </html>
  );
}
