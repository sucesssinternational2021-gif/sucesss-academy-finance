// payment-system.js
// Success Model International Academy - Payment System
// Firebase Integration for Payments Management

// ============================================
// FIREBASE CONFIGURATION - UPDATE THESE VALUES
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
let db, auth;
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
// FIREBASE INITIALIZATION
// ============================================
function initializeFirebase() {
    try {
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        isFirebaseConnected = true;
        updateFirebaseStatus(true);
        console.log("✅ Firebase initialized successfully");
        
        // Check if user is authenticated
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                document.getElementById('currentUser').textContent = user.displayName || user.email;
                loadPaymentData();
                setupAuthUI(user);
            } else {
                // If not authenticated, use demo data
                console.log("⚠️ User not authenticated, using demo data");
                loadDemoData();
                setupAuthUI(null);
            }
        });
        
        // Initialize Firestore listeners
        setupFirestoreListeners();
        
    } catch (error) {
        console.error("❌ Error initializing Firebase:", error);
        updateFirebaseStatus(false);
        
        // Load demo data if Firebase fails
        loadDemoData();
        showAlert('error', 'Firebase connection failed. Running in demo mode.');
    }
}

// ============================================
// UI STATUS FUNCTIONS
// ============================================
function updateFirebaseStatus(connected) {
    const statusElement = document.getElementById('firebaseStatus');
    if (!statusElement) {
        console.warn("Firebase status element not found");
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
}

function showAlert(type, message) {
    const alertElement = document.getElementById(`alert${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (!alertElement) {
        console.log(`${type}: ${message}`);
        return;
    }
    
    const alertText = alertElement.querySelector('span');
    alertText.textContent = message;
    alertElement.style.display = 'block';
    
    // Hide alert after 5 seconds
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 5000);
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================
function setupAuthUI(user) {
    const loginSection = document.getElementById('loginSection');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (!loginSection || !logoutBtn) return;
    
    if (user) {
        loginSection.style.display = 'none';
        logoutBtn.style.display = 'block';
        logoutBtn.onclick = handleLogout;
    } else {
        loginSection.style.display = 'block';
        logoutBtn.style.display = 'none';
        document.getElementById('loginBtn').onclick = handleLogin;
    }
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showAlert('error', 'Please enter email and password');
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            showAlert('success', 'Login successful!');
        })
        .catch((error) => {
            console.error("Login error:", error);
            showAlert('error', `Login failed: ${error.message}`);
        });
}

function handleLogout() {
    auth.signOut()
        .then(() => {
            showAlert('success', 'Logged out successfully');
        })
        .catch((error) => {
            console.error("Logout error:", error);
            showAlert('error', 'Logout failed');
        });
}

// ============================================
// FIRESTORE LISTENERS
// ============================================
function setupFirestoreListeners() {
    // Listen for new payments in real-time
    db.collection('payments')
        .orderBy('recordedAt', 'desc')
        .limit(10)
        .onSnapshot((snapshot) => {
            const payments = [];
            snapshot.forEach(doc => {
                payments.push({ id: doc.id, ...doc.data() });
            });
            updatePaymentHistoryTable(payments);
        }, (error) => {
            console.error("Payments listener error:", error);
        });
    
    // Listen for outstanding payments
    db.collection('students')
        .where('outstanding', '>', 0)
        .onSnapshot((snapshot) => {
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
        }, (error) => {
            console.error("Students listener error:", error);
        });
}

// ============================================
// FORMATTING UTILITIES
// ============================================
function formatCurrency(amount) {
    return '₦' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatNumber(num) {
    return num.toLocaleString('en-US');
}

function calculatePercentage(part, total) {
    if (total === 0) return '0%';
    return ((part / total) * 100).toFixed(1) + '%';
}

// ============================================
// PAYMENT CATEGORIES INITIALIZATION
// ============================================
function initPaymentCategories() {
    const categoriesContainer = document.getElementById('paymentCategories');
    if (!categoriesContainer) return;
    
    categoriesContainer.innerHTML = '';
    
    paymentCategories.forEach(category => {
        const badge = document.createElement('div');
        badge.className = 'category-badge';
        badge.textContent = category.name;
        badge.dataset.id = category.id;
        badge.dataset.levels = JSON.stringify(category.levels);
        
        badge.addEventListener('click', function() {
            // Remove active class from all badges
            document.querySelectorAll('.category-badge').forEach(b => {
                b.classList.remove('active');
            });
            
            // Add active class to clicked badge
            this.classList.add('active');
            
            // Set selected category
            document.getElementById('selectedCategory').value = this.dataset.id;
            
            // Load students for this category
            loadStudentsByCategory(this.dataset.id, JSON.parse(this.dataset.levels));
        });
        
        categoriesContainer.appendChild(badge);
    });
}

// ============================================
// STUDENT MANAGEMENT
// ============================================
function loadStudentsByCategory(categoryId, levels) {
    const studentSelect = document.getElementById('studentSelect');
    if (!studentSelect) return;
    
    // Clear existing options except the first one
    while (studentSelect.options.length > 1) {
        studentSelect.remove(1);
    }
    
    if (isFirebaseConnected) {
        // Load students from Firebase
        db.collection('students')
            .where('category', '==', categoryId)
            .where('status', '==', 'active')
            .get()
            .then(snapshot => {
                snapshot.forEach(doc => {
                    const student = doc.data();
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = `${student.name} - ${student.level || student.class} (${student.admissionNumber || 'N/A'})`;
                    option.dataset.data = JSON.stringify(student);
                    studentSelect.appendChild(option);
                });
                
                if (snapshot.empty) {
                    showAlert('info', `No active ${categoryId} students found in the database.`);
                }
            })
            .catch(error => {
                console.error("Error loading students:", error);
                showAlert('error', 'Failed to load students.');
            });
    } else {
        // Load demo students
        loadDemoStudents(categoryId, levels);
    }
}

// ============================================
// PAYMENT CALCULATIONS
// ============================================
function calculateInstalment() {
    const studentSelect = document.getElementById('studentSelect');
    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value) || 0;
    const paymentType = document.getElementById('paymentType').value;
    
    if (!studentSelect || !studentSelect.value) {
        showAlert('error', 'Please select a student first.');
        return;
    }
    
    const studentData = JSON.parse(studentSelect.selectedOptions[0].dataset.data);
    
    // Show instalment info
    const instalmentInfo = document.getElementById('instalmentInfo');
    if (instalmentInfo) {
        instalmentInfo.style.display = 'block';
    }
    
    // Update instalment info
    document.getElementById('totalTermFees').textContent = formatCurrency(studentData.fees);
    document.getElementById('previouslyPaid').textContent = formatCurrency(studentData.paid);
    document.getElementById('currentPaymentDisplay').textContent = formatCurrency(paymentAmount);
    
    // Calculate PTA and levies to deduct
    let ptaToDeduct = 0;
    let leviesToDeduct = 0;
    let newPaidAmount = studentData.paid;
    let remainingPayment = paymentAmount;
    
    // If payment type is tuition and PTA/levies haven't been paid
    if (paymentType === 'tuition') {
        if (!studentData.ptaPaid && remainingPayment > 0) {
            ptaToDeduct = Math.min(studentData.pta, remainingPayment);
            newPaidAmount += ptaToDeduct;
            remainingPayment -= ptaToDeduct;
        }
        
        if (!studentData.leviesPaid && remainingPayment > 0) {
            leviesToDeduct = Math.min(studentData.levies, remainingPayment);
            newPaidAmount += leviesToDeduct;
            remainingPayment -= leviesToDeduct;
        }
        
        // Now apply the remaining payment to tuition
        newPaidAmount += remainingPayment;
        const newBalance = studentData.fees - newPaidAmount;
        
        // Update display
        document.getElementById('leviesDeducted').textContent = formatCurrency(ptaToDeduct + leviesToDeduct);
        document.getElementById('newBalance').textContent = formatCurrency(newBalance);
        
        // Update status
        let status = 'Partial Payment';
        if (newBalance <= 0) {
            status = 'Fully Paid';
        } else if (newPaidAmount === studentData.paid) {
            status = 'No Payment Applied';
        }
        document.getElementById('instalmentStatus').textContent = status;
    }
}

// ============================================
// PAYMENT PROCESSING
// ============================================
function processPayment(e) {
    e.preventDefault();
    
    const studentSelect = document.getElementById('studentSelect');
    const paymentDate = document.getElementById('paymentDate').value;
    const paymentType = document.getElementById('paymentType').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
    const paymentDescription = document.getElementById('paymentDescription').value;
    const selectedCategory = document.getElementById('selectedCategory').value;
    
    // Validation
    if (!studentSelect || !studentSelect.value) {
        showAlert('error', 'Please select a student.');
        return;
    }
    
    if (!selectedCategory) {
        showAlert('error', 'Please select a payment category.');
        return;
    }
    
    if (!paymentAmount || paymentAmount <= 0) {
        showAlert('error', 'Please enter a valid payment amount.');
        return;
    }
    
    const studentData = JSON.parse(studentSelect.selectedOptions[0].dataset.data);
    const receiptNumber = generateReceiptNumber();
    
    // Calculate payment breakdown
    let tuitionPayment = 0;
    let ptaPayment = 0;
    let levyPayment = 0;
    let remainingAmount = paymentAmount;
    
    // Apply payment logic based on payment type
    if (paymentType === 'tuition') {
        // First, pay PTA if not paid
        if (!studentData.ptaPaid && remainingAmount > 0) {
            ptaPayment = Math.min(studentData.pta, remainingAmount);
            remainingAmount -= ptaPayment;
        }
        
        // Then, pay levies if not paid
        if (!studentData.leviesPaid && remainingAmount > 0) {
            levyPayment = Math.min(studentData.levies, remainingAmount);
            remainingAmount -= levyPayment;
        }
        
        // Finally, apply to tuition
        tuitionPayment = remainingAmount;
    } else if (paymentType === 'pta') {
        ptaPayment = paymentAmount;
    } else if (paymentType === 'levy') {
        levyPayment = paymentAmount;
    } else {
        // For other payment types
        tuitionPayment = paymentAmount;
    }
    
    // Calculate new totals
    const newTuitionPaid = studentData.paid + tuitionPayment;
    const newPTAPaid = studentData.ptaPaid || ptaPayment > 0;
    const newLeviesPaid = studentData.leviesPaid || levyPayment > 0;
    const newBalance = studentData.fees - newTuitionPaid;
    
    // Create payment record
    const paymentRecord = {
        receiptNumber: receiptNumber,
        studentId: studentSelect.value,
        studentName: studentData.name,
        studentLevel: studentData.level,
        studentCategory: selectedCategory,
        paymentDate: paymentDate || new Date().toISOString(),
        paymentType: paymentType,
        paymentMethod: paymentMethod,
        paymentAmount: paymentAmount,
        tuitionPayment: tuitionPayment,
        ptaPayment: ptaPayment,
        levyPayment: levyPayment,
        description: paymentDescription || `${paymentType} payment`,
        recordedBy: currentUser ? (currentUser.displayName || currentUser.email) : 'Bursar',
        recordedAt: new Date().toISOString(),
        previousBalance: studentData.outstanding,
        newBalance: newBalance,
        term: getCurrentTerm(),
        academicYear: getCurrentAcademicYear()
    };
    
    // Update student record
    const updatedStudentData = {
        paid: newTuitionPaid,
        ptaPaid: newPTAPaid,
        leviesPaid: newLeviesPaid,
        outstanding: newBalance,
        lastPaymentDate: new Date().toISOString(),
        lastPaymentAmount: paymentAmount,
        updatedAt: new Date().toISOString()
    };
    
    if (isFirebaseConnected) {
        // Save to Firebase
        const batch = db.batch();
        
        // Add payment record
        const paymentRef = db.collection('payments').doc();
        batch.set(paymentRef, paymentRecord);
        
        // Update student record
        const studentRef = db.collection('students').doc(studentSelect.value);
        batch.update(studentRef, updatedStudentData);
        
        batch.commit()
            .then(() => {
                showAlert('success', `Payment of ${formatCurrency(paymentAmount)} recorded successfully!`);
                currentPaymentId = paymentRef.id;
                
                // Show receipt
                showReceipt(paymentRecord, studentData, updatedStudentData);
                
                // Reset form
                document.getElementById('paymentForm').reset();
                const instalmentInfo = document.getElementById('instalmentInfo');
                if (instalmentInfo) {
                    instalmentInfo.style.display = 'none';
                }
            })
            .catch(error => {
                console.error("Error saving payment:", error);
                showAlert('error', `Failed to save payment: ${error.message}`);
            });
    } else {
        // Demo mode
        showAlert('success', `Payment of ${formatCurrency(paymentAmount)} recorded successfully! (Demo Mode)`);
        currentPaymentId = 'demo_' + Date.now();
        
        // Show receipt
        showReceipt(paymentRecord, studentData, updatedStudentData);
        
        // Reset form
        document.getElementById('paymentForm').reset();
        const instalmentInfo = document.getElementById('instalmentInfo');
        if (instalmentInfo) {
            instalmentInfo.style.display = 'none';
        }
    }
}

// ============================================
// RECEIPT MANAGEMENT
// ============================================
function generateReceiptNumber() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 1000) + 1;
    lastReceiptNumber++;
    return `SMIA-${year}${month}-${String(lastReceiptNumber).padStart(4, '0')}`;
}

function showReceipt(paymentRecord, studentData, updatedStudentData) {
    const modal = document.getElementById('receiptModal');
    if (!modal) return;
    
    // Populate receipt data
    document.getElementById('receiptNumber').textContent = paymentRecord.receiptNumber;
    document.getElementById('receiptDateTime').textContent = formatDate(paymentRecord.paymentDate);
    document.getElementById('receiptStudent').textContent = paymentRecord.studentName;
    document.getElementById('receiptClass').textContent = paymentRecord.studentLevel;
    document.getElementById('receiptPaymentType').textContent = getPaymentTypeLabel(paymentRecord.paymentType);
    document.getElementById('receiptPaymentMethod').textContent = getPaymentMethodLabel(paymentRecord.paymentMethod);
    document.getElementById('receiptDescription').textContent = paymentRecord.description;
    document.getElementById('receiptPreviousBalance').textContent = formatCurrency(paymentRecord.previousBalance);
    document.getElementById('receiptAmountPaid').textContent = formatCurrency(paymentRecord.paymentAmount);
    document.getElementById('receiptPTADeducted').textContent = formatCurrency(paymentRecord.ptaPayment);
    document.getElementById('receiptLeviesDeducted').textContent = formatCurrency(paymentRecord.levyPayment);
    document.getElementById('receiptNewBalance').textContent = formatCurrency(paymentRecord.newBalance);
    document.getElementById('receiptTotalAmount').textContent = formatCurrency(paymentRecord.paymentAmount);
    document.getElementById('receiptPrintedDate').textContent = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
    
    // Show modal
    modal.style.display = 'flex';
}

function getPaymentTypeLabel(type) {
    const labels = {
        'tuition': 'Tuition Fees',
        'pta': 'PTA Levy',
        'levy': 'Other Levy',
        'other': 'Other Payment'
    };
    return labels[type] || type;
}

function getPaymentMethodLabel(method) {
    const labels = {
        'cash': 'Cash',
        'bank_transfer': 'Bank Transfer',
        'pos': 'POS',
        'cheque': 'Cheque',
        'online': 'Online Payment'
    };
    return labels[method] || method;
}

// ============================================
// OUTSTANDING PAYMENTS MANAGEMENT
// ============================================
function loadOutstandingPayments() {
    if (isFirebaseConnected) {
        // Real-time updates handled by listener
        return;
    } else {
        // Load demo outstanding payments
        loadDemoOutstandingPayments();
    }
}

function updateOutstandingTable(payments) {
    const tableBody = document.getElementById('outstandingTableBody');
    if (!tableBody) return;
    
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
    const broughtForwardElement = document.getElementById('broughtForwardTotal');
    const currentOutstandingElement = document.getElementById('currentOutstandingTotal');
    const carryForwardElement = document.getElementById('carryForwardTotal');
    
    if (broughtForwardElement) {
        broughtForwardElement.textContent = formatCurrency(broughtForward);
    }
    if (currentOutstandingElement) {
        currentOutstandingElement.textContent = formatCurrency(currentOutstanding);
    }
    if (carryForwardElement) {
        carryForwardElement.textContent = formatCurrency(currentOutstanding);
    }
}

// ============================================
// PAYMENT HISTORY
// ============================================
function loadPaymentHistory() {
    if (isFirebaseConnected) {
        // Real-time updates handled by listener
        return;
    } else {
        loadDemoPaymentHistory();
    }
}

function updatePaymentHistoryTable(payments) {
    const tableBody = document.getElementById('historyTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    payments.forEach(payment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(payment.paymentDate)}</td>
            <td>${payment.receiptNumber}</td>
            <td>${payment.studentName}</td>
            <td>${payment.studentLevel} (${payment.studentCategory})</td>
            <td>${getPaymentTypeLabel(payment.paymentType)}</td>
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
    
    // Add event listeners to receipt buttons
    document.querySelectorAll('.view-receipt').forEach(btn => {
        btn.addEventListener('click', function() {
            const paymentId = this.dataset.id;
            // In a real app, you would fetch the payment details and show receipt
            showAlert('info', 'Receipt view functionality would open here in full implementation.');
        });
    });
}

// ============================================
// DEMO DATA FUNCTIONS
// ============================================
function loadDemoData() {
    // Set default payment date to now
    const now = new Date();
    const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    const paymentDateInput = document.getElementById('paymentDate');
    if (paymentDateInput) {
        paymentDateInput.value = localDateTime;
    }
    
    // Initialize categories
    initPaymentCategories();
    
    // Load outstanding payments
    loadOutstandingPayments();
    
    // Load payment history
    loadPaymentHistory();
}

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

function loadDemoStudents(categoryId, levels) {
    const studentSelect = document.getElementById('studentSelect');
    if (!studentSelect) return;
    
    const names = [
        'John Adebayo', 'Sarah Johnson', 'Michael Chukwu', 'Grace Okafor', 
        'David Musa', 'Fatima Ahmed', 'Peter Okonkwo', 'Blessing Adeyemi',
        'Emma Thompson', 'Daniel Williams', 'Sophia Garcia', 'James Brown'
    ];
    
    levels.forEach((level, index) => {
        const nameIndex = index % names.length;
        const fees = getFeeByCategoryAndLevel(categoryId, level);
        const paid = Math.floor(Math.random() * fees * 0.7);
        const ptaPaid = Math.random() > 0.5;
        const leviesPaid = Math.random() > 0.3;
        
        const student = {
            id: `${categoryId}_${index + 1}`,
            name: names[nameIndex],
            level: level,
            admissionNumber: `${categoryId.toUpperCase()}${String(index + 1).padStart(3, '0')}`,
            category: categoryId,
            fees: fees,
            paid: paid,
            outstanding: fees - paid,
            pta: 5000,
            ptaPaid: ptaPaid,
            levies: 8000,
            leviesPaid: leviesPaid,
            broughtForward: Math.floor(Math.random() * 20000),
            status: 'active'
        };
        
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.name} - ${student.level} (${student.admissionNumber})`;
        option.dataset.data = JSON.stringify(student);
        studentSelect.appendChild(option);
    });
}

