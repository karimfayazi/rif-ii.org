import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Regional Infrastructure Fund – II in Khyber Pakhtunkhwa for RESILIENT RESOURCE MANAGEMENT IN CITIES (RRMIC)",
  description: "RIF-II Management Information System - Resilient Resource Management in Cities"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen" style={{ fontFamily: 'Calibri, "Segoe UI", Arial, Helvetica, sans-serif' }}>
        <main className="w-full max-w-none">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
