// Firebase Configuration
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

// Global variables
let allPupils = [];
let currentFilter = 'all';

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

// Form elements
const pupilForm = document.getElementById('pupilForm');
const hasLeftCheckbox = document.getElementById('hasLeft');
const dateLeftSection = document.getElementById('dateLeftSection');

// Dashboard elements
const totalPupilsElement = document.getElementById('totalPupils');
const newIntakeElement = document.getElementById('newIntake');
const activePupilsElement = document.getElementById('activePupils');
const leftPupilsElement = document.getElementById('leftPupils');

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in (basic check)
    checkAuth();
    
    // Load all pupils
    loadPupils();
    
    // Set today's date for date fields
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateOfEntry').value = today;
    
    // Setup event listeners
    hasLeftCheckbox.addEventListener('change', function() {
        dateLeftSection.style.display = this.checked ? 'block' : 'none';
        if (this.checked) {
            document.getElementById('dateLeft').value = today;
        }
    });
    
    // Generate pupil ID if field is empty
    document.getElementById('pupilId').addEventListener('focus', function() {
        if (!this.value) {
            generatePupilId();
        }
    });
});

// Generate automatic pupil ID
function generatePupilId() {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100 + Math.random() * 900);
    const pupilId = `SMIA-${year}-${randomNum}`;
    document.getElementById('pupilId').value = pupilId;
}

// Check authentication (basic implementation)
function checkAuth() {
    // In a real application, implement proper Firebase Authentication
    console.log("Authentication check passed");
}

// Load all pupils from Firestore
function loadPupils() {
    loadingSpinner.style.display = 'block';
    noPupilsMessage.style.display = 'none';
    
    db.collection('pupils').orderBy('dateOfEntry', 'desc')
        .onSnapshot((snapshot) => {
            allPupils = [];
            snapshot.forEach((doc) => {
                const pupil = {
                    id: doc.id,
                    ...doc.data()
                };
                allPupils.push(pupil);
            });
            
            updatePupilsTable();
            updateDashboard();
            loadingSpinner.style.display = 'none';
            
            if (allPupils.length === 0) {
                noPupilsMessage.style.display = 'block';
            }
        }, (error) => {
            console.error("Error loading pupils: ", error);
            loadingSpinner.style.display = 'none';
            alert("Error loading pupils data. Please check console.");
        });
}

