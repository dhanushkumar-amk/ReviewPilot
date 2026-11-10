import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider, ToastPortal, ToastViewport } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReviewPilot",
  description: "AI-powered code review and design tokens",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          {children}
          <ToastPortal>
            <ToastViewport />
          </ToastPortal>
        </ToastProvider>
      </body>
    </html>
  );
}
