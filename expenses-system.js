// expenses-system.js - Complete Expenses Management System

// Global variables
let currentUser = null;
let currentTab = 'expenses';
let allExpenses = [];
let allCategories = [];
let allBudgets = [];
let filteredExpenses = [];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    loadExpenses();
    loadCategories();
    loadBudgets();
    updateExpenseStats();
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
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('expenseDate').value = today;
    document.getElementById('budgetStartDate').value = today;
    
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    document.getElementById('budgetEndDate').value = endDate.toISOString().split('T')[0];
    
    // Expense form submission
    document.getElementById('expenseForm').addEventListener('submit', saveExpense);
    
    // Budget form submission
    document.getElementById('budgetForm').addEventListener('submit', saveBudget);
    
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

// Load expenses from Firestore
async function loadExpenses() {
    try {
        const expensesQuery = query(
            collection(db, "expenses"),
            orderBy("date", "desc"),
            limit(100)
        );
        
        const querySnapshot = await getDocs(expensesQuery);
        allExpenses = [];
        
        querySnapshot.forEach((doc) => {
            const expense = { id: doc.id, ...doc.data() };
            allExpenses.push(expense);
        });
        
        filterExpenses();
        updateExpenseStats();
        
    } catch (error) {
        console.error("Error loading expenses:", error);
        showAlert('Error loading expenses data', 'error');
        document.getElementById('expensesTable').innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fas fa-exclamation-circle"></i>
                    <p style="margin-top: 10px;">Error loading expenses</p>
                </td>
            </tr>
        `;
    }
}

// Filter expenses based on selected filters
function filterExpenses() {
    const category = document.getElementById('expenseFilterCategory').value;
    const dateFilter = document.getElementById('expenseFilterDate').value;
    
    filteredExpenses = [...allExpenses];
    
    // Filter by category
    if (category !== 'all') {
        filteredExpenses = filteredExpenses.filter(expense => expense.category === category);
    }
    
    // Filter by date
    const now = new Date();
    if (dateFilter !== 'all') {
        filteredExpenses = filteredExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            
            switch (dateFilter) {
                case 'today':
                    return expenseDate.toDateString() === now.toDateString();
                case 'week':
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return expenseDate >= weekAgo;
                case 'month':
                    const monthAgo = new Date();
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return expenseDate >= monthAgo;
                case 'quarter':
                    const quarterAgo = new Date();
                    quarterAgo.setMonth(quarterAgo.getMonth() - 3);
                    return expenseDate >= quarterAgo;
                case 'year':
                    const yearAgo = new Date();
                    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                    return expenseDate >= yearAgo;
                default:
                    return true;
            }
        });
    }
    
    displayExpenses();
}

// Display expenses in table
function displayExpenses() {
    const tbody = document.getElementById('expensesTable');
    
    if (filteredExpenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <i class="fas fa-receipt" style="font-size: 1.5rem; color: #6c757d;"></i>
                    <p style="margin-top: 10px;">No expenses found matching the filters</p>
                </td>
            </tr>
        `;
        
        document.getElementById('expensesShowing').textContent = 0;
        document.getElementById('expensesTotal').textContent = allExpenses.length;
        return;
    }
    
    let html = '';
    
    filteredExpenses.forEach(expense => {
        const categoryClass = `category-${expense.category}`;
        const categoryName = getCategoryName(expense.category);
        const statusBadge = getStatusBadge(expense.status);
        
        html += `
            <tr>
                <td>${formatDate(expense.date)}</td>
                <td>
                    <strong>${expense.description || 'No description'}</strong>
                    ${expense.vendor ? `<br><small>Vendor: ${expense.vendor}</small>` : ''}
                </td>
                <td class="${categoryClass}">${categoryName}</td>
                <td><strong style="color: #dc3545;">${formatCurrency(expense.amount)}</strong></td>
                <td>${getPaymentMethodName(expense.paymentMethod)}</td>
                <td>${statusBadge}</td>
                <td>${expense.approver || 'N/A'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" style="background: #17a2b8; color: white;" onclick="viewExpense('${expense.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" style="background: #ffc107; color: black;" onclick="editExpense('${expense.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" style="background: #dc3545; color: white;" onclick="deleteExpense('${expense.id}', '${expense.description}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    document.getElementById('expensesShowing').textContent = filteredExpenses.length;
    document.getElementById('expensesTotal').textContent = allExpenses.length;
}

// Update expense statistics
function updateExpenseStats() {
    const totalExpenses = allExpenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
    
    // Calculate monthly expenses
    const now = new Date();
    const thisMonthExpenses = allExpenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === now.getMonth() && 
               expenseDate.getFullYear() === now.getFullYear();
    }).reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
    
    // Count pending expenses
    const pendingExpenses = allExpenses.filter(expense => expense.status === 'pending').length;
    
    // Calculate budget utilization (sample data)
    const budgetUtilization = Math.min(100, Math.round((thisMonthExpenses / 5000000) * 100));
    
    // Find top category
    const categoryTotals = {};
    allExpenses.forEach(expense => {
        const category = expense.category || 'other';
        categoryTotals[category] = (categoryTotals[category] || 0) + (parseFloat(expense.amount) || 0);
    });
    
    let topCategory = '-';
    let maxAmount = 0;
    for (const [category, amount] of Object.entries(categoryTotals)) {
        if (amount > maxAmount) {
            maxAmount = amount;
            topCategory = getCategoryName(category);
        }
    }
    
    // Calculate average expense
    const avgExpense = allExpenses.length > 0 ? totalExpenses / allExpenses.length : 0;
    
    document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('monthlyExpenses').textContent = formatCurrency(thisMonthExpenses);
    document.getElementById('pendingExpenses').textContent = pendingExpenses;
    document.getElementById('budgetUtilization').textContent = `${budgetUtilization}%`;
    document.getElementById('topCategory').textContent = topCategory;
    document.getElementById('avgExpense').textContent = formatCurrency(avgExpense);
}

// Show add expense modal
function showAddExpenseModal() {
    document.getElementById('modalTitle').textContent = 'Record New Expense';
    document.getElementById('expenseForm').reset();
    document.getElementById('expenseId').value = '';
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('expenseStatus').value = 'pending';
    document.getElementById('expensePriority').value = 'medium';
    
    // Generate reference number
    const reference = `EXP${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    document.getElementById('expenseReference').value = reference;
    
    document.getElementById('expenseModal').style.display = 'flex';
}

// Save expense
async function saveExpense(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showAlert('Please login to record expenses', 'error');
        return;
    }
    
    // Get form values
    const expenseId = document.getElementById('expenseId').value;
    const expenseDate = document.getElementById('expenseDate').value;
    const expenseAmount = parseFloat(document.getElementById('expenseAmount').value) || 0;
    const expenseCategory = document.getElementById('expenseCategory').value;
    const expensePriority = document.getElementById('expensePriority').value;
    const expenseVendor = document.getElementById('expenseVendor').value.trim();
    const expensePaymentMethod = document.getElementById('expensePaymentMethod').value;
    const expenseReference = document.getElementById('expenseReference').value.trim();
    const expenseStatus = document.getElementById('expenseStatus').value;
    const expenseDescription = document.getElementById('expenseDescription').value.trim();
    const expenseNotes = document.getElementById('expenseNotes').value.trim();
    const expenseDepartment = document.getElementById('expenseDepartment').value;
    const expenseApprover = document.getElementById('expenseApprover').value.trim();
    
    // Validation
    if (!expenseDate || !expenseAmount || expenseAmount <= 0 || !expenseCategory || !expensePaymentMethod || !expenseDescription) {
        showAlert('Please fill all required fields with valid values', 'error');
        return;
    }
    
    try {
        const expenseData = {
            date: expenseDate,
            amount: expenseAmount,
            category: expenseCategory,
            priority: expensePriority,
            vendor: expenseVendor,
            paymentMethod: expensePaymentMethod,
            reference: expenseReference || null,
            status: expenseStatus,
            description: expenseDescription,
            notes: expenseNotes,
            department: expenseDepartment || null,
            approver: expenseApprover || null,
            recordedBy: currentUser.uid,
            recordedByName: currentUser.email,
            updatedAt: serverTimestamp()
        };
        
        if (!expenseId) {
            // New expense
            const newExpenseId = expenseReference || `expense_${Date.now()}`;
            expenseData.createdAt = serverTimestamp();
            expenseData.createdBy = currentUser.uid;
            
            await setDoc(doc(db, "expenses", newExpenseId), expenseData);
            showAlert(`Expense recorded successfully! Amount: ${formatCurrency(expenseAmount)}`, 'success');
        } else {
            // Update existing expense
            await updateDoc(doc(db, "expenses", expenseId), expenseData);
            showAlert(`Expense updated successfully!`, 'success');
        }
        
        // Close modal and refresh data
        closeExpenseModal();
        await loadExpenses();
        
    } catch (error) {
        console.error("Error saving expense:", error);
        showAlert('Error saving expense: ' + error.message, 'error');
    }
}

// Edit expense
async function editExpense(expenseId) {
    try {
        const expenseRef = doc(db, "expenses", expenseId);
        const expenseSnap = await getDoc(expenseRef);
        
        if (expenseSnap.exists()) {
            const expense = expenseSnap.data();
            
            document.getElementById('modalTitle').textContent = 'Edit Expense';
            document.getElementById('expenseId').value = expenseId;
            document.getElementById('expenseDate').value = expense.date || '';
            document.getElementById('expenseAmount').value = expense.amount || 0;
            document.getElementById('expenseCategory').value = expense.category || '';
            document.getElementById('expensePriority').value = expense.priority || 'medium';
            document.getElementById('expenseVendor').value = expense.vendor || '';
            document.getElementById('expensePaymentMethod').value = expense.paymentMethod || '';
            document.getElementById('expenseReference').value = expense.reference || '';
            document.getElementById('expenseStatus').value = expense.status || 'pending';
            document.getElementById('expenseDescription').value = expense.description || '';
            document.getElementById('expenseNotes').value = expense.notes || '';
            document.getElementById('expenseDepartment').value = expense.department || '';
            document.getElementById('expenseApprover').value = expense.approver || '';
            
            document.getElementById('expenseModal').style.display = 'flex';
        }
    } catch (error) {
        console.error("Error loading expense for edit:", error);
        showAlert('Error loading expense data', 'error');
    }
}

// View expense details
async function viewExpense(expenseId) {
    try {
        const expenseRef = doc(db, "expenses", expenseId);
        const expenseSnap = await getDoc(expenseRef);
        
        if (expenseSnap.exists()) {
            const expense = expenseSnap.data();
            
            const details = `
                <div class="expense-card ${expense.priority === 'urgent' ? 'urgent' : expense.priority === 'high' ? 'moderate' : ''}">
                    <div class="expense-header">
                        <div class="expense-info">
                            <h4>${expense.description || 'No Description'}</h4>
                            <p>Date: ${formatDate(expense.date)} • Reference: ${expense.reference || 'N/A'}</p>
                        </div>
                        <div class="expense-amount">${formatCurrency(expense.amount)}</div>
                    </div>
                    
                    <div class="expense-details">
                        <div class="detail-item">
                            <span class="detail-label">Category</span>
                            <span class="detail-value ${`category-${expense.category}`}">${getCategoryName(expense.category)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Priority</span>
                            <span class="detail-value" style="color: ${getPriorityColor(expense.priority)};">
                                ${expense.priority ? expense.priority.charAt(0).toUpperCase() + expense.priority.slice(1) : 'Medium'}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Payment Method</span>
                            <span class="detail-value">${getPaymentMethodName(expense.paymentMethod)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status</span>
                            <span class="${getStatusBadgeClass(expense.status)}">${expense.status ? expense.status.charAt(0).toUpperCase() + expense.status.slice(1) : 'Pending'}</span>
                        </div>
                    </div>
                    
                    <div style="margin-top: 15px;">
                        ${expense.vendor ? `<p><strong>Vendor:</strong> ${expense.vendor}</p>` : ''}
                        ${expense.department ? `<p><strong>Department:</strong> ${expense.department}</p>` : ''}
                        ${expense.approver ? `<p><strong>Approver:</strong> ${expense.approver}</p>` : ''}
                        ${expense.notes ? `<p><strong>Notes:</strong> ${expense.notes}</p>` : ''}
                    </div>
                </div>
            `;
            
            // Show in modal or alert
            alert(`Expense Details:\n\nAmount: ${formatCurrency(expense.amount)}\nDate: ${formatDate(expense.date)}\nCategory: ${getCategoryName(expense.category)}\nStatus: ${expense.status}\nDescription: ${expense.description}`);
        }
    } catch (error) {
        console.error("Error viewing expense:", error);
        showAlert('Error loading expense details', 'error');
    }
}

// Delete expense
function deleteExpense(expenseId, expenseDescription) {
    if (confirm(`Are you sure you want to delete expense: "${expenseDescription}"?\n\nThis action cannot be undone!`)) {
        deleteExpenseConfirmed(expenseId);
    }
}

async function deleteExpenseConfirmed(expenseId) {
    try {
        await deleteDoc(doc(db, "expenses", expenseId));
        showAlert(`Expense deleted successfully`, 'success');
        await loadExpenses();
    } catch (error) {
        console.error("Error deleting expense:", error);
        showAlert('Error deleting expense: ' + error.message, 'error');
    }
}

// Load categories
async function loadCategories() {
    try {
        const categoriesQuery = query(
            collection(db, "expense_categories"),
            orderBy("name")
        );
        
        const querySnapshot = await getDocs(categoriesQuery);
        allCategories = [];
        
        querySnapshot.forEach((doc) => {
            const category = { id: doc.id, ...doc.data() };
            allCategories.push(category);
        });
        
        displayCategories();
        
    } catch (error) {
        console.error("Error loading categories:", error);
        // Don't show error if collection doesn't exist yet
    }
}

// Display categories
function displayCategories() {
    const categoriesDiv = document.getElementById('categoriesList');
    
    if (allCategories.length === 0) {
        categoriesDiv.innerHTML = `
            <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
                <i class="fas fa-tags" style="font-size: 1.5rem; color: #6c757d;"></i>
                <p style="margin-top: 10px;">No categories defined yet. Add categories above.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    allCategories.forEach(category => {
        html += `
            <div style="background: white; padding: 15px; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div style="width: 20px; height: 20px; border-radius: 3px; background: ${category.color || '#667eea'};"></div>
                    <div>
                        <h4 style="margin: 0; color: #333;">${category.name}</h4>
                        <p style="margin: 0; color: #666; font-size: 0.9rem;">${category.code || ''}</p>
                    </div>
                </div>
                
                ${category.description ? `<p style="color: #666; font-size: 0.9rem; margin-bottom: 10px;">${category.description}</p>` : ''}
                
                ${category.budget ? `<p><strong>Monthly Budget:</strong> ${formatCurrency(category.budget)}</p>` : ''}
                
                <div style="display: flex; gap: 5px; margin-top: 10px;">
                    <button class="action-btn" style="background: #ffc107; color: black;" onclick="editCategory('${category.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn" style="background: #dc3545; color: white;" onclick="deleteCategory('${category.id}', '${category.name}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    categoriesDiv.innerHTML = html;
}

// Save category
async function saveCategory() {
    const categoryName = document.getElementById('categoryName').value.trim();
    const categoryCode = document.getElementById('categoryCode').value.trim();
    const categoryBudget = parseFloat(document.getElementById('categoryBudget').value) || 0;
    const categoryColor = document.getElementById('categoryColor').value;
    const categoryDescription = document.getElementById('categoryDescription').value.trim();
    
    if (!categoryName) {
        showAlert('Please enter category name', 'error');
        return;
    }
    
    try {
        const categoryId = categoryCode.toLowerCase() || categoryName.toLowerCase().replace(/\s+/g, '_');
        const categoryData = {
            name: categoryName,
            code: categoryCode || null,
            budget: categoryBudget > 0 ? categoryBudget : null,
            color: categoryColor,
            description: categoryDescription || null,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid
        };
        
        await setDoc(doc(db, "expense_categories", categoryId), categoryData);
        
        showAlert(`Category "${categoryName}" saved successfully!`, 'success');
        
        // Clear form and reload
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryCode').value = '';
        document.getElementById('categoryBudget').value = '';
        document.getElementById('categoryColor').value = '#667eea';
        document.getElementById('categoryDescription').value = '';
        
        await loadCategories();
        
    } catch (error) {
        console.error("Error saving category:", error);
        showAlert('Error saving category: ' + error.message, 'error');
    }
}

// Edit category
async function editCategory(categoryId) {
    try {
        const categoryRef = doc(db, "expense_categories", categoryId);
        const categorySnap = await getDoc(categoryRef);
        
        if (categorySnap.exists()) {
            const category = categorySnap.data();
            
            document.getElementById('categoryName').value = category.name || '';
            document.getElementById('categoryCode').value = category.code || '';
            document.getElementById('categoryBudget').value = category.budget || '';
            document.getElementById('categoryColor').value = category.color || '#667eea';
            document.getElementById('categoryDescription').value = category.description || '';
            
            // Scroll to form
            document.getElementById('categoryName').scrollIntoView({ behavior: 'smooth' });
            showAlert(`Loaded category "${category.name}" for editing`, 'success');
        }
    } catch (error) {
        console.error("Error loading category for edit:", error);
        showAlert('Error loading category', 'error');
    }
}

// Delete category
function deleteCategory(categoryId, categoryName) {
    if (confirm(`Are you sure you want to delete category "${categoryName}"?\n\nThis will not delete expenses in this category.`)) {
        deleteCategoryConfirmed(categoryId);
    }
}

async function deleteCategoryConfirmed(categoryId) {
    try {
        await deleteDoc(doc(db, "expense_categories", categoryId));
        showAlert('Category deleted successfully', 'success');
        await loadCategories();
    } catch (error) {
        console.error("Error deleting category:", error);
        showAlert('Error deleting category: ' + error.message, 'error');
    }
}

// Load budgets
async function loadBudgets() {
    try {
        const budgetsQuery = query(
            collection(db, "budgets"),
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(budgetsQuery);
        allBudgets = [];
        
        querySnapshot.forEach((doc) => {
            const budget = { id: doc.id, ...doc.data() };
            allBudgets.push(budget);
        });
        
        displayBudgets();
        
    } catch (error) {
        console.error("Error loading budgets:", error);
        // Don't show error if collection doesn't exist yet
    }
}

// Display budgets
function displayBudgets() {
    const budgetsDiv = document.getElementById('budgetsList');
    
    if (allBudgets.length === 0) {
        budgetsDiv.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-chart-pie" style="font-size: 1.5rem; color: #6c757d;"></i>
                <p style="margin-top: 10px;">No budgets created yet. Create a budget to get started.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    allBudgets.forEach(budget => {
        // Calculate budget utilization
        const spent = calculateBudgetSpent(budget);
        const utilization = budget.amount > 0 ? Math.min(100, Math.round((spent / budget.amount) * 100)) : 0;
        const progressClass = utilization < 50 ? 'low' : utilization < 80 ? 'medium' : 'high';
        
        html += `
            <div class="budget-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div>
                        <h4 style="margin: 0; color: #333;">${budget.name}</h4>
                        <p style="color: #666; margin: 5px 0;">${getBudgetPeriodName(budget.period)} Budget</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.2rem; font-weight: bold; color: ${utilization >= 80 ? '#dc3545' : utilization >= 50 ? '#ffc107' : '#28a745'};">${formatCurrency(spent)}</div>
                        <div style="color: #666; font-size: 0.9rem;">Budget: ${formatCurrency(budget.amount)}</div>
                    </div>
                </div>
                
                <div class="budget-progress">
                    <div class="budget-progress-bar ${progressClass}" style="width: ${utilization}%;"></div>
                </div>
                
                <div style="display: flex; justify-content: space-between; color: #666; font-size: 0.9rem;">
                    <span>Spent: ${formatCurrency(spent)}</span>
                    <span>Remaining: ${formatCurrency(Math.max(0, budget.amount - spent))}</span>
                    <span>${utilization}% used</span>
                </div>
                
                ${budget.description ? `<p style="margin-top: 10px; color: #666; font-size: 0.9rem;">${budget.description}</p>` : ''}
            </div>
        `;
    });
    
    budgetsDiv.innerHTML = html;
}

// Calculate spent amount for a budget
function calculateBudgetSpent(budget) {
    const now = new Date();
    const budgetStart = new Date(budget.startDate);
    const budgetEnd = new Date(budget.endDate);
    
    // Filter expenses for this budget period and category
    const relevantExpenses = allExpenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        const matchesCategory = expense.category === budget.category;
        const withinPeriod = expenseDate >= budgetStart && expenseDate <= budgetEnd;
        
        return matchesCategory && withinPeriod;
    });
    
    return relevantExpenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
}

// Show add budget modal
function showAddBudgetModal() {
    document.getElementById('budgetForm').reset();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('budgetStartDate').value = today;
    
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    document.getElementById('budgetEndDate').value = endDate.toISOString().split('T')[0];
    
    document.getElementById('budgetModal').style.display = 'flex';
}

// Save budget
async function saveBudget(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showAlert('Please login to create budgets', 'error');
        return;
    }
    
    // Get form values
    const budgetName = document.getElementById('budgetName').value.trim();
    const budgetCategory = document.getElementById('budgetCategory').value;
    const budgetAmount = parseFloat(document.getElementById('budgetAmount').value) || 0;
    const budgetPeriod = document.getElementById('budgetPeriod').value;
    const budgetStartDate = document.getElementById('budgetStartDate').value;
    const budgetEndDate = document.getElementById('budgetEndDate').value;
    const budgetDescription = document.getElementById('budgetDescription').value.trim();
    
    // Validation
    if (!budgetName || !budgetCategory || !budgetAmount || budgetAmount <= 0 || !budgetStartDate || !budgetEndDate) {
        showAlert('Please fill all required fields with valid values', 'error');
        return;
    }
    
    try {
        const budgetId = `budget_${Date.now()}`;
        const budgetData = {
            name: budgetName,
            category: budgetCategory,
            amount: budgetAmount,
            period: budgetPeriod,
            startDate: budgetStartDate,
            endDate: budgetEndDate,
            description: budgetDescription || null,
            createdBy: currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        await setDoc(doc(db, "budgets", budgetId), budgetData);
        
        showAlert(`Budget "${budgetName}" created successfully!`, 'success');
        
        // Close modal and reload
        closeBudgetModal();
        await loadBudgets();
        
    } catch (error) {
        console.error("Error saving budget:", error);
        showAlert('Error saving budget: ' + error.message, 'error');
    }
}

// Apply filters
function filterExpenses() {
    filterExpenses();
}

// Clear filters
function clearFilters() {
    document.getElementById('expenseFilterCategory').value = 'all';
    document.getElementById('expenseFilterDate').value = 'all';
    filterExpenses();
}

// Generate expense analysis
async function generateAnalysis() {
    const period = document.getElementById('analysisPeriod').value;
    const year = document.getElementById('analysisYear').value;
    
    const chartDiv = document.getElementById('expenseChart');
    const insightsDiv = document.getElementById('expenseInsights');
    
    chartDiv.innerHTML = `
        <div style="text-align: center;">
            <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; color: #667eea;"></i>
            <p style="margin-top: 10px;">Generating analysis for ${period} ${year}...</p>
        </div>
    `;
    
    insightsDiv.innerHTML = '<p style="color: #666;">Generating insights...</p>';
    
    // Simulate analysis generation
    setTimeout(() => {
        // Sample chart data
        const chartData = `
            <div style="text-align: left;">
                <h5>Expense Distribution by Category (${year})</h5>
                <div style="display: flex; align-items: flex-end; gap: 10px; height: 200px; margin-top: 20px;">
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                        <div style="background: #dc3545; width: 30px; height: 150px;"></div>
                        <div style="margin-top: 5px; font-size: 0.9rem;">Salaries</div>
                        <div style="color: #666; font-size: 0.8rem;">45%</div>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                        <div style="background: #007bff; width: 30px; height: 100px;"></div>
                        <div style="margin-top: 5px; font-size: 0.9rem;">Utilities</div>
                        <div style="color: #666; font-size: 0.8rem;">20%</div>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                        <div style="background: #28a745; width: 30px; height: 80px;"></div>
                        <div style="margin-top: 5px; font-size: 0.9rem;">Supplies</div>
                        <div style="color: #666; font-size: 0.8rem;">15%</div>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                        <div style="background: #ffc107; width: 30px; height: 60px;"></div>
                        <div style="margin-top: 5px; font-size: 0.9rem;">Maintenance</div>
                        <div style="color: #666; font-size: 0.8rem;">12%</div>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                        <div style="background: #6c757d; width: 30px; height: 40px;"></div>
                        <div style="margin-top: 5px; font-size: 0.9rem;">Other</div>
                        <div style="color: #666; font-size: 0.8rem;">8%</div>
                    </div>
                </div>
                
                <div style="margin-top: 30px;">
                    <h5>Monthly Expense Trend</h5>
                    <p style="color: #666;">Total expenses show a 12% increase compared to last ${period}</p>
                </div>
            </div>
        `;
        
        // Sample insights
        const insights = `
            <div style="color: #333;">
                <p><i class="fas fa-check-circle" style="color: #28a745;"></i> <strong>Positive Finding:</strong> Utility costs decreased by 8% this ${period}</p>
                <p><i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i> <strong>Area for Improvement:</strong> Supply expenses increased by 15% - consider bulk purchasing</p>
                <p><i class="fas fa-lightbulb" style="color: #17a2b8;"></i> <strong>Recommendation:</strong> Implement digital expense approvals to reduce processing time</p>
                <p><i class="fas fa-chart-line" style="color: #667eea;"></i> <strong>Trend:</strong> Overall expenses are within 5% of projected budget</p>
            </div>
        `;
        
        chartDiv.innerHTML = chartData;
        insightsDiv.innerHTML = insights;
    }, 1500);
}

// Export expenses
function exportExpenses() {
    const format = confirm('Export as Excel? Click OK for Excel, Cancel for PDF') ? 'excel' : 'pdf';
    
    if (format === 'excel') {
        alert('Excel export would start here. In production, this would download an Excel file.');
    } else {
        alert('PDF export would start here. In production, this would download a PDF file.');
    }
}

// Print expenses
function printExpenses() {
    window.print();
}

// Helper functions
function getCategoryName(categoryCode) {
    const categories = {
        'salary': 'Salary & Wages',
        'utilities': 'Utilities',
        'maintenance': 'Maintenance',
        'supplies': 'Supplies',
        'transport': 'Transport',
        'training': 'Training',
        'marketing': 'Marketing',
        'equipment': 'Equipment',
        'rent': 'Rent',
        'insurance': 'Insurance',
        'taxes': 'Taxes',
        'other': 'Other'
    };
    return categories[categoryCode] || categoryCode;
}

function getPaymentMethodName(method) {
    const methods = {
        'cash': 'Cash',
        'bank_transfer': 'Bank Transfer',
        'cheque': 'Cheque',
        'pos': 'POS/Card',
        'mobile_money': 'Mobile Money'
    };
    return methods[method] || method;
}

function getPriorityColor(priority) {
    const colors = {
        'low': '#28a745',
        'medium': '#ffc107',
        'high': '#fd7e14',
        'urgent': '#dc3545'
    };
    return colors[priority] || '#666';
}

function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="badge badge-pending">Pending</span>',
        'approved': '<span class="badge badge-approved">Approved</span>',
        'paid': '<span class="badge badge-paid">Paid</span>',
        'rejected': '<span class="badge badge-rejected">Rejected</span>'
    };
    return badges[status] || '<span class="badge">Unknown</span>';
}

function getStatusBadgeClass(status) {
    const classes = {
        'pending': 'badge badge-pending',
        'approved': 'badge badge-approved',
        'paid': 'badge badge-paid',
        'rejected': 'badge badge-rejected'
    };
    return classes[status] || 'badge';
}

function getBudgetPeriodName(period) {
    const periods = {
        'monthly': 'Monthly',
        'quarterly': 'Quarterly',
        'term': 'Term',
        'annual': 'Annual'
    };
    return periods[period] || period;
}

function formatCurrency(amount) {
    return '₦' + amount.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Modal functions
function closeExpenseModal() {
    document.getElementById('expenseModal').style.display = 'none';
}

function closeBudgetModal() {
    document.getElementById('budgetModal').style.display = 'none';
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
window.showAddExpenseModal = showAddExpenseModal;
window.showAddBudgetModal = showAddBudgetModal;
window.closeExpenseModal = closeExpenseModal;
window.closeBudgetModal = closeBudgetModal;
window.editExpense = editExpense;
window.viewExpense = viewExpense;
window.deleteExpense = deleteExpense;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.saveCategory = saveCategory;
window.filterExpenses = filterExpenses;
window.clearFilters = clearFilters;
window.generateAnalysis = generateAnalysis;
window.exportExpenses = exportExpenses;
window.printExpenses = printExpenses;
window.loadBudgets = loadBudgets;
window.showAlert = showAlert;
