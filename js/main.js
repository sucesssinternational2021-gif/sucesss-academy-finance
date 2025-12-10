import { logout } from './auth.js';

// Navigation active state
document.addEventListener('DOMContentLoaded', function() {
  // Set active navigation item
  const currentPage = window.location.pathname.split('/').pop();
  const navItems = document.querySelectorAll('.nav-link');
  navItems.forEach(item => {
    if (item.getAttribute('href') === currentPage) {
      item.classList.add('active');
    }
  });
  
  // Logout functionality
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logout();
    });
  }
  
  // Load school info
  loadSchoolInfo();
});

// Load School Information
function loadSchoolInfo() {
  const schoolName = document.getElementById('schoolName');
  const schoolAddress = document.getElementById('schoolAddress');
  const schoolContact = document.getElementById('schoolContact');
  
  if (schoolName) {
    schoolName.textContent = 'Sucesss Model International Academy';
  }
  if (schoolAddress) {
    schoolAddress.textContent = 'NO13 Behind COCIN Church Gura-Landoh Gyel, Plateau State';
  }
  if (schoolContact) {
    schoolContact.innerHTML = `
      <i class="fas fa-phone"></i> 09020488851 | 
      <i class="fas fa-envelope"></i> sucesssinternational2021@gmail.com
    `;
  }
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);
}

// Format date
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export { formatCurrency, formatDate };
