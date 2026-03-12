import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyANHR5YCQrEQ-JG07mX-r38ht_7cWwsA8I",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "quail-67.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://quail-67-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "quail-67",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "quail-67.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "458809179973",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:458809179973:web:94452e121f7df60bbac82c"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
