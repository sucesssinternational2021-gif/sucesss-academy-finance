// students-system.js - Complete Secondary Students Management System

// Global variables
let currentUser = null;
let currentTab = 'list';
let currentClass = 'all';
let allStudents = [];
let filteredStudents = [];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    loadStudents();
    updateStats();
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
    // Class filter buttons
    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentClass = this.dataset.class;
            filterAndDisplayStudents();
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
    
    // Calculate age from date of birth
    document.getElementById('dateOfBirth').addEventListener('change', calculateAgeFromDOB);
    
    // Student form submission
    document.getElementById('studentForm').addEventListener('submit', saveStudent);
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('admissionDate').value = today;
    document.getElementById('promotionDate').value = today;
    document.getElementById('reportStartDate').value = today;
    document.getElementById('reportEndDate').value = today;
    
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

// Calculate age from date of birth
function calculateAgeFromDOB() {
    const dob = new Date(document.getElementById('dateOfBirth').value);
    if (isNaN(dob.getTime())) return;
    
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    
    document.getElementById('age').value = age;
}

// Load students from Firestore
async function loadStudents() {
    try {
        const studentsQuery = query(
            collection(db, "students"),
            orderBy("admissionDate", "desc")
        );
        
        const querySnapshot = await getDocs(studentsQuery);
        allStudents = [];
        
        querySnapshot.forEach((doc) => {
            const student = { id: doc.id, ...doc.data() };
            allStudents.push(student);
        });
        
        filterAndDisplayStudents();
        updateStats();
        
    } catch (error) {
        console.error("Error loading students:", error);
        showAlert('Error loading students data', 'error');
        document.getElementById('studentsTable').innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fas fa-exclamation-circle"></i>
                    <p style="margin-top: 10px;">Error loading students</p>
                </td>
            </tr>
        `;
    }
}

// Filter and display students based on current class
function filterAndDisplayStudents() {
    // Filter by class
    if (currentClass === 'all') {
        filteredStudents = allStudents.filter(s => s.status !== 'graduated' && s.status !== 'transferred');
    } else if (currentClass === 'graduated') {
        filteredStudents = allStudents.filter(s => s.status === 'graduated');
    } else {
        filteredStudents = allStudents.filter(s => s.currentClass === currentClass || s.admissionClass === currentClass);
    }
    
    displayStudentsTable();
}

// Display students in table
function displayStudentsTable() {
    const tbody = document.getElementById('studentsTable');
    
    if (filteredStudents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px;">
                    <i class="fas fa-user-graduate" style="font-size: 1.5rem; color: #6c757d;"></i>
                    <p style="margin-top: 10px;">No students found for the selected class</p>
                </td>
            </tr>
        `;
        
        document.getElementById('showingCount').textContent = 0;
        document.getElementById('totalCount').textContent = allStudents.length;
        return;
    }
    
    let html = '';
    
    filteredStudents.forEach(student => {
        const fullName = `${student.firstName || ''} ${student.lastName || ''} ${student.otherNames || ''}`;
        const className = getClassName(student.currentClass || student.admissionClass);
        const house = getHouseName(student.house);
        const houseColor = student.house ? `house-${student.house}` : '';
        
        html += `
            <tr>
                <td><strong>${student.admissionNumber || student.id}</strong></td>
                <td>
                    <strong>${fullName}</strong>
                    ${student.medicalConditions ? '<br><small style="color: #dc3545;"><i class="fas fa-heartbeat"></i> Medical note</small>' : ''}
                </td>
                <td>${className}</td>
                <td class="${houseColor}">${house}</td>
                <td>${student.gender === 'male' ? '👦 Male' : '👧 Female'}</td>
                <td>
                    ${student.parentName || 'N/A'}<br>
                    <small>${student.parentRelationship || ''}</small>
                </td>
                <td>${student.parentPhone || 'N/A'}</td>
                <td>
                    <span class="badge badge-${student.status || 'active'}">
                        ${getStatusText(student.status)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" style="background: #17a2b8; color: white;" onclick="viewStudent('${student.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" style="background: #ffc107; color: black;" onclick="editStudent('${student.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" style="background: #dc3545; color: white;" onclick="deleteStudent('${student.id}', '${fullName}')">
                            <i class="fas fa-trash"></i>
                        </button>
                        ${student.status === 'active' ? `
                        <button class="action-btn" style="background: #28a745; color: white;" onclick="collectStudentPayment('${student.id}', '${fullName}')">
                            <i class="fas fa-money-bill-wave"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    document.getElementById('showingCount').textContent = filteredStudents.length;
    document.getElementById('totalCount').textContent = allStudents.length;
}

// Update statistics
function updateStats() {
    const totalStudents = allStudents.length;
    const activeStudents = allStudents.filter(s => s.status === 'active').length;
    const jssStudents = allStudents.filter(s => 
        ['jss1', 'jss2', 'jss3'].includes(s.currentClass || s.admissionClass)
    ).length;
    const ssStudents = allStudents.filter(s => 
        ['ss1', 'ss2', 'ss3'].includes(s.currentClass || s.admissionClass)
    ).length;
    const maleStudents = allStudents.filter(s => s.gender === 'male').length;
    const femaleStudents = allStudents.filter(s => s.gender === 'female').length;
    
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('activeStudents').textContent = activeStudents;
    document.getElementById('jssStudents').textContent = jssStudents;
    document.getElementById('ssStudents').textContent = ssStudents;
    document.getElementById('maleStudents').textContent = maleStudents;
    document.getElementById('femaleStudents').textContent = femaleStudents;
}

// Show add student modal
function showAddStudentModal() {
    document.getElementById('modalTitle').textContent = 'Add New Student';
    document.getElementById('studentForm').reset();
    document.getElementById('studentId').value = '';
    document.getElementById('status').value = 'active';
    document.getElementById('boardingStatus').value = 'day';
    document.getElementById('nationality').value = 'Nigerian';
    document.getElementById('admissionDate').value = new Date().toISOString().split('T')[0];
    
    // Generate admission number
    const admissionNumber = generateAdmissionNumber();
    document.getElementById('admissionNumber').value = admissionNumber;
    
    // Set current class same as admission class
    document.getElementById('admissionClass').addEventListener('change', function() {
        document.getElementById('currentClass').value = this.value;
    });
    
    document.getElementById('studentModal').style.display = 'flex';
}

// Generate admission number
function generateAdmissionNumber() {
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `SSA${year}${random}`;
}

// Save student (add or update)
async function saveStudent(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showAlert('Please login to save student data', 'error');
        return;
    }
    
    // Get form values
    const studentId = document.getElementById('studentId').value;
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const otherNames = document.getElementById('otherNames').value.trim();
    const gender = document.getElementById('gender').value;
    const dateOfBirth = document.getElementById('dateOfBirth').value;
    const age = document.getElementById('age').value;
    const admissionClass = document.getElementById('admissionClass').value;
    const currentClass = document.getElementById('currentClass').value;
    const house = document.getElementById('house').value;
    const religion = document.getElementById('religion').value;
    const nationality = document.getElementById('nationality').value.trim();
    const stateOfOrigin = document.getElementById('stateOfOrigin').value.trim();
    const lga = document.getElementById('lga').value.trim();
    const hometown = document.getElementById('hometown').value.trim();
    const parentName = document.getElementById('parentName').value.trim();
    const parentRelationship = document.getElementById('parentRelationship').value;
    const parentPhone = document.getElementById('parentPhone').value.trim();
    const parentEmail = document.getElementById('parentEmail').value.trim();
    const parentOccupation = document.getElementById('parentOccupation').value.trim();
    const parentAddress = document.getElementById('parentAddress').value.trim();
    const emergencyContact = document.getElementById('emergencyContact').value.trim();
    const emergencyPhone = document.getElementById('emergencyPhone').value.trim();
    const admissionNumber = document.getElementById('admissionNumber').value.trim();
    const admissionDate = document.getElementById('admissionDate').value;
    const previousSchool = document.getElementById('previousSchool').value.trim();
    const lastClassPassed = document.getElementById('lastClassPassed').value.trim();
    const bloodGroup = document.getElementById('bloodGroup').value;
    const genotype = document.getElementById('genotype').value;
    const medicalConditions = document.getElementById('medicalConditions').value.trim();
    const medications = document.getElementById('medications').value.trim();
    const status = document.getElementById('status').value;
    const boardingStatus = document.getElementById('boardingStatus').value;
    const notes = document.getElementById('notes').value.trim();
    
    // Validation
    if (!firstName || !lastName || !gender || !dateOfBirth || !admissionClass || !parentName || !parentPhone || !parentAddress || !admissionNumber || !admissionDate) {
        showAlert('Please fill all required fields', 'error');
        return;
    }
    
    try {
        const studentData = {
            firstName,
            lastName,
            otherNames,
            gender,
            dateOfBirth,
            age: parseInt(age) || 0,
            admissionClass,
            currentClass: currentClass || admissionClass,
            house,
            religion,
            nationality,
            stateOfOrigin,
            lga,
            hometown,
            parentName,
            parentRelationship,
            parentPhone,
            parentEmail,
            parentOccupation,
            parentAddress,
            emergencyContact,
            emergencyPhone,
            admissionNumber,
            admissionDate,
            previousSchool,
            lastClassPassed,
            bloodGroup,
            genotype,
            medicalConditions,
            medications,
            status,
            boardingStatus,
            notes,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid,
            updatedByName: currentUser.email
        };
        
        if (!studentId) {
            // New student
            const newStudentId = admissionNumber;
            studentData.createdAt = serverTimestamp();
            studentData.createdBy = currentUser.uid;
            
            await setDoc(doc(db, "students", newStudentId), studentData);
            showAlert(`Student ${firstName} ${lastName} added successfully! Admission No: ${admissionNumber}`, 'success');
        } else {
            // Update existing student
            await updateDoc(doc(db, "students", studentId), studentData);
            showAlert(`Student ${firstName} ${lastName} updated successfully!`, 'success');
        }
        
        // Close modal and refresh data
        closeStudentModal();
        await loadStudents();
        
    } catch (error) {
        console.error("Error saving student:", error);
        showAlert('Error saving student data: ' + error.message, 'error');
    }
}

// Edit student
async function editStudent(studentId) {
    try {
        const studentRef = doc(db, "students", studentId);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
            const student = studentSnap.data();
            
            document.getElementById('modalTitle').textContent = 'Edit Student';
            document.getElementById('studentId').value = studentId;
            document.getElementById('firstName').value = student.firstName || '';
            document.getElementById('lastName').value = student.lastName || '';
            document.getElementById('otherNames').value = student.otherNames || '';
            document.getElementById('gender').value = student.gender || '';
            document.getElementById('dateOfBirth').value = student.dateOfBirth || '';
            document.getElementById('age').value = student.age || '';
            document.getElementById('admissionClass').value = student.admissionClass || '';
            document.getElementById('currentClass').value = student.currentClass || student.admissionClass || '';
            document.getElementById('house').value = student.house || '';
            document.getElementById('religion').value = student.religion || '';
            document.getElementById('nationality').value = student.nationality || '';
            document.getElementById('stateOfOrigin').value = student.stateOfOrigin || '';
            document.getElementById('lga').value = student.lga || '';
            document.getElementById('hometown').value = student.hometown || '';
            document.getElementById('parentName').value = student.parentName || '';
            document.getElementById('parentRelationship').value = student.parentRelationship || '';
            document.getElementById('parentPhone').value = student.parentPhone || '';
            document.getElementById('parentEmail').value = student.parentEmail || '';
            document.getElementById('parentOccupation').value = student.parentOccupation || '';
            document.getElementById('parentAddress').value = student.parentAddress || '';
            document.getElementById('emergencyContact').value = student.emergencyContact || '';
            document.getElementById('emergencyPhone').value = student.emergencyPhone || '';
            document.getElementById('admissionNumber').value = student.admissionNumber || '';
            document.getElementById('admissionDate').value = student.admissionDate || '';
            document.getElementById('previousSchool').value = student.previousSchool || '';
            document.getElementById('lastClassPassed').value = student.lastClassPassed || '';
            document.getElementById('bloodGroup').value = student.bloodGroup || '';
            document.getElementById('genotype').value = student.genotype || '';
            document.getElementById('medicalConditions').value = student.medicalConditions || '';
            document.getElementById('medications').value = student.medications || '';
            document.getElementById('status').value = student.status || 'active';
            document.getElementById('boardingStatus').value = student.boardingStatus || 'day';
            document.getElementById('notes').value = student.notes || '';
            
            document.getElementById('studentModal').style.display = 'flex';
        }
    } catch (error) {
        console.error("Error loading student for edit:", error);
        showAlert('Error loading student data', 'error');
    }
}

