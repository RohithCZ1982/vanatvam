// Dashboard page functionality for tasks

// Initialize dashboard page
async function initDashboardPage() {
    // Check authentication
    if (!checkAuth()) {
        return;
    }
    
    const user = getCurrentUser();
    if (user) {
        if (user.role !== 'admin' && user.role !== 'manager') {
            alert('Access denied.');
            handleLogout();
            return;
        }
        setupDashboardNavigation(user);
        const userRoleEl = document.getElementById('userRole');
        if (userRoleEl) {
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
        const allTasks = await getAllTasks(null);
        console.log('Tasks received from API:', allTasks);
        console.log('Number of tasks:', allTasks ? allTasks.length : 0);
        
        // Get customers for filtering and display
        const customers = await getCustomers();
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c;
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Always include overdue tasks regardless of filters
        const overdueTasks = allTasks.filter(task => {
            if ((task.status || 'pending') === 'completed') return false;
            if (!task.taskDate) return false;
            const taskDateObj = new Date(task.taskDate + 'T00:00:00');
            return taskDateObj < today;
        });

        // Apply date filter locally when provided
        let filteredTasks = allTasks.slice();
        if (date) {
            filteredTasks = filteredTasks.filter(task => task.taskDate === date);
        }

        // Filter tasks by project if project filter is set
        if (project && project !== '') {
            const normalizedProject = project.toLowerCase();
            filteredTasks = filteredTasks.filter(task => {
                const customer = task.customerId ? customerMap[task.customerId] : null;
                const taskProjectName = (task.projectName || '').toLowerCase();
                const customerProjectName = customer && customer.projectName ? customer.projectName.toLowerCase() : '';
                return taskProjectName === normalizedProject || customerProjectName === normalizedProject;
            });
        }

        const overdueExtras = overdueTasks.filter(task => !filteredTasks.some(t => t.id === task.id));
        const displayTasks = [...overdueExtras, ...filteredTasks];

        console.log('Rendering', displayTasks.length, 'tasks (filtered:', filteredTasks.length, 'overdue extras:', overdueExtras.length, ')');

        const tasksCountEl = document.getElementById('tasksCount');
        if (tasksCountEl) {
            if (displayTasks.length === 0) {
                tasksCountEl.textContent = 'Tasks: 0';
            } else if (overdueExtras.length > 0) {
                tasksCountEl.textContent = `Tasks: ${filteredTasks.length} filtered, ${overdueExtras.length} overdue (always shown)`;
            } else {
                tasksCountEl.textContent = `Tasks: ${filteredTasks.length}`;
            }
        }

        if (displayTasks.length === 0) {
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

        const tasksHTML = displayTasks.map(task => {
            console.log('Processing task:', task);
            const customer = task.customerId ? customerMap[task.customerId] : null;
            let formattedDate = task.taskDate;
            let overdueBadge = '';
            try {
                const taskDate = new Date(task.taskDate + 'T00:00:00');
                formattedDate = taskDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if ((task.status || 'pending') !== 'completed' && taskDate < today) {
                    const diffMs = today.getTime() - taskDate.getTime();
                    const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
                    overdueBadge = `
                        <span class="task-overdue">
                            Overdue by ${diffDays} day${diffDays === 1 ? '' : 's'} (always shown)
                        </span>
                    `;
                }
            } catch (e) {
                console.error('Error formatting date:', e);
            }
            
            const projectDisplay = task.projectName || (customer && customer.projectName ? customer.projectName : '');
            const isProjectTask = Boolean(task.projectName && !task.customerId);
            const sourceBadge = isProjectTask 
                ? '<span class="task-source task-source-project">Project Task</span>'
                : '<span class="task-source task-source-customer">Customer Task</span>';
            const customerInfoRow = customer ? `
                        <div class="task-info-row">
                            <p class="task-customer"><strong>Customer:</strong> ${escapeHtml(customer.name || 'Unknown Customer')}</p>
                            <p class="task-mobile"><strong>Mobile:</strong> ${escapeHtml(customer.mobile || 'N/A')}</p>
                        </div>` : '';
            const projectInfo = projectDisplay ? `<p class="task-project"><strong>Project:</strong> ${escapeHtml(projectDisplay)}</p>` : '';

            const actionButtons = `
                        <div class="task-header-actions">
                            <button class="icon-btn icon-btn-success" title="Mark Completed" onclick="completeTask('${task.id}')">✓</button>
                            <button class="icon-btn icon-btn-primary" title="Continue to Next Day" onclick="continueTask('${task.id}')">↷</button>
                            ${isProjectTask ? `<button class="icon-btn icon-btn-danger" title="Delete Task" onclick="deleteProjectTask('${task.id}')">✕</button>` : ''}
                        </div>`;

            return `
                <div class="task-card" data-task-id="${task.id}">
                    <div class="task-header">
                        <div class="task-title-row">
                            <h3>${escapeHtml(task.title || 'Untitled Task')}</h3>
                            ${sourceBadge}
                        </div>
                        <div class="task-subheader">
                            <span class="task-date">${formattedDate}</span>
                            ${actionButtons}
                        </div>
                    </div>
                    <div class="task-body">
                        ${customerInfoRow}
                        ${projectInfo}
                        ${task.description ? `
                            <div class="task-description-wrapper" data-task-id="${task.id}">
                                <p class="task-description">
                                    <strong>Description:</strong>
                                    <span class="task-description-text">${escapeHtml(task.description)}</span>
                                    <button class="task-description-more" style="display: none;" onclick="showTaskDescriptionModal('${task.id}', '${escapeHtml(task.description).replace(/'/g, "\\'")}'); event.stopPropagation();" title="View full description">...</button>
                                </p>
                            </div>
                        ` : ''}
                        <p class="task-status"><strong>Status:</strong> <span class="status-badge status-${task.status || 'pending'}">${escapeHtml(task.status || 'pending')}</span></p>
                        ${overdueBadge}
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('Setting innerHTML with tasks');
        tasksList.innerHTML = tasksHTML;
        
        // Check which descriptions are truncated and show "..." button only for those
        setTimeout(() => {
            const descriptionWrappers = tasksList.querySelectorAll('.task-description-wrapper');
            descriptionWrappers.forEach(wrapper => {
                const textElement = wrapper.querySelector('.task-description-text');
                const moreButton = wrapper.querySelector('.task-description-more');
                if (textElement && moreButton) {
                    // Check if text is truncated (scrollHeight > clientHeight)
                    if (textElement.scrollHeight > textElement.clientHeight) {
                        moreButton.style.display = 'block';
                    }
                }
            });
        }, 100);
        
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

async function deleteProjectTask(taskId) {
    if (!taskId) return;
    if (!confirm('Delete this project task? This cannot be undone.')) {
        return;
    }
    try {
        await deleteTask(taskId);
        const dateFilterEl = document.getElementById('dateFilter');
        const projectFilterEl = document.getElementById('projectFilter');
        const filterDate = dateFilterEl ? dateFilterEl.value || null : null;
        const filterProject = projectFilterEl ? projectFilterEl.value || null : null;
        await loadTasks(filterDate, filterProject);
        alert('Task deleted.');
    } catch (error) {
        alert('Error deleting task: ' + error.message);
    }
}

// Show task description modal
function showTaskDescriptionModal(taskId, descriptionText) {
    let modal = document.getElementById('taskDescriptionModal');
    if (!modal) {
        const modalHTML = `
            <div id="taskDescriptionModal" class="modal" onclick="closeTaskDescriptionModal(event)">
                <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2>Task Description</h2>
                        <span class="close" onclick="closeTaskDescriptionModal(event)">&times;</span>
                    </div>
                    <div class="modal-body">
                        <p id="taskDescriptionModalText" style="white-space: pre-wrap; word-wrap: break-word; line-height: 1.6;"></p>
                    </div>
                    <div class="form-actions" style="margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="closeTaskDescriptionModal(event)">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        modal = document.getElementById('taskDescriptionModal');
        if (modal) {
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    closeTaskDescriptionModal(e);
                }
            });
        }
    }
    
    const modalText = document.getElementById('taskDescriptionModalText');
    if (modalText) {
        modalText.textContent = descriptionText;
    }
    
    if (modal) {
        modal.style.display = 'flex';
        modal.focus();
    }
}

// Close task description modal
function closeTaskDescriptionModal(event) {
    if (event) {
        event.stopPropagation();
    }
    const modal = document.getElementById('taskDescriptionModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setupDashboardNavigation(user) {
    const navMenu = document.getElementById('navMenu');
    if (!navMenu || !user) return;

    let links = '';
    if (user.role === 'admin') {
        links = `
            <a href="dashboard.html" class="nav-link active">Dashboard</a>
            <a href="tasks.html" class="nav-link">Tasks</a>
            <a href="calendar.html" class="nav-link">Calendar</a>
            <a href="customer-list.html" class="nav-link">Customers</a>
            <a href="add-customer.html" class="nav-link">Add Customer</a>
        `;
    } else {
        links = `
            <a href="dashboard.html" class="nav-link active">Dashboard</a>
            <a href="customer-list.html" class="nav-link">Customers</a>
            <a href="calendar.html" class="nav-link">Calendar</a>
        `;
    }

    navMenu.innerHTML = `
        ${links}
        <span id="userRole" class="nav-user-info"></span>
        <a href="#" class="nav-link nav-link-logout" onclick="handleLogout(); return false;">Logout</a>
    `;
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
