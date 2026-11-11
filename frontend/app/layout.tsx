import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider, ToastPortal, ToastViewport } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReviewPilot",
  description: "AI-powered code review and design tokens",
};

const themeScript = `(function() {
  try {
    var stored = localStorage.getItem('reviewpilot-theme');
    var isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-150">
        <ThemeProvider>
          <Providers>
            <ToastProvider>
              {children}
              <ToastPortal>
                <ToastViewport />
              </ToastPortal>
            </ToastProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
