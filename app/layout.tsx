import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { TenantProvider } from "@/lib/tenant/context";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Binda - Multi-Tenant Booking & Walk-In Management",
  description: "Salon booking and walk-in management SaaS",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased bg-[linear-gradient(-45deg,#FFF6F3,#FFE7F0,#E8F9FF,#F6FFFD)] bg-[length:400%_400%] animate-gradient`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TenantProvider>
            {children}
            <Toaster position="top-right" />
          </TenantProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
