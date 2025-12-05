// pupils-system.js - Complete Pupils Management System

// Global variables
let currentUser = null;
let currentClass = 'all';
let currentTab = 'list';
let allPupils = [];
let filteredPupils = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentAttendanceData = {};
let attendanceDate = new Date().toISOString().split('T')[0];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    loadPupils();
    loadStats();
    loadFeeStructures();
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
    // Class selection
    document.querySelectorAll('.class-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.class-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            currentClass = this.dataset.class;
            document.getElementById('className').textContent = this.querySelector('span').textContent;
            currentPage = 1;
            filterAndDisplayPupils();
        });
    });
    
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
    
    // Search input
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchPupils();
        }
    });
    
    // Pupil form submission
    document.getElementById('pupilForm').addEventListener('submit', savePupil);
    
    // Fee structure form submission
    document.getElementById('feeStructureForm').addEventListener('submit', saveFeeStructure);
    
    // Calculate age from date of birth
    document.getElementById('pupilDob').addEventListener('change', calculateAge);
    
    // Set today's date for attendance
    document.getElementById('attendanceDate').value = attendanceDate;
}

// Calculate age from date of birth
function calculateAge() {
    const dob = new Date(document.getElementById('pupilDob').value);
    if (isNaN(dob.getTime())) return;
    
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    
    document.getElementById('pupilAge').value = age;
}

// Load all pupils from Firestore
async function loadPupils() {
    try {
        const pupilsQuery = query(
            collection(db, "pupils"),
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(pupilsQuery);
        allPupils = [];
        
        querySnapshot.forEach((doc) => {
            const pupil = { id: doc.id, ...doc.data() };
            allPupils.push(pupil);
        });
        
        filterAndDisplayPupils();
        
    } catch (error) {
        console.error("Error loading pupils:", error);
        showAlert('Error loading pupils data', 'error');
        document.getElementById('pupilsTableBody').innerHTML = 
            '<tr><td colspan="9" class="no-data">Error loading data</td></tr>';
    }
}

// Filter and display pupils based on current class
function filterAndDisplayPupils() {
    // Filter by class
    if (currentClass === 'all') {
        filteredPupils = [...allPupils];
    } else {
        filteredPupils = allPupils.filter(pupil => pupil.class === currentClass);
    }
    
    // Apply search filter if any
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filteredPupils = filteredPupils.filter(pupil => 
            (pupil.firstName?.toLowerCase().includes(searchTerm) || 
             pupil.lastName?.toLowerCase().includes(searchTerm) ||
             pupil.pupilId?.toLowerCase().includes(searchTerm) ||
             pupil.parentName?.toLowerCase().includes(searchTerm) ||
             pupil.parentPhone?.includes(searchTerm))
        );
    }
    
    displayPupilsTable();
    updatePagination();
}

