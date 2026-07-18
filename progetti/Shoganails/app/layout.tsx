import type { Metadata, Viewport } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
});

const DESCRIZIONE =
  "Nail art e cura delle unghie. Prenota un appuntamento: ti risponderemo su WhatsApp.";

export const metadata: Metadata = {
  metadataBase: new URL("https://shoganails.ch"),
  title: "Shoganails",
  description: DESCRIZIONE,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Shoganails",
  },
  openGraph: {
    title: "Shoganails",
    description: DESCRIZIONE,
    url: "https://shoganails.ch",
    siteName: "Shoganails",
    locale: "it_IT",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Shoganails — nail art fatto a mano",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shoganails",
    description: DESCRIZIONE,
    images: ["/og-image.jpg"],
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
    <html lang="it" className={`${playfair.variable} ${poppins.variable}`}>
      <body className="font-body text-stone-800 antialiased">{children}</body>
    </html>
  );
}
