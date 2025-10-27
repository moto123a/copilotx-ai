"use client";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="relative bg-gradient-to-t from-black via-zinc-900 to-black text-gray-300 py-12 border-t border-gray-800">
      <div className="container mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-8">
        
        {/* Left: Logo + Brand */}
        <div className="flex items-center space-x-3">
          <Image
            src="/logo.png"
            alt="CopilotX AI"
            width={45}
            height={45}
            className="rounded-lg hover:scale-105 transition-transform"
          />
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            CopilotX AI
          </span>
        </div>

        {/* Center: Links */}
        <div className="flex flex-wrap justify-center gap-6 text-sm md:text-base">
          <a href="#features" className="hover:text-cyan-400 transition-all duration-300">Features</a>
          <a href="#how" className="hover:text-cyan-400 transition-all duration-300">How it Works</a>
          <a href="#pricing" className="hover:text-cyan-400 transition-all duration-300">Pricing</a>
          <a href="#contact" className="hover:text-cyan-400 transition-all duration-300">Contact</a>
        </div>

        {/* Right: Social Icons */}
        <div className="flex space-x-6 text-gray-400 text-xl">
          {/* X / Twitter */}
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
             className="hover:text-cyan-400 transition-all duration-300 hover:scale-110">
            <i className="fa-brands fa-x-twitter"></i>
          </a>

          {/* Instagram */}
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
             className="hover:text-pink-500 transition-all duration-300 hover:scale-110">
            <i className="fa-brands fa-instagram"></i>
          </a>

          {/* Meta / Facebook */}
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
             className="hover:text-blue-500 transition-all duration-300 hover:scale-110">
            <i className="fa-brands fa-meta"></i>
          </a>

          {/* LinkedIn */}
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
             className="hover:text-blue-400 transition-all duration-300 hover:scale-110">
            <i className="fa-brands fa-linkedin"></i>
          </a>

          {/* GitHub */}
          <a href="https://github.com" target="_blank" rel="noopener noreferrer"
             className="hover:text-gray-300 transition-all duration-300 hover:scale-110">
            <i className="fa-brands fa-github"></i>
          </a>
        </div>
      </div>

      {/* Bottom Line */}
      <div className="mt-10 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} <span className="text-cyan-400">CopilotX AI</span>. All rights reserved.
      </div>

      {/* Neon glow underline */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 shadow-[0_0_15px_#06b6d4]" />
    </footer>
  );
}