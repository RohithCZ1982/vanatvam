// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Get current user from sessionStorage
function getCurrentUser() {
    const user = sessionStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

// Set current user in sessionStorage
function setCurrentUser(user) {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
}

// API: Get all customers
async function getCustomers(searchQuery = '') {
    try {
        const url = searchQuery 
            ? `${API_BASE_URL}/customers?search=${encodeURIComponent(searchQuery)}`
            : `${API_BASE_URL}/customers`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch customers');
        return await response.json();
    } catch (error) {
        console.error('Error fetching customers:', error);
        alert('Error loading customers. Please check if the server is running.');
        return [];
    }
}

// API: Add customer
async function addCustomer(customer) {
    try {
        const response = await fetch(`${API_BASE_URL}/customers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(customer)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to add customer');
        return data.customer;
    } catch (error) {
        console.error('Error adding customer:', error);
        throw error;
    }
}

// API: Update customer
async function updateCustomer(id, updatedData) {
    try {
        const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update customer');
        return data.customer;
    } catch (error) {
        console.error('Error updating customer:', error);
        throw error;
    }
}

// API: Delete customer
async function deleteCustomer(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to delete customer');
        return true;
    } catch (error) {
        console.error('Error deleting customer:', error);
        throw error;
    }
}

// API: Search customers (handled by backend)
async function searchCustomers(query) {
    return await getCustomers(query);
}

// API: Add task
async function addTask(taskData) {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to add task');
        return data.task;
    } catch (error) {
        console.error('Error adding task:', error);
        throw error;
    }
}

// API: Get all tasks (optionally filtered by date)
async function getAllTasks(date = null) {
    try {
        let url = `${API_BASE_URL}/tasks`;
        if (date) {
            url += `?date=${encodeURIComponent(date)}`;
        }
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch tasks: ' + response.status);
        }
        
        const tasks = await response.json();
        
        if (!Array.isArray(tasks)) {
            return [];
        }
        
        return tasks;
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }
}

// API: Get all tasks for a specific customer (including completed)
async function getCustomerTasks(customerId) {
    try {
        const url = `${API_BASE_URL}/tasks?customerId=${encodeURIComponent(customerId)}&include_completed=true`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch customer tasks: ' + response.status);
        }
        
        const tasks = await response.json();
        
        if (!Array.isArray(tasks)) {
            return [];
        }
        
        return tasks;
    } catch (error) {
        console.error('Error fetching customer tasks:', error);
        return [];
    }
}

// API: Get tasks by date (for backward compatibility)
async function getTasksByDate(date) {
    return await getAllTasks(date);
}

// API: Update task status
async function updateTaskStatus(taskId, status) {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update task');
        return data.task;
    } catch (error) {
        console.error('Error updating task:', error);
        throw error;
    }
}

// API: Update task date
async function updateTaskDate(taskId, newDate) {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/date`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ taskDate: newDate })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update task date');
        return data.task;
    } catch (error) {
        console.error('Error updating task date:', error);
        throw error;
    }
}

// API: Add booking
async function addBooking(booking) {
    try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(booking)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to add booking');
        return data.booking;
    } catch (error) {
        console.error('Error adding booking:', error);
        throw error;
    }
}

// API: Get all bookings
async function getAllBookings(projectFilter = null) {
    try {
        let url = `${API_BASE_URL}/bookings`;
        if (projectFilter) {
            url += `?project=${encodeURIComponent(projectFilter)}`;
        }
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch bookings: ' + response.status);
        }
        
        const bookings = await response.json();
        
        if (!Array.isArray(bookings)) {
            return [];
        }
        
        return bookings;
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return [];
    }
}

// Check authentication
function checkAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Login handler
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    const errorMessage = document.getElementById('errorMessage');

    errorMessage.classList.remove('show');

    if (!username || !password || !role) {
        errorMessage.textContent = 'Please fill in all fields';
        errorMessage.classList.add('show');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, role })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            setCurrentUser(data.user);
            if (data.user.role === 'admin') {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'customer-list.html';
            }
        } else {
            errorMessage.textContent = data.message || 'Invalid credentials or role mismatch';
            errorMessage.classList.add('show');
        }
    } catch (error) {
        console.error('Login error:', error);
        let errorMsg = 'Error connecting to server. ';
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMsg += 'Please make sure the Flask server is running on http://localhost:5000';
        } else {
            errorMsg += error.message;
        }
        errorMessage.textContent = errorMsg;
        errorMessage.classList.add('show');
    }
}

// Logout handler
function handleLogout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Toggle mobile menu
// Mobile Menu Management
let mobileMenuPanel = null;
let mobileMenuOverlay = null;

