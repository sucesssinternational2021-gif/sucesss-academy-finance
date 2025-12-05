// payment-system.js - Complete Updated Version

// Global variables
let currentStudent = null;
let lastPaymentId = null;
let currentUser = null;
let studentDeductionHistory = {}; // Track deductions per student per term

// Fee structure configuration
const feeStructure = {
    tuition: { ptaPercentage: 0.10, levyPercentage: 0.05 }, // 10% PTA, 5% Levy
    pta: { ptaPercentage: 1.00, levyPercentage: 0.00 }, // 100% PTA, 0% Levy
    exam: { ptaPercentage: 0.00, levyPercentage: 0.00 },
    library: { ptaPercentage: 0.00, levyPercentage: 0.00 },
    sports: { ptaPercentage: 0.00, levyPercentage: 0.00 },
    other: { ptaPercentage: 0.00, levyPercentage: 0.00 }
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Load recent payments
    loadRecentPayments();
    
    // Setup event listeners
    setupEventListeners();
});

// Check if user is logged in
async function checkAuth() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log("User authenticated:", user.email);
        } else {
            // Redirect to login if not authenticated
            window.location.href = "login.html";
        }
    });
}

// Setup all event listeners
function setupEventListeners() {
    // Search student button
    document.getElementById('searchStudent').addEventListener('click', searchStudent);
    
    // Payment type change - show/hide PTA breakdown
    document.getElementById('paymentType').addEventListener('change', function() {
        const studentId = document.getElementById('studentId').value.trim();
        const term = document.getElementById('term').value;
        const amount = parseFloat(document.getElementById('amount').value) || 0;
        
        if (this.value === 'tuition' && amount > 0 && studentId && term) {
            document.getElementById('ptaBreakdown').classList.remove('hidden');
            calculatePTABreakdown(amount, this.value, studentId, term);
        } else {
            document.getElementById('ptaBreakdown').classList.add('hidden');
        }
    });
    
    // Amount input - update PTA breakdown
    document.getElementById('amount').addEventListener('input', function() {
        const paymentType = document.getElementById('paymentType').value;
        const studentId = document.getElementById('studentId').value.trim();
        const term = document.getElementById('term').value;
        const amount = parseFloat(this.value) || 0;
        
        if (paymentType === 'tuition' && amount > 0 && studentId && term) {
            document.getElementById('ptaBreakdown').classList.remove('hidden');
            calculatePTABreakdown(amount, paymentType, studentId, term);
        } else if (paymentType !== 'tuition') {
            document.getElementById('ptaBreakdown').classList.add('hidden');
        }
    });
    
    // Term change - reset deduction tracking for new term
    document.getElementById('term').addEventListener('change', function() {
        const studentId = document.getElementById('studentId').value.trim();
        const paymentType = document.getElementById('paymentType').value;
        const amount = parseFloat(document.getElementById('amount').value) || 0;
        
        if (paymentType === 'tuition' && amount > 0 && studentId) {
            calculatePTABreakdown(amount, paymentType, studentId, this.value);
        }
    });
    
    // Form submission
    document.getElementById('paymentForm').addEventListener('submit', processPayment);
    
    // Generate receipt button
    document.getElementById('generateReceipt').addEventListener('click', generateReceipt);
    
    // View all payments button
    document.getElementById('viewAllPayments').addEventListener('click', function() {
        window.location.href = "payment-history.html";
    });
}

// Search for student by ID
async function searchStudent() {
    const studentId = document.getElementById('studentId').value.trim().toUpperCase();
    
    if (!studentId) {
        showAlert('Please enter a Student ID', 'error');
        return;
    }
    
    try {
        const studentRef = doc(db, "students", studentId);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
            currentStudent = { id: studentId, ...studentSnap.data() };
            displayStudentInfo(currentStudent);
            showAlert('Student found successfully!', 'success');
            
            // Load deduction history for current term
            await loadDeductionHistory(studentId);
        } else {
            showAlert('Student not found. Please check the Student ID.', 'error');
            currentStudent = null;
            document.getElementById('studentInfo').classList.add('hidden');
            document.getElementById('ptaBreakdown').classList.add('hidden');
        }
    } catch (error) {
        console.error("Error searching student:", error);
        showAlert('Error searching for student. Please try again.', 'error');
    }
}

