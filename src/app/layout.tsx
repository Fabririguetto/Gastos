import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar, BottomNav } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
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
