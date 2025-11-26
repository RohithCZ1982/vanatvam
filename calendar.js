// Calendar page functionality for room bookings

// Initialize calendar page
async function initCalendarPage() {
    // Check authentication
    if (!checkAuth()) {
        return;
    }
    
    const user = getCurrentUser();
    if (user) {
        // Set user info in menu
        const userRoleEl = document.getElementById('userRole');
        if (user && userRoleEl) {
            userRoleEl.textContent = `${user.username} (${user.role})`;
            userRoleEl.style.display = 'inline';
        }
    }

    // Setup navigation
    setupNavigation();

    // Initialize current month
    let currentMonth = new Date();
    window.currentCalendarMonth = currentMonth;
    
    // Update month display
    updateMonthDisplay();

    // Load calendar
    await loadCalendar();

    // Event listeners
    const projectFilter = document.getElementById('projectFilter');
    
    if (projectFilter) {
        projectFilter.addEventListener('change', async () => {
            await loadCalendar();
        });
    }
}

// Setup navigation menu
function setupNavigation() {
    const user = getCurrentUser();
    const navMenu = document.getElementById('navMenu');
    
    if (!navMenu || !user) return;
    
    let menuHTML = '';
    
    if (user.role === 'admin') {
        menuHTML = `
            <a href="dashboard.html" class="nav-link">Dashboard</a>
            <a href="tasks.html" class="nav-link">Tasks</a>
            <a href="calendar.html" class="nav-link active">Calendar</a>
            <a href="customer-list.html" class="nav-link">Customers</a>
            <a href="add-customer.html" class="nav-link">Add Customer</a>
        `;
    } else {
        menuHTML = `
            <a href="dashboard.html" class="nav-link">Dashboard</a>
            <a href="customer-list.html" class="nav-link">Customers</a>
            <a href="calendar.html" class="nav-link active">Calendar</a>
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

// Load calendar with bookings
async function loadCalendar() {
    const calendarContainer = document.getElementById('calendarContainer');
    if (!calendarContainer) return;

    try {
        calendarContainer.innerHTML = '<div class="calendar-loading">Loading calendar...</div>';
        
        const projectFilter = document.getElementById('projectFilter');
        const selectedProject = projectFilter ? projectFilter.value : '';
        
        // Get current month from global variable
        const currentMonth = window.currentCalendarMonth || new Date();
        
        // Get bookings
        const bookings = await getAllBookings(selectedProject || null);
        
        // Generate calendar
        const calendarHTML = generateCalendar(currentMonth, bookings);
        calendarContainer.innerHTML = calendarHTML;
        
    } catch (error) {
        console.error('Error loading calendar:', error);
        calendarContainer.innerHTML = '<div class="no-data">Error loading calendar: ' + error.message + '</div>';
    }
}

// Navigate to previous or next month
function navigateMonth(direction) {
    const currentMonth = window.currentCalendarMonth || new Date();
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1);
    window.currentCalendarMonth = newMonth;
    updateMonthDisplay();
    loadCalendar();
}

// Update month display
function updateMonthDisplay() {
    const monthDisplay = document.getElementById('monthDisplay');
    if (monthDisplay) {
        const currentMonth = window.currentCalendarMonth || new Date();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[currentMonth.getMonth()];
        monthDisplay.textContent = monthName;
    }
}

// Generate calendar HTML
function generateCalendar(monthDate, bookings) {
    const date = monthDate instanceof Date ? monthDate : (monthDate ? new Date(monthDate + '-01') : new Date());
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Month names
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Day names
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    let html = `
        <div class="calendar">
            <div class="calendar-header">
                <h2>${monthNames[month]} ${year}</h2>
            </div>
            <div class="calendar-grid">
                <div class="calendar-weekdays">
                    ${dayNames.map(day => `<div class="calendar-weekday">${day}</div>`).join('')}
                </div>
                <div class="calendar-days">
    `;
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Find bookings for this date
        const dayBookings = bookings.filter(booking => {
            const fromDate = new Date(booking.dateFrom);
            const toDate = new Date(booking.dateTo);
            const checkDate = new Date(dateStr);
            return checkDate >= fromDate && checkDate <= toDate;
        });
        
        const isToday = currentDate.toDateString() === new Date().toDateString();
        const dayClass = isToday ? 'calendar-day today' : 'calendar-day';
        
        html += `<div class="${dayClass}" data-date="${dateStr}">`;
        html += `<div class="calendar-day-number">${day}</div>`;
        
        if (dayBookings.length > 0) {
            html += '<div class="calendar-bookings">';
            dayBookings.forEach(booking => {
                const projectColor = getProjectColor(booking.projectName);
                const titleText = `${escapeHtml(booking.customerName)} - ${escapeHtml(booking.projectName || 'No Project')} - ${booking.numberOfRooms} room(s)`;
                html += `
                    <div class="calendar-booking" style="background: ${projectColor};" title="${titleText}">
                        ${escapeHtml(booking.customerName)}
                    </div>
                `;
            });
            html += '</div>';
        }
        
        html += '</div>';
    }
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    return html;
}

// Generate a consistent color for a project name
function getProjectColor(projectName) {
    if (!projectName) {
        return '#8B4513'; // Default color
    }
    
    // Color palette for projects (distinct colors)
    const colors = [
        '#8B4513', // Brown
        '#2E7D32', // Green
        '#1976D2', // Blue
        '#D32F2F', // Red
        '#F57C00', // Orange
        '#7B1FA2', // Purple
        '#0288D1', // Light Blue
        '#388E3C', // Dark Green
        '#C2185B', // Pink
        '#5D4037', // Dark Brown
        '#00796B', // Teal
        '#E64A19', // Deep Orange
        '#303F9F', // Indigo
        '#C62828', // Dark Red
        '#AD1457', // Dark Pink
        '#6A1B9A', // Dark Purple
        '#00695C', // Dark Teal
        '#455A64', // Blue Grey
        '#BF360C', // Deep Red
        '#1B5E20'  // Very Dark Green
    ];
    
    // Simple hash function to convert project name to a number
    let hash = 0;
    for (let i = 0; i < projectName.length; i++) {
        hash = projectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Use absolute value and modulo to get index
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when page loads
function initializeCalendar() {
    const calendarContainer = document.getElementById('calendarContainer');
    const projectFilter = document.getElementById('projectFilter');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const currentMonthBtn = document.getElementById('currentMonthBtn');
    
    if (!calendarContainer || !projectFilter || !prevMonthBtn || !nextMonthBtn) {
        setTimeout(initializeCalendar, 100);
        return;
    }
    
    initCalendarPage();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initializeCalendar();
    });
} else {
    setTimeout(initializeCalendar, 50);
}

