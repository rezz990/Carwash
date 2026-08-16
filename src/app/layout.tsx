import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/toast/ToastProvider";
import "./globals.css";
import { MotionConfig } from "@/components/animation/MotionConfig";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Carwash Management",
  description: "Aplikasi Point of Sale untuk usaha steam cuci mobil dan motor",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
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
          <ToastProvider>{children}</ToastProvider>
        </MotionConfig>
      </body>
    </html>
  );
}