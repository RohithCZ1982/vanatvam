// Admin page functionality
let editingCustomerId = null;

// Initialize admin page
async function initAdminPage() {
    const user = getCurrentUser();
    if (user) {
        document.getElementById('userRole').textContent = `Logged in as: ${user.username} (${user.role})`;
    }

    // Load customers
    await loadCustomers();

    // Form submission
    const customerForm = document.getElementById('customerForm');
    customerForm.addEventListener('submit', handleCustomerSubmit);

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleSearch);
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
        alert('Please fill in all fields');
        return;
    }

    try {
        if (editingCustomerId) {
            // Update existing customer
            await updateCustomer(editingCustomerId, formData);
            alert('Customer updated successfully!');
            editingCustomerId = null;
        } else {
            // Add new customer
            await addCustomer(formData);
            alert('Customer added successfully!');
        }

        resetForm();
        await loadCustomers();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Load customers into table
async function loadCustomers(searchQuery = '') {
    const customers = await getCustomers(searchQuery);
    const tbody = document.getElementById('customersTableBody');
    
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No customers found</td></tr>';
        return;
    }

    tbody.innerHTML = customers.map(customer => `
        <tr>
            <td>${escapeHtml(customer.name)}</td>
            <td>${escapeHtml(customer.mobile)}</td>
            <td>${escapeHtml(customer.plotNumber)}</td>
            <td>${escapeHtml(customer.squareFeet)}</td>
            <td>${escapeHtml(customer.projectName)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-small" onclick="editCustomer('${customer.id}')">Edit</button>
                    <button class="btn btn-danger btn-small" onclick="deleteCustomerConfirm('${customer.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Edit customer
async function editCustomer(id) {
    const customers = await getCustomers();
    const customer = customers.find(c => c.id === id);
    
    if (customer) {
        document.getElementById('name').value = customer.name;
        document.getElementById('mobile').value = customer.mobile;
        document.getElementById('plotNumber').value = customer.plotNumber;
        document.getElementById('squareFeet').value = customer.squareFeet;
        document.getElementById('projectName').value = customer.projectName;
        
        editingCustomerId = id;
        
        // Scroll to form
        document.querySelector('.customer-form').scrollIntoView({ behavior: 'smooth' });
        
        // Change submit button text
        const submitBtn = document.querySelector('#customerForm button[type="submit"]');
        submitBtn.textContent = 'Update Customer';
    }
}

// Delete customer with confirmation
async function deleteCustomerConfirm(id) {
    if (confirm('Are you sure you want to delete this customer?')) {
        try {
            await deleteCustomer(id);
            await loadCustomers();
            alert('Customer deleted successfully!');
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
}

// Reset form
function resetForm() {
    document.getElementById('customerForm').reset();
    editingCustomerId = null;
    const submitBtn = document.querySelector('#customerForm button[type="submit"]');
    submitBtn.textContent = 'Add Customer';
}

// Handle search
async function handleSearch(e) {
    const query = e.target.value.trim();
    await loadCustomers(query);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPage);
} else {
    initAdminPage();
}

