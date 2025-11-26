// Tasks management page for admins
const PROJECT_OPTIONS = ['Madhuvana', 'Shukavana', 'Saptavana', 'Anantavana', 'Brindavana'];

const SCHEDULE_TYPES = {
    none: { label: 'One-time task', type: 'none' },
    weekly: { label: 'Every week', type: 'days', value: 7 },
    biweekly: { label: 'Every 2 weeks', type: 'days', value: 14 },
    triweekly: { label: 'Every 3 weeks', type: 'days', value: 21 },
    monthly: { label: 'Monthly once', type: 'months', value: 1 },
    quarterly: { label: 'Quarterly once', type: 'months', value: 3 },
    half_yearly: { label: 'Half-yearly once', type: 'months', value: 6 },
    yearly: { label: 'Yearly once', type: 'months', value: 12 }
};

async function initTasksPage() {
    if (!checkAuth()) return;

    const user = getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        alert('Access denied.');
        window.location.href = 'dashboard.html';
        return;
    }

    setupTasksNavigation(user);

    const userRoleEl = document.getElementById('userRole');
    if (userRoleEl) {
        userRoleEl.textContent = `${user.username} (${user.role})`;
        userRoleEl.style.display = 'inline';
    }

    populateProjectSelects();
    setDefaultTaskDate();
    setDefaultFilters();
    wireTaskPageEvents();
    await loadProjectTasksTable();
}

function populateProjectSelects() {
    const projectSelect = document.getElementById('projectNameSelect');
    if (projectSelect) {
        projectSelect.innerHTML = '<option value="">Select Project</option>' + PROJECT_OPTIONS.map(project => `<option value="${project}">${project}</option>`).join('');
    }
}

function setDefaultTaskDate() {
    const dateInput = document.getElementById('taskDateInput');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
}

function setDefaultFilters() {
    const today = new Date();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentYear = String(today.getFullYear());

    const monthFilter = document.getElementById('tasksMonthFilter');
    const yearFilter = document.getElementById('tasksYearFilter');

    if (monthFilter) {
        monthFilter.value = currentMonth;
    }

    if (yearFilter) {
        yearFilter.value = currentYear;
    }
}

function wireTaskPageEvents() {
    const taskForm = document.getElementById('projectTaskForm');
    const scheduleSelect = document.getElementById('scheduleTypeSelect');
    const occurrencesInput = document.getElementById('occurrenceCountInput');
    const clearTaskFormBtn = document.getElementById('clearTaskForm');
    const searchInput = document.getElementById('tasksSearchInput');

    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskFormSubmit);
    }

    if (scheduleSelect && occurrencesInput) {
        scheduleSelect.addEventListener('change', () => handleScheduleToggle(scheduleSelect.value, occurrencesInput));
        handleScheduleToggle(scheduleSelect.value, occurrencesInput);
    }

    if (clearTaskFormBtn && taskForm) {
        clearTaskFormBtn.addEventListener('click', () => {
            taskForm.reset();
            setDefaultTaskDate();
            if (scheduleSelect && occurrencesInput) {
                handleScheduleToggle(scheduleSelect.value, occurrencesInput);
            }
            const statusEl = document.getElementById('taskFormStatus');
            if (statusEl) {
                statusEl.textContent = '';
                statusEl.className = 'form-status';
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderProjectTasksTable();
        });
    }

    const projectFilter = document.getElementById('tasksProjectFilter');
    const monthFilter = document.getElementById('tasksMonthFilter');
    const yearFilter = document.getElementById('tasksYearFilter');

    if (projectFilter) {
        projectFilter.addEventListener('change', () => {
            renderProjectTasksTable();
        });
    }

    if (monthFilter) {
        monthFilter.addEventListener('change', () => {
            renderProjectTasksTable();
        });
    }

    if (yearFilter) {
        yearFilter.addEventListener('change', () => {
            renderProjectTasksTable();
        });
    }
}

function handleScheduleToggle(scheduleValue, occurrencesInput) {
    if (!occurrencesInput) return;
    if (scheduleValue === 'none') {
        occurrencesInput.value = 1;
        occurrencesInput.disabled = true;
    } else {
        if (occurrencesInput.value === '1') {
            occurrencesInput.value = 6;
        }
        occurrencesInput.disabled = false;
    }
}

