"use client";
import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../app/firebaseConfig";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ✅ Track Firebase authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  // ✅ Logout handler
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setShowMenu(false);
  };

  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-black text-white border-b border-gray-800 relative">
      {/* ✅ Logo */}
      <h1 className="text-2xl font-bold text-cyan-400 cursor-pointer hover:scale-105 transition-transform">
        CopilotX AI
      </h1>

      {/* ✅ Right Section */}
      <div className="relative flex items-center space-x-4">
        {!user ? (
          <>
            {/* Login / Signup Button */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-cyan-500 text-black px-4 py-2 rounded-md font-semibold hover:bg-cyan-400 transition"
            >
              Login / Signup
            </button>

            {/* Auth Modal */}
            {showAuthModal && (
              <AuthModal onClose={() => setShowAuthModal(false)} />
            )}
          </>
        ) : (
          <>
            {/* ✅ Profile Icon */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="focus:outline-none"
              >
                <img
                  src={
                    user.photoURL ||
                    "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                  }
                  alt="Profile"
                  className="w-10 h-10 rounded-full border-2 border-cyan-400 hover:scale-105 transition-transform"
                />
              </button>

              {/* ✅ Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-3 z-50">
                  <p className="text-cyan-400 font-semibold text-sm mb-2 truncate">
                    {user.displayName || user.email}
                  </p>
                  <hr className="border-gray-700 mb-2" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 transition text-sm"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </nav>
  );
}