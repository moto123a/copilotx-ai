"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import Footer from "../components/Footer";
import { useEffect, useState } from "react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // ✅ Hide layout for specific paths (like editor)
  const hideLayout = pathname.startsWith("/resume/editor");

  return (
    <>
      {/* ✅ Navbar removed completely (you already have it inside page.tsx) */}

      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="flex flex-col min-h-[80vh]"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      {/* ✅ Keep Footer visible unless on hidden layout path */}
      {!hideLayout && <Footer />}
    </>
  );
}
