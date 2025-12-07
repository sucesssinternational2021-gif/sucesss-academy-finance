// Updated pupils-system.js with Authentication

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
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Global variables
let allPupils = [];
let currentFilter = 'all';
let currentUser = null;

// DOM Elements
const addPupilSection = document.getElementById('addPupilSection');
const pupilsListSection = document.getElementById('pupilsListSection');
const dashboardSection = document.getElementById('dashboardSection');
const classSection = document.getElementById('classSection');
const classTitle = document.getElementById('classTitle');
const classPupilsList = document.getElementById('classPupilsList');
const pupilsTableBody = document.getElementById('pupilsTableBody');
const loadingSpinner = document.getElementById('loadingSpinner');
const noPupilsMessage = document.getElementById('noPupilsMessage');
const searchInput = document.getElementById('searchInput');

// Add login modal HTML to the page
document.addEventListener('DOMContentLoaded', function() {
    // Create and add login modal
    const loginModalHTML = `
        <div class="modal fade" id="loginModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-lock me-2"></i>
                            Success Model International Academy
                        </h5>
                    </div>
                    <div class="modal-body">
                        <div id="loginForm">
                            <h4 class="text-center mb-4">Admin Login</h4>
                            <div class="mb-3">
                                <label for="loginEmail" class="form-label">Email Address</label>
                                <input type="email" class="form-control" id="loginEmail" 
                                       placeholder="admin@sucesssacademy.com">
                            </div>
                            <div class="mb-3">
                                <label for="loginPassword" class="form-label">Password</label>
                                <input type="password" class="form-control" id="loginPassword" 
                                       placeholder="Enter password">
                            </div>
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input" id="rememberMe">
                                <label class="form-check-label" for="rememberMe">Remember me</label>
                            </div>
                            <div class="d-grid gap-2">
                                <button type="button" class="btn btn-primary" onclick="loginUser()">
                                    <i class="fas fa-sign-in-alt me-2"></i> Login
                                </button>
                                <button type="button" class="btn btn-outline-secondary" onclick="setupDefaultAdmin()">
                                    Setup Default Admin Account
                                </button>
                            </div>
                            <div class="mt-3 text-center">
                                <small class="text-muted">
                                    For security, this system requires authentication
                                </small>
                            </div>
                        </div>
                        <div id="loginMessage" class="mt-3" style="display: none;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = loginModalHTML;
    document.body.appendChild(modalContainer.firstChild);
    
    // Show login modal
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
    
    // Set up authentication state listener
    setupAuthListener();
    
    // Set today's date for date fields
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('dateOfEntry')) {
        document.getElementById('dateOfEntry').value = today;
    }
    
    // Setup event listeners
    if (document.getElementById('hasLeft')) {
        document.getElementById('hasLeft').addEventListener('change', function() {
            const dateLeftSection = document.getElementById('dateLeftSection');
            dateLeftSection.style.display = this.checked ? 'block' : 'none';
            if (this.checked && document.getElementById('dateLeft')) {
                document.getElementById('dateLeft').value = today;
            }
        });
    }
    
    // Generate pupil ID if field is empty
    if (document.getElementById('pupilId')) {
        document.getElementById('pupilId').addEventListener('focus', function() {
            if (!this.value) {
                generatePupilId();
            }
        });
    }
});

// Setup authentication state listener
function setupAuthListener() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            console.log("User logged in:", user.email);
            
            // Hide login modal
            const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            if (loginModal) {
                loginModal.hide();
            }
            
            // Show admin info in sidebar
            updateAdminInfo(user);
            
            // Load pupils data
            loadPupils();
            
            // Enable form submission
            if (document.getElementById('pupilForm')) {
                document.getElementById('pupilForm').onsubmit = savePupil;
            }
        } else {
            currentUser = null;
            console.log("No user logged in");
            
            // Show login modal
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
            
            // Clear pupils data
            allPupils = [];
            updatePupilsTable();
            
            // Disable form submission
            if (document.getElementById('pupilForm')) {
                document.getElementById('pupilForm').onsubmit = function(e) {
                    e.preventDefault();
                    alert("Please login to add pupils");
                };
            }
        }
    });
}

// Login function
function loginUser() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!email || !password) {
        showLoginMessage("Please enter email and password", "danger");
        return;
    }
    
    const persistence = rememberMe ? 
        firebase.auth.Auth.Persistence.LOCAL : 
        firebase.auth.Auth.Persistence.SESSION;
    
    auth.setPersistence(persistence)
        .then(() => {
            return auth.signInWithEmailAndPassword(email, password);
        })
        .then((userCredential) => {
            showLoginMessage("Login successful!", "success");
        })
        .catch((error) => {
            console.error("Login error:", error);
            
            if (error.code === 'auth/user-not-found') {
                showLoginMessage("User not found. Would you like to create an admin account?", "warning");
                // Optionally show create account button
            } else if (error.code === 'auth/wrong-password') {
                showLoginMessage("Incorrect password", "danger");
            } else {
                showLoginMessage(error.message, "danger");
            }
        });
}

// Setup default admin account (for first-time setup)
function setupDefaultAdmin() {
    const email = "admin@sucesssacademy.com";
    const password = "SuccessModel2023!";
    
    // First try to sign in
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            showLoginMessage("Signed in with default admin account", "success");
        })
        .catch((error) => {
            if (error.code === 'auth/user-not-found') {
                // Create the admin account
                auth.createUserWithEmailAndPassword(email, password)
                    .then((userCredential) => {
                        showLoginMessage("Default admin account created! Email: admin@sucesssacademy.com, Password: SuccessModel2023!", "success");
                        
                        // Update user profile
                        return userCredential.user.updateProfile({
                            displayName: "System Administrator"
                        });
                    })
                    .then(() => {
                        console.log("Default admin setup complete");
                    })
                    .catch((createError) => {
                        console.error("Error creating admin:", createError);
                        showLoginMessage("Error creating admin account: " + createError.message, "danger");
                    });
            } else {
                showLoginMessage("Error: " + error.message, "danger");
            }
        });
}

// Show login message
function showLoginMessage(message, type) {
    const messageDiv = document.getElementById('loginMessage');
    messageDiv.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    messageDiv.style.display = 'block';
}

// Update admin info in sidebar
function updateAdminInfo(user) {
    const adminInfoDiv = document.querySelector('.sidebar .text-center');
    if (adminInfoDiv && user) {
        adminInfoDiv.innerHTML = `
            <div class="mb-3">
                <i class="fas fa-user-circle fa-3x"></i>
            </div>
            <p class="mb-0">${user.displayName || user.email}</p>
            <small>Administrator</small>
            <div class="mt-2">
                <button class="btn btn-sm btn-outline-light" onclick="logoutUser()">
                    <i class="fas fa-sign-out-alt me-1"></i> Logout
                </button>
            </div>
        `;
    }
}

// Logout function
function logoutUser() {
    if (confirm("Are you sure you want to logout?")) {
        auth.signOut()
            .then(() => {
                console.log("User logged out");
                // Clear pupils data
                allPupils = [];
                updatePupilsTable();
                
                // Reset admin info
                const adminInfoDiv = document.querySelector('.sidebar .text-center');
                if (adminInfoDiv) {
                    adminInfoDiv.innerHTML = `
                        <div class="mb-3">
                            <i class="fas fa-user-circle fa-3x"></i>
                        </div>
                        <p class="mb-0">Admin Portal</p>
                        <small>Success Model International Academy</small>
                    `;
                }
            })
            .catch((error) => {
                console.error("Logout error:", error);
            });
    }
}

// Updated Firestore Security Rules (for production):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write only if they are authenticated
    match /pupils/{pupilId} {
      allow read, write: if request.auth != null;
    }
    
    // Optional: Add admin specific rules
    match /admin/{adminId} {
      allow read, write: if request.auth != null && 
        request.auth.token.email == "admin@sucesssacademy.com";
    }
  }
}
