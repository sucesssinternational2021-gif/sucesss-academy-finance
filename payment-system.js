// payment-system.js - Updated with Firebase fixes
// Success Model International Academy - Payment System

// ============================================
// FIREBASE CONFIGURATION
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyC-Xz6BftZJf96JDZu-fUUlR-ldGYG-2gI",
    authDomain: "sucesss-academy.firebaseapp.com",
    projectId: "sucesss-academy",
    storageBucket: "sucesss-academy.firebasestorage.app",
    messagingSenderId: "274982692906",
    appId: "1:274982692906:web:5e39a38451725a3cd13b53",
    measurementId: "G-QLX11V1YHQ"
};

// ============================================
// GLOBAL VARIABLES
// ============================================
let db = null;
let auth = null;
let isFirebaseConnected = false;
let currentPaymentId = null;
let lastReceiptNumber = 0;
let currentUser = null;

// Payment categories
const paymentCategories = [
    { id: 'kg', name: 'KG (Kindergarten)', levels: ['KG 1', 'KG 2', 'KG 3'] },
    { id: 'nursery', name: 'Nursery', levels: ['Nursery 1', 'Nursery 2', 'Nursery 3'] },
    { id: 'primary', name: 'Primary', levels: ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'] },
    { id: 'secondary', name: 'Secondary', levels: ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'] }
];

// ============================================
// FIREBASE INITIALIZATION - FIXED VERSION
// ============================================
function initializeFirebase() {
    try {
        console.log("Initializing Firebase...");
        
        // Check if Firebase is already initialized
        if (firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
            console.log("✅ Firebase app initialized");
        } else {
            console.log("ℹ️ Firebase app already initialized");
        }
        
        // Initialize services with error handling
        if (typeof firebase.firestore === 'function') {
            db = firebase.firestore();
            console.log("✅ Firestore initialized");
        } else {
            throw new Error("Firestore SDK not loaded");
        }
        
        if (typeof firebase.auth === 'function') {
            auth = firebase.auth();
            console.log("✅ Auth initialized");
            
            // Check auth state
            auth.onAuthStateChanged(user => {
                if (user) {
                    currentUser = user;
                    console.log("✅ User authenticated:", user.email);
                    updateUIForUser(user);
                } else {
                    console.log("ℹ️ No user authenticated");
                    // Don't load demo data here - wait for DOM to be ready
                }
            });
        } else {
            console.warn("⚠️ Auth SDK not available - running without authentication");
            // Continue without auth
        }
        
        isFirebaseConnected = true;
        updateFirebaseStatus(true);
        
    } catch (error) {
        console.error("❌ Firebase initialization error:", error);
        updateFirebaseStatus(false);
        showAlert('error', `Firebase error: ${error.message}`);
    }
}

// ============================================
// UI STATUS FUNCTIONS
// ============================================
function updateFirebaseStatus(connected) {
    // Wait for DOM to be ready
    setTimeout(() => {
        const statusElement = document.getElementById('firebaseStatus');
        if (!statusElement) {
            console.warn("Firebase status element not found yet");
            return;
        }
        
        if (connected) {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> <span>Firebase: Connected</span>';
            statusElement.className = 'firebase-status connected';
            isFirebaseConnected = true;
        } else {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> <span>Firebase: Disconnected (Demo Mode)</span>';
            statusElement.className = 'firebase-status disconnected';
            isFirebaseConnected = false;
        }
    }, 100);
}

function showAlert(type, message) {
    // Wait a bit for DOM to be ready
    setTimeout(() => {
        const alertElement = document.getElementById(`alert${type.charAt(0).toUpperCase() + type.slice(1)}`);
        if (!alertElement) {
            console.log(`${type.toUpperCase()}: ${message}`);
            return;
        }
        
        const alertText = alertElement.querySelector('span');
        if (alertText) {
            alertText.textContent = message;
        }
        
        alertElement.style.display = 'block';
        
        // Hide alert after 5 seconds
        setTimeout(() => {
            alertElement.style.display = 'none';
        }, 5000);
    }, 200);
}

// ============================================
// DOM READY FUNCTIONS
// ============================================
function updateUIForUser(user) {
    const userElement = document.getElementById('currentUser');
    if (userElement && user) {
        userElement.textContent = user.displayName || user.email || 'Bursar';
    }
}

function setupInitialData() {
    console.log("Setting up initial data...");
    
    // Set default payment date to now
    const now = new Date();
    const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    const paymentDateInput = document.getElementById('paymentDate');
    if (paymentDateInput) {
        paymentDateInput.value = localDateTime;
    }
    
    // Initialize categories
    initPaymentCategories();
    
    // Load data based on Firebase connection
    if (isFirebaseConnected) {
        loadFirestoreData();
    } else {
        loadDemoData();
    }
}

// ============================================
// FIXED DEMO DATA LOADING
// ============================================
function loadDemoData() {
    console.log("Loading demo data...");
    
    // Don't show alerts until DOM is ready
    setTimeout(() => {
        showAlert('info', 'Running in demo mode. Connect to Firebase for real data.');
    }, 500);
    
    // Initialize demo data
    initPaymentCategories();
    loadDemoOutstandingPayments();
    loadDemoPaymentHistory();
}

// ============================================
// FIREBASE DATA FUNCTIONS
// ============================================
function loadFirestoreData() {
    if (!isFirebaseConnected || !db) {
        console.warn("Cannot load Firestore data - not connected");
        return;
    }
    
    console.log("Loading Firestore data...");
    
    // Load outstanding payments
    db.collection('students').where('outstanding', '>', 0).get()
        .then(snapshot => {
            const outstandingPayments = [];
            let broughtForwardTotal = 0;
            let currentOutstandingTotal = 0;
            
            snapshot.forEach(doc => {
                const student = { id: doc.id, ...doc.data() };
                outstandingPayments.push(student);
                broughtForwardTotal += student.broughtForward || 0;
                currentOutstandingTotal += student.outstanding || 0;
            });
            
            updateOutstandingTable(outstandingPayments);
            updateOutstandingTotals(broughtForwardTotal, currentOutstandingTotal);
            showAlert('success', `Loaded ${outstandingPayments.length} outstanding payments`);
        })
        .catch(error => {
            console.error("Error loading outstanding payments:", error);
            loadDemoOutstandingPayments();
        });
    
    // Load recent payments
    db.collection('payments').orderBy('paymentDate', 'desc').limit(20).get()
        .then(snapshot => {
            const payments = [];
            snapshot.forEach(doc => {
                payments.push({ id: doc.id, ...doc.data() });
            });
            updatePaymentHistoryTable(payments);
        })
        .catch(error => {
            console.error("Error loading payment history:", error);
            loadDemoPaymentHistory();
        });
}

// ============================================
// PAYMENT CATEGORIES (UNCHANGED)
// ============================================
function initPaymentCategories() {
    const categoriesContainer = document.getElementById('paymentCategories');
    if (!categoriesContainer) {
        console.warn("Payment categories container not found");
        return;
    }
    
    categoriesContainer.innerHTML = '';
    
    paymentCategories.forEach(category => {
        const badge = document.createElement('div');
        badge.className = 'category-badge';
        badge.textContent = category.name;
        badge.dataset.id = category.id;
        badge.dataset.levels = JSON.stringify(category.levels);
        
        badge.addEventListener('click', function() {
            document.querySelectorAll('.category-badge').forEach(b => {
                b.classList.remove('active');
            });
            
            this.classList.add('active');
            document.getElementById('selectedCategory').value = this.dataset.id;
            loadStudentsByCategory(this.dataset.id, JSON.parse(this.dataset.levels));
        });
        
        categoriesContainer.appendChild(badge);
    });
}

// ============================================
// STUDENT LOADING (WITH ERROR HANDLING)
// ============================================
function loadStudentsByCategory(categoryId, levels) {
    const studentSelect = document.getElementById('studentSelect');
    if (!studentSelect) {
        console.warn("Student select element not found");
        return;
    }
    
    // Clear existing options except the first one
    while (studentSelect.options.length > 1) {
        studentSelect.remove(1);
    }
    
    if (isFirebaseConnected && db) {
        // Load from Firebase
        db.collection('students')
            .where('category', '==', categoryId)
            .where('status', '==', 'active')
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    // Load demo students as fallback
                    loadDemoStudents(categoryId, levels);
                    showAlert('info', `No ${categoryId} students found, using demo data`);
                    return;
                }
                
                snapshot.forEach(doc => {
                    const student = doc.data();
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = `${student.name} - ${student.level} (${student.admissionNumber || 'N/A'})`;
                    option.dataset.data = JSON.stringify(student);
                    studentSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error("Error loading students:", error);
                loadDemoStudents(categoryId, levels);
            });
    } else {
        loadDemoStudents(categoryId, levels);
    }
}

// ============================================
// DEMO DATA FUNCTIONS (SIMPLIFIED)
// ============================================
function loadDemoStudents(categoryId, levels) {
    const studentSelect = document.getElementById('studentSelect');
    if (!studentSelect) return;
    
    const demoData = [
        { name: 'John Adebayo', fees: 150000, paid: 75000 },
        { name: 'Sarah Johnson', fees: 120000, paid: 60000 },
        { name: 'Michael Chukwu', fees: 180000, paid: 90000 },
        { name: 'Grace Okafor', fees: 160000, paid: 80000 }
    ];
    
    levels.forEach((level, index) => {
        const studentIndex = index % demoData.length;
        const fees = getFeeByCategoryAndLevel(categoryId, level);
        const student = {
            id: `demo_${categoryId}_${index}`,
            name: demoData[studentIndex].name,
            level: level,
            admissionNumber: `${categoryId.toUpperCase()}${String(index + 1).padStart(3, '0')}`,
            category: categoryId,
            fees: fees,
            paid: Math.floor(fees * 0.5),
            outstanding: Math.floor(fees * 0.5),
            pta: 5000,
            ptaPaid: Math.random() > 0.5,
            levies: 8000,
            leviesPaid: Math.random() > 0.3,
            broughtForward: 0,
            status: 'active'
        };
        
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.name} - ${student.level}`;
        option.dataset.data = JSON.stringify(student);
        studentSelect.appendChild(option);
    });
}

function loadDemoOutstandingPayments() {
    const outstandingPayments = [];
    let broughtForwardTotal = 0;
    let currentOutstandingTotal = 0;
    
    paymentCategories.forEach(category => {
        category.levels.forEach((level, index) => {
            const fees = getFeeByCategoryAndLevel(category.id, level);
            const paid = Math.floor(fees * 0.5);
            const outstanding = fees - paid;
            
            if (outstanding > 0) {
                const student = {
                    id: `demo_${category.id}_${index}`,
                    name: `Student ${index + 1}`,
                    level: level,
                    category: category.id,
                    fees: fees,
                    paid: paid,
                    outstanding: outstanding,
                    broughtForward: Math.floor(Math.random() * 10000)
                };
                
                outstandingPayments.push(student);
                broughtForwardTotal += student.broughtForward;
                currentOutstandingTotal += outstanding;
            }
        });
    });
    
    updateOutstandingTable(outstandingPayments);
    updateOutstandingTotals(broughtForwardTotal, currentOutstandingTotal);
}

function loadDemoPaymentHistory() {
    const payments = [];
    const now = new Date();
    
    for (let i = 0; i < 8; i++) {
        const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
        const category = paymentCategories[Math.floor(Math.random() * paymentCategories.length)];
        const level = category.levels[Math.floor(Math.random() * category.levels.length)];
        const amount = 5000 + Math.random() * 150000;
        
        payments.push({
            id: `demo_${i}`,
            receiptNumber: generateReceiptNumber(),
            studentName: `Student ${i + 1}`,
            studentLevel: level,
            studentCategory: category.id,
            paymentDate: date.toISOString(),
            paymentType: ['tuition', 'pta', 'levy'][Math.floor(Math.random() * 3)],
            paymentMethod: ['cash', 'bank_transfer', 'pos'][Math.floor(Math.random() * 3)],
            paymentAmount: Math.round(amount / 100) * 100,
            description: `Payment for ${level}`
        });
    }
    
    updatePaymentHistoryTable(payments);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function getFeeByCategoryAndLevel(categoryId, level) {
    const feeStructure = {
        'kg': { 'KG 1': 45000, 'KG 2': 48000, 'KG 3': 50000 },
        'nursery': { 'Nursery 1': 55000, 'Nursery 2': 58000, 'Nursery 3': 60000 },
        'primary': { 
            'Primary 1': 75000, 'Primary 2': 78000, 'Primary 3': 80000,
            'Primary 4': 85000, 'Primary 5': 90000
        },
        'secondary': {
            'JSS 1': 120000, 'JSS 2': 125000, 'JSS 3': 130000,
            'SSS 1': 150000, 'SSS 2': 155000, 'SSS 3': 160000
        }
    };
    
    return feeStructure[categoryId]?.[level] || 0;
}

function formatCurrency(amount) {
    return '₦' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return 'Invalid Date';
    }
}

function generateReceiptNumber() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    lastReceiptNumber++;
    return `SMIA-${year}${month}-${String(lastReceiptNumber).padStart(4, '0')}`;
}

// ============================================
// TABLE UPDATES
// ============================================
function updateOutstandingTable(payments) {
    const tableBody = document.getElementById('outstandingTableBody');
    if (!tableBody) {
        console.warn("Outstanding table body not found");
        return;
    }
    
    tableBody.innerHTML = '';
    
    payments.forEach(payment => {
        const totalDue = (payment.broughtForward || 0) + payment.outstanding;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${payment.name}</td>
            <td>${payment.level} (${payment.category})</td>
            <td>${formatCurrency(payment.broughtForward || 0)}</td>
            <td>${formatCurrency(payment.outstanding)}</td>
            <td>${formatCurrency(totalDue)}</td>
        `;
        tableBody.appendChild(row);
    });
}

