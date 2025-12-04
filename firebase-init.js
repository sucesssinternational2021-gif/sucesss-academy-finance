// firebase-init.js
// Initialize Firebase for Sucesss Model International Academy

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);      // Firestore Database
const auth = getAuth(app);         // Authentication
const storage = getStorage(app);   // Storage

// Make available globally
window.firebaseApp = app;
window.db = db;
window.auth = auth;
window.storage = storage;

console.log("✅ Firebase initialized for Sucesss Model International Academy");
