import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Script from "next/script";
import { ReactNode } from "react";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// ✅ Metadata must stay in a SERVER component (no "use client" here)
export const metadata = {
  title: "CopilotX AI",
  description: "AI Interview & Resume Assistant",
};

// ✅ Define RootLayout as server-side, and load a ClientLayout inside it
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/js/all.min.js"
          strategy="afterInteractive"
        />
      </head>
      <body className="bg-black text-white min-h-screen overflow-x-hidden"
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

// ✅ Import Client Layout below (client-only animations)
import ClientLayout from "./client-layout";