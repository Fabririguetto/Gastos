import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar, BottomNav } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import { RegisterSW } from "@/components/pwa/RegisterSW";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gastos — Control financiero personal",
  description: "App de control de gastos personales para Argentina",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gastos",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <RegisterSW />
        <ToastProvider>
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <div className="hidden md:block">
              <Sidebar />
            </div>
            <main style={{ flex: 1, minWidth: 0, overflowX: "hidden" }} className="mobile-safe-bottom md:pb-0">
              {children}
            </main>
          </div>
          <div className="md:hidden">
            <BottomNav />
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
