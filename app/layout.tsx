import "./globals.css";
import Script from "next/script";
import { ReactNode } from "react";
import ClientLayout from "./client-layout";

export const metadata = {
  title: "CopilotX AI",
  description: "AI Interview & Resume Assistant",
};

// ✅ Proper HTML + BODY structure required by Next.js
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/js/all.min.js"
          strategy="afterInteractive"
        />
      </head>
      <body className="bg-black text-white min-h-screen overflow-x-hidden">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}