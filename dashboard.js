// Dashboard page functionality for tasks

// Initialize dashboard page
async function initDashboardPage() {
    // Check authentication
    if (!checkAuth()) {
        return;
    }
    
    const user = getCurrentUser();
    if (user) {
        if (user.role !== 'admin') {
            alert('Access denied. Admin only.');
            handleLogout();
            return;
        }
        // Set user info in menu
        const userRoleEl = document.getElementById('userRole');
        if (user && userRoleEl) {
            userRoleEl.textContent = `${user.username} (${user.role})`;
            userRoleEl.style.display = 'inline';
        }
    }

    // Wait for DOM to be fully ready
    const dateFilter = document.getElementById('dateFilter');
    const projectFilter = document.getElementById('projectFilter');
    
    if (!dateFilter || !projectFilter) {
        return;
    }

    // Set today's date as default
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    dateFilter.value = todayStr;
    // Project filter defaults to "Madhuvana" (already set in HTML)

    // Load tasks for today by default with Madhuvana filter
    await loadTasks(todayStr, 'Madhuvana');

    // Date filter change - filter by selected date and project
    dateFilter.addEventListener('change', async (e) => {
        const selectedDate = e.target.value;
        const selectedProject = projectFilter.value;
        if (selectedDate) {
            await loadTasks(selectedDate, selectedProject);
        } else {
            await loadTasks(null, selectedProject);
        }
    });

    // Project filter change - filter by selected project and date
    projectFilter.addEventListener('change', async (e) => {
        const selectedProject = e.target.value;
        const selectedDate = dateFilter.value;
        if (selectedDate) {
            await loadTasks(selectedDate, selectedProject);
        } else {
            await loadTasks(null, selectedProject);
        }
    });
}

