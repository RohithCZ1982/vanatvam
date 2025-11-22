// Customers page functionality
let isAdmin = false;

// Initialize Customers page
async function initCustomerListPage() {
    // Check authentication
    if (!checkAuth()) return;
    
    const user = getCurrentUser();
    if (user) {
        isAdmin = user.role === 'admin';
        
        // Setup navigation menu based on role
        setupNavigation(user.role);
        
        // Show/hide actions column for admin
        if (isAdmin) {
            document.getElementById('actionsHeader').style.display = 'table-cell';
        }
    }

    // Load customers
    await loadCustomers();

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleSearch);
    
    // Create task modal on page load (if admin)
    if (isAdmin) {
        createTaskModal();
    }
}

// Setup navigation menu
function setupNavigation(role) {
    const navMenu = document.getElementById('navMenu');
    const user = getCurrentUser();
    
    let menuHTML = '';
    
    if (role === 'admin') {
        menuHTML = `
            <a href="dashboard.html" class="nav-link">Dashboard</a>
            <a href="calendar.html" class="nav-link">Calendar</a>
            <a href="customer-list.html" class="nav-link active">Customers</a>
            <a href="add-customer.html" class="nav-link">Add Customer</a>
        `;
    } else {
        // Manager only sees Customers
        menuHTML = `
            <a href="customer-list.html" class="nav-link active">Customers</a>
            <a href="calendar.html" class="nav-link">Calendar</a>
        `;
    }
    
    // Add user info and logout to menu for all users
    if (user) {
        menuHTML += `
            <span class="nav-user-info">${user.username} (${user.role})</span>
            <a href="#" class="nav-link nav-link-logout" onclick="handleLogout(); return false;">Logout</a>
        `;
    }
    
    navMenu.innerHTML = menuHTML;
}

