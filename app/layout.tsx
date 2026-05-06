import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spingarn | Portal del Cliente",
  description: "Portal de clientes — Spingarn Integrated Business Consulting",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