// View student details
async function viewStudent(studentId) {
    try {
        const studentRef = doc(db, "students", studentId);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
            const student = studentSnap.data();
            const fullName = `${student.firstName || ''} ${student.lastName || ''} ${student.otherNames || ''}`;
            
            // Create detailed view
            const details = `
                <div class="student-card">
                    <div class="student-header">
                        <div class="student-info">
                            <h4>${fullName}</h4>
                            <p>Admission No: ${student.admissionNumber || studentId}</p>
                            <p>Class: ${getClassName(student.currentClass || student.admissionClass)}</p>
                        </div>
                        <div class="student-actions">
                            <button class="action-btn" style="background: #28a745; color: white;" onclick="collectStudentPayment('${studentId}', '${fullName}')">
                                <i class="fas fa-money-bill-wave"></i> Collect Fee
                            </button>
                        </div>
                    </div>
                    
                    <div class="student-details">
                        <div class="detail-item">
                            <span class="detail-label">Gender</span>
                            <span class="detail-value">${student.gender || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Date of Birth</span>
                            <span class="detail-value">${student.dateOfBirth || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Age</span>
                            <span class="detail-value">${student.age || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">House</span>
                            <span class="detail-value">${getHouseName(student.house)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Religion</span>
                            <span class="detail-value">${student.religion || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status</span>
                            <span class="detail-value">${getStatusText(student.status)}</span>
                        </div>
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <h5 style="color: #667eea; margin-bottom: 10px;">Parent Information</h5>
                        <p><strong>Name:</strong> ${student.parentName || 'N/A'}</p>
                        <p><strong>Phone:</strong> ${student.parentPhone || 'N/A'}</p>
                        <p><strong>Address:</strong> ${student.parentAddress || 'N/A'}</p>
                    </div>
                    
                    ${student.medicalConditions ? `
                    <div style="margin-top: 15px; background: #f8d7da; padding: 10px; border-radius: 5px;">
                        <h5 style="color: #721c24; margin-bottom: 5px;"><i class="fas fa-heartbeat"></i> Medical Information</h5>
                        <p>${student.medicalConditions}</p>
                    </div>
                    ` : ''}
                </div>
            `;
            
            // Show in modal or alert
            alert(`Student Details:\n\nName: ${fullName}\nAdmission No: ${student.admissionNumber}\nClass: ${getClassName(student.currentClass || student.admissionClass)}\nParent: ${student.parentName}\nPhone: ${student.parentPhone}`);
        }
    } catch (error) {
        console.error("Error viewing student:", error);
        showAlert('Error loading student details', 'error');
    }
}

