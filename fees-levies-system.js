// fees-levies-system.js
// Success Model International Academy - Fees & Levies Management System

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
let currentUser = null;
let feesChart = null;

// Default fee structure
const defaultFeeStructure = {
    kg: [
        { class: 'KG 1', termFee: 45000, annualFee: 135000 },
        { class: 'KG 2', termFee: 48000, annualFee: 144000 },
        { class: 'KG 3', termFee: 50000, annualFee: 150000 }
    ],
    nursery: [
        { class: 'Nursery 1', termFee: 55000, annualFee: 165000 },
        { class: 'Nursery 2', termFee: 58000, annualFee: 174000 },
        { class: 'Nursery 3', termFee: 60000, annualFee: 180000 }
    ],
    primary: [
        { class: 'Primary 1', termFee: 75000, annualFee: 225000 },
        { class: 'Primary 2', termFee: 78000, annualFee: 234000 },
        { class: 'Primary 3', termFee: 80000, annualFee: 240000 },
        { class: 'Primary 4', termFee: 85000, annualFee: 255000 },
        { class: 'Primary 5', termFee: 90000, annualFee: 270000 }
    ],
    secondary: [
        { class: 'JSS 1', termFee: 120000, annualFee: 360000 },
        { class: 'JSS 2', termFee: 125000, annualFee: 375000 },
        { class: 'JSS 3', termFee: 130000, annualFee: 390000 },
        { class: 'SSS 1', termFee: 150000, annualFee: 450000 },
        { class: 'SSS 2', termFee: 155000, annualFee: 465000 },
        { class: 'SSS 3', termFee: 160000, annualFee: 480000 }
    ]
};

// Default levies
const defaultLevies = [
    { name: 'PTA Levy', amount: 5000, type: 'per_head', applicableTo: 'all', frequency: 'per_term' },
    { name: 'Sports Levy', amount: 3000, type: 'per_head', applicableTo: 'all', frequency: 'per_term' },
    { name: 'Examination Fee', amount: 8000, type: 'per_head', applicableTo: 'all', frequency: 'per_term' },
    { name: 'ICT Levy', amount: 10000, type: 'by_category', applicableTo: 'secondary', frequency: 'per_session' },
    { name: 'Library Fee', amount: 5000, type: 'by_category', applicableTo: 'primary,secondary', frequency: 'per_session' }
];

// ============================================
// FIREBASE INITIALIZATION
// ============================================
function initializeFirebase() {
    try {
        console.log("Initializing Firebase for Fees & Levies...");
        
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
                    loadFeeData();
                } else {
                    console.log("ℹ️ No user authenticated");
                    loadDemoData();
                }
            });
        } else {
            console.warn("⚠️ Auth SDK not available - running without authentication");
            loadDemoData();
        }
        
        isFirebaseConnected = true;
        updateFirebaseStatus(true);
        
    } catch (error) {
        console.error("❌ Firebase initialization error:", error);
        updateFirebaseStatus(false);
        showAlert('error', `Firebase error: ${error.message}`);
        loadDemoData();
    }
}