// Load deduction history for student
async function loadDeductionHistory(studentId) {
    try {
        // Query payments for this student to check deduction history
        const paymentsQuery = query(
            collection(db, "payments"),
            where("studentId", "==", studentId)
        );
        
        const querySnapshot = await getDocs(paymentsQuery);
        
        // Reset deduction history
        studentDeductionHistory = {};
        
        querySnapshot.forEach((doc) => {
            const payment = doc.data();
            const deductionKey = `${studentId}_${payment.term}`;
            
            if (!studentDeductionHistory[deductionKey]) {
                studentDeductionHistory[deductionKey] = {
                    ptaDeducted: false,
                    levyDeducted: false
                };
            }
            
            if (payment.ptaDeduction > 0) {
                studentDeductionHistory[deductionKey].ptaDeducted = true;
            }
            if (payment.levyDeduction > 0) {
                studentDeductionHistory[deductionKey].levyDeducted = true;
            }
        });
        
    } catch (error) {
        console.error("Error loading deduction history:", error);
    }
}

// Display student information
function displayStudentInfo(student) {
    document.getElementById('studentInfo').classList.remove('hidden');
    document.getElementById('studentNameDisplay').textContent = student.fullName || 'N/A';
    document.getElementById('studentClass').textContent = student.class || 'N/A';
    document.getElementById('totalFees').textContent = formatCurrency(student.totalFees || 0);
    document.getElementById('paidAmount').textContent = formatCurrency(student.paidAmount || 0);
    document.getElementById('ptaDeducted').textContent = formatCurrency(student.ptaDeducted || 0);
    document.getElementById('levyDeducted').textContent = formatCurrency(student.levyDeducted || 0);
    document.getElementById('totalDeductions').textContent = formatCurrency(student.totalDeductions || 0);
    document.getElementById('outstandingBalance').textContent = formatCurrency(student.outstanding || 0);
}

// Calculate PTA and levies breakdown with smart deduction logic
function calculatePTABreakdown(amount, paymentType, studentId, term) {
    const ptaPercentage = feeStructure[paymentType]?.ptaPercentage || 0;
    const levyPercentage = feeStructure[paymentType]?.levyPercentage || 0;
    
    // Check deduction history for this student and term
    const deductionKey = `${studentId}_${term}`;
    let ptaDeduction = 0;
    let levyDeduction = 0;
    
    if (studentDeductionHistory[deductionKey]) {
        // Check if deductions already made this term
        if (studentDeductionHistory[deductionKey].ptaDeducted) {
            ptaDeduction = 0;
            document.getElementById('ptaNote').innerHTML = 
                '<i class="fas fa-info-circle"></i> PTA already deducted for this term. No additional PTA will be charged.';
        } else {
            ptaDeduction = amount * ptaPercentage;
        }
        
        if (studentDeductionHistory[deductionKey].levyDeducted) {
            levyDeduction = 0;
            document.getElementById('ptaNote').innerHTML += 
                '<br><i class="fas fa-info-circle"></i> School levy already deducted for this term.';
        } else {
            levyDeduction = amount * levyPercentage;
        }
    } else {
        // First deduction this term
        ptaDeduction = amount * ptaPercentage;
        levyDeduction = amount * levyPercentage;
        document.getElementById('ptaNote').innerHTML = 
            '<i class="fas fa-info-circle"></i> First payment this term. PTA and levies will be deducted.';
    }
    
    const totalDeductions = ptaDeduction + levyDeduction;
    const schoolPortion = amount - totalDeductions;
    
    // Update display
    document.getElementById('paymentAmountDisplay').textContent = formatCurrency(amount);
    document.getElementById('ptaDeductionDisplay').textContent = formatCurrency(ptaDeduction);
    document.getElementById('levyDeductionDisplay').textContent = formatCurrency(levyDeduction);
    document.getElementById('totalDeductionsDisplay').textContent = formatCurrency(totalDeductions);
    document.getElementById('schoolPortionDisplay').textContent = formatCurrency(schoolPortion);
    
    return { ptaDeduction, levyDeduction, totalDeductions, schoolPortion };
}