// Load customers into table
async function loadCustomers(searchQuery = '') {
    const customers = await getCustomers(searchQuery);
    const tbody = document.getElementById('customersTableBody');
    
    if (customers.length === 0) {
        const colspan = isAdmin ? 7 : 6;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="no-data">No customers found</td></tr>`;
        return;
    }

    // Get all tasks to count per customer (including completed)
    let allTasks = [];
    try {
        const allTasksResponse = await fetch(`${API_BASE_URL}/tasks?include_completed=true`);
        if (allTasksResponse.ok) {
            const tasks = await allTasksResponse.json();
            allTasks = Array.isArray(tasks) ? tasks : [];
        }
    } catch (error) {
        console.error('Error fetching tasks for counts:', error);
        allTasks = [];
    }
    
    tbody.innerHTML = customers.map(customer => {
        // Count tasks for this customer
        const customerTasks = allTasks.filter(task => task.customerId === customer.id);
        const pendingTasks = customerTasks.filter(task => task.status !== 'completed');
        const completedTasks = customerTasks.filter(task => task.status === 'completed');
        const totalTasks = customerTasks.length;
        
        const tasksCell = `
            <td>
                <div class="task-counts">
                    <span class="task-count total">Total: ${totalTasks}</span>
                    <span class="task-count pending">Pending: ${pendingTasks.length}</span>
                    <span class="task-count completed">Completed: ${completedTasks.length}</span>
                </div>
            </td>
        `;
        
        let actionsCell = '';
        if (isAdmin) {
            actionsCell = `
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-small" onclick="editCustomer('${customer.id}')">Edit</button>
                        <button class="btn btn-success btn-small" onclick="openTaskModal('${customer.id}', '${escapeHtml(customer.name)}')">CreateTask</button>
                        <button class="btn btn-info btn-small" onclick="showCustomerTasks('${customer.id}', '${escapeHtml(customer.name)}')">Show Tasks</button>
                        <button class="btn btn-warning btn-small" onclick="openBookingModal('${customer.id}', '${escapeHtml(customer.name)}', '${escapeHtml(customer.projectName)}')">Booking</button>
                        <button class="btn btn-danger btn-small" onclick="deleteCustomerConfirm('${customer.id}')">Delete</button>
                    </div>
                </td>
            `;
        }
        
        return `
            <tr>
                <td>${escapeHtml(customer.name)}</td>
                <td>${escapeHtml(customer.mobile)}</td>
                <td>${escapeHtml(customer.plotNumber)}</td>
                <td>${escapeHtml(customer.squareFeet)}</td>
                <td>${escapeHtml(customer.projectName)}</td>
                ${tasksCell}
                ${actionsCell}
            </tr>
        `;
    }).join('');
}

// Edit customer (admin only)
async function editCustomer(id) {
    if (!isAdmin) return;
    
    const customers = await getCustomers();
    const customer = customers.find(c => c.id === id);
    
    if (customer) {
        // Redirect to add-customer page with edit mode
        sessionStorage.setItem('editingCustomer', JSON.stringify(customer));
        window.location.href = 'add-customer.html';
    }
}

// Delete customer with confirmation (admin only)
async function deleteCustomerConfirm(id) {
    if (!isAdmin) return;
    
    // Get customer name and task count for warning message
    const customers = await getCustomers();
    const customer = customers.find(c => c.id === id);
    const customerName = customer ? customer.name : 'this customer';
    
    // Get tasks for this customer
    let taskCount = 0;
    try {
        const tasks = await getCustomerTasks(id);
        taskCount = tasks ? tasks.length : 0;
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
    
    // Build warning message
    let warningMessage = `Are you sure you want to delete ${customerName}?`;
    if (taskCount > 0) {
        warningMessage += `\n\nWARNING: This will also delete ${taskCount} related task(s) associated with this customer.`;
        warningMessage += `\n\nThis action cannot be undone.`;
    } else {
        warningMessage += `\n\nThis action cannot be undone.`;
    }
    
    if (confirm(warningMessage)) {
        try {
            await deleteCustomer(id);
            await loadCustomers();
            if (taskCount > 0) {
                alert(`Customer and ${taskCount} related task(s) deleted successfully!`);
            } else {
                alert('Customer deleted successfully!');
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
}

// Handle search
async function handleSearch(e) {
    const query = e.target.value.trim();
    await loadCustomers(query);
}

// Open task scheduling modal
function openTaskModal(customerId, customerName) {
    const modal = document.getElementById('taskModal');
    if (!modal) {
        // Create modal if it doesn't exist
        createTaskModal();
    }
    
    document.getElementById('taskCustomerId').value = customerId;
    document.getElementById('taskCustomerName').textContent = customerName;
    document.getElementById('taskModal').style.display = 'flex';
}

// Close task modal
function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
    document.getElementById('taskForm').reset();
}

// Create task modal HTML
function createTaskModal() {
    const modalHTML = `
        <div id="taskModal" class="modal" style="display: none;" onclick="handleModalClick(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>Schedule Task</h2>
                    <span class="close" onclick="closeTaskModal()">&times;</span>
                </div>
                <form id="taskForm">
                    <input type="hidden" id="taskCustomerId">
                    <div class="form-group">
                        <label>Customer: <span id="taskCustomerName"></span></label>
                    </div>
                    <div class="form-group">
                        <label for="taskTitle">Task Title *</label>
                        <input type="text" id="taskTitle" name="taskTitle" required>
                    </div>
                    <div class="form-group">
                        <label for="taskDescription">Task Description</label>
                        <textarea id="taskDescription" name="taskDescription" rows="4"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="taskDate">Task Date *</label>
                        <input type="date" id="taskDate" name="taskDate" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeTaskModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Schedule Task</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add form submit handler
    document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('taskDate').value = today;
}

// Handle modal click (close when clicking outside)
function handleModalClick(event) {
    if (event.target.id === 'taskModal') {
        closeTaskModal();
    }
}

// Handle task form submission
async function handleTaskSubmit(e) {
    e.preventDefault();
    
    const taskData = {
        customerId: document.getElementById('taskCustomerId').value,
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        taskDate: document.getElementById('taskDate').value
    };
    
    if (!taskData.title || !taskData.taskDate) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        await addTask(taskData);
        alert('Task scheduled successfully!');
        closeTaskModal();
        
        // Reload Customers to update task counts
        const searchInput = document.getElementById('searchInput');
        const searchQuery = searchInput ? searchInput.value.trim() : '';
        await loadCustomers(searchQuery);
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Show all tasks for a customer (including completed)
async function showCustomerTasks(customerId, customerName) {
    try {
        // Get all tasks for this customer including completed ones
        const customerTasks = await getCustomerTasks(customerId);
        
        // Create or update tasks modal
        createCustomerTasksModal(customerName, customerTasks);
    } catch (error) {
        console.error('Error loading customer tasks:', error);
        alert('Error loading tasks: ' + error.message);
    }
}

// Helper function to render a task item
function renderTaskItem(task) {
        let formattedDate = task.taskDate;
        try {
            const taskDate = new Date(task.taskDate + 'T00:00:00');
            formattedDate = taskDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        } catch (e) {
            console.error('Error formatting date:', e);
        }
        
        const statusClass = task.status === 'completed' ? 'status-completed' : 'status-pending';
        const statusText = task.status || 'pending';
        const itemClass = task.status === 'completed' ? 'customer-task-item completed' : 'customer-task-item';
        
        return `
            <div class="${itemClass}">
                <div class="customer-task-header">
                    <h4>${escapeHtml(task.title || 'Untitled Task')}</h4>
                    <span class="status-badge ${statusClass}">${escapeHtml(statusText)}</span>
                </div>
                <div class="customer-task-body">
                    <p><strong>Date:</strong> ${formattedDate}</p>
                    ${task.description ? `<p><strong>Description:</strong> ${escapeHtml(task.description)}</p>` : ''}
                </div>
            </div>
        `;
}

// Create modal to display customer tasks
function createCustomerTasksModal(customerName, tasks) {
    // Remove existing modal if any
    const existingModal = document.getElementById('customerTasksModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Separate pending and completed tasks
    const pendingTasks = tasks.filter(task => task.status !== 'completed');
    const completedTasks = tasks.filter(task => task.status === 'completed');
    
    let tasksHTML = '';
    if (!tasks || tasks.length === 0) {
        tasksHTML = '<div class="no-data">No tasks found for this customer</div>';
    } else {
        // Render pending tasks first
        if (pendingTasks.length > 0) {
            tasksHTML += '<div class="tasks-section"><h3>Pending Tasks (' + pendingTasks.length + ')</h3>';
            tasksHTML += pendingTasks.map(task => renderTaskItem(task)).join('');
            tasksHTML += '</div>';
        }
        
        // Then render completed tasks
        if (completedTasks.length > 0) {
            tasksHTML += '<div class="tasks-section"><h3>Completed Tasks (' + completedTasks.length + ')</h3>';
            tasksHTML += completedTasks.map(task => renderTaskItem(task)).join('');
            tasksHTML += '</div>';
        }
    }
    
    const modalHTML = `
        <div id="customerTasksModal" class="modal" style="display: flex;" onclick="closeCustomerTasksModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>Tasks for Customer: ${escapeHtml(customerName)}</h2>
                    <span class="close" onclick="closeCustomerTasksModal(event)">&times;</span>
                </div>
                <div class="customer-tasks-list">
                    ${tasksHTML}
                </div>
                <div class="form-actions" style="margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="closeCustomerTasksModal(event)">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Close customer tasks modal
function closeCustomerTasksModal(event) {
    event.stopPropagation();
    const modal = document.getElementById('customerTasksModal');
    if (modal) {
        modal.style.display = 'none';
        setTimeout(() => modal.remove(), 300);
    }
}

// Open booking modal
function openBookingModal(customerId, customerName, projectName) {
    // Remove existing booking modal if any
    const existingModal = document.getElementById('bookingModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div id="bookingModal" class="modal" onclick="handleModalClick(event)">
            <div class="modal-content">
                <span class="close" onclick="closeBookingModal()">&times;</span>
                <h2>Book Room</h2>
                <form id="bookingForm">
                    <input type="hidden" id="bookingCustomerId" value="${customerId}">
                    <div class="form-group">
                        <label>Customer Name:</label>
                        <input type="text" value="${escapeHtml(customerName)}" readonly class="readonly-input">
                    </div>
                    <div class="form-group">
                        <label>Project Name:</label>
                        <input type="text" value="${escapeHtml(projectName)}" readonly class="readonly-input">
                    </div>
                    <div class="form-group">
                        <label for="bookingDateFrom">Date From *</label>
                        <input type="date" id="bookingDateFrom" name="bookingDateFrom" required>
                    </div>
                    <div class="form-group">
                        <label for="bookingDateTo">Date To *</label>
                        <input type="date" id="bookingDateTo" name="bookingDateTo" required>
                    </div>
                    <div class="form-group">
                        <label for="bookingRooms">Number of Rooms *</label>
                        <input type="number" id="bookingRooms" name="bookingRooms" min="1" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeBookingModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Book Room</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add form submit handler
    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
    
    // Show modal
    document.getElementById('bookingModal').style.display = 'block';
}

// Close booking modal
function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) {
        modal.style.display = 'none';
        modal.remove();
    }
}

// Handle booking form submission
async function handleBookingSubmit(e) {
    e.preventDefault();
    
    const bookingData = {
        customerId: document.getElementById('bookingCustomerId').value,
        dateFrom: document.getElementById('bookingDateFrom').value,
        dateTo: document.getElementById('bookingDateTo').value,
        numberOfRooms: parseInt(document.getElementById('bookingRooms').value)
    };
    
    if (!bookingData.dateFrom || !bookingData.dateTo || !bookingData.numberOfRooms) {
        alert('Please fill in all required fields');
        return;
    }
    
    if (new Date(bookingData.dateFrom) > new Date(bookingData.dateTo)) {
        alert('Date From cannot be after Date To');
        return;
    }
    
    try {
        await addBooking(bookingData);
        alert('Room booked successfully!');
        closeBookingModal();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomerListPage);
} else {
    initCustomerListPage();
}

