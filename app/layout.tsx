import type { Metadata } from "next";
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
  title: "ChamoEntregas | Entregas en Coloncito",
  description:
    "ChamoEntregas conecta comida, paquetes y mandados en Coloncito, Táchira con entregas rápidas y confiables.",
  icons: {
    icon: "/brand/logo-mascota.svg",
  },
  appleWebApp: {
    capable: true,
    title: "ChamoEntregas",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#fffdfb] text-slate-900">{children}</body>
    </html>
  );
}
