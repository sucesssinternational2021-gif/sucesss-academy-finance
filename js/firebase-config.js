// ============================================
// FIREBASE CONFIG - Success Model International Academy
// ============================================

// REPLACE WITH YOUR ACTUAL FIREBASE CONFIG FROM CONSOLE
const firebaseConfig = {
    apiKey: "AIzaSyC-Xz6BftZJf96JDZu...", // Your complete key
    authDomain: "success-academy.firebaseapp.com",
    projectId: "success-academy",
    storageBucket: "success-academy.appspot.com",
    messagingSenderId: "123456789012", // Your number
    appId: "1:123456789012:web:abcdef1234567890abcdef" // Your app ID
};

// ============================================
// DO NOT MODIFY BELOW
// ============================================

// Initialize Firebase
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized for Success Academy");
}

// Make services available globally
if (typeof firebase !== 'undefined') {
    window.firebaseAuth = firebase.auth();
    window.firebaseDB = firebase.firestore();
    window.firebaseStorage = firebase.storage();
    
    // Configure Firestore
    firebase.firestore().settings({
        timestampsInSnapshots: true
    });
}

console.log("🚀 Firebase configuration loaded");
