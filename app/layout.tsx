import type { Metadata } from "next";
import "./globals.css";
import "./ui-cleanup.css";

export const metadata: Metadata = {
  title: "Pragma Works Cotizador Pro",
  description: "Cotizador comercial para servicios de software, automatización, soporte e IA.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