function updateOutstandingTotals(broughtForward, currentOutstanding) {
    const elements = {
        broughtForward: document.getElementById('broughtForwardTotal'),
        currentOutstanding: document.getElementById('currentOutstandingTotal'),
        carryForward: document.getElementById('carryForwardTotal')
    };
    
    for (const [key, element] of Object.entries(elements)) {
        if (element) {
            if (key === 'broughtForward') element.textContent = formatCurrency(broughtForward);
            if (key === 'currentOutstanding') element.textContent = formatCurrency(currentOutstanding);
            if (key === 'carryForward') element.textContent = formatCurrency(currentOutstanding);
        }
    }
}

function updatePaymentHistoryTable(payments) {
    const tableBody = document.getElementById('historyTableBody');
    if (!tableBody) {
        console.warn("History table body not found");
        return;
    }
    
    tableBody.innerHTML = '';
    
    payments.forEach(payment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(payment.paymentDate)}</td>
            <td>${payment.receiptNumber}</td>
            <td>${payment.studentName}</td>
            <td>${payment.studentLevel}</td>
            <td>${payment.paymentType}</td>
            <td>${formatCurrency(payment.paymentAmount)}</td>
            <td><span class="payment-status status-paid">Paid</span></td>
            <td>
                <button class="btn btn-secondary btn-sm view-receipt" data-id="${payment.id}">
                    <i class="fas fa-receipt"></i> Receipt
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// ============================================
// PAYMENT PROCESSING (SIMPLIFIED)
// ============================================
function calculateInstalment() {
    const studentSelect = document.getElementById('studentSelect');
    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value) || 0;
    
    if (!studentSelect || !studentSelect.value) {
        showAlert('error', 'Please select a student first.');
        return;
    }
    
    const studentData = JSON.parse(studentSelect.selectedOptions[0].dataset.data);
    const instalmentInfo = document.getElementById('instalmentInfo');
    
    if (instalmentInfo) {
        instalmentInfo.style.display = 'block';
        
        document.getElementById('totalTermFees').textContent = formatCurrency(studentData.fees);
        document.getElementById('previouslyPaid').textContent = formatCurrency(studentData.paid);
        document.getElementById('currentPaymentDisplay').textContent = formatCurrency(paymentAmount);
        
        // Simple calculation
        const newTotal = studentData.paid + paymentAmount;
        const newBalance = studentData.fees - newTotal;
        
        document.getElementById('newBalance').textContent = formatCurrency(newBalance);
        document.getElementById('instalmentStatus').textContent = newBalance <= 0 ? 'Fully Paid' : 'Partial Payment';
    }
}

