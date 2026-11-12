import type { Metadata, Viewport } from "next";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/onest";
import "../globals.css";

export const metadata: Metadata = {
  title: "Хужирт · Админ",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: "#f2f9fe",
  width: "device-width",
  initialScale: 1,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <body className="min-h-dvh bg-sky-50">{children}</body>
    </html>
  );
}
