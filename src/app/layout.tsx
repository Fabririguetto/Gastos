import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar, BottomNav } from "@/components/layout/Sidebar";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
        style={{ background: "var(--bg)", color: "var(--text-primary)" }}
      >
        {/* Desktop sidebar */}
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
          }}
        >
          {/* Sidebar — hidden on mobile via CSS */}
          <div className="hidden md:block">
            <Sidebar />
          </div>

          {/* Main content */}
          <main
            style={{
              flex: 1,
              overflowX: "hidden",
            }}
            className="md:ml-[220px] pb-20 md:pb-0"
          >
            {children}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
