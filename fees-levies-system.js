// fees-levies-system.js - Complete Fees & Levies Management System

// Global variables
let currentUser = null;
let currentTab = 'structures';
let allFeeStructures = [];
let allLevies = [];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    loadFeeStructures();
    loadLevies();
    loadArrearsSummary();
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
    // Tab selection
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentTab = this.dataset.tab;
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(currentTab + 'Tab').classList.add('active');
        });
    });
    
    // Fee calculation on input
    document.querySelectorAll('#feeModal input[type="number"]').forEach(input => {
        input.addEventListener('input', calculateTotalFee);
    });
    
    // Fee form submission
    document.getElementById('feeStructureForm').addEventListener('submit', saveFeeStructure);
    
    // Levies form submission
    document.getElementById('leviesForm').addEventListener('submit', saveLevy);
    
    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024 && sidebar) {
            if (!sidebar.contains(e.target) && menuToggle && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
}

// Load fee structures from Firestore
async function loadFeeStructures() {
    try {
        const feesQuery = query(
            collection(db, "fee_structures"),
            orderBy("updatedAt", "desc")
        );
        
        const querySnapshot = await getDocs(feesQuery);
        allFeeStructures = [];
        
        querySnapshot.forEach((doc) => {
            const fee = { id: doc.id, ...doc.data() };
            allFeeStructures.push(fee);
        });
        
        displayFeeStructures();
        updateFeeSummary();
        
    } catch (error) {
        console.error("Error loading fee structures:", error);
        showAlert('Error loading fee structures', 'error');
        document.getElementById('feeStructuresTable').innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fas fa-exclamation-circle"></i>
                    <p style="margin-top: 10px;">Error loading fee structures</p>
                </td>
            </tr>
        `;
    }
}

// Display fee structures in table
function displayFeeStructures() {
    const tbody = document.getElementById('feeStructuresTable');
    
    if (allFeeStructures.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <i class="fas fa-file-invoice-dollar" style="font-size: 1.5rem; color: #6c757d;"></i>
                    <p style="margin-top: 10px;">No fee structures found. Add one to get started.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    allFeeStructures.forEach(fee => {
        const total = calculateFeeTotal(fee);
        const className = getClassName(fee.class);
        
        html += `
            <tr>
                <td><strong>${className}</strong></td>
                <td>${fee.term || 'N/A'}</td>
                <td>${formatCurrency(fee.tuitionFee || 0)}</td>
                <td>${formatCurrency(fee.ptaLevy || 0)}</td>
                <td>${formatCurrency(fee.examFee || 0)}</td>
                <td><strong style="color: #28a745;">${formatCurrency(total)}</strong></td>
                <td>
                    <span class="badge ${fee.status === 'active' ? 'badge-active' : 'badge-inactive'}">
                        ${fee.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" style="background: #17a2b8; color: white;" onclick="viewFeeStructure('${fee.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" style="background: #ffc107; color: black;" onclick="editFeeStructure('${fee.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" style="background: #dc3545; color: white;" onclick="deleteFeeStructure('${fee.id}', '${className}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Calculate total fee from all components
function calculateFeeTotal(fee) {
    const tuition = parseFloat(fee.tuitionFee) || 0;
    const pta = parseFloat(fee.ptaLevy) || 0;
    const exam = parseFloat(fee.examFee) || 0;
    const sports = parseFloat(fee.sportsFee) || 0;
    const library = parseFloat(fee.libraryFee) || 0;
    const medical = parseFloat(fee.medicalFee) || 0;
    const development = parseFloat(fee.developmentLevy) || 0;
    const other = parseFloat(fee.otherFees) || 0;
    
    return tuition + pta + exam + sports + library + medical + development + other;
}

// Update fee summary stats
function updateFeeSummary() {
    const totalStructures = allFeeStructures.length;
    const activeStructures = allFeeStructures.filter(f => f.status === 'active').length;
    const inactiveStructures = totalStructures - activeStructures;
    
    // Calculate total fees amount
    let totalFeesAmount = 0;
    allFeeStructures.forEach(fee => {
        totalFeesAmount += calculateFeeTotal(fee);
    });
    
    document.getElementById('totalStructures').textContent = totalStructures;
    document.getElementById('totalFeesAmount').textContent = formatCurrency(totalFeesAmount);
    document.getElementById('activeStructures').textContent = activeStructures;
    document.getElementById('inactiveStructures').textContent = inactiveStructures;
}

// Show add fee modal
function showAddFeeModal() {
    document.getElementById('modalTitle').textContent = 'Add Fee Structure';
    document.getElementById('feeStructureForm').reset();
    document.getElementById('feeId').value = '';
    document.getElementById('status').value = 'active';
    
    // Set default dates
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + 30); // 30 days from today
    
    document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];
    
    calculateTotalFee();
    document.getElementById('feeModal').style.display = 'flex';
}

// Calculate total fee in modal
function calculateTotalFee() {
    const tuition = parseFloat(document.getElementById('tuitionFee').value) || 0;
    const pta = parseFloat(document.getElementById('ptaLevy').value) || 0;
    const exam = parseFloat(document.getElementById('examFee').value) || 0;
    const sports = parseFloat(document.getElementById('sportsFee').value) || 0;
    const library = parseFloat(document.getElementById('libraryFee').value) || 0;
    const medical = parseFloat(document.getElementById('medicalFee').value) || 0;
    const development = parseFloat(document.getElementById('developmentLevy').value) || 0;
    const other = parseFloat(document.getElementById('otherFees').value) || 0;
    
    const total = tuition + pta + exam + sports + library + medical + development + other;
    document.getElementById('totalFeeDisplay').textContent = formatCurrency(total);
}

// Save fee structure
async function saveFeeStructure(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showAlert('Please login to save fee structure', 'error');
        return;
    }
    
    // Get form values
    const feeId = document.getElementById('feeId').value;
    const className = document.getElementById('className').value;
    const term = document.getElementById('term').value;
    const tuitionFee = parseFloat(document.getElementById('tuitionFee').value) || 0;
    const ptaLevy = parseFloat(document.getElementById('ptaLevy').value) || 0;
    const examFee = parseFloat(document.getElementById('examFee').value) || 0;
    const sportsFee = parseFloat(document.getElementById('sportsFee').value) || 0;
    const libraryFee = parseFloat(document.getElementById('libraryFee').value) || 0;
    const medicalFee = parseFloat(document.getElementById('medicalFee').value) || 0;
    const developmentLevy = parseFloat(document.getElementById('developmentLevy').value) || 0;
    const otherFees = parseFloat(document.getElementById('otherFees').value) || 0;
    const status = document.getElementById('status').value;
    const dueDate = document.getElementById('dueDate').value;
    const description = document.getElementById('description').value.trim();
    
    // Validation
    if (!className || !term || tuitionFee <= 0) {
        showAlert('Please fill all required fields with valid values', 'error');
        return;
    }
    
    try {
        const totalFees = calculateFeeTotal({
            tuitionFee, ptaLevy, examFee, sportsFee, libraryFee, medicalFee, developmentLevy, otherFees
        });
        
        const feeData = {
            class: className,
            term,
            tuitionFee,
            ptaLevy,
            examFee,
            sportsFee,
            libraryFee,
            medicalFee,
            developmentLevy,
            otherFees,
            totalFees,
            status,
            dueDate,
            description,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid,
            updatedByName: currentUser.email
        };
        
        if (!feeId) {
            // New fee structure
            const newFeeId = `${className}_${term.replace(/\s+/g, '_')}_${Date.now()}`;
            feeData.createdAt = serverTimestamp();
            feeData.createdBy = currentUser.uid;
            
            await setDoc(doc(db, "fee_structures", newFeeId), feeData);
            showAlert(`Fee structure for ${getClassName(className)} (${term}) created successfully!`, 'success');
        } else {
            // Update existing
            await updateDoc(doc(db, "fee_structures", feeId), feeData);
            showAlert(`Fee structure updated successfully!`, 'success');
        }
        
        // Close modal and refresh data
        closeFeeModal();
        await loadFeeStructures();
        
    } catch (error) {
        console.error("Error saving fee structure:", error);
        showAlert('Error saving fee structure: ' + error.message, 'error');
    }
}

// Edit fee structure
async function editFeeStructure(feeId) {
    try {
        const feeRef = doc(db, "fee_structures", feeId);
        const feeSnap = await getDoc(feeRef);
        
        if (feeSnap.exists()) {
            const fee = feeSnap.data();
            
            document.getElementById('modalTitle').textContent = 'Edit Fee Structure';
            document.getElementById('feeId').value = feeId;
            document.getElementById('className').value = fee.class || '';
            document.getElementById('term').value = fee.term || '';
            document.getElementById('tuitionFee').value = fee.tuitionFee || 0;
            document.getElementById('ptaLevy').value = fee.ptaLevy || 0;
            document.getElementById('examFee').value = fee.examFee || 0;
            document.getElementById('sportsFee').value = fee.sportsFee || 0;
            document.getElementById('libraryFee').value = fee.libraryFee || 0;
            document.getElementById('medicalFee').value = fee.medicalFee || 0;
            document.getElementById('developmentLevy').value = fee.developmentLevy || 0;
            document.getElementById('otherFees').value = fee.otherFees || 0;
            document.getElementById('status').value = fee.status || 'active';
            document.getElementById('dueDate').value = fee.dueDate || '';
            document.getElementById('description').value = fee.description || '';
            
            calculateTotalFee();
            document.getElementById('feeModal').style.display = 'flex';
        }
    } catch (error) {
        console.error("Error loading fee structure for edit:", error);
        showAlert('Error loading fee structure', 'error');
    }
}

// View fee structure details
async function viewFeeStructure(feeId) {
    try {
        const feeRef = doc(db, "fee_structures", feeId);
        const feeSnap = await getDoc(feeRef);
        
        if (feeSnap.exists()) {
            const fee = feeSnap.data();
            const total = calculateFeeTotal(fee);
            
            // Create a detailed view (could be a modal or new page)
            const details = `
                <div class="fee-card">
                    <div class="fee-card-header">
                        <div>
                            <div class="fee-card-title">${getClassName(fee.class)} - ${fee.term}</div>
                            <div class="fee-card-subtitle">Status: ${fee.status === 'active' ? 'Active' : 'Inactive'}</div>
                        </div>
                        <span style="font-size: 1.2rem; font-weight: bold; color: #28a745;">${formatCurrency(total)}</span>
                    </div>
                    
                    <div class="fee-breakdown">
                        <div class="fee-item">
                            <span>Tuition Fee:</span>
                            <span>${formatCurrency(fee.tuitionFee || 0)}</span>
                        </div>
                        ${fee.ptaLevy ? `<div class="fee-item"><span>PTA Levy:</span><span>${formatCurrency(fee.ptaLevy)}</span></div>` : ''}
                        ${fee.examFee ? `<div class="fee-item"><span>Examination Fee:</span><span>${formatCurrency(fee.examFee)}</span></div>` : ''}
                        ${fee.sportsFee ? `<div class="fee-item"><span>Sports Fee:</span><span>${formatCurrency(fee.sportsFee)}</span></div>` : ''}
                        ${fee.libraryFee ? `<div class="fee-item"><span>Library Fee:</span><span>${formatCurrency(fee.libraryFee)}</span></div>` : ''}
                        ${fee.medicalFee ? `<div class="fee-item"><span>Medical Fee:</span><span>${formatCurrency(fee.medicalFee)}</span></div>` : ''}
                        ${fee.developmentLevy ? `<div class="fee-item"><span>Development Levy:</span><span>${formatCurrency(fee.developmentLevy)}</span></div>` : ''}
                        ${fee.otherFees ? `<div class="fee-item"><span>Other Fees:</span><span>${formatCurrency(fee.otherFees)}</span></div>` : ''}
                        <div class="fee-item">
                            <span>Total Fees:</span>
                            <span>${formatCurrency(total)}</span>
                        </div>
                    </div>
                    
                    ${fee.description ? `<p style="margin-top: 10px; color: #666;">${fee.description}</p>` : ''}
                    ${fee.dueDate ? `<p style="margin-top: 5px; color: #666;">Due Date: ${fee.dueDate}</p>` : ''}
                </div>
            `;
            
            // Show in an alert or modal
            alert(`Fee Structure Details:\n\nClass: ${getClassName(fee.class)}\nTerm: ${fee.term}\nTotal: ${formatCurrency(total)}\nStatus: ${fee.status}`);
        }
    } catch (error) {
        console.error("Error viewing fee structure:", error);
        showAlert('Error loading fee details', 'error');
    }
}

// Delete fee structure
function deleteFeeStructure(feeId, feeName) {
    if (confirm(`Are you sure you want to delete fee structure for ${feeName}?\n\nThis will not delete existing payments, but students will not be able to see this fee structure.`)) {
        deleteFeeStructureConfirmed(feeId);
    }
}

async function deleteFeeStructureConfirmed(feeId) {
    try {
        await deleteDoc(doc(db, "fee_structures", feeId));
        showAlert('Fee structure deleted successfully', 'success');
        await loadFeeStructures();
    } catch (error) {
        console.error("Error deleting fee structure:", error);
        showAlert('Error deleting fee structure: ' + error.message, 'error');
    }
}

// Load levies
async function loadLevies() {
    try {
        const leviesQuery = query(
            collection(db, "levies"),
            orderBy("updatedAt", "desc")
        );
        
        const querySnapshot = await getDocs(leviesQuery);
        allLevies = [];
        
        querySnapshot.forEach((doc) => {
            const levy = { id: doc.id, ...doc.data() };
            allLevies.push(levy);
        });
        
        displayLevies();
        
    } catch (error) {
        console.error("Error loading levies:", error);
        // Don't show error if collection doesn't exist yet
    }
}

// Display levies
function displayLevies() {
    const tbody = document.getElementById('leviesTable');
    
    if (allLevies.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    No levies configured yet. Add a levy above.
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    allLevies.forEach(levy => {
        const applicableTo = Array.isArray(levy.applicableTo) ? levy.applicableTo.join(', ') : levy.applicableTo;
        
        html += `
            <tr>
                <td><strong>${levy.name}</strong></td>
                <td>${formatCurrency(levy.amount || 0)}</td>
                <td>${levy.type || 'N/A'}</td>
                <td>${levy.frequency || 'N/A'}</td>
                <td>${applicableTo || 'All'}</td>
                <td>
                    <span class="badge ${levy.status === 'active' ? 'badge-active' : 'badge-inactive'}">
                        ${levy.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" style="background: #ffc107; color: black;" onclick="editLevy('${levy.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" style="background: #dc3545; color: white;" onclick="deleteLevy('${levy.id}', '${levy.name}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Save levy
async function saveLevy(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showAlert('Please login to save levy', 'error');
        return;
    }
    
    // Get form values
    const levyName = document.getElementById('levyName').value.trim();
    const levyAmount = parseFloat(document.getElementById('levyAmount').value) || 0;
    const levyType = document.getElementById('levyType').value;
    const levyFrequency = document.getElementById('levyFrequency').value;
    const levyDescription = document.getElementById('levyDescription').value.trim();
    const levyApplicableTo = Array.from(document.getElementById('levyApplicableTo').selectedOptions).map(opt => opt.value);
    const levyStatus = document.getElementById('levyStatus').value;
    
    // Validation
    if (!levyName || !levyAmount || !levyType) {
        showAlert('Please fill all required fields', 'error');
        return;
    }
    
    try {
        const levyId = `levy_${Date.now()}`;
        const levyData = {
            name: levyName,
            amount: levyAmount,
            type: levyType,
            frequency: levyFrequency,
            description: levyDescription,
            applicableTo: levyApplicableTo,
            status: levyStatus,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid
        };
        
        await setDoc(doc(db, "levies", levyId), levyData);
        
        showAlert(`Levy "${levyName}" saved successfully!`, 'success');
        document.getElementById('leviesForm').reset();
        await loadLevies();
        
    } catch (error) {
        console.error("Error saving levy:", error);
        showAlert('Error saving levy: ' + error.message, 'error');
    }
}

// Edit levy
async function editLevy(levyId) {
    try {
        const levyRef = doc(db, "levies", levyId);
        const levySnap = await getDoc(levyRef);
        
        if (levySnap.exists()) {
            const levy = levySnap.data();
            
            document.getElementById('levyName').value = levy.name || '';
            document.getElementById('levyAmount').value = levy.amount || 0;
            document.getElementById('levyType').value = levy.type || '';
            document.getElementById('levyFrequency').value = levy.frequency || '';
            document.getElementById('levyDescription').value = levy.description || '';
            document.getElementById('levyStatus').value = levy.status || 'active';
            
            // Scroll to form
            document.getElementById('leviesForm').scrollIntoView({ behavior: 'smooth' });
            showAlert(`Loaded levy "${levy.name}" for editing`, 'success');
        }
    } catch (error) {
        console.error("Error loading levy for edit:", error);
        showAlert('Error loading levy', 'error');
    }
}

// Delete levy
function deleteLevy(levyId, levyName) {
    if (confirm(`Are you sure you want to delete levy "${levyName}"?`)) {
        deleteLevyConfirmed(levyId);
    }
}

async function deleteLevyConfirmed(levyId) {
    try {
        await deleteDoc(doc(db, "levies", levyId));
        showAlert('Levy deleted successfully', 'success');
        await loadLevies();
    } catch (error) {
        console.error("Error deleting levy:", error);
        showAlert('Error deleting levy: ' + error.message, 'error');
    }
}

// Load arrears summary
async function loadArrearsSummary() {
    try {
        // This would normally query your payments and fee structures
        // For now, we'll use sample data
        const totalArrears = 125000;
        const studentsInArrears = 8;
        const oldestArrear = 45;
        
        document.getElementById('totalArrears').textContent = formatCurrency(totalArrears);
        document.getElementById('studentsInArrears').textContent = studentsInArrears;
        document.getElementById('oldestArrear').textContent = oldestArrear + ' days';
        
    } catch (error) {
        console.error("Error loading arrears summary:", error);
    }
}

// Generate report
async function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const reportTerm = document.getElementById('reportTerm').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const reportClass = document.getElementById('reportClass').value;
    const reportFormat = document.getElementById('reportFormat').value;
    
    // Show loading
    const reportResults = document.getElementById('reportResults');
    reportResults.innerHTML = `
        <div style="text-align: center;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #667eea;"></i>
            <p style="margin-top: 10px;">Generating report...</p>
        </div>
    `;
    
    // Simulate API call
    setTimeout(() => {
        const sampleData = {
            totalCollected: 2450000,
            totalExpected: 2850000,
            collectionRate: '86%',
            topClass: 'Nursery 3',
            topClassAmount: 650000,
            pendingPayments: 12,
            totalArrears: 400000
        };
        
        const reportHtml = `
            <div style="padding: 20px;">
                <h4 style="color: #667eea; margin-bottom: 20px;">Fee Collection Report</h4>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 5px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #28a745;">${formatCurrency(sampleData.totalCollected)}</div>
                        <div style="color: #666;">Total Collected</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 5px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #dc3545;">${formatCurrency(sampleData.totalArrears)}</div>
                        <div style="color: #666;">Total Arrears</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 5px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #17a2b8;">${sampleData.collectionRate}</div>
                        <div style="color: #666;">Collection Rate</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 5px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #ffc107;">${sampleData.topClass}</div>
                        <div style="color: #666;">Highest Collection (${formatCurrency(sampleData.topClassAmount)})</div>
                    </div>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 5px; border: 1px solid #eee;">
                    <h5 style="margin-bottom: 10px;">Report Details</h5>
                    <p><strong>Report Type:</strong> ${reportType.replace('_', ' ').toUpperCase()}</p>
                    <p><strong>Term:</strong> ${reportTerm}</p>
                    ${reportClass !== 'all' ? `<p><strong>Class:</strong> ${getClassName(reportClass)}</p>` : ''}
                    ${startDate ? `<p><strong>Period:</strong> ${startDate} to ${endDate || 'Present'}</p>` : ''}
                    <p><strong>Generated:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
                </div>
            </div>
        `;
        
        reportResults.innerHTML = reportHtml;
        
        if (reportFormat === 'pdf') {
            alert('PDF generation would open here. In production, this would generate a downloadable PDF.');
        } else if (reportFormat === 'excel') {
            alert('Excel export would start here. In production, this would download an Excel file.');
        }
        
    }, 1500);
}

// Print report
function printReport() {
    window.print();
}

// Helper functions
function getClassName(classCode) {
    const classes = {
        'kg': 'Kindergarten (KG)',
        'nursery1': 'Nursery 1',
        'nursery2': 'Nursery 2',
        'nursery3': 'Nursery 3',
        'primary1': 'Primary 1',
        'primary2': 'Primary 2',
        'primary3': 'Primary 3',
        'primary4': 'Primary 4',
        'primary5': 'Primary 5',
        'primary6': 'Primary 6',
        'primary': 'Primary'
    };
    return classes[classCode] || classCode;
}

function formatCurrency(amount) {
    return '₦' + amount.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Modal functions
function closeFeeModal() {
    document.getElementById('feeModal').style.display = 'none';
}

// Alert function
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

// Make functions available globally
window.showAddFeeModal = showAddFeeModal;
window.closeFeeModal = closeFeeModal;
window.editFeeStructure = editFeeStructure;
window.viewFeeStructure = viewFeeStructure;
window.deleteFeeStructure = deleteFeeStructure;
window.editLevy = editLevy;
window.deleteLevy = deleteLevy;
window.generateReport = generateReport;
window.printReport = printReport;
window.showAlert = showAlert;
