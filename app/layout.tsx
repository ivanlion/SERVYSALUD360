/**
 * Layout principal de la aplicación Next.js
 * 
 * Configura las fuentes, metadata y estructura base del HTML
 * 
 * @module app/layout
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SERVYSALUD 360 - Trabajo Modificado",
  description: "Sistema de gestión de trabajo modificado para Servysalud. Gestión de casos, evaluación de capacidades funcionales y seguimiento de restricciones laborales.",
  keywords: ["salud ocupacional", "trabajo modificado", "servysalud", "seguridad laboral", "gestión de casos"],
  authors: [{ name: "Servysalud 360" }],
  robots: "noindex, nofollow", // Cambiar según necesidades de SEO
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
