
// app/firebaseConfig.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAGGmuFpR0qkCHLI3q2cPv_o3cQlbIU8lE",
  authDomain: "copilotx-ai.firebaseapp.com",
  projectId: "copilotx-ai",
  storageBucket: "copilotx-ai.firebasestorage.app",
  messagingSenderId: "442817370861",
  appId: "1:442817370861:web:7ad73b592a1680db5f0ae4"
};

// ✅ Initialize app only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ✅ Export both app and auth (for Navbar + AuthModal)
export const auth = getAuth(app);
export { app };