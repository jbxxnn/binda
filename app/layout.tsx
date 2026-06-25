import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Binda Business Assistant",
  description: "WhatsApp-first business assistant for vendors in Minna."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