// ============================================
// UI STATUS FUNCTIONS
// ============================================
function updateFirebaseStatus(connected) {
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

function updateUIForUser(user) {
    const userElement = document.getElementById('currentUser');
    if (userElement && user) {
        userElement.textContent = user.displayName || user.email || 'Bursar';
    }
}

// ============================================
// FORMATTING UTILITIES
// ============================================
function formatCurrency(amount) {
    return '₦' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(num) {
    return num.toLocaleString('en-US');
}

// ============================================
// FEE STRUCTURE MANAGEMENT
// ============================================
function initializeFeeStructure() {
    console.log("Initializing fee structure...");
    
    const tuitionFeesBody = document.getElementById('tuitionFeesBody');
    if (!tuitionFeesBody) {
        console.warn("Tuition fees body not found");
        return;
    }
    
    tuitionFeesBody.innerHTML = '';
    
    // Add KG fees
    defaultFeeStructure.kg.forEach(fee => {
        addFeeRow('kg', fee.class, fee.termFee, fee.annualFee);
    });
    
    // Add Nursery fees
    defaultFeeStructure.nursery.forEach(fee => {
        addFeeRow('nursery', fee.class, fee.termFee, fee.annualFee);
    });
    
    // Add Primary fees
    defaultFeeStructure.primary.forEach(fee => {
        addFeeRow('primary', fee.class, fee.termFee, fee.annualFee);
    });
    
    // Add Secondary fees
    defaultFeeStructure.secondary.forEach(fee => {
        addFeeRow('secondary', fee.class, fee.termFee, fee.annualFee);
    });
    
    // Initialize levies
    initializeLevies();
    
    // Calculate summary
    calculateSummary();
    
    // Initialize chart
    initializeChart();
}

function addFeeRow(category, className, termFee, annualFee) {
    const tuitionFeesBody = document.getElementById('tuitionFeesBody');
    if (!tuitionFeesBody) return;
    
    const row = document.createElement('tr');
    row.className = 'fee-row';
    row.dataset.category = category;
    
    // Determine category label
    let categoryLabel = category;
    switch(category) {
        case 'kg': categoryLabel = 'Kindergarten'; break;
        case 'nursery': categoryLabel = 'Nursery'; break;
        case 'primary': categoryLabel = 'Primary'; break;
        case 'secondary': categoryLabel = 'Secondary'; break;
    }
    
    row.innerHTML = `
        <td>${categoryLabel}</td>
        <td>${className}</td>
        <td>
            <input type="number" class="term-fee" value="${termFee}" min="0" step="1000" style="width: 120px;">
        </td>
        <td>
            <input type="number" class="annual-fee" value="${annualFee}" min="0" step="1000" style="width: 120px;">
        </td>
        <td>
            <button class="btn btn-danger btn-sm remove-fee-row">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tuitionFeesBody.appendChild(row);
    
    // Add event listener to remove button
    row.querySelector('.remove-fee-row').addEventListener('click', function() {
        if (confirm('Are you sure you want to remove this fee entry?')) {
            row.remove();
            calculateSummary();
        }
    });
    
    // Add event listeners to fee inputs
    row.querySelector('.term-fee').addEventListener('input', calculateSummary);
    row.querySelector('.annual-fee').addEventListener('input', calculateSummary);
}

function initializeLevies() {
    const leviesContainer = document.getElementById('leviesContainer');
    if (!leviesContainer) return;
    
    leviesContainer.innerHTML = '';
    
    defaultLevies.forEach((levy, index) => {
        addLevyRow(levy.name, levy.amount, levy.type, levy.applicableTo, levy.frequency);
    });
}

function addLevyRow(name = '', amount = 0, type = 'per_head', applicableTo = 'all', frequency = 'per_term') {
    const leviesContainer = document.getElementById('leviesContainer');
    if (!leviesContainer) return;
    
    const levyRow = document.createElement('div');
    levyRow.className = 'levy-row';
    
    levyRow.innerHTML = `
        <div>
            <input type="text" class="form-control levy-name" placeholder="Levy Name" value="${name}">
        </div>
        <div>
            <input type="number" class="form-control levy-amount" placeholder="Amount" value="${amount}" min="0" step="500">
        </div>
        <div>
            <select class="form-control levy-frequency">
                <option value="per_term" ${frequency === 'per_term' ? 'selected' : ''}>Per Term</option>
                <option value="per_session" ${frequency === 'per_session' ? 'selected' : ''}>Per Session</option>
                <option value="one_time" ${frequency === 'one_time' ? 'selected' : ''}>One Time</option>
            </select>
        </div>
        <div>
            <button class="btn btn-danger btn-sm remove-levy">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    leviesContainer.appendChild(levyRow);
    
    // Add event listener to remove button
    levyRow.querySelector('.remove-levy').addEventListener('click', function() {
        if (confirm('Are you sure you want to remove this levy?')) {
            levyRow.remove();
            calculateSummary();
        }
    });
    
    // Add event listeners to levy inputs
    levyRow.querySelector('.levy-name').addEventListener('input', calculateSummary);
    levyRow.querySelector('.levy-amount').addEventListener('input', calculateSummary);
    levyRow.querySelector('.levy-frequency').addEventListener('change', calculateSummary);
}

// ============================================
// SUMMARY CALCULATION
// ============================================
function calculateSummary() {
    console.log("Calculating fee summary...");
    
    // Calculate tuition fees by category
    const categories = {
        nursery: { total: 0, count: 0 },
        primary: { total: 0, count: 0 },
        secondary: { total: 0, count: 0 },
        kg: { total: 0, count: 0 }
    };
    
    // Calculate tuition fees
    document.querySelectorAll('.fee-row').forEach(row => {
        const category = row.dataset.category;
        const termFee = parseFloat(row.querySelector('.term-fee').value) || 0;
        const annualFee = parseFloat(row.querySelector('.annual-fee').value) || 0;
        
        if (categories[category]) {
            categories[category].total += termFee;
            categories[category].count++;
        }
    });
    
    // Calculate levies
    let totalLevies = 0;
    let leviesCount = 0;
    
    document.querySelectorAll('.levy-row').forEach(row => {
        const amount = parseFloat(row.querySelector('.levy-amount').value) || 0;
        totalLevies += amount;
        leviesCount++;
    });
    
    // Add PTA levy
    const ptaLevy = parseFloat(document.getElementById('ptaLevy').value) || 0;
    totalLevies += ptaLevy;
    
    // Calculate totals
    const nurseryTotal = categories.nursery.total;
    const primaryTotal = categories.primary.total;
    const secondaryTotal = categories.secondary.total;
    const kgTotal = categories.kg.total;
    
    const totalTuition = nurseryTotal + primaryTotal + secondaryTotal + kgTotal;
    const totalExpected = totalTuition + totalLevies;
    
    // Calculate averages
    const nurseryAvg = categories.nursery.count > 0 ? nurseryTotal / categories.nursery.count : 0;
    const primaryAvg = categories.primary.count > 0 ? primaryTotal / categories.primary.count : 0;
    const secondaryAvg = categories.secondary.count > 0 ? secondaryTotal / categories.secondary.count : 0;
    const totalClasses = categories.nursery.count + categories.primary.count + categories.secondary.count + categories.kg.count;
    const avgPerStudent = totalClasses > 0 ? totalExpected / totalClasses : 0;
    const leviesPerHead = totalLevies;
    
    // Update UI
    updateSummaryUI({
        nurseryTotal, nurseryAvg, nurseryClasses: categories.nursery.count,
        primaryTotal, primaryAvg, primaryClasses: categories.primary.count,
        secondaryTotal, secondaryAvg, secondaryClasses: categories.secondary.count,
        totalLevies, leviesCount, leviesPerHead,
        totalExpected, avgPerStudent
    });
    
    // Update chart
    updateChart(categories);
}

function updateSummaryUI(data) {
    // Update nursery section
    document.getElementById('nurseryTotal').textContent = formatCurrency(data.nurseryTotal);
    document.getElementById('nurseryAvg').textContent = formatCurrency(data.nurseryAvg);
    document.getElementById('nurseryClasses').textContent = `${data.nurseryClasses} class${data.nurseryClasses !== 1 ? 'es' : ''}`;
    
    // Update primary section
    document.getElementById('primaryTotal').textContent = formatCurrency(data.primaryTotal);
    document.getElementById('primaryAvg').textContent = formatCurrency(data.primaryAvg);
    document.getElementById('primaryClasses').textContent = `${data.primaryClasses} class${data.primaryClasses !== 1 ? 'es' : ''}`;
    
    // Update secondary section
    document.getElementById('secondaryTotal').textContent = formatCurrency(data.secondaryTotal);
    document.getElementById('secondaryAvg').textContent = formatCurrency(data.secondaryAvg);
    document.getElementById('secondaryClasses').textContent = `${data.secondaryClasses} class${data.secondaryClasses !== 1 ? 'es' : ''}`;
    
    // Update levies section
    document.getElementById('totalLevies').textContent = formatCurrency(data.totalLevies);
    document.getElementById('leviesCount').textContent = `${data.leviesCount} levies`;
    document.getElementById('leviesPerHead').textContent = formatCurrency(data.leviesPerHead);
    
    // Update total section
    document.getElementById('totalExpected').textContent = formatCurrency(data.totalExpected);
    document.getElementById('avgPerStudent').textContent = formatCurrency(data.avgPerStudent);
}

// ============================================
// CHART MANAGEMENT
// ============================================
function initializeChart() {
    const ctx = document.getElementById('feesChart');
    if (!ctx) return;
    
    feesChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Nursery', 'Primary', 'Secondary', 'KG'],
            datasets: [{
                label: 'Average Term Fees (₦)',
                data: [0, 0, 0, 0],
                backgroundColor: [
                    '#9b59b6', // Nursery - Purple
                    '#3498db', // Primary - Blue
                    '#e74c3c', // Secondary - Red
                    '#f39c12'  // KG - Orange
                ],
                borderColor: [
                    '#8e44ad',
                    '#2980b9',
                    '#c0392b',
                    '#e67e22'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₦' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Average: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
}

function updateChart(categories) {
    if (!feesChart) return;
    
    feesChart.data.datasets[0].data = [
        categories.nursery.count > 0 ? categories.nursery.total / categories.nursery.count : 0,
        categories.primary.count > 0 ? categories.primary.total / categories.primary.count : 0,
        categories.secondary.count > 0 ? categories.secondary.total / categories.secondary.count : 0,
        categories.kg.count > 0 ? categories.kg.total / categories.kg.count : 0
    ];
    
    feesChart.update();
}

// ============================================
// FIREBASE DATA OPERATIONS
// ============================================
function loadFeeData() {
    if (!isFirebaseConnected || !db) {
        console.warn("Cannot load fee data - Firebase not connected");
        loadDemoData();
        return;
    }
    
    console.log("Loading fee data from Firestore...");
    
    // Load term settings
    db.collection('settings').doc('termSettings').get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('currentTerm').value = data.currentTerm || '2';
                document.getElementById('academicYear').value = data.academicYear || '2023/2024';
                document.getElementById('feeStructureType').value = data.feeStructureType || 'variable';
                showAlert('success', 'Term settings loaded from database');
            }
        })
        .catch(error => {
            console.error("Error loading term settings:", error);
        });
    
    // Load fee structure
    db.collection('settings').doc('feeStructure').get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                loadFeeStructureFromData(data);
                showAlert('success', 'Fee structure loaded from database');
            } else {
                initializeFeeStructure();
                showAlert('info', 'No fee structure found, using default');
            }
        })
        .catch(error => {
            console.error("Error loading fee structure:", error);
            initializeFeeStructure();
        });
    
    // Load levies
    db.collection('settings').doc('levies').get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                loadLeviesFromData(data);
                showAlert('success', 'Levies loaded from database');
            }
        })
        .catch(error => {
            console.error("Error loading levies:", error);
        });
    
    // Load PTA settings
    db.collection('settings').doc('ptaSettings').get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('ptaLevy').value = data.ptaLevy || 5000;
                document.getElementById('ptaFrequency').value = data.ptaFrequency || 'per_term';
            }
        })
        .catch(error => {
            console.error("Error loading PTA settings:", error);
        });
}

