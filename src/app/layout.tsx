import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { IdleShutdown } from "@/components/global/IdleShutdown";
import { ToastProvider } from "@/components/global/ToastContainer";
import { ClientLayout } from "@/components/global/ClientLayout";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Ruby News Studio — AI News Orchestrator",
  description:
    "Autonomous AI-powered news channel. Scrape, script, and render professional vertical videos featuring virtual anchor Ruby.",
  keywords: ["AI", "news", "video", "automation", "Ruby", "Remotion"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans bg-background text-foreground antialiased`}>
          <ToastProvider>
            <IdleShutdown />
            <div className="min-h-screen bg-background text-foreground">
              <ClientLayout>{children}</ClientLayout>
            </div>
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