function loadDemoOutstandingPayments() {
    const outstandingPayments = [];
    let broughtForwardTotal = 0;
    let currentOutstandingTotal = 0;
    
    // Generate demo data for each category
    paymentCategories.forEach(category => {
        category.levels.forEach((level, index) => {
            const fees = getFeeByCategoryAndLevel(category.id, level);
            const paid = Math.floor(Math.random() * fees * 0.7);
            const outstanding = fees - paid;
            const broughtForward = Math.floor(Math.random() * 20000);
            
            if (outstanding > 0) {
                const student = {
                    id: `${category.id}_${index + 1}`,
                    name: `Demo Student ${index + 1}`,
                    level: level,
                    category: category.id,
                    fees: fees,
                    paid: paid,
                    outstanding: outstanding,
                    broughtForward: broughtForward
                };
                
                outstandingPayments.push(student);
                broughtForwardTotal += broughtForward;
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
    
    // Generate demo payment history
    for (let i = 0; i < 15; i++) {
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
            description: `Payment for ${category.name} - ${level}`
        });
    }
    
    updatePaymentHistoryTable(payments);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function getCurrentTerm() {
    // This should be fetched from your settings
    return 'Term 2';
}

function getCurrentAcademicYear() {
    // This should be fetched from your settings
    const year = new Date().getFullYear();
    return `${year}/${year + 1}`;
}

function loadPaymentData() {
    loadOutstandingPayments();
    loadPaymentHistory();
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================
function setupEventListeners() {
    // Payment form submission
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', processPayment);
    }
    
    // Calculate instalment button
    const calculateBtn = document.getElementById('calculateInstalment');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateInstalment);
    }
    
    // Print receipt button
    const printReceiptBtn = document.getElementById('printReceipt');
    if (printReceiptBtn) {
        printReceiptBtn.addEventListener('click', () => window.print());
    }
    
    // Download PDF button
    const downloadPdfBtn = document.getElementById('downloadReceiptPDF');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', downloadReceiptPDF);
    }
    
    // Close receipt button
    const closeReceiptBtn = document.getElementById('closeReceipt');
    if (closeReceiptBtn) {
        closeReceiptBtn.addEventListener('click', () => {
            const modal = document.getElementById('receiptModal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Category filter
    const filterCategory = document.getElementById('filterCategory');
    if (filterCategory) {
        filterCategory.addEventListener('change', function() {
            // Implement category filtering
            showAlert('info', 'Category filter would be implemented here');
        });
    }
    
    // Load more payments
    const loadMoreBtn = document.getElementById('loadMorePayments');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            showAlert('info', 'Load more functionality would be implemented here');
        });
    }
    
    // Export payments
    const exportBtn = document.getElementById('exportPayments');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            showAlert('info', 'Export functionality would be implemented here');
        });
    }
}

// ============================================
// PDF GENERATION
// ============================================
function downloadReceiptPDF() {
    const receiptContent = document.getElementById('receiptContent');
    if (!receiptContent) return;
    
    html2canvas(receiptContent).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
        const imgWidth = 190;
        const pageHeight = 295;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 10;
        
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        const receiptNumber = document.getElementById('receiptNumber').textContent;
        pdf.save(`Receipt-${receiptNumber}.pdf`);
        showAlert('success', 'Receipt downloaded as PDF');
    });
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Setup event listeners first
    setupEventListeners();
    
    // Initialize Firebase
    initializeFirebase();
    
    // Set up modal close on outside click
    const modal = document.getElementById('receiptModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    }
    
    console.log('✅ Payment System Initialized');
});

// ============================================
// EXPORT FUNCTIONS FOR HTML INTEGRATION
// ============================================
// These functions can be called from your HTML if needed
window.PaymentSystem = {
    initialize: initializeFirebase,
    processPayment: processPayment,
    calculateInstalment: calculateInstalment,
    showReceipt: showReceipt,
    downloadReceiptPDF: downloadReceiptPDF,
    getCurrentTerm: getCurrentTerm,
    getCurrentAcademicYear: getCurrentAcademicYear
};