function loadFeeStructureFromData(data) {
    const tuitionFeesBody = document.getElementById('tuitionFeesBody');
    if (!tuitionFeesBody) return;
    
    tuitionFeesBody.innerHTML = '';
    
    // Load each category
    ['kg', 'nursery', 'primary', 'secondary'].forEach(category => {
        if (data[category]) {
            data[category].forEach(fee => {
                addFeeRow(category, fee.class, fee.termFee, fee.annualFee);
            });
        }
    });
    
    calculateSummary();
}

function loadLeviesFromData(data) {
    const leviesContainer = document.getElementById('leviesContainer');
    if (!leviesContainer) return;
    
    leviesContainer.innerHTML = '';
    
    if (data.levies) {
        data.levies.forEach(levy => {
            addLevyRow(levy.name, levy.amount, levy.type, levy.applicableTo, levy.frequency);
        });
    }
    
    calculateSummary();
}

function saveTermSettings() {
    const termSettings = {
        currentTerm: document.getElementById('currentTerm').value,
        academicYear: document.getElementById('academicYear').value,
        feeStructureType: document.getElementById('feeStructureType').value,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser ? (currentUser.displayName || currentUser.email) : 'System'
    };
    
    if (isFirebaseConnected && db) {
        db.collection('settings').doc('termSettings').set(termSettings)
            .then(() => {
                showAlert('success', 'Term settings saved successfully!');
            })
            .catch(error => {
                console.error("Error saving term settings:", error);
                showAlert('error', `Failed to save term settings: ${error.message}`);
            });
    } else {
        showAlert('success', 'Term settings saved (Demo Mode)');
        console.log("Term settings (demo):", termSettings);
    }
}

