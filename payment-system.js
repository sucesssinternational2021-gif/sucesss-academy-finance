// payment-system.js

// Global variables
let currentStudent = null;
let lastPaymentId = null;
let currentUser = null;

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
        const ptaBreakdown = document.getElementById('ptaBreakdown');
        const amount = parseFloat(document.getElementById('amount').value) || 0;
        
        if (this.value === 'tuition' && amount > 0) {
            ptaBreakdown.classList.remove('hidden');
            calculatePTABreakdown(amount);
        } else {
            ptaBreakdown.classList.add('hidden');
        }
    });
    
    // Amount input - update PTA breakdown
    document.getElementById('amount').addEventListener('input', function() {
        const paymentType = document.getElementById('paymentType').value;
        const amount = parseFloat(this.value) || 0;
        
        if (paymentType === 'tuition' && amount > 0) {
            document.getElementById('ptaBreakdown').classList.remove('hidden');
            calculatePTABreakdown(amount);
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
        } else {
            showAlert('Student not found. Please check the Student ID.', 'error');
            currentStudent = null;
            document.getElementById('studentInfo').classList.add('hidden');
        }
    } catch (error) {
        console.error("Error searching student:", error);
        showAlert('Error searching for student. Please try again.', 'error');
    }
}

// Display student information
function displayStudentInfo(student) {
    document.getElementById('studentInfo').classList.remove('hidden');
    document.getElementById('studentNameDisplay').textContent = student.fullName || 'N/A';
    document.getElementById('studentClass').textContent = student.class || 'N/A';
    document.getElementById('totalFees').textContent = formatCurrency(student.totalFees || 0);
    document.getElementById('paidAmount').textContent = formatCurrency(student.paidAmount || 0);
    document.getElementById('outstandingBalance').textContent = formatCurrency(student.outstanding || 0);
}

// Calculate PTA deduction (10% of tuition payment)
function calculatePTABreakdown(amount) {
    const ptaPercentage = 0.10; // 10% for PTA
    const ptaDeduction = amount * ptaPercentage;
    const schoolPortion = amount - ptaDeduction;
    
    document.getElementById('paymentAmountDisplay').textContent = formatCurrency(amount);
    document.getElementById('ptaDeductionDisplay').textContent = formatCurrency(ptaDeduction);
    document.getElementById('schoolPortionDisplay').textContent = formatCurrency(schoolPortion);
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
    
    // Calculate PTA deduction if payment type is tuition
    let ptaDeduction = 0;
    if (paymentType === 'tuition') {
        ptaDeduction = amount * 0.10; // 10% PTA deduction
    }
    
    try {
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
            term: term,
            status: 'completed',
            receiptGenerated: false,
            receiptNumber: ''
        };
        
        // Save payment to Firestore
        await addDoc(collection(db, "payments"), paymentData);
        
        // Update student's payment information
        await updateStudentBalance(studentId, amount, ptaDeduction);
        
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
async function updateStudentBalance(studentId, amount, ptaDeduction) {
    try {
        const studentRef = doc(db, "students", studentId);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
            const studentData = studentSnap.data();
            const newPaidAmount = (studentData.paidAmount || 0) + amount;
            const newOutstanding = (studentData.totalFees || 0) - newPaidAmount;
            const newPtaDeducted = (studentData.ptaDeducted || 0) + ptaDeduction;
            
            await updateDoc(studentRef, {
                paidAmount: newPaidAmount,
                outstanding: newOutstanding,
                ptaDeducted: newPtaDeducted,
                lastPaymentDate: new Date().toISOString()
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
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `PAY${year}${month}${day}-${random}`;
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
        
        querySnapshot.forEach((doc) => {
            const payment = doc.data();
            termTotal += payment.amount || 0;
            totalPTA += payment.ptaDeduction || 0;
            
            html += `
                <div class="payment-item">
                    <div class="payment-item-header">
                        <span class="payment-id">${payment.paymentId}</span>
                        <span class="payment-amount">${formatCurrency(payment.amount)}</span>
                    </div>
                    <div class="payment-details">
                        <p><strong>${payment.studentName}</strong> (${payment.studentId})</p>
                        <p>${payment.description}</p>
                        <p class="payment-date">${formatDate(payment.dateTime)} • ${payment.paymentMethod}</p>
                    </div>
                </div>
            `;
        });
        
        paymentHistory.innerHTML = html;
        
        // Update summary
        document.getElementById('termTotal').textContent = formatCurrency(termTotal);
        document.getElementById('totalPTA').textContent = formatCurrency(totalPTA);
        document.getElementById('netToSchool').textContent = formatCurrency(termTotal - totalPTA);
        
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
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h1>Success Academy</h1>
                    <p>Official Receipt</p>
                    <p>${receiptNumber}</p>
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
                    ${payment.ptaDeduction > 0 ? `
                    <div class="row">
                        <span>PTA Deduction (10%):</span>
                        <span>-${formatCurrency(payment.ptaDeduction)}</span>
                    </div>
                    ` : ''}
                    <div class="row total">
                        <span>Amount Paid:</span>
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

// Utility: Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
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
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
        <button onclick="this.parentElement.remove()" style="float:right; background:none; border:none; cursor:pointer;">
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

// Make functions available globally
window.searchStudent = searchStudent;
window.processPayment = processPayment;
window.generateReceipt = generateReceipt;
window.showAlert = showAlert;
