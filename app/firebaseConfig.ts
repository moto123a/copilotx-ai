// app/firebaseConfig.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // 1. Added this import

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

// ✅ Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app); // 2. Added this line to initialize Firestore
export { app };