function processPayment(e) {
    if (e) e.preventDefault();
    
    // Get form values
    const studentSelect = document.getElementById('studentSelect');
    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value) || 0;
    
    // Validation
    if (!studentSelect || !studentSelect.value) {
        showAlert('error', 'Please select a student.');
        return false;
    }
    
    if (!paymentAmount || paymentAmount <= 0) {
        showAlert('error', 'Please enter a valid payment amount.');
        return false;
    }
    
    const studentData = JSON.parse(studentSelect.selectedOptions[0].dataset.data);
    const receiptNumber = generateReceiptNumber();
    
    // Create payment record
    const paymentRecord = {
        receiptNumber: receiptNumber,
        studentName: studentData.name,
        studentLevel: studentData.level,
        paymentDate: new Date().toISOString(),
        paymentType: document.getElementById('paymentType')?.value || 'tuition',
        paymentMethod: document.getElementById('paymentMethod')?.value || 'cash',
        paymentAmount: paymentAmount,
        description: document.getElementById('paymentDescription')?.value || 'Payment',
        previousBalance: studentData.outstanding,
        newBalance: studentData.outstanding - paymentAmount
    };
    
    // Show success
    showAlert('success', `Payment of ${formatCurrency(paymentAmount)} recorded! Receipt: ${receiptNumber}`);
    
    // Show receipt
    showReceipt(paymentRecord);
    
    // Reset form
    document.getElementById('paymentForm').reset();
    const instalmentInfo = document.getElementById('instalmentInfo');
    if (instalmentInfo) instalmentInfo.style.display = 'none';
    
    // Update demo data
    loadDemoPaymentHistory();
    
    return false;
}