// Process payment form submission
async function processPayment(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showAlert('Please login to process payments', 'error');
        return;
    }
    
    if (!currentStudent) {
        showAlert('Please search and select a student first', 'error');
        return;
    }
    
    // Get form values
    const studentId = document.getElementById('studentId').value.trim().toUpperCase();
    const paymentType = document.getElementById('paymentType').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const paymentMethod = document.getElementById('paymentMethod').value;
    const description = document.getElementById('description').value;
    const term = document.getElementById('term').value;
    
    // Validation
    if (!studentId || !paymentType || !amount || !paymentMethod || !term) {
        showAlert('Please fill all required fields', 'error');
        return;
    }
    
    if (amount <= 0) {
        showAlert('Please enter a valid amount', 'error');
        return;
    }
    
    if (amount > currentStudent.outstanding && paymentType === 'tuition') {
        showAlert(`Amount exceeds outstanding balance. Maximum allowed: ${formatCurrency(currentStudent.outstanding)}`, 'error');
        return;
    }
    
    try {
        // Calculate deductions
        let ptaDeduction = 0;
        let levyDeduction = 0;
        let totalDeductions = 0;
        
        if (paymentType === 'tuition') {
            const deductions = calculatePTABreakdown(amount, paymentType, studentId, term);
            ptaDeduction = deductions.ptaDeduction;
            levyDeduction = deductions.levyDeduction;
            totalDeductions = deductions.totalDeductions;
            
            // Update deduction history
            const deductionKey = `${studentId}_${term}`;
            if (!studentDeductionHistory[deductionKey]) {
                studentDeductionHistory[deductionKey] = {
                    ptaDeducted: false,
                    levyDeducted: false
                };
            }
            
            if (ptaDeduction > 0) studentDeductionHistory[deductionKey].ptaDeducted = true;
            if (levyDeduction > 0) studentDeductionHistory[deductionKey].levyDeducted = true;
        }
        
        // Generate payment ID
        const paymentId = generatePaymentId();
        lastPaymentId = paymentId;
        
        // Create payment data
        const paymentData = {
            paymentId: paymentId,
            studentId: studentId,
            studentName: currentStudent.fullName,
            paymentType: paymentType,
            amount: amount,
            paymentMethod: paymentMethod,
            description: description || `${paymentType} payment`,
            dateTime: new Date().toISOString(),
            timestamp: serverTimestamp(),
            recordedBy: currentUser.uid,
            recordedByName: currentUser.email,
            ptaDeduction: ptaDeduction,
            levyDeduction: levyDeduction,
            totalDeductions: totalDeductions,
            term: term,
            status: 'completed',
            receiptGenerated: false,
            receiptNumber: ''
        };
        
        // Save payment to Firestore
        await addDoc(collection(db, "payments"), paymentData);
        
        // Update student's payment information
        await updateStudentBalance(studentId, amount, ptaDeduction, levyDeduction, term);
        
        // Show success message
        showAlert(`Payment of ${formatCurrency(amount)} processed successfully! Payment ID: ${paymentId}`, 'success');
        
        // Enable receipt generation button
        document.getElementById('generateReceipt').disabled = false;
        
        // Reset form (keep student info)
        document.getElementById('amount').value = '';
        document.getElementById('description').value = '';
        document.getElementById('ptaBreakdown').classList.add('hidden');
        
        // Reload payment history
        loadRecentPayments();
        
        // Update student info
        await searchStudent();
        
    } catch (error) {
        console.error("Error processing payment:", error);
        showAlert('Error processing payment. Please try again.', 'error');
    }
}

// Update student's balance after payment
async function updateStudentBalance(studentId, amount, ptaDeduction, levyDeduction, term) {
    try {
        const studentRef = doc(db, "students", studentId);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
            const studentData = studentSnap.data();
            const newPaidAmount = (studentData.paidAmount || 0) + amount;
            const newOutstanding = Math.max(0, (studentData.totalFees || 0) - newPaidAmount);
            const newPtaDeducted = (studentData.ptaDeducted || 0) + ptaDeduction;
            const newLevyDeducted = (studentData.levyDeducted || 0) + levyDeduction;
            const newTotalDeductions = (studentData.totalDeductions || 0) + ptaDeduction + levyDeduction;
            
            // Update term deductions tracking
            let termDeductions = studentData.termDeductions || {};
            if (!termDeductions[term]) {
                termDeductions[term] = {
                    ptaDeducted: false,
                    levyDeducted: false,
                    totalDeducted: 0
                };
            }
            
            if (ptaDeduction > 0) termDeductions[term].ptaDeducted = true;
            if (levyDeduction > 0) termDeductions[term].levyDeducted = true;
            termDeductions[term].totalDeducted = (termDeductions[term].totalDeducted || 0) + ptaDeduction + levyDeduction;
            
            await updateDoc(studentRef, {
                paidAmount: newPaidAmount,
                outstanding: newOutstanding,
                ptaDeducted: newPtaDeducted,
                levyDeducted: newLevyDeducted,
                totalDeductions: newTotalDeductions,
                lastPaymentDate: new Date().toISOString(),
                lastPaymentTerm: term,
                termDeductions: termDeductions
            });
        }
    } catch (error) {
        console.error("Error updating student balance:", error);
        throw error;
    }
}

