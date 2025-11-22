# Vanatvam Customer Management System

A web-based customer management system with admin and manager roles, built with Python Flask backend and vanilla JavaScript frontend.

## Features

- **Login System**: Admin and Manager authentication
- **Navigation Menu**: Easy navigation between pages
- **Add Customer Page**: Separate page for adding/editing customers (Admin only)
- **Customers Page**: View and search customers with edit/delete options (Admin) or read-only (Manager)
- **Project Dropdown**: Project name field with options: Madhuvana
- **Mobile Responsive**: Works seamlessly on desktop, tablet, and mobile devices
- **JSON Data Storage**: All data stored in JSON files

## Setup Instructions

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run the Flask Server

```bash
python app.py
```

The server will start on `http://localhost:5000`

### 3. Open the Application

Open `index.html` in your web browser, or access it through the Flask server if configured.

## Default Login Credentials

**Admin:**
- Username: `admin`
- Password: `admin123`
- Role: `admin`

**Manager:**
- Username: `manager`
- Password: `manager123`
- Role: `manager`

## Data Storage

- Customer data: `data/customers.json`
- User data: `data/users.json`

Data files are automatically created when the server starts for the first time.

## API Endpoints

- `POST /api/login` - User authentication
- `GET /api/customers?search=<query>` - Get all customers (with optional search)
- `POST /api/customers` - Add new customer
- `PUT /api/customers/<id>` - Update customer
- `DELETE /api/customers/<id>` - Delete customer
- `GET /api/health` - Health check

## Customer Fields

- Name
- Mobile Number
- Plot Number
- Square Feet
- Project Name (Dropdown: Madhuvana)

## User Roles

**Admin:**
- Can access "Add Customer" page
- Can access "Customers" page
- Can add, edit, and delete customers

**Manager:**
- Can only access "Customers" page (read-only)
- Can search and view customers
- Cannot add, edit, or delete customers

## Project Structure

```
vanatvam/
├── app.py              # Flask backend server
├── requirements.txt    # Python dependencies
├── index.html          # Login page
├── add-customer.html   # Add/Edit customer page (Admin only)
├── customer-list.html  # Customers with search (Admin & Manager)
├── app.js              # Main JavaScript (API calls & routing)
├── add-customer.js     # Add customer page functionality
├── customer-list.js    # Customers page functionality
├── styles.css          # Styling
└── data/               # JSON data files (auto-created)
    ├── customers.json
    └── users.json
```