function saveTuitionFees() {
    const feeStructure = {
        kg: [],
        nursery: [],
        primary: [],
        secondary: [],
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser ? (currentUser.displayName || currentUser.email) : 'System'
    };
    
    // Collect all fee rows
    document.querySelectorAll('.fee-row').forEach(row => {
        const category = row.dataset.category;
        const className = row.querySelector('td:nth-child(2)').textContent;
        const termFee = parseFloat(row.querySelector('.term-fee').value) || 0;
        const annualFee = parseFloat(row.querySelector('.annual-fee').value) || 0;
        
        if (feeStructure[category]) {
            feeStructure[category].push({
                class: className,
                termFee: termFee,
                annualFee: annualFee
            });
        }
    });
    
    if (isFirebaseConnected && db) {
        db.collection('settings').doc('feeStructure').set(feeStructure)
            .then(() => {
                showAlert('success', 'Tuition fees saved successfully!');
            })
            .catch(error => {
                console.error("Error saving tuition fees:", error);
                showAlert('error', `Failed to save tuition fees: ${error.message}`);
            });
    } else {
        showAlert('success', 'Tuition fees saved (Demo Mode)');
        console.log("Fee structure (demo):", feeStructure);
    }
}

function saveLevies() {
    const levies = [];
    
    // Collect all levies
    document.querySelectorAll('.levy-row').forEach(row => {
        const name = row.querySelector('.levy-name').value.trim();
        const amount = parseFloat(row.querySelector('.levy-amount').value) || 0;
        const frequency = row.querySelector('.levy-frequency').value;
        
        if (name && amount > 0) {
            levies.push({
                name: name,
                amount: amount,
                type: 'per_head', // Simplified for this version
                applicableTo: 'all',
                frequency: frequency
            });
        }
    });
    
    const leviesData = {
        levies: levies,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser ? (currentUser.displayName || currentUser.email) : 'System'
    };
    
    if (isFirebaseConnected && db) {
        db.collection('settings').doc('levies').set(leviesData)
            .then(() => {
                showAlert('success', 'Levies saved successfully!');
            })
            .catch(error => {
                console.error("Error saving levies:", error);
                showAlert('error', `Failed to save levies: ${error.message}`);
            });
    } else {
        showAlert('success', 'Levies saved (Demo Mode)');
        console.log("Levies (demo):", leviesData);
    }
}

