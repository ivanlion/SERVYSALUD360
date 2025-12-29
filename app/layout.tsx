/**
 * Layout principal de la aplicación Next.js
 * 
 * Configura las fuentes, metadata y estructura base del HTML
 * Incluye estructura Sidebar + Contenido estilo HealthGuard
 * 
 * @module app/layout
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "../components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema de Gestión de Salud Ocupacional",
  description: "Sistema de gestión de trabajo modificado para Servysalud. Gestión de casos, evaluación de capacidades funcionales y seguimiento de restricciones laborales.",
  keywords: ["salud ocupacional", "trabajo modificado", "servysalud", "seguridad laboral", "gestión de casos"],
  authors: [{ name: "Sistema de Gestión de Salud Ocupacional" }],
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
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  let effectiveTheme = 'light';
                  
                  if (theme === 'dark' || (theme === 'system' && systemDark) || (!theme && systemDark)) {
                    effectiveTheme = 'dark';
                  }
                  
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(effectiveTheme);
                  if (effectiveTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                  document.documentElement.setAttribute('data-theme', effectiveTheme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
