"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../app/firebaseConfig";

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async () => {
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-gray-900 text-white p-6 rounded-lg shadow-xl w-96 border border-gray-700"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
        >
          <h2 className="text-2xl font-bold mb-4 text-center text-cyan-400">
            {isSignUp ? "Sign Up" : "Login"}
          </h2>

          {error && (
            <p className="text-red-400 text-sm mb-3 text-center">{error}</p>
          )}

          <input
            type="email"
            placeholder="Email"
            className="w-full mb-3 px-3 py-2 rounded bg-gray-800 text-white focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full mb-4 px-3 py-2 rounded bg-gray-800 text-white focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleAuth}
            className="w-full bg-cyan-500 text-black py-2 rounded font-semibold hover:bg-cyan-400 transition"
          >
            {isSignUp ? "Create Account" : "Login"}
          </button>

          <button
            onClick={handleGoogleLogin}
            className="w-full mt-3 bg-white text-black py-2 rounded font-semibold hover:bg-gray-300 transition"
          >
            Continue with Google
          </button>

          <p className="text-sm mt-4 text-center">
            {isSignUp ? "Already have an account?" : "Don’t have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-cyan-400 hover:underline"
            >
              {isSignUp ? "Login" : "Sign Up"}
            </button>
          </p>

          <button
            onClick={onClose}
            className="mt-4 text-sm text-gray-400 hover:text-gray-200 block mx-auto"
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}