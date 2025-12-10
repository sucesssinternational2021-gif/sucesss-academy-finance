// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-Xz6BftZJf96JDZu-fUUlR-ldGYG-2gI",
  authDomain: "sucesss-academy.firebaseapp.com",
  projectId: "sucesss-academy",
  storageBucket: "sucesss-academy.firebasestorage.app",
  messagingSenderId: "274982692906",
  appId: "1:274982692906:web:5e39a38451725a3cd13b53",
  measurementId: "G-QLX11V1YHQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