// Collect payment for student
function collectStudentPayment(studentId, studentName) {
    // Store student info in sessionStorage or localStorage
    localStorage.setItem('selectedStudentId', studentId);
    localStorage.setItem('selectedStudentName', studentName);
    
    // Redirect to payment page
    window.location.href = 'payment.html';
}

// Delete student
function deleteStudent(studentId, studentName) {
    if (confirm(`Are you sure you want to delete student ${studentName}?\n\nThis action cannot be undone!`)) {
        deleteStudentConfirmed(studentId);
    }
}

async function deleteStudentConfirmed(studentId) {
    try {
        await deleteDoc(doc(db, "students", studentId));
        showAlert(`Student deleted successfully`, 'success');
        await loadStudents();
    } catch (error) {
        console.error("Error deleting student:", error);
        showAlert('Error deleting student: ' + error.message, 'error');
    }
}

// Load academic records
async function loadAcademicRecords() {
    const academicClass = document.getElementById('academicClass').value;
    const academicTerm = document.getElementById('academicTerm').value;
    
    if (!academicClass) {
        showAlert('Please select a class', 'error');
        return;
    }
    
    try {
        const resultsDiv = document.getElementById('academicResults');
        resultsDiv.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; color: #667eea;"></i>
                <p style="margin-top: 10px;">Loading academic records for ${getClassName(academicClass)} - ${academicTerm}...</p>
            </div>
        `;
        
        // Simulate loading
        setTimeout(() => {
            const sampleData = `
                <div style="text-align: left;">
                    <h4 style="color: #667eea; margin-bottom: 15px;">${getClassName(academicClass)} - ${academicTerm} Results</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 10px; text-align: left;">Student Name</th>
                                <th style="padding: 10px; text-align: center;">English</th>
                                <th style="padding: 10px; text-align: center;">Mathematics</th>
                                <th style="padding: 10px; text-align: center;">Science</th>
                                <th style="padding: 10px; text-align: center;">Total</th>
                                <th style="padding: 10px; text-align: center;">Position</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 10px;">John Doe</td>
                                <td style="padding: 10px; text-align: center;">85</td>
                                <td style="padding: 10px; text-align: center;">92</td>
                                <td style="padding: 10px; text-align: center;">78</td>
                                <td style="padding: 10px; text-align: center;">255</td>
                                <td style="padding: 10px; text-align: center;">1st</td>
                            </tr>
                            <tr style="background: #f8f9fa;">
                                <td style="padding: 10px;">Jane Smith</td>
                                <td style="padding: 10px; text-align: center;">78</td>
                                <td style="padding: 10px; text-align: center;">85</td>
                                <td style="padding: 10px; text-align: center;">90</td>
                                <td style="padding: 10px; text-align: center;">253</td>
                                <td style="padding: 10px; text-align: center;">2nd</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div style="margin-top: 20px; background: #f8f9fa; padding: 15px; border-radius: 5px;">
                        <p><strong>Class Average:</strong> 82.5%</p>
                        <p><strong>Highest Score:</strong> John Doe (85%)</p>
                        <p><strong>Lowest Score:</strong> Mike Johnson (65%)</p>
                        <p><strong>Students with Distinction:</strong> 15</p>
                    </div>
                </div>
            `;
            
            resultsDiv.innerHTML = sampleData;
        }, 1500);
        
    } catch (error) {
        console.error("Error loading academic records:", error);
        document.getElementById('academicResults').innerHTML = `
            <p style="color: #dc3545;">Error loading academic records</p>
        `;
    }
}

// Promote students
async function promoteStudents() {
    const fromClass = document.getElementById('fromClass').value;
    const toClass = document.getElementById('toClass').value;
    const promotionSession = document.getElementById('promotionSession').value;
    const promotionDate = document.getElementById('promotionDate').value;
    const promotionRemarks = document.getElementById('promotionRemarks').value.trim();
    
    if (!fromClass || !toClass || !promotionSession || !promotionDate) {
        showAlert('Please fill all required fields', 'error');
        return;
    }
    
    if (fromClass === toClass) {
        showAlert('From class and to class cannot be the same', 'error');
        return;
    }
    
    try {
        // Get students from the current class
        const studentsQuery = query(
            collection(db, "students"),
            where("currentClass", "==", fromClass),
            where("status", "==", "active")
        );
        
        const querySnapshot = await getDocs(studentsQuery);
        
        if (querySnapshot.empty) {
            showAlert(`No active students found in ${getClassName(fromClass)}`, 'warning');
            return;
        }
        
        let promotedCount = 0;
        
        // Update each student
        querySnapshot.forEach(async (doc) => {
            const studentData = doc.data();
            
            // Update student record
            await updateDoc(doc.ref, {
                currentClass: toClass,
                status: toClass === 'graduated' ? 'graduated' : 'active',
                promotionHistory: [...(studentData.promotionHistory || []), {
                    fromClass,
                    toClass,
                    session: promotionSession,
                    date: promotionDate,
                    remarks: promotionRemarks
                }],
                updatedAt: serverTimestamp()
            });
            
            promotedCount++;
        });
        
        showAlert(`${promotedCount} students promoted from ${getClassName(fromClass)} to ${getClassName(toClass)}`, 'success');
        
        // Refresh data
        await loadStudents();
        
    } catch (error) {
        console.error("Error promoting students:", error);
        showAlert('Error promoting students: ' + error.message, 'error');
    }
}

// Bulk promotion
async function bulkPromotion() {
    const confirmBulk = confirm(`This will promote all students to their next class:\n\nJSS1 → JSS2\nJSS2 → JSS3\nJSS3 → SS1\nSS1 → SS2\nSS2 → SS3\nSS3 → Graduated\n\nContinue?`);
    
    if (!confirmBulk) return;
    
    try {
        const promotionSession = document.getElementById('promotionSession').value;
        const promotionDate = document.getElementById('promotionDate').value;
        const promotionRemarks = "Bulk promotion to next class";
        
        const classProgressions = {
            'jss1': 'jss2',
            'jss2': 'jss3',
            'jss3': 'ss1',
            'ss1': 'ss2',
            'ss2': 'ss3',
            'ss3': 'graduated'
        };
        
        let totalPromoted = 0;
        
        for (const [fromClass, toClass] of Object.entries(classProgressions)) {
            const studentsQuery = query(
                collection(db, "students"),
                where("currentClass", "==", fromClass),
                where("status", "==", "active")
            );
            
            const querySnapshot = await getDocs(studentsQuery);
            
            querySnapshot.forEach(async (doc) => {
                const studentData = doc.data();
                
                await updateDoc(doc.ref, {
                    currentClass: toClass,
                    status: toClass === 'graduated' ? 'graduated' : 'active',
                    promotionHistory: [...(studentData.promotionHistory || []), {
                        fromClass,
                        toClass,
                        session: promotionSession,
                        date: promotionDate,
                        remarks: promotionRemarks
                    }],
                    updatedAt: serverTimestamp()
                });
                
                totalPromoted++;
            });
        }
        
        showAlert(`Bulk promotion completed! ${totalPromoted} students promoted to next classes.`, 'success');
        await loadStudents();
        
    } catch (error) {
        console.error("Error in bulk promotion:", error);
        showAlert('Error in bulk promotion: ' + error.message, 'error');
    }
}

// Generate student report
async function generateStudentReport() {
    const reportClass = document.getElementById('reportStudentClass').value;
    const reportType = document.getElementById('reportType').value;
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    const reportPreview = document.getElementById('reportPreview');
    reportPreview.innerHTML = `
        <div style="text-align: center;">
            <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; color: #667eea;"></i>
            <p style="margin-top: 10px;">Generating ${reportType} report...</p>
        </div>
    `;
    
    // Simulate report generation
    setTimeout(() => {
        const sampleReport = `
            <div style="padding: 20px;">
                <h4 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-bottom: 20px;">
                    ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
                    ${reportClass !== 'all' ? `- ${getClassName(reportClass)}` : ''}
                </h4>
                
                <div style="background: white; padding: 15px; border-radius: 5px; border: 1px solid #eee; margin-bottom: 20px;">
                    <h5>Report Summary</h5>
                    <p><strong>Period:</strong> ${startDate} to ${endDate}</p>
                    <p><strong>Generated:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
                    <p><strong>Total Students:</strong> ${reportClass === 'all' ? allStudents.length : filteredStudents.length}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                        <div style="font-size: 1.2rem; font-weight: bold; color: #28a745;">95%</div>
                        <div style="color: #666;">Attendance Rate</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                        <div style="font-size: 1.2rem; font-weight: bold; color: #007bff;">₦2,450,000</div>
                        <div style="color: #666;">Total Fees Collected</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                        <div style="font-size: 1.2rem; font-weight: bold; color: #ffc107;">12</div>
                        <div style="color: #666;">Academic Distinctions</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                        <div style="font-size: 1.2rem; font-weight: bold; color: #dc3545;">3</div>
                        <div style="color: #666;">Disciplinary Cases</div>
                    </div>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 5px; border: 1px solid #eee;">
                    <h5>Key Findings</h5>
                    <ul>
                        <li>Overall student performance is excellent with 85% pass rate</li>
                        <li>Attendance has improved by 5% compared to last term</li>
                        <li>Fee collection rate is at 92% for the period</li>
                        <li>Parent satisfaction survey shows 94% approval rate</li>
                    </ul>
                </div>
            </div>
        `;
        
        reportPreview.innerHTML = sampleReport;
    }, 2000);
}

// Print report
function printReport() {
    window.print();
}

// Export students
function exportStudents(format) {
    if (format === 'csv') {
        alert('CSV export would start here. In production, this would download a CSV file.');
    } else if (format === 'pdf') {
        alert('PDF export would start here. In production, this would download a PDF file.');
    }
}

// Generate student ID cards
function generateStudentIdCards() {
    alert('ID card generation would open here. In production, this would generate printable ID cards for selected students.');
}

// Helper functions
function getClassName(classCode) {
    const classes = {
        'jss1': 'JSS 1',
        'jss2': 'JSS 2',
        'jss3': 'JSS 3',
        'ss1': 'SS 1',
        'ss2': 'SS 2',
        'ss3': 'SS 3'
    };
    return classes[classCode] || classCode;
}

function getHouseName(houseCode) {
    const houses = {
        'red': 'Red House',
        'blue': 'Blue House',
        'green': 'Green House',
        'yellow': 'Yellow House'
    };
    return houses[houseCode] || houseCode || 'Not Assigned';
}

function getStatusText(status) {
    const statusText = {
        'active': 'Active',
        'inactive': 'Inactive',
        'graduated': 'Graduated',
        'transferred': 'Transferred',
        'suspended': 'Suspended'
    };
    return statusText[status] || status;
}

// Modal functions
function closeStudentModal() {
    document.getElementById('studentModal').style.display = 'none';
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
window.showAddStudentModal = showAddStudentModal;
window.closeStudentModal = closeStudentModal;
window.editStudent = editStudent;
window.viewStudent = viewStudent;
window.deleteStudent = deleteStudent;
window.collectStudentPayment = collectStudentPayment;
window.loadAcademicRecords = loadAcademicRecords;
window.promoteStudents = promoteStudents;
window.bulkPromotion = bulkPromotion;
window.generateStudentReport = generateStudentReport;
window.printReport = printReport;
window.exportStudents = exportStudents;
window.generateStudentIdCards = generateStudentIdCards;
window.showAlert = showAlert;