// Display pupils in table
function displayPupilsTable() {
    const tbody = document.getElementById('pupilsTableBody');
    
    if (filteredPupils.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="no-data">
                    <i class="fas fa-user-slash" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>No pupils found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pagePupils = filteredPupils.slice(startIndex, endIndex);
    
    let html = '';
    
    pagePupils.forEach(pupil => {
        const fullName = `${pupil.firstName || ''} ${pupil.lastName || ''}`;
        const className = getClassName(pupil.class);
        const age = pupil.age || calculateAgeFromDob(pupil.dob);
        
        html += `
            <tr>
                <td>${pupil.pupilId || pupil.id}</td>
                <td>
                    <strong>${fullName}</strong>
                    ${pupil.medicalNotes ? '<br><small style="color: #dc3545;"><i class="fas fa-heartbeat"></i> Medical note</small>' : ''}
                </td>
                <td>${className}</td>
                <td>${pupil.gender === 'male' ? '👦 Boy' : '👧 Girl'}</td>
                <td>${age}</td>
                <td>
                    ${pupil.parentName || 'N/A'}<br>
                    <small>${pupil.parentRelationship || ''}</small>
                </td>
                <td>${pupil.parentPhone || 'N/A'}</td>
                <td>
                    <span class="status-${pupil.status || 'active'}">
                        ${getStatusText(pupil.status)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" style="background: #17a2b8; color: white;" onclick="viewPupil('${pupil.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" style="background: #ffc107; color: black;" onclick="editPupil('${pupil.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" style="background: #dc3545; color: white;" onclick="deletePupil('${pupil.id}', '${fullName}')">
                            <i class="fas fa-trash"></i>
                        </button>
                        ${pupil.status === 'active' ? `
                        <button class="action-btn" style="background: #28a745; color: white;" onclick="collectPayment('${pupil.id}', '${fullName}')">
                            <i class="fas fa-money-bill-wave"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Update pagination controls
function updatePagination() {
    const totalPages = Math.ceil(filteredPupils.length / itemsPerPage);
    const paginationDiv = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `
        <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `
                <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span>...</span>`;
        }
    }
    
    // Next button
    html += `
        <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationDiv.innerHTML = html;
}

// Change page
function changePage(page) {
    currentPage = page;
    displayPupilsTable();
    updatePagination();
}

// Search pupils
function searchPupils() {
    currentPage = 1;
    filterAndDisplayPupils();
}

// Clear search
function clearSearch() {
    document.getElementById('searchInput').value = '';
    currentPage = 1;
    filterAndDisplayPupils();
}

// Load statistics
async function loadStats() {
    try {
        // Get all pupils if not already loaded
        if (allPupils.length === 0) {
            await loadPupils();
        }
        
        const totalPupils = allPupils.length;
        const activePupils = allPupils.filter(p => p.status === 'active').length;
        const boys = allPupils.filter(p => p.gender === 'male').length;
        const girls = allPupils.filter(p => p.gender === 'female').length;
        const kgPupils = allPupils.filter(p => p.class === 'kg').length;
        const nurseryPupils = allPupils.filter(p => p.class.startsWith('nursery')).length;
        
        document.getElementById('totalPupils').textContent = totalPupils;
        document.getElementById('activePupils').textContent = activePupils;
        document.getElementById('boysCount').textContent = boys;
        document.getElementById('girlsCount').textContent = girls;
        document.getElementById('kgCount').textContent = kgPupils;
        document.getElementById('nurseryCount').textContent = nurseryPupils;
        
    } catch (error) {
        console.error("Error loading stats:", error);
    }
}

// Show add pupil modal
function showAddPupilModal() {
    document.getElementById('modalTitle').textContent = 'Add New Pupil';
    document.getElementById('pupilForm').reset();
    document.getElementById('pupilId').value = '';
    document.getElementById('enrollmentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('status').value = 'active';
    document.getElementById('pupilModal').style.display = 'flex';
}

// Show edit pupil modal
async function editPupil(pupilId) {
    try {
        const pupilRef = doc(db, "pupils", pupilId);
        const pupilSnap = await getDoc(pupilRef);
        
        if (pupilSnap.exists()) {
            const pupil = pupilSnap.data();
            
            document.getElementById('modalTitle').textContent = 'Edit Pupil';
            document.getElementById('pupilId').value = pupilId;
            document.getElementById('pupilFirstName').value = pupil.firstName || '';
            document.getElementById('pupilLastName').value = pupil.lastName || '';
            document.getElementById('pupilClass').value = pupil.class || '';
            document.getElementById('pupilGender').value = pupil.gender || '';
            document.getElementById('pupilDob').value = pupil.dob || '';
            document.getElementById('pupilAge').value = pupil.age || '';
            document.getElementById('pupilAddress').value = pupil.address || '';
            document.getElementById('parentName').value = pupil.parentName || '';
            document.getElementById('parentRelationship').value = pupil.parentRelationship || '';
            document.getElementById('parentPhone').value = pupil.parentPhone || '';
            document.getElementById('parentEmail').value = pupil.parentEmail || '';
            document.getElementById('parentOccupation').value = pupil.parentOccupation || '';
            document.getElementById('parentAddress').value = pupil.parentAddress || '';
            document.getElementById('enrollmentDate').value = pupil.enrollmentDate || '';
            document.getElementById('status').value = pupil.status || 'active';
            document.getElementById('medicalNotes').value = pupil.medicalNotes || '';
            document.getElementById('notes').value = pupil.notes || '';
            
            document.getElementById('pupilModal').style.display = 'flex';
        }
    } catch (error) {
        console.error("Error loading pupil for edit:", error);
        showAlert('Error loading pupil data', 'error');
    }
}

// View pupil details
async function viewPupil(pupilId) {
    try {
        const pupilRef = doc(db, "pupils", pupilId);
        const pupilSnap = await getDoc(pupilRef);
        
        if (pupilSnap.exists()) {
            const pupil = pupilSnap.data();
            const fullName = `${pupil.firstName || ''} ${pupil.lastName || ''}`;
            
            // For now, just show an alert with basic info
            // In a real app, you might want to show a detailed modal
            showAlert(`Viewing: ${fullName} (${pupil.pupilId || pupilId}) - ${getClassName(pupil.class)}`, 'success');
            
            // You could also redirect to a detailed view page
            // window.location.href = `pupil-details.html?id=${pupilId}`;
        }
    } catch (error) {
        console.error("Error viewing pupil:", error);
    }
}

// Collect payment for pupil
function collectPayment(pupilId, pupilName) {
    // Store pupil info in sessionStorage or localStorage
    localStorage.setItem('selectedPupilId', pupilId);
    localStorage.setItem('selectedPupilName', pupilName);
    
    // Redirect to payment page
    window.location.href = 'payment.html';
}

// Save pupil (add or update)
async function savePupil(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showAlert('Please login to save pupil data', 'error');
        return;
    }
    
    // Get form values
    const pupilId = document.getElementById('pupilId').value;
    const firstName = document.getElementById('pupilFirstName').value.trim();
    const lastName = document.getElementById('pupilLastName').value.trim();
    const pupilClass = document.getElementById('pupilClass').value;
    const gender = document.getElementById('pupilGender').value;
    const dob = document.getElementById('pupilDob').value;
    const age = document.getElementById('pupilAge').value || calculateAgeFromDob(dob);
    const address = document.getElementById('pupilAddress').value.trim();
    const parentName = document.getElementById('parentName').value.trim();
    const parentRelationship = document.getElementById('parentRelationship').value;
    const parentPhone = document.getElementById('parentPhone').value.trim();
    const parentEmail = document.getElementById('parentEmail').value.trim();
    const parentOccupation = document.getElementById('parentOccupation').value.trim();
    const parentAddress = document.getElementById('parentAddress').value.trim();
    const enrollmentDate = document.getElementById('enrollmentDate').value;
    const status = document.getElementById('status').value;
    const medicalNotes = document.getElementById('medicalNotes').value.trim();
    const notes = document.getElementById('notes').value.trim();
    
    // Validation
    if (!firstName || !lastName || !pupilClass || !gender || !dob || !parentName || !parentPhone || !enrollmentDate) {
        showAlert('Please fill all required fields', 'error');
        return;
    }
    
    try {
        // Generate pupil ID if new
        const newPupilId = pupilId || generatePupilId(pupilClass);
        
        const pupilData = {
            firstName,
            lastName,
            class: pupilClass,
            gender,
            dob,
            age: parseInt(age) || 0,
            address,
            parentName,
            parentRelationship,
            parentPhone,
            parentEmail,
            parentOccupation,
            parentAddress,
            enrollmentDate,
            status,
            medicalNotes,
            notes,
            pupilId: newPupilId,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid,
            updatedByName: currentUser.email
        };
        
        if (!pupilId) {
            // New pupil
            pupilData.createdAt = serverTimestamp();
            pupilData.createdBy = currentUser.uid;
            pupilData.createdByName = currentUser.email;
            
            await setDoc(doc(db, "pupils", newPupilId), pupilData);
            showAlert(`Pupil ${firstName} ${lastName} added successfully! ID: ${newPupilId}`, 'success');
        } else {
            // Update existing pupil
            await updateDoc(doc(db, "pupils", pupilId), pupilData);
            showAlert(`Pupil ${firstName} ${lastName} updated successfully!`, 'success');
        }
        
        // Close modal and refresh data
        closePupilModal();
        await loadPupils();
        await loadStats();
        
    } catch (error) {
        console.error("Error saving pupil:", error);
        showAlert('Error saving pupil data: ' + error.message, 'error');
    }
}

// Generate pupil ID
function generatePupilId(pupilClass) {
    const prefix = getClassPrefix(pupilClass);
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${year}${random}`;
}

// Delete pupil with confirmation
function deletePupil(pupilId, pupilName) {
    document.getElementById('confirmMessage').innerHTML = `
        <p>Are you sure you want to delete pupil <strong>${pupilName}</strong>?</p>
        <p style="color: #dc3545; font-weight: bold;">This action cannot be undone!</p>
    `;
    
    document.getElementById('confirmActionBtn').onclick = async function() {
        try {
            await deleteDoc(doc(db, "pupils", pupilId));
            showAlert(`Pupil ${pupilName} deleted successfully`, 'success');
            closeConfirmModal();
            await loadPupils();
            await loadStats();
        } catch (error) {
            console.error("Error deleting pupil:", error);
            showAlert('Error deleting pupil: ' + error.message, 'error');
        }
    };
    
    document.getElementById('confirmModal').style.display = 'flex';
}

// Save fee structure
async function saveFeeStructure(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showAlert('Please login to save fee structure', 'error');
        return;
    }
    
    // Get form values
    const feeClass = document.getElementById('feeClass').value;
    const feeTerm = document.getElementById('feeTerm').value;
    const tuitionFee = parseFloat(document.getElementById('tuitionFee').value) || 0;
    const ptaFee = parseFloat(document.getElementById('ptaFee').value) || 0;
    const examFee = parseFloat(document.getElementById('examFee').value) || 0;
    const sportsFee = parseFloat(document.getElementById('sportsFee').value) || 0;
    const libraryFee = parseFloat(document.getElementById('libraryFee').value) || 0;
    const otherFee = parseFloat(document.getElementById('otherFee').value) || 0;
    const feeDescription = document.getElementById('feeDescription').value.trim();
    
    // Validation
    if (!feeClass || !feeTerm || tuitionFee <= 0) {
        showAlert('Please fill all required fields with valid values', 'error');
        return;
    }
    
    try {
        const totalFees = tuitionFee + ptaFee + examFee + sportsFee + libraryFee + otherFee;
        const feeId = `${feeClass}_${feeTerm.replace(/\s+/g, '_')}`;
        
        const feeData = {
            class: feeClass,
            term: feeTerm,
            tuitionFee,
            ptaFee,
            examFee,
            sportsFee,
            libraryFee,
            otherFee,
            totalFees,
            description: feeDescription,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid
        };
        
        await setDoc(doc(db, "fee_structures", feeId), feeData);
        showAlert(`Fee structure for ${getClassName(feeClass)} (${feeTerm}) saved successfully!`, 'success');
        
        // Reset form and reload fee structures
        document.getElementById('feeStructureForm').reset();
        await loadFeeStructures();
        
    } catch (error) {
        console.error("Error saving fee structure:", error);
        showAlert('Error saving fee structure: ' + error.message, 'error');
    }
}

// Load fee structures
async function loadFeeStructures() {
    try {
        const feesQuery = query(
            collection(db, "fee_structures"),
            orderBy("updatedAt", "desc")
        );
        
        const querySnapshot = await getDocs(feesQuery);
        const tbody = document.getElementById('feeStructuresTable');
        
        if (querySnapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">
                        No fee structures found. Add one above.
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        
        querySnapshot.forEach((doc) => {
            const fee = doc.data();
            const total = (fee.tuitionFee || 0) + (fee.ptaFee || 0) + (fee.examFee || 0) + 
                         (fee.sportsFee || 0) + (fee.libraryFee || 0) + (fee.otherFee || 0);
            
            html += `
                <tr>
                    <td>${getClassName(fee.class)}</td>
                    <td>${fee.term}</td>
                    <td>${formatCurrency(fee.tuitionFee || 0)}</td>
                    <td>${formatCurrency(fee.ptaFee || 0)}</td>
                    <td>${formatCurrency(fee.examFee || 0)}</td>
                    <td><strong>${formatCurrency(total)}</strong></td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn" style="background: #ffc107; color: black;" onclick="editFeeStructure('${doc.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn" style="background: #dc3545; color: white;" onclick="deleteFeeStructure('${doc.id}', '${getClassName(fee.class)} - ${fee.term}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading fee structures:", error);
        document.getElementById('feeStructuresTable').innerHTML = 
            '<tr><td colspan="7" class="no-data">Error loading fee structures</td></tr>';
    }
}

// Edit fee structure
async function editFeeStructure(feeId) {
    try {
        const feeRef = doc(db, "fee_structures", feeId);
        const feeSnap = await getDoc(feeRef);
        
        if (feeSnap.exists()) {
            const fee = feeSnap.data();
            
            document.getElementById('feeClass').value = fee.class;
            document.getElementById('feeTerm').value = fee.term;
            document.getElementById('tuitionFee').value = fee.tuitionFee || 0;
            document.getElementById('ptaFee').value = fee.ptaFee || 0;
            document.getElementById('examFee').value = fee.examFee || 0;
            document.getElementById('sportsFee').value = fee.sportsFee || 0;
            document.getElementById('libraryFee').value = fee.libraryFee || 0;
            document.getElementById('otherFee').value = fee.otherFee || 0;
            document.getElementById('feeDescription').value = fee.description || '';
            
            showAlert(`Loaded fee structure for editing: ${getClassName(fee.class)} (${fee.term})`, 'success');
            
            // Scroll to form
            document.getElementById('feeStructureForm').scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error("Error loading fee structure for edit:", error);
        showAlert('Error loading fee structure', 'error');
    }
}

// Delete fee structure
function deleteFeeStructure(feeId, feeName) {
    document.getElementById('confirmMessage').innerHTML = `
        <p>Are you sure you want to delete fee structure <strong>${feeName}</strong>?</p>
        <p style="color: #dc3545;">Note: This will not affect existing payments.</p>
    `;
    
    document.getElementById('confirmActionBtn').onclick = async function() {
        try {
            await deleteDoc(doc(db, "fee_structures", feeId));
            showAlert(`Fee structure ${feeName} deleted successfully`, 'success');
            closeConfirmModal();
            await loadFeeStructures();
        } catch (error) {
            console.error("Error deleting fee structure:", error);
            showAlert('Error deleting fee structure: ' + error.message, 'error');
        }
    };
    
    document.getElementById('confirmModal').style.display = 'flex';
}

// Load class for attendance
async function loadClassForAttendance() {
    const attendanceClass = document.getElementById('attendanceClass').value;
    const date = document.getElementById('attendanceDate').value;
    
    if (!attendanceClass || !date) {
        showAlert('Please select class and date', 'error');
        return;
    }
    
    attendanceDate = date;
    
    try {
        // Load pupils for the selected class
        const pupilsQuery = query(
            collection(db, "pupils"),
            where("class", "==", attendanceClass),
            where("status", "==", "active")
        );
        
        const querySnapshot = await getDocs(pupilsQuery);
        const tbody = document.getElementById('attendanceTableBody');
        
        if (querySnapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="no-data">
                        No active pupils found in ${getClassName(attendanceClass)}
                    </td>
                </tr>
            `;
            return;
        }
        
        // Load existing attendance for this date and class
        const attendanceQuery = query(
            collection(db, "attendance"),
            where("date", "==", date),
            where("class", "==", attendanceClass)
        );
        
        const attendanceSnapshot = await getDocs(attendanceQuery);
        let existingAttendance = {};
        
        attendanceSnapshot.forEach((doc) => {
            const att = doc.data();
            existingAttendance[att.pupilId] = att;
        });
        
        // Build attendance table
        let html = '';
        currentAttendanceData = {};
        
        querySnapshot.forEach((doc) => {
            const pupil = doc.data();
            const fullName = `${pupil.firstName || ''} ${pupil.lastName || ''}`;
            const existing = existingAttendance[doc.id];
            
            // Store in currentAttendanceData
            currentAttendanceData[doc.id] = existing || {
                pupilId: doc.id,
                pupilName: fullName,
                class: attendanceClass,
                date: date,
                status: 'present',
                arrivalTime: '08:00',
                departureTime: '14:00',
                remarks: ''
            };
            
            // If existing, update currentAttendanceData
            if (existing) {
                currentAttendanceData[doc.id] = existing;
            }
            
            html += `
                <tr>
                    <td>
                        <strong>${fullName}</strong><br>
                        <small>${pupil.pupilId || doc.id}</small>
                    </td>
                    <td>
                        <select class="attendance-status" data-pupil="${doc.id}" onchange="updateAttendanceStatus('${doc.id}', this.value)">
                            <option value="present" ${(existing?.status || 'present') === 'present' ? 'selected' : ''}>Present</option>
                            <option value="absent" ${(existing?.status || 'present') === 'absent' ? 'selected' : ''}>Absent</option>
                            <option value="late" ${(existing?.status || 'present') === 'late' ? 'selected' : ''}>Late</option>
                            <option value="excused" ${(existing?.status || 'present') === 'excused' ? 'selected' : ''}>Excused</option>
                            <option value="sick" ${(existing?.status || 'present') === 'sick' ? 'selected' : ''}>Sick</option>
                        </select>
                    </td>
                    <td>
                        <input type="time" class="arrival-time" data-pupil="${doc.id}" 
                               value="${existing?.arrivalTime || '08:00'}" 
                               onchange="updateAttendanceTime('${doc.id}', 'arrivalTime', this.value)">
                    </td>
                    <td>
                        <input type="time" class="departure-time" data-pupil="${doc.id}" 
                               value="${existing?.departureTime || '14:00'}" 
                               onchange="updateAttendanceTime('${doc.id}', 'departureTime', this.value)">
                    </td>
                    <td>
                        <input type="text" class="attendance-remarks" data-pupil="${doc.id}" 
                               value="${existing?.remarks || ''}" 
                               onchange="updateAttendanceRemarks('${doc.id}', this.value)"
                               placeholder="Remarks...">
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        document.getElementById('attendanceTableContainer').classList.remove('hidden');
        
    } catch (error) {
        console.error("Error loading attendance:", error);
        showAlert('Error loading attendance data: ' + error.message, 'error');
    }
}

// Update attendance status
function updateAttendanceStatus(pupilId, status) {
    if (currentAttendanceData[pupilId]) {
        currentAttendanceData[pupilId].status = status;
    }
}

// Update attendance time
function updateAttendanceTime(pupilId, field, time) {
    if (currentAttendanceData[pupilId]) {
        currentAttendanceData[pupilId][field] = time;
    }
}

// Update attendance remarks
function updateAttendanceRemarks(pupilId, remarks) {
    if (currentAttendanceData[pupilId]) {
        currentAttendanceData[pupilId].remarks = remarks;
    }
}

// Save attendance
async function saveAttendance() {
    try {
        const attendanceClass = document.getElementById('attendanceClass').value;
        const date = document.getElementById('attendanceDate').value;
        
        if (!attendanceClass || !date || Object.keys(currentAttendanceData).length === 0) {
            showAlert('No attendance data to save', 'error');
            return;
        }
        
        let savedCount = 0;
        const errors = [];
        
        // Save each attendance record
        for (const pupilId in currentAttendanceData) {
            const attendance = currentAttendanceData[pupilId];
            const attendanceId = `${date}_${attendanceClass}_${pupilId}`;
            
            try {
                // Add metadata
                attendance.updatedAt = serverTimestamp();
                attendance.updatedBy = currentUser.uid;
                attendance.updatedByName = currentUser.email;
                
                await setDoc(doc(db, "attendance", attendanceId), attendance);
                savedCount++;
            } catch (error) {
                errors.push(`${attendance.pupilName}: ${error.message}`);
            }
        }
        
        if (savedCount > 0) {
            showAlert(`Attendance saved for ${savedCount} pupil(s)`, 'success');
            // Load attendance summary
            await loadAttendanceSummary(attendanceClass, date);
        }
        
        if (errors.length > 0) {
            console.error("Errors saving attendance:", errors);
            showAlert(`Saved ${savedCount} records. Some errors: ${errors.slice(0, 3).join(', ')}`, 'error');
        }
        
    } catch (error) {
        console.error("Error saving attendance:", error);
        showAlert('Error saving attendance: ' + error.message, 'error');
    }
}

// Clear attendance form
function clearAttendance() {
    document.getElementById('attendanceForm').reset();
    document.getElementById('attendanceDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceTableContainer').classList.add('hidden');
    currentAttendanceData = {};
}

// Load attendance summary
async function loadAttendanceSummary(className, date) {
    try {
        const attendanceQuery = query(
            collection(db, "attendance"),
            where("date", "==", date),
            where("class", "==", className)
        );
        
        const querySnapshot = await getDocs(attendanceQuery);
        const summaryDiv = document.getElementById('attendanceSummary');
        
        if (querySnapshot.empty) {
            summaryDiv.innerHTML = '<p>No attendance records for this date.</p>';
            return;
        }
        
        let present = 0, absent = 0, late = 0, excused = 0, sick = 0;
        
        querySnapshot.forEach((doc) => {
            const att = doc.data();
            switch (att.status) {
                case 'present': present++; break;
                case 'absent': absent++; break;
                case 'late': late++; break;
                case 'excused': excused++; break;
                case 'sick': sick++; break;
            }
        });
        
        const total = present + absent + late + excused + sick;
        const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;
        
        summaryDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                <div class="stat-card">
                    <h3>${total}</h3>
                    <p>Total Pupils</p>
                </div>
                <div class="stat-card">
                    <h3>${present}</h3>
                    <p>Present</p>
                </div>
                <div class="stat-card">
                    <h3>${attendanceRate}%</h3>
                    <p>Attendance Rate</p>
                </div>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                <h4>Attendance Breakdown</h4>
                <p>Absent: ${absent} | Late: ${late} | Excused: ${excused} | Sick: ${sick}</p>
                <div style="background: #e9ecef; height: 10px; border-radius: 5px; margin-top: 10px;">
                    <div style="background: #28a745; width: ${attendanceRate}%; height: 100%; border-radius: 5px;"></div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error("Error loading attendance summary:", error);
        document.getElementById('attendanceSummary').innerHTML = 
            '<p>Error loading attendance summary</p>';
    }
}

// Helper functions
function getClassName(classCode) {
    const classes = {
        'kg': 'Kindergarten (KG)',
        'nursery1': 'Nursery 1',
        'nursery2': 'Nursery 2',
        'nursery3': 'Nursery 3'
    };
    return classes[classCode] || classCode;
}

function getClassPrefix(classCode) {
    const prefixes = {
        'kg': 'KG',
        'nursery1': 'NUR1',
        'nursery2': 'NUR2',
        'nursery3': 'NUR3'
    };
    return prefixes[classCode] || 'PUP';
}

function getStatusText(status) {
    const statusText = {
        'active': 'Active',
        'inactive': 'Inactive',
        'graduated': 'Graduated',
        'transferred': 'Transferred'
    };
    return statusText[status] || status;
}

function calculateAgeFromDob(dob) {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return 0;
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

function formatCurrency(amount) {
    return '₦' + amount.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Modal functions
function closePupilModal() {
    document.getElementById('pupilModal').style.display = 'none';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
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
window.showAddPupilModal = showAddPupilModal;
window.closePupilModal = closePupilModal;
window.closeConfirmModal = closeConfirmModal;
window.editPupil = editPupil;
window.viewPupil = viewPupil;
window.deletePupil = deletePupil;
window.collectPayment = collectPayment;
window.searchPupils = searchPupils;
window.clearSearch = clearSearch;
window.changePage = changePage;
window.loadClassForAttendance = loadClassForAttendance;
window.saveAttendance = saveAttendance;
window.clearAttendance = clearAttendance;
window.updateAttendanceStatus = updateAttendanceStatus;
window.updateAttendanceTime = updateAttendanceTime;
window.updateAttendanceRemarks = updateAttendanceRemarks;
window.editFeeStructure = editFeeStructure;
window.deleteFeeStructure = deleteFeeStructure;
window.showAlert = showAlert;
