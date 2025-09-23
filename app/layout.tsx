import type { Metadata } from "next";
import { DM_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { PreferencesProvider } from "@/lib/contexts/preferences-context";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://getbinda.com";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Binda - Your Business, Organized with Simplicity and Ease",
  description: "Smart, compliant, and stress-free business solutions tailored to your business's needs. Professional accounting, customer management, and invoicing tools.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/Binda-icon.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/Binda-icon.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/Binda-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "icon",
        url: "/Binda-icon.png",
        sizes: "any",
      },
    ],
  },
};

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  display: "swap",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  fallback: ["monospace"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={dmMono.variable}>
      <body className={`${dmMono.variable} font-mono antialiased bg-brand-underworld`}>
        <NuqsAdapter>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            forcedTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <PreferencesProvider>
              {children}
              <Toaster position="bottom-right" richColors />
            </PreferencesProvider>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