async function handleTaskFormSubmit(event) {
    event.preventDefault();
    const title = document.getElementById('taskTitleInput').value.trim();
    const projectName = document.getElementById('projectNameSelect').value;
    const startDate = document.getElementById('taskDateInput').value;
    const description = document.getElementById('taskDescriptionInput').value.trim();
    const scheduleType = document.getElementById('scheduleTypeSelect').value;
    const occurrencesInput = document.getElementById('occurrenceCountInput');
    const statusEl = document.getElementById('taskFormStatus');

    if (!title || !projectName || !startDate) {
        showFormStatus('Please complete all required fields.', 'error');
        return;
    }

    const rawOccurrences = occurrencesInput ? occurrencesInput.value : '1';
    const totalOccurrences = scheduleType === 'none'
        ? 1
        : Math.max(1, Math.min(24, parseInt(rawOccurrences, 10) || 1));

    const scheduleGroupId = scheduleType === 'none' ? null : `sch_${Date.now()}`;
    const creationResults = [];

    try {
        for (let index = 0; index < totalOccurrences; index++) {
            const taskDate = calculateRecurringDate(startDate, scheduleType, index);
            const payload = {
                title,
                description,
                taskDate,
                projectName
            };

            if (scheduleType !== 'none') {
                payload.scheduleType = scheduleType;
                payload.scheduleIteration = index + 1;
                payload.scheduleTotalIterations = totalOccurrences;
                payload.scheduleGroupId = scheduleGroupId;
                payload.autoScheduled = true;
            }

            const createdTask = await addTask(payload);
            creationResults.push(createdTask);
        }

        showFormStatus(`Created ${creationResults.length} task(s) successfully.`, 'success');
        event.target.reset();
        setDefaultTaskDate();
        if (occurrencesInput) {
            handleScheduleToggle(scheduleType, occurrencesInput);
        }
        await loadProjectTasksTable();
    } catch (error) {
        console.error('Error creating tasks:', error);
        showFormStatus(error.message || 'Failed to create tasks.', 'error');
    }
}

function showFormStatus(message, type) {
    const statusEl = document.getElementById('taskFormStatus');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `form-status ${type}`;
}


function formatTaskDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(date.getTime())) {
        return escapeHtml(dateStr);
    }
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function calculateRecurringDate(startDate, scheduleType, occurrenceIndex) {
    const baseDate = new Date(startDate + 'T00:00:00');
    if (Number.isNaN(baseDate.getTime())) {
        return startDate;
    }

    if (!scheduleType || scheduleType === 'none' || occurrenceIndex === 0) {
        return baseDate.toISOString().split('T')[0];
    }

    const rule = SCHEDULE_TYPES[scheduleType];
    if (!rule) {
        return baseDate.toISOString().split('T')[0];
    }

    let nextDate = new Date(baseDate);
    if (rule.type === 'days') {
        nextDate.setDate(nextDate.getDate() + (rule.value * occurrenceIndex));
    } else if (rule.type === 'months') {
        nextDate = addMonths(nextDate, rule.value * occurrenceIndex);
    }

    return nextDate.toISOString().split('T')[0];
}

function addMonths(date, months) {
    const target = new Date(date);
    const day = target.getDate();
    target.setDate(1);
    target.setMonth(target.getMonth() + months);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(day, lastDay));
    return target;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

let allProjectTasksCache = [];
let filteredProjectTasksCache = [];

async function loadProjectTasksTable() {
    try {
        const allTasks = await getAllTasks(null, null, true);
        allProjectTasksCache = (allTasks || []).filter(task => 
            task.projectName && !task.customerId
        );
        populateFilters();
        renderProjectTasksTable();
    } catch (error) {
        console.error('Error loading project tasks:', error);
        const tbody = document.getElementById('projectTasksTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">Error loading tasks: ' + escapeHtml(error.message) + '</td></tr>';
        }
    }
}

