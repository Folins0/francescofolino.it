import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shoganails",
  description:
    "Nail art e cura delle unghie. Prenota un appuntamento: ti risponderemo su WhatsApp.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Shoganails",
  },
};

export const viewport: Viewport = {
  themeColor: "#f97148",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="font-body text-stone-800 antialiased">{children}</body>
    </html>
  );
}