// Generate unique payment ID
function generatePaymentId() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `PAY${year}${month}${day}${hours}${minutes}${seconds}`;
}

// Load recent payments
async function loadRecentPayments() {
    try {
        const paymentsQuery = query(
            collection(db, "payments"),
            orderBy("timestamp", "desc"),
            limit(10)
        );
        
        const querySnapshot = await getDocs(paymentsQuery);
        const paymentHistory = document.getElementById('paymentHistory');
        
        if (querySnapshot.empty) {
            paymentHistory.innerHTML = '<p>No payment history found.</p>';
            return;
        }
        
        let html = '';
        let termTotal = 0;
        let totalPTA = 0;
        let totalLevies = 0;
        
        querySnapshot.forEach((doc) => {
            const payment = doc.data();
            termTotal += payment.amount || 0;
            totalPTA += payment.ptaDeduction || 0;
            totalLevies += payment.levyDeduction || 0;
            
            html += `
                <div class="payment-item">
                    <div class="payment-item-header">
                        <span class="payment-id">${payment.paymentId}</span>
                        <span class="payment-amount">${formatCurrency(payment.amount)}</span>
                    </div>
                    <div class="payment-details">
                        <p><strong>${payment.studentName}</strong> (${payment.studentId})</p>
                        <p>${payment.description} • ${payment.paymentType}</p>
                        ${payment.ptaDeduction > 0 ? `<p>PTA: ${formatCurrency(payment.ptaDeduction)}</p>` : ''}
                        ${payment.levyDeduction > 0 ? `<p>Levy: ${formatCurrency(payment.levyDeduction)}</p>` : ''}
                        <p class="payment-date">${formatDate(payment.dateTime)} • ${payment.paymentMethod} • ${payment.term}</p>
                    </div>
                </div>
            `;
        });
        
        paymentHistory.innerHTML = html;
        
        // Update summary
        document.getElementById('termTotal').textContent = formatCurrency(termTotal);
        document.getElementById('totalPTA').textContent = formatCurrency(totalPTA);
        document.getElementById('totalLevies').textContent = formatCurrency(totalLevies);
        document.getElementById('netToSchool').textContent = formatCurrency(termTotal - totalPTA - totalLevies);
        
    } catch (error) {
        console.error("Error loading payments:", error);
        document.getElementById('paymentHistory').innerHTML = '<p class="error">Error loading payment history</p>';
    }
}

// Generate receipt for last payment
async function generateReceipt() {
    if (!lastPaymentId) {
        showAlert('No recent payment found', 'error');
        return;
    }
    
    try {
        // Find the payment
        const paymentsQuery = query(
            collection(db, "payments"),
            where("paymentId", "==", lastPaymentId)
        );
        
        const querySnapshot = await getDocs(paymentsQuery);
        
        if (!querySnapshot.empty) {
            const paymentDoc = querySnapshot.docs[0];
            const payment = paymentDoc.data();
            
            // Generate receipt number
            const receiptNumber = `REC-${payment.paymentId}`;
            
            // Update payment with receipt info
            await updateDoc(paymentDoc.ref, {
                receiptGenerated: true,
                receiptNumber: receiptNumber,
                receiptDate: new Date().toISOString()
            });
            
            // Create receipt content
            const receiptContent = createReceiptContent(payment, receiptNumber);
            
            // Open receipt in new window for printing
            const receiptWindow = window.open('', '_blank');
            receiptWindow.document.write(receiptContent);
            receiptWindow.document.close();
            
            showAlert('Receipt generated successfully!', 'success');
        }
        
    } catch (error) {
        console.error("Error generating receipt:", error);
        showAlert('Error generating receipt', 'error');
    }
}