function populateFilters() {
    const projectFilter = document.getElementById('tasksProjectFilter');
    const yearFilter = document.getElementById('tasksYearFilter');
    
    if (projectFilter) {
        const existingProjects = [...new Set(allProjectTasksCache.map(t => t.projectName).filter(Boolean))].sort();
        const currentValue = projectFilter.value;
        projectFilter.innerHTML = '<option value="">All Projects</option>' + 
            existingProjects.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
        if (currentValue) {
            projectFilter.value = currentValue;
        }
    }
    
    if (yearFilter) {
        const years = [...new Set(allProjectTasksCache.map(t => {
            if (!t.taskDate) return null;
            return t.taskDate.split('-')[0];
        }).filter(Boolean))].sort((a, b) => b - a);
        const currentValue = yearFilter.value;
        yearFilter.innerHTML = '<option value="">All Years</option>' + 
            years.map(y => `<option value="${y}">${y}</option>`).join('');
        if (currentValue) {
            yearFilter.value = currentValue;
        } else {
            const currentYear = String(new Date().getFullYear());
            if (years.includes(currentYear)) {
                yearFilter.value = currentYear;
            }
        }
    }
}

function renderProjectTasksTable() {
    const tbody = document.getElementById('projectTasksTableBody');
    if (!tbody) return;

    const searchQuery = (document.getElementById('tasksSearchInput')?.value || '').trim().toLowerCase();
    const projectFilter = document.getElementById('tasksProjectFilter')?.value || '';
    const monthFilter = document.getElementById('tasksMonthFilter')?.value || '';
    const yearFilter = document.getElementById('tasksYearFilter')?.value || '';
    
    let filteredTasks = allProjectTasksCache.slice();
    
    if (projectFilter) {
        filteredTasks = filteredTasks.filter(task => 
            (task.projectName || '').toLowerCase() === projectFilter.toLowerCase()
        );
    }

    if (monthFilter || yearFilter) {
        filteredTasks = filteredTasks.filter(task => {
            if (!task.taskDate) return false;
            const [year, month] = task.taskDate.split('-');
            if (monthFilter && month !== monthFilter) return false;
            if (yearFilter && year !== yearFilter) return false;
            return true;
        });
    }
    
    if (searchQuery) {
        filteredTasks = filteredTasks.filter(task => {
            const titleMatch = (task.title || '').toLowerCase().includes(searchQuery);
            const descMatch = (task.description || '').toLowerCase().includes(searchQuery);
            return titleMatch || descMatch;
        });
    }

    filteredProjectTasksCache = filteredTasks.slice();

    filteredTasks.sort((a, b) => {
        const dateA = new Date((a.taskDate || '') + 'T00:00:00');
        const dateB = new Date((b.taskDate || '') + 'T00:00:00');
        return dateB - dateA;
    });

    if (filteredTasks.length === 0) {
        const filterText = [];
        if (projectFilter) filterText.push('project');
        if (monthFilter || yearFilter) filterText.push('date');
        if (searchQuery) filterText.push('search');
        const filterMsg = filterText.length > 0 ? ' matching your ' + filterText.join(' and ') + ' filter(s)' : '';
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No project tasks found' + filterMsg + '.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredTasks.map(task => {
        const projectLabel = escapeHtml(task.projectName || '—');
        const formattedDate = formatTaskDate(task.taskDate);
        const scheduleLabel = getScheduleDisplay(task);
        const statusValue = task.status || 'pending';
        const statusClass = `status-${statusValue}`;
        const taskDescription = task.description ? `<p class="task-table-description">${escapeHtml(task.description)}</p>` : '';

        return `
            <tr>
                <td>${projectLabel}</td>
                <td>
                    <div class="task-table-title">
                        <strong>${escapeHtml(task.title || 'Untitled Task')}</strong>
                        ${taskDescription}
                    </div>
                </td>
                <td>${formattedDate}</td>
                <td>${scheduleLabel}</td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(statusValue)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn icon-btn-primary" title="Edit Task" onclick="editProjectTask('${task.id}')">✎</button>
                        <button class="icon-btn icon-btn-danger" title="Delete Task" onclick="deleteProjectTask('${task.id}')">✕</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getScheduleDisplay(task) {
    const scheduleType = task.scheduleType || 'none';
    const scheduleMeta = SCHEDULE_TYPES[scheduleType];
    if (!scheduleMeta || scheduleType === 'none') {
        return 'One-time';
    }
    let label = scheduleMeta.label;
    if (task.scheduleIteration && task.scheduleTotalIterations) {
        label += ` (${task.scheduleIteration}/${task.scheduleTotalIterations})`;
    }
    return label;
}

async function editProjectTask(taskId) {
    const task = allProjectTasksCache.find(t => t.id === taskId);
    if (!task) {
        alert('Task not found');
        return;
    }

    document.getElementById('taskTitleInput').value = task.title || '';
    document.getElementById('projectNameSelect').value = task.projectName || '';
    document.getElementById('taskDateInput').value = task.taskDate || '';
    document.getElementById('taskDescriptionInput').value = task.description || '';
    document.getElementById('scheduleTypeSelect').value = task.scheduleType || 'none';
    
    const occurrencesInput = document.getElementById('occurrenceCountInput');
    if (occurrencesInput) {
        occurrencesInput.value = task.scheduleTotalIterations || 1;
        handleScheduleToggle(task.scheduleType || 'none', occurrencesInput);
    }

    document.getElementById('projectTaskForm').scrollIntoView({ behavior: 'smooth' });
    showFormStatus('Task loaded for editing. Update and save to create a new task.', 'success');
}

async function deleteProjectTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        await deleteTask(taskId);
        await loadProjectTasksTable();
        showFormStatus('Task deleted successfully.', 'success');
    } catch (error) {
        console.error('Error deleting task:', error);
        alert('Error: ' + error.message);
    }
}

async function deleteAllProjectTasks() {
    const tasksToDelete = filteredProjectTasksCache.length > 0 ? filteredProjectTasksCache : allProjectTasksCache;
    
    if (tasksToDelete.length === 0) {
        alert('No tasks to delete.');
        return;
    }

    const filterActive = filteredProjectTasksCache.length !== allProjectTasksCache.length;
    const firstConfirmMsg = filterActive 
        ? `WARNING: You are about to delete ${tasksToDelete.length} filtered task(s).\n\nThis action cannot be undone. Are you sure you want to proceed?`
        : `WARNING: You are about to delete all ${tasksToDelete.length} project task(s).\n\nThis action cannot be undone. Are you sure you want to proceed?`;

    if (!confirm(firstConfirmMsg)) {
        return;
    }

    const secondConfirmMsg = filterActive
        ? `FINAL WARNING: This will permanently delete ${tasksToDelete.length} filtered task(s).\n\nType "DELETE" to confirm (case-sensitive):`
        : `FINAL WARNING: This will permanently delete all ${tasksToDelete.length} project task(s).\n\nType "DELETE" to confirm (case-sensitive):`;

    const userInput = prompt(secondConfirmMsg);
    if (userInput !== 'DELETE') {
        alert('Delete operation cancelled. You must type "DELETE" exactly to confirm.');
        return;
    }

    try {
        const deletePromises = tasksToDelete.map(task => deleteTask(task.id));
        await Promise.all(deletePromises);
        await loadProjectTasksTable();
        showFormStatus(`Deleted ${tasksToDelete.length} task(s) successfully.`, 'success');
    } catch (error) {
        console.error('Error deleting all tasks:', error);
        alert('Error: ' + error.message);
    }
}

function clearTasksFilters() {
    const projectFilter = document.getElementById('tasksProjectFilter');
    const monthFilter = document.getElementById('tasksMonthFilter');
    const yearFilter = document.getElementById('tasksYearFilter');
    const searchInput = document.getElementById('tasksSearchInput');

    if (projectFilter) projectFilter.value = '';
    if (monthFilter) monthFilter.value = '';
    if (yearFilter) yearFilter.value = '';
    if (searchInput) searchInput.value = '';

    renderProjectTasksTable();
}

function setupTasksNavigation(user) {
    const navMenu = document.getElementById('navMenu');
    if (!navMenu || !user) return;

    let links = '';
    if (user.role === 'admin') {
        links = `
            <a href="dashboard.html" class="nav-link">Dashboard</a>
            <a href="tasks.html" class="nav-link active">Tasks</a>
            <a href="calendar.html" class="nav-link">Calendar</a>
            <a href="customer-list.html" class="nav-link">Customers</a>
            <a href="add-customer.html" class="nav-link">Add Customer</a>
        `;
    } else {
        links = `
            <a href="dashboard.html" class="nav-link">Dashboard</a>
            <a href="tasks.html" class="nav-link active">Tasks</a>
            <a href="calendar.html" class="nav-link">Calendar</a>
            <a href="customer-list.html" class="nav-link">Customers</a>
        `;
    }

    navMenu.innerHTML = `
        ${links}
        <span id="userRole" class="nav-user-info"></span>
        <a href="#" class="nav-link nav-link-logout" onclick="handleLogout(); return false;">Logout</a>
    `;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTasksPage);
} else {
    initTasksPage();
}