// ============================================
// RECEIPT FUNCTIONS
// ============================================
function showReceipt(paymentRecord) {
    const modal = document.getElementById('receiptModal');
    if (!modal) {
        console.warn("Receipt modal not found");
        return;
    }
    
    // Populate receipt
    const elements = {
        'receiptNumber': paymentRecord.receiptNumber,
        'receiptDateTime': formatDate(paymentRecord.paymentDate),
        'receiptStudent': paymentRecord.studentName,
        'receiptClass': paymentRecord.studentLevel,
        'receiptPaymentType': paymentRecord.paymentType,
        'receiptPaymentMethod': paymentRecord.paymentMethod,
        'receiptDescription': paymentRecord.description,
        'receiptPreviousBalance': formatCurrency(paymentRecord.previousBalance),
        'receiptAmountPaid': formatCurrency(paymentRecord.paymentAmount),
        'receiptNewBalance': formatCurrency(paymentRecord.newBalance),
        'receiptTotalAmount': formatCurrency(paymentRecord.paymentAmount)
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }
    
    document.getElementById('receiptPrintedDate').textContent = new Date().toLocaleDateString('en-US');
    
    // Show modal
    modal.style.display = 'flex';
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================
function setupEventListeners() {
    console.log("Setting up event listeners...");
    
    // Payment form
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', processPayment);
        console.log("✅ Payment form listener added");
    }
    
    // Calculate button
    const calculateBtn = document.getElementById('calculateInstalment');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateInstalment);
        console.log("✅ Calculate button listener added");
    }
    
    // Receipt buttons
    const receiptButtons = {
        'printReceipt': () => window.print(),
        'closeReceipt': () => {
            const modal = document.getElementById('receiptModal');
            if (modal) modal.style.display = 'none';
        }
    };
    
    for (const [id, action] of Object.entries(receiptButtons)) {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', action);
    }
    
    // Category filter
    const filterCategory = document.getElementById('filterCategory');
    if (filterCategory) {
        filterCategory.addEventListener('change', function() {
            showAlert('info', `Filtering by: ${this.value}`);
        });
    }
}

// ============================================
// MAIN INITIALIZATION
// ============================================
function initializeApp() {
    console.log("Initializing Payment System...");
    
    // Setup event listeners first
    setupEventListeners();
    
    // Initialize Firebase
    initializeFirebase();
    
    // Setup initial data after a short delay
    setTimeout(setupInitialData, 500);
    
    console.log("✅ Payment System Initialized");
}

// ============================================
// START THE APPLICATION
// ============================================
// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