// Update pupils table based on current filter
function updatePupilsTable() {
    pupilsTableBody.innerHTML = '';
    
    let filteredPupils = allPupils;
    
    // Apply status filter
    if (currentFilter === 'active') {
        filteredPupils = allPupils.filter(pupil => !pupil.hasLeft);
    } else if (currentFilter === 'left') {
        filteredPupils = allPupils.filter(pupil => pupil.hasLeft);
    }
    
    // Apply search filter if exists
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredPupils = filteredPupils.filter(pupil => 
            pupil.pupilId.toLowerCase().includes(searchTerm) ||
            pupil.firstName.toLowerCase().includes(searchTerm) ||
            pupil.lastName.toLowerCase().includes(searchTerm) ||
            (pupil.parentName && pupil.parentName.toLowerCase().includes(searchTerm))
        );
    }
    
    if (filteredPupils.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="8" class="text-center py-4">
                No pupils found matching your criteria.
            </td>
        `;
        pupilsTableBody.appendChild(row);
        return;
    }
    
    filteredPupils.forEach(pupil => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${pupil.pupilId}</td>
            <td>
                <strong>${pupil.firstName} ${pupil.lastName}</strong>
                ${pupil.hasLeft ? '<br><small class="text-danger">(Left School)</small>' : ''}
            </td>
            <td>
                <span class="class-badge ${getClassColor(pupil.classLevel)}">
                    ${pupil.classLevel}
                </span>
            </td>
            <td>${pupil.parentName || 'N/A'}</td>
            <td>${pupil.parentPhone || 'N/A'}</td>
            <td>
                <span class="badge ${pupil.pupilType === 'new' ? 'bg-success' : 'bg-primary'}">
                    ${pupil.pupilType === 'new' ? 'New Intake' : 'Returning'}
                </span>
            </td>
            <td>
                <span class="badge ${pupil.hasLeft ? 'bg-danger' : 'bg-success'}">
                    ${pupil.hasLeft ? 'Left' : 'Active'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewPupilDetails('${pupil.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="editPupil('${pupil.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletePupil('${pupil.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        pupilsTableBody.appendChild(row);
    });
}

// Get class color for badge
function getClassColor(classLevel) {
    const colors = {
        'KG': 'bg-primary',
        'Nursery 1': 'bg-success',
        'Nursery 2': 'bg-warning',
        'Nursery 3': 'bg-info'
    };
    return colors[classLevel] || 'bg-secondary';
}

// Search pupils
function searchPupils() {
    updatePupilsTable();
}

// Filter by status
function filterByStatus(status) {
    currentFilter = status;
    updatePupilsTable();
}

// Save pupil to Firestore
function savePupil(event) {
    event.preventDefault();
    
    const pupilData = {
        pupilId: document.getElementById('pupilId').value,
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        classLevel: document.getElementById('classLevel').value,
        pupilType: document.querySelector('input[name="pupilType"]:checked').value,
        dateOfBirth: document.getElementById('dateOfBirth').value,
        parentName: document.getElementById('parentName').value,
        parentPhone: document.getElementById('parentPhone').value,
        parentEmail: document.getElementById('parentEmail').value || '',
        address: document.getElementById('address').value,
        dateOfEntry: document.getElementById('dateOfEntry').value,
        hasLeft: document.getElementById('hasLeft').checked,
        dateLeft: document.getElementById('hasLeft').checked ? document.getElementById('dateLeft').value : '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Check if we're editing an existing pupil
    const pupilId = pupilForm.getAttribute('data-edit-id');
    
    if (pupilId) {
        // Update existing pupil
        db.collection('pupils').doc(pupilId).update(pupilData)
            .then(() => {
                alert('Pupil updated successfully!');
                resetForm();
                showPupilsSection();
            })
            .catch(error => {
                console.error("Error updating pupil: ", error);
                alert('Error updating pupil. Please try again.');
            });
    } else {
        // Add new pupil
        db.collection('pupils').add(pupilData)
            .then(() => {
                alert('Pupil added successfully!');
                resetForm();
                showPupilsSection();
            })
            .catch(error => {
                console.error("Error adding pupil: ", error);
                alert('Error adding pupil. Please try again.');
            });
    }
}

// Reset form
function resetForm() {
    pupilForm.reset();
    pupilForm.removeAttribute('data-edit-id');
    document.getElementById('dateOfEntry').value = new Date().toISOString().split('T')[0];
    dateLeftSection.style.display = 'none';
    generatePupilId();
}

// Edit pupil
function editPupil(pupilId) {
    const pupil = allPupils.find(p => p.id === pupilId);
    if (!pupil) return;
    
    // Fill form with pupil data
    document.getElementById('pupilId').value = pupil.pupilId;
    document.getElementById('firstName').value = pupil.firstName;
    document.getElementById('lastName').value = pupil.lastName;
    document.getElementById('classLevel').value = pupil.classLevel;
    
    // Set pupil type radio
    if (pupil.pupilType === 'new') {
        document.getElementById('newIntakeRadio').checked = true;
    } else {
        document.getElementById('returningRadio').checked = true;
    }
    
    document.getElementById('dateOfBirth').value = pupil.dateOfBirth;
    document.getElementById('parentName').value = pupil.parentName;
    document.getElementById('parentPhone').value = pupil.parentPhone;
    document.getElementById('parentEmail').value = pupil.parentEmail || '';
    document.getElementById('address').value = pupil.address;
    document.getElementById('dateOfEntry').value = pupil.dateOfEntry;
    document.getElementById('hasLeft').checked = pupil.hasLeft || false;
    
    if (pupil.hasLeft) {
        dateLeftSection.style.display = 'block';
        document.getElementById('dateLeft').value = pupil.dateLeft || '';
    }
    
    // Set edit mode
    pupilForm.setAttribute('data-edit-id', pupilId);
    
    // Show add pupil section
    showAddPupilForm();
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// View pupil details
function viewPupilDetails(pupilId) {
    const pupil = allPupils.find(p => p.id === pupilId);
    if (!pupil) return;
    
    const modalContent = document.getElementById('pupilDetailsContent');
    modalContent.innerHTML = `
        <div class="row">
            <div class="col-md-4 text-center">
                <div class="mb-3">
                    <i class="fas fa-user-circle fa-5x text-primary"></i>
                </div>
                <h4>${pupil.firstName} ${pupil.lastName}</h4>
                <p class="text-muted">${pupil.pupilId}</p>
                <span class="badge ${pupil.hasLeft ? 'bg-danger' : 'bg-success'}">
                    ${pupil.hasLeft ? 'Left School' : 'Active'}
                </span>
            </div>
            <div class="col-md-8">
                <h5>Pupil Information</h5>
                <table class="table table-bordered">
                    <tr>
                        <th width="30%">Class:</th>
                        <td>${pupil.classLevel}</td>
                    </tr>
                    <tr>
                        <th>Date of Birth:</th>
                        <td>${formatDate(pupil.dateOfBirth)}</td>
                    </tr>
                    <tr>
                        <th>Date of Entry:</th>
                        <td>${formatDate(pupil.dateOfEntry)}</td>
                    </tr>
                    ${pupil.hasLeft ? `
                    <tr>
                        <th>Date Left:</th>
                        <td>${formatDate(pupil.dateLeft)}</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <th>Pupil Type:</th>
                        <td>${pupil.pupilType === 'new' ? 'New Intake' : 'Returning Pupil'}</td>
                    </tr>
                </table>
                
                <h5 class="mt-4">Parent Information</h5>
                <table class="table table-bordered">
                    <tr>
                        <th width="30%">Parent Name:</th>
                        <td>${pupil.parentName}</td>
                    </tr>
                    <tr>
                        <th>Phone Number:</th>
                        <td>${pupil.parentPhone}</td>
                    </tr>
                    ${pupil.parentEmail ? `
                    <tr>
                        <th>Email:</th>
                        <td>${pupil.parentEmail}</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <th>Address:</th>
                        <td>${pupil.address}</td>
                    </tr>
                </table>
                
                ${pupil.notes ? `
                <h5 class="mt-4">Additional Notes</h5>
                <p>${pupil.notes}</p>
                ` : ''}
            </div>
        </div>
    `;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('pupilDetailsModal'));
    modal.show();
}

// Delete pupil
function deletePupil(pupilId) {
    if (confirm('Are you sure you want to delete this pupil record? This action cannot be undone.')) {
        db.collection('pupils').doc(pupilId).delete()
            .then(() => {
                alert('Pupil deleted successfully!');
            })
            .catch(error => {
                console.error("Error deleting pupil: ", error);
                alert('Error deleting pupil. Please try again.');
            });
    }
}

// Load class section
function loadClassSection(className) {
    // Hide all sections
    addPupilSection.style.display = 'none';
    pupilsListSection.style.display = 'none';
    dashboardSection.style.display = 'none';
    classSection.style.display = 'block';
    
    // Set class title
    classTitle.innerHTML = `<i class="fas fa-school me-2"></i> ${className} Pupils`;
    
    // Filter pupils by class
    const classPupils = allPupils.filter(pupil => pupil.classLevel === className);
    
    if (classPupils.length === 0) {
        classPupilsList.innerHTML = `
            <div class="alert alert-info">
                No pupils found in ${className}.
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Pupil ID</th>
                        <th>Name</th>
                        <th>Parent Name</th>
                        <th>Phone</th>
                        <th>Type</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    classPupils.forEach(pupil => {
        html += `
            <tr>
                <td>${pupil.pupilId}</td>
                <td>${pupil.firstName} ${pupil.lastName}</td>
                <td>${pupil.parentName}</td>
                <td>${pupil.parentPhone}</td>
                <td>
                    <span class="badge ${pupil.pupilType === 'new' ? 'bg-success' : 'bg-primary'}">
                        ${pupil.pupilType === 'new' ? 'New' : 'Returning'}
                    </span>
                </td>
                <td>
                    <span class="badge ${pupil.hasLeft ? 'bg-danger' : 'bg-success'}">
                        ${pupil.hasLeft ? 'Left' : 'Active'}
                    </span>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div class="mt-3">
            <p><strong>Total Pupils in ${className}:</strong> ${classPupils.length}</p>
            <p><strong>Active Pupils:</strong> ${classPupils.filter(p => !p.hasLeft).length}</p>
        </div>
    `;
    
    classPupilsList.innerHTML = html;
}

// Show add pupil form
function showAddPupilForm() {
    addPupilSection.style.display = 'block';
    pupilsListSection.style.display = 'none';
    dashboardSection.style.display = 'none';
    classSection.style.display = 'none';
}

// Show pupils list section
function showPupilsSection() {
    addPupilSection.style.display = 'none';
    pupilsListSection.style.display = 'block';
    dashboardSection.style.display = 'none';
    classSection.style.display = 'none';
}

// Load dashboard
function loadDashboard() {
    addPupilSection.style.display = 'none';
    pupilsListSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    classSection.style.display = 'none';
    
    updateDashboard();
}

// Update dashboard statistics
function updateDashboard() {
    const total = allPupils.length;
    const newIntake = allPupils.filter(p => p.pupilType === 'new').length;
    const active = allPupils.filter(p => !p.hasLeft).length;
    const left = allPupils.filter(p => p.hasLeft).length;
    
    totalPupilsElement.textContent = total;
    newIntakeElement.textContent = newIntake;
    activePupilsElement.textContent = active;
    leftPupilsElement.textContent = left;
    
    // Update class distribution chart (simple version)
    updateClassChart();
}

// Update class distribution chart
function updateClassChart() {
    const classChart = document.getElementById('classChart');
    const classes = ['KG', 'Nursery 1', 'Nursery 2', 'Nursery 3'];
    const counts = classes.map(cls => allPupils.filter(p => p.classLevel === cls).length);
    
    let html = `
        <div class="row">
    `;
    
    classes.forEach((cls, index) => {
        const count = counts[index];
        const percentage = totalPupilsElement.textContent > 0 ? 
            Math.round((count / totalPupilsElement.textContent) * 100) : 0;
        
        html += `
            <div class="col-md-3 mb-3">
                <div class="card">
                    <div class="card-body text-center">
                        <h5>${cls}</h5>
                        <h3>${count}</h3>
                        <div class="progress" style="height: 10px;">
                            <div class="progress-bar ${getClassColor(cls)}" 
                                 style="width: ${percentage}%"></div>
                        </div>
                        <small>${percentage}% of total</small>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    classChart.innerHTML = html;
}

// Export pupils data
function exportPupilsData() {
    // Simple CSV export
    let csv = 'Pupil ID,First Name,Last Name,Class,Type,Parent Name,Phone,Email,Address,Date of Birth,Date of Entry,Status\n';
    
    allPupils.forEach(pupil => {
        const row = [
            pupil.pupilId,
            pupil.firstName,
            pupil.lastName,
            pupil.classLevel,
            pupil.pupilType === 'new' ? 'New Intake' : 'Returning',
            pupil.parentName,
            pupil.parentPhone,
            pupil.parentEmail || '',
            `"${pupil.address}"`,
            pupil.dateOfBirth,
            pupil.dateOfEntry,
            pupil.hasLeft ? 'Left' : 'Active'
        ];
        
        csv += row.join(',') + '\n';
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pupils_data_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Print pupil details
function printPupilDetails() {
    window.print();
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Initialize with pupils list
showPupilsSection();