// Initialize mobile menu
function initMobileMenu() {
    // Create overlay
    mobileMenuOverlay = document.createElement('div');
    mobileMenuOverlay.className = 'mobile-menu-overlay';
    mobileMenuOverlay.onclick = closeMobileMenu;
    document.body.appendChild(mobileMenuOverlay);

    // Create menu panel
    mobileMenuPanel = document.createElement('div');
    mobileMenuPanel.className = 'mobile-menu-panel';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'mobile-menu-header';
    header.innerHTML = `
        <h3 class="mobile-menu-title">Menu</h3>
        <button class="mobile-menu-close" onclick="closeMobileMenu()">✕</button>
    `;
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'mobile-menu-content';
    content.id = 'mobileMenuContent';
    
    mobileMenuPanel.appendChild(header);
    mobileMenuPanel.appendChild(content);
    document.body.appendChild(mobileMenuPanel);
}

// Populate mobile menu with navigation items
function populateMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    const mobileMenuContent = document.getElementById('mobileMenuContent');
    
    if (!navMenu || !mobileMenuContent) return;
    
    // Get all nav links from the original menu
    const navLinks = navMenu.querySelectorAll('.nav-link');
    const userInfo = navMenu.querySelector('.nav-user-info');
    
    let menuHTML = '';
    
    // Add navigation links
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        const text = link.textContent.trim();
        const isActive = link.classList.contains('active');
        const isLogout = link.classList.contains('nav-link-logout');
        
        if (isLogout) {
            menuHTML += `
                <a href="#" class="mobile-menu-item" onclick="handleLogout(); closeMobileMenu(); return false;">
                    ${text}
                </a>
            `;
        } else {
            menuHTML += `
                <a href="${href}" class="mobile-menu-item ${isActive ? 'active' : ''}" onclick="closeMobileMenu()">
                    ${text}
                </a>
            `;
        }
    });
    
    // Add user info if exists
    if (userInfo) {
        menuHTML += `
            <div class="mobile-menu-user-info">
                ${userInfo.textContent}
            </div>
        `;
    }
    
    mobileMenuContent.innerHTML = menuHTML;
}

// Open mobile menu
function openMobileMenu() {
    populateMobileMenu();
    
    if (mobileMenuOverlay) {
        mobileMenuOverlay.classList.add('active');
    }
    if (mobileMenuPanel) {
        mobileMenuPanel.classList.add('active');
    }
    
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.classList.add('active');
    }
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

// Close mobile menu
function closeMobileMenu() {
    if (mobileMenuOverlay) {
        mobileMenuOverlay.classList.remove('active');
    }
    if (mobileMenuPanel) {
        mobileMenuPanel.classList.remove('active');
    }
    
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.classList.remove('active');
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
}

// Toggle mobile menu
function toggleMobileMenu(event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (!mobileMenuPanel || !mobileMenuOverlay) {
        initMobileMenu();
    }
    
    const isOpen = mobileMenuPanel && mobileMenuPanel.classList.contains('active');
    
    if (isOpen) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

// Close menu when clicking outside
document.addEventListener('click', function(event) {
    const menuToggle = event.target.closest('.menu-toggle');
    const mobileMenu = event.target.closest('.mobile-menu-panel');
    const mobileMenuItem = event.target.closest('.mobile-menu-item');
    
    if (mobileMenuPanel && mobileMenuPanel.classList.contains('active')) {
        if (!menuToggle && !mobileMenu && !mobileMenuItem) {
            closeMobileMenu();
        }
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize mobile menu
    if (window.innerWidth <= 768) {
        initMobileMenu();
    }
    
    const pathname = window.location.pathname;
    const isLoginPage = pathname.includes('index.html') || pathname === '/' || pathname.endsWith('/') || pathname === '/index.html';
    
    if (isLoginPage) {
        // Login page
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    } else if (pathname.includes('dashboard.html')) {
        // Dashboard page - admin only
        if (!checkAuth()) return;
        const user = getCurrentUser();
        if (user && user.role !== 'admin') {
            alert('Access denied. Admin only.');
            handleLogout();
            return;
        }
    } else if (pathname.includes('add-customer.html')) {
        // Add customer page - admin only
        if (!checkAuth()) return;
        const user = getCurrentUser();
        if (user && user.role !== 'admin') {
            alert('Access denied. Admin only.');
            handleLogout();
            return;
        }
    } else if (pathname.includes('customer-list.html')) {
        // Customers page - both admin and manager
        if (!checkAuth()) return;
    }
});

// Also try to attach immediately if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded (handled above)
} else {
    // DOM is already loaded
    const pathname = window.location.pathname;
    const isLoginPage = pathname.includes('index.html') || pathname === '/' || pathname.endsWith('/') || pathname === '/index.html';
    
    if (isLoginPage) {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    }
}