// Load tasks - if date is provided, filter by date, otherwise show all
// If project is provided, filter by project name
async function loadTasks(date, project = null) {
    const tasksList = document.getElementById('tasksList');
    
    if (!tasksList) {
        console.error('Tasks list element not found');
        return;
    }
    
    try {
        // Show loading state
        tasksList.innerHTML = '<div class="no-data">Loading tasks...</div>';
        
        console.log('Loading tasks, date filter:', date || 'none (all tasks)', 'project filter:', project || 'all projects');
        const tasks = await getAllTasks(date);
        console.log('Tasks received from API:', tasks);
        console.log('Number of tasks:', tasks ? tasks.length : 0);
        
        // Get customers for filtering and display
        const customers = await getCustomers();
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c;
        });

        // Filter tasks by project if project filter is set
        let filteredTasks = tasks;
        if (project && project !== '') {
            filteredTasks = tasks.filter(task => {
                const customer = customerMap[task.customerId];
                return customer && customer.projectName === project;
            });
        }
        
        console.log('Filtered tasks count:', filteredTasks ? filteredTasks.length : 0);
        
        // Update tasks count
        const tasksCountEl = document.getElementById('tasksCount');
        if (tasksCountEl) {
            if (!filteredTasks || filteredTasks.length === 0) {
                tasksCountEl.textContent = 'Total Tasks: 0';
            } else {
                tasksCountEl.textContent = `Total Tasks: ${filteredTasks.length}`;
            }
        }
        
        if (!filteredTasks || filteredTasks.length === 0) {
            let message = 'No tasks found';
            if (date && project) {
                message = `No tasks found for ${project} on ${date}`;
            } else if (date) {
                message = `No tasks scheduled for ${date}`;
            } else if (project) {
                message = `No tasks found for ${project}`;
            }
            console.log('No tasks to display:', message);
            tasksList.innerHTML = '<div class="no-data">' + message + '</div>';
            return;
        }
        
        // Update tasks count
        if (tasksCountEl) {
            tasksCountEl.textContent = `Total Tasks: ${filteredTasks.length}`;
        }

        console.log('Rendering', filteredTasks.length, 'tasks');
        const tasksHTML = filteredTasks.map(task => {
            console.log('Processing task:', task);
            const customer = customerMap[task.customerId] || { name: 'Unknown Customer', mobile: 'N/A', projectName: 'N/A' };
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
            
            return `
                <div class="task-card" data-task-id="${task.id}">
                    <div class="task-header">
                        <h3>${escapeHtml(task.title || 'Untitled Task')}</h3>
                        <span class="task-date">${formattedDate}</span>
                    </div>
                    <div class="task-body">
                        <div class="task-info-row">
                            <p class="task-customer"><strong>Customer:</strong> ${escapeHtml(customer.name)}</p>
                            <p class="task-mobile"><strong>Mobile:</strong> ${escapeHtml(customer.mobile || 'N/A')}</p>
                        </div>
                        ${customer.projectName ? `<p class="task-project"><strong>Project:</strong> ${escapeHtml(customer.projectName)}</p>` : ''}
                        ${task.description ? `<div class="task-description-wrapper"><p class="task-description"><strong>Description:</strong> ${escapeHtml(task.description)}</p></div>` : ''}
                        <p class="task-status"><strong>Status:</strong> <span class="status-badge status-${task.status || 'pending'}">${escapeHtml(task.status || 'pending')}</span></p>
                    </div>
                    <div class="task-actions">
                        <button class="btn btn-success btn-small" onclick="completeTask('${task.id}')">Mark Completed</button>
                        <button class="btn btn-primary btn-small" onclick="continueTask('${task.id}')">Continue to Next Day</button>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('Setting innerHTML with tasks');
        tasksList.innerHTML = tasksHTML;
        console.log('Tasks displayed successfully');
    } catch (error) {
        console.error('Error loading tasks:', error);
        const errorMsg = error.message || 'Unknown error';
        tasksList.innerHTML = `<div class="no-data">Error loading tasks: ${errorMsg}</div>`;
    }
}

// Complete task
async function completeTask(taskId) {
    if (confirm('Mark this task as completed?')) {
        try {
            await updateTaskStatus(taskId, 'completed');
            const dateFilterEl = document.getElementById('dateFilter');
            const projectFilterEl = document.getElementById('projectFilter');
            const filterDate = dateFilterEl ? dateFilterEl.value || null : null;
            const filterProject = projectFilterEl ? projectFilterEl.value || null : null;
            await loadTasks(filterDate, filterProject);
            alert('Task marked as completed!');
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
}

// Clear date filter and show all tasks
function clearDateFilter() {
    const dateFilterEl = document.getElementById('dateFilter');
    const projectFilterEl = document.getElementById('projectFilter');
    if (dateFilterEl) {
        dateFilterEl.value = '';
    }
    const selectedProject = projectFilterEl ? projectFilterEl.value : null;
    loadTasks(null, selectedProject);
}

// Set date filter to today
function setTodayDate() {
    const dateFilterEl = document.getElementById('dateFilter');
    const projectFilterEl = document.getElementById('projectFilter');
    if (dateFilterEl) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        dateFilterEl.value = todayStr;
        const selectedProject = projectFilterEl ? projectFilterEl.value : null;
        loadTasks(todayStr, selectedProject);
    }
}

// Continue task (move to next day, skip Sunday)
async function continueTask(taskId) {
    try {
        const dateFilterEl = document.getElementById('dateFilter');
        const currentFilterDate = dateFilterEl ? dateFilterEl.value || null : null;
        const tasks = await getAllTasks(currentFilterDate);
        const task = tasks.find(t => t.id === taskId);
        
        if (!task) {
            alert('Task not found');
            return;
        }

        // Calculate next day (skip Sunday)
        const currentDate = new Date(task.taskDate);
        let nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 1);
        
        // Skip Sunday (day 0)
        if (nextDate.getDay() === 0) {
            nextDate.setDate(nextDate.getDate() + 1);
        }
        
        const nextDateStr = nextDate.toISOString().split('T')[0];
        
        // Update task date
        await updateTaskDate(taskId, nextDateStr);
        
        // Reload tasks
        const projectFilterEl = document.getElementById('projectFilter');
        const reloadFilterDate = dateFilterEl ? dateFilterEl.value || null : null;
        const reloadFilterProject = projectFilterEl ? projectFilterEl.value || null : null;
        await loadTasks(reloadFilterDate, reloadFilterProject);
        
        alert(`Task moved to ${nextDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
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
function initializeDashboard() {
    // Ensure all elements exist
    const dateFilter = document.getElementById('dateFilter');
    const projectFilter = document.getElementById('projectFilter');
    const tasksList = document.getElementById('tasksList');
    
    if (!dateFilter || !projectFilter || !tasksList) {
        // Retry after a short delay if elements aren't ready
        setTimeout(initializeDashboard, 100);
        return;
    }
    
    initDashboardPage();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initializeDashboard();
    });
} else {
    // DOM is already loaded, but wait a tiny bit to ensure everything is ready
    setTimeout(initializeDashboard, 50);
}
