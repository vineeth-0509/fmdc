import type { Metadata, Viewport } from "next";
import { Hind } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/components/lang";
import { SwRegister } from "@/components/SwRegister";

const hind = Hind({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-hind",
});

export const metadata: Metadata = {
  title: { default: "Company A Orders", template: "%s · Company A Orders" },
  description: "Order from your distributor in a minute: your prices, today's stock and schemes.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1E4D3A",
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