function saveSpecialLevies() {
    const ptaSettings = {
        ptaLevy: parseFloat(document.getElementById('ptaLevy').value) || 0,
        ptaFrequency: document.getElementById('ptaFrequency').value,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser ? (currentUser.displayName || currentUser.email) : 'System'
    };
    
    if (isFirebaseConnected && db) {
        db.collection('settings').doc('ptaSettings').set(ptaSettings)
            .then(() => {
                showAlert('success', 'PTA settings saved successfully!');
                calculateSummary();
            })
            .catch(error => {
                console.error("Error saving PTA settings:", error);
                showAlert('error', `Failed to save PTA settings: ${error.message}`);
            });
    } else {
        showAlert('success', 'PTA settings saved (Demo Mode)');
        console.log("PTA settings (demo):", ptaSettings);
        calculateSummary();
    }
}

function applyToAllStudents() {
    if (!confirm('This will update fee structures for all existing students. Are you sure?')) {
        return;
    }
    
    showAlert('info', 'Applying fee structure to all students...');
    
    // In a real application, you would update all student records
    // For demo purposes, we'll just show a message
    setTimeout(() => {
        showAlert('success', 'Fee structure applied to all students successfully!');
    }, 2000);
}

// ============================================
// DEMO DATA FUNCTIONS
// ============================================
function loadDemoData() {
    console.log("Loading demo fee data...");
    
    // Initialize with default structure
    initializeFeeStructure();
    
    // Set demo values
    document.getElementById('currentTerm').value = '2';
    document.getElementById('academicYear').value = '2023/2024';
    document.getElementById('feeStructureType').value = 'variable';
    document.getElementById('ptaLevy').value = '5000';
    document.getElementById('ptaFrequency').value = 'per_term';
    
    // Update summary
    calculateSummary();
    
    // Show demo mode message
    setTimeout(() => {
        showAlert('info', 'Running in demo mode. Connect to Firebase for real data.');
    }, 500);
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================
function setupEventListeners() {
    console.log("Setting up event listeners for fees & levies...");
    
    // Save term settings
    const saveTermBtn = document.getElementById('saveTermSettings');
    if (saveTermBtn) {
        saveTermBtn.addEventListener('click', saveTermSettings);
    }
    
    // Load term settings
    const loadTermBtn = document.getElementById('loadTermSettings');
    if (loadTermBtn) {
        loadTermBtn.addEventListener('click', loadFeeData);
    }
    
    // Add fee row
    const addFeeBtn = document.getElementById('addFeeRow');
    if (addFeeBtn) {
        addFeeBtn.addEventListener('click', () => {
            const defaultClass = 'New Class';
            const defaultFee = 50000;
            addFeeRow('secondary', defaultClass, defaultFee, defaultFee * 3);
            calculateSummary();
        });
    }
    
    // Reset fees
    const resetFeesBtn = document.getElementById('resetFees');
    if (resetFeesBtn) {
        resetFeesBtn.addEventListener('click', () => {
            if (confirm('Reset all fees to default values?')) {
                initializeFeeStructure();
                showAlert('info', 'Fees reset to default values');
            }
        });
    }
    
    // Save tuition fees
    const saveTuitionBtn = document.getElementById('saveTuitionFees');
    if (saveTuitionBtn) {
        saveTuitionBtn.addEventListener('click', saveTuitionFees);
    }
    
    // Add levy
    const addLevyBtn = document.getElementById('addLevy');
    if (addLevyBtn) {
        addLevyBtn.addEventListener('click', () => {
            addLevyRow('', 0, 'per_head', 'all', 'per_term');
            calculateSummary();
        });
    }
    
    // Save levies
    const saveLeviesBtn = document.getElementById('saveLevies');
    if (saveLeviesBtn) {
        saveLeviesBtn.addEventListener('click', saveLevies);
    }
    
    // Save special levies
    const saveSpecialBtn = document.getElementById('saveSpecialLevies');
    if (saveSpecialBtn) {
        saveSpecialBtn.addEventListener('click', saveSpecialLevies);
    }
    
    // Export structure
    const exportBtn = document.getElementById('exportStructure');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            showAlert('info', 'Export functionality would generate file here');
        });
    }
    
    // Print structure
    const printBtn = document.getElementById('printStructure');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }
    
    // Apply to all
    const applyAllBtn = document.getElementById('applyToAll');
    if (applyAllBtn) {
        applyAllBtn.addEventListener('click', applyToAllStudents);
    }
    
    // Levy type change
    const levyTypeSelect = document.getElementById('levyType');
    if (levyTypeSelect) {
        levyTypeSelect.addEventListener('change', function() {
            showAlert('info', `Levy type changed to: ${this.value}`);
        });
    }
    
    // Fee structure for export
    const structureForSelect = document.getElementById('structureFor');
    if (structureForSelect) {
        structureForSelect.addEventListener('change', function() {
            showAlert('info', `Showing structure for: ${this.value}`);
        });
    }
    
    // Export format
    const exportFormatSelect = document.getElementById('exportFormat');
    if (exportFormatSelect) {
        exportFormatSelect.addEventListener('change', function() {
            showAlert('info', `Export format: ${this.value}`);
        });
    }
}

// ============================================
// INITIALIZATION
// ============================================
function initializeApp() {
    console.log("Initializing Fees & Levies System...");
    
    // Setup event listeners first
    setupEventListeners();
    
    // Initialize Firebase
    initializeFirebase();
    
    console.log("✅ Fees & Levies System Initialized");
}

// ============================================
// START THE APPLICATION
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export functions for HTML integration
window.FeesLeviesSystem = {
    initialize: initializeApp,
    saveTermSettings: saveTermSettings,
    saveTuitionFees: saveTuitionFees,
    saveLevies: saveLevies,
    saveSpecialLevies: saveSpecialLevies,
    applyToAllStudents: applyToAllStudents
};