// Create receipt HTML content
function createReceiptContent(payment, receiptNumber) {
    const date = new Date(payment.dateTime);
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt ${receiptNumber}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .receipt { border: 2px solid #000; padding: 30px; max-width: 500px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 { margin: 0; color: #2c3e50; }
                .header p { margin: 5px 0; color: #7f8c8d; }
                .details { margin: 20px 0; }
                .row { display: flex; justify-content: space-between; margin: 10px 0; }
                .total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #000; padding-top: 10px; }
                .footer { text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 0.9em; }
                .signature { margin-top: 40px; border-top: 1px solid #000; padding-top: 10px; }
                .deductions { background: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h1>Success Academy</h1>
                    <p>Official Receipt</p>
                    <p><strong>${receiptNumber}</strong></p>
                </div>
                
                <div class="details">
                    <div class="row">
                        <span>Date:</span>
                        <span>${date.toLocaleDateString()}</span>
                    </div>
                    <div class="row">
                        <span>Time:</span>
                        <span>${date.toLocaleTimeString()}</span>
                    </div>
                    <div class="row">
                        <span>Student ID:</span>
                        <span>${payment.studentId}</span>
                    </div>
                    <div class="row">
                        <span>Student Name:</span>
                        <span>${payment.studentName}</span>
                    </div>
                    <div class="row">
                        <span>Payment Type:</span>
                        <span>${payment.paymentType}</span>
                    </div>
                    <div class="row">
                        <span>Description:</span>
                        <span>${payment.description}</span>
                    </div>
                    <div class="row">
                        <span>Payment Method:</span>
                        <span>${payment.paymentMethod}</span>
                    </div>
                    <div class="row">
                        <span>Term:</span>
                        <span>${payment.term}</span>
                    </div>
                    
                    ${(payment.ptaDeduction > 0 || payment.levyDeduction > 0) ? `
                    <div class="deductions">
                        <h4>Deductions</h4>
                        ${payment.ptaDeduction > 0 ? `
                        <div class="row">
                            <span>PTA (10%):</span>
                            <span>-${formatCurrency(payment.ptaDeduction)}</span>
                        </div>
                        ` : ''}
                        ${payment.levyDeduction > 0 ? `
                        <div class="row">
                            <span>School Levy (5%):</span>
                            <span>-${formatCurrency(payment.levyDeduction)}</span>
                        </div>
                        ` : ''}
                        <div class="row">
                            <span>Total Deductions:</span>
                            <span>-${formatCurrency(payment.totalDeductions || 0)}</span>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="row total">
                        <span>Total Amount Paid:</span>
                        <span>${formatCurrency(payment.amount)}</span>
                    </div>
                </div>
                
                <div class="signature">
                    <p>Received by: ${payment.recordedByName}</p>
                    <p>Signature: _________________________</p>
                </div>
                
                <div class="footer">
                    <p>Thank you for your payment!</p>
                    <p>Success Academy Finance Department</p>
                    <p>Contact: finance@successacademy.edu</p>
                    <p><em>This is an official receipt. Please keep for your records.</em></p>
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `;
}

// Utility: Format currency in Nigerian Naira
function formatCurrency(amount) {
    return '₦' + amount.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Utility: Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Utility: Show alert message
function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
        <button onclick="this.parentElement.remove()" style="background:none; border:none; cursor:pointer; font-size: 1.2em;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    alertContainer.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

// Setup collections function (for testing)
async function setupCollections() {
    try {
        // Create sample student
        const studentData = {
            studentId: "STU001",
            fullName: "John Doe",
            class: "Grade 10A",
            parentName: "Jane Doe",
            parentPhone: "+2348012345678",
            parentEmail: "parent@example.com",
            totalFees: 150000,
            paidAmount: 0,
            outstanding: 150000,
            ptaDeducted: 0,
            levyDeducted: 0,
            totalDeductions: 0,
            createdAt: new Date().toISOString(),
            termDeductions: {
                "Term 1 2024/2025": { ptaDeducted: false, levyDeducted: false, totalDeducted: 0 },
                "Term 2 2024/2025": { ptaDeducted: false, levyDeducted: false, totalDeducted: 0 },
                "Term 3 2024/2025": { ptaDeducted: false, levyDeducted: false, totalDeducted: 0 }
            }
        };
        
        await setDoc(doc(db, "students", "STU001"), studentData);
        
        // Create sample fees structure
        const feesData = {
            tuition: { amount: 150000, ptaPercentage: 0.10, levyPercentage: 0.05 },
            pta: { amount: 15000, ptaPercentage: 1.00, levyPercentage: 0.00 },
            exam: { amount: 10000, ptaPercentage: 0.00, levyPercentage: 0.00 },
            library: { amount: 5000, ptaPercentage: 0.00, levyPercentage: 0.00 },
            sports: { amount: 8000, ptaPercentage: 0.00, levyPercentage: 0.00 },
            updatedAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, "fees_structure", "current"), feesData);
        
        showAlert('Collections setup complete! Sample student STU001 created.', 'success');
        
    } catch (error) {
        console.error("Setup error:", error);
        showAlert('Error setting up collections: ' + error.message, 'error');
    }
}

// Make functions available globally
window.searchStudent = searchStudent;
window.processPayment = processPayment;
window.generateReceipt = generateReceipt;
window.showAlert = showAlert;
window.setupCollections = setupCollections;
