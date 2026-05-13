import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#C8007A",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Spingarn | Portal del Cliente",
  description: "Portal de clientes — Spingarn Integrated Business Consulting",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Spingarn Portal",
  },
  icons: {
    apple: "/logo.png",
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
