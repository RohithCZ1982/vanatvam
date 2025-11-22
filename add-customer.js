// Add customer page functionality
let editingCustomerId = null;

// Initialize add customer page
async function initAddCustomerPage() {
    // Check authentication and role
    if (!checkAuth()) return;
    
    const user = getCurrentUser();
    if (user && user.role !== 'admin') {
        alert('Access denied. Admin only.');
        handleLogout();
        return;
    }

    // User info will be shown in menu
    const userRoleEl = document.getElementById('userRole');
    if (user && userRoleEl) {
        userRoleEl.textContent = `${user.username} (${user.role})`;
    }

    // Check if editing a customer
    const editingCustomer = sessionStorage.getItem('editingCustomer');
    if (editingCustomer) {
        const customer = JSON.parse(editingCustomer);
        populateFormForEdit(customer);
        sessionStorage.removeItem('editingCustomer');
    }

    // Form submission
    const customerForm = document.getElementById('customerForm');
    customerForm.addEventListener('submit', handleCustomerSubmit);
}

// Populate form for editing
function populateFormForEdit(customer) {
    document.getElementById('name').value = customer.name || '';
    document.getElementById('mobile').value = customer.mobile || '';
    document.getElementById('plotNumber').value = customer.plotNumber || '';
    document.getElementById('squareFeet').value = customer.squareFeet || '';
    document.getElementById('projectName').value = customer.projectName || '';
    
    editingCustomerId = customer.id;
    
    const submitBtn = document.querySelector('#customerForm button[type="submit"]');
    submitBtn.textContent = 'Update Customer';
    
    // Update page title
    document.querySelector('.customer-form h2').textContent = 'Edit Customer';
}

// Handle customer form submission
async function handleCustomerSubmit(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('name').value.trim(),
        mobile: document.getElementById('mobile').value.trim(),
        plotNumber: document.getElementById('plotNumber').value.trim(),
        squareFeet: document.getElementById('squareFeet').value.trim(),
        projectName: document.getElementById('projectName').value.trim()
    };

    // Validation
    if (!formData.name || !formData.mobile || !formData.plotNumber || !formData.squareFeet || !formData.projectName) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    try {
        if (editingCustomerId) {
            // Update existing customer
            await updateCustomer(editingCustomerId, formData);
            showMessage('Customer updated successfully!', 'success');
            editingCustomerId = null;
            resetForm();
            // Redirect to Customers after update
            setTimeout(() => {
                window.location.href = 'customer-list.html';
            }, 1500);
        } else {
            // Add new customer
            await addCustomer(formData);
            showMessage('Customer added successfully!', 'success');
            resetForm();
        }
    } catch (error) {
        showMessage('Error: ' + error.message, 'error');
    }
}

// Reset form
function resetForm() {
    document.getElementById('customerForm').reset();
    editingCustomerId = null;
    const submitBtn = document.querySelector('#customerForm button[type="submit"]');
    submitBtn.textContent = 'Add Customer';
    hideMessage();
}

// Show success/error message
function showMessage(message, type) {
    const messageDiv = document.getElementById('successMessage');
    messageDiv.textContent = message;
    messageDiv.className = `success-message ${type}`;
    messageDiv.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            hideMessage();
        }, 3000);
    }
}

function hideMessage() {
    const messageDiv = document.getElementById('successMessage');
    messageDiv.style.display = 'none';
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAddCustomerPage);
} else {
    initAddCustomerPage();
}

