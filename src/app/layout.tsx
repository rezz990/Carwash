import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/toast/ToastProvider";
import "./globals.css";
import { MotionConfig } from "@/components/animation/MotionConfig";
import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bujon | Steam Cuci Mobil & Motor",
  description: "Aplikasi Point of Sale untuk usaha steam cuci mobil dan motor",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#facc15",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <MotionConfig>
          <AuthSessionProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthSessionProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
