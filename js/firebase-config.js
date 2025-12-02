// ============================================
// FIREBASE CONFIG - Sucesss Model International Academy
// ============================================

// REPLACE WITH YOUR ACTUAL FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyC-Xz6BftZJf96JDZu...",
    authDomain: "sucesss-academy.firebaseapp.com",
    projectId: "sucesss-academy",
    storageBucket: "sucesss-academy.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890abcdef"
};

// ============================================
// DO NOT MODIFY BELOW
// ============================================

// Initialize Firebase
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized for Sucesss Academy");
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

console.log("🚀 Firebase configuration loaded for Sucesss Academy");
