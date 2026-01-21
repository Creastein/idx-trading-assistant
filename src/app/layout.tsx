import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import { SettingsProvider } from "@/components/SettingsContext";
import WhatsNewModal from "@/components/WhatsNewModal";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IDX Trading Assistant | AI-Powered Stock Analysis",
  description: "AI-powered trading assistant for Indonesian stocks (IDX) with chart analysis and market data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-background`}
      >
        <SettingsProvider>
          {children}
          <DisclaimerBanner />
          <WhatsNewModal />
          <Toaster
            position="top-right"
            theme="dark"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              },
            }}
          />
        </SettingsProvider>
      </body>
    </html>
  );
}

