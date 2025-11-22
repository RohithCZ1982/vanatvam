from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__, static_folder='.')
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Enable CORS for API endpoints

# Data file paths
DATA_DIR = 'data'
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
CUSTOMERS_FILE = os.path.join(DATA_DIR, 'customers.json')
TASKS_FILE = os.path.join(DATA_DIR, 'tasks.json')
BOOKINGS_FILE = os.path.join(DATA_DIR, 'bookings.json')

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Initialize data files if they don't exist
def init_data_files():
    if not os.path.exists(USERS_FILE):
        default_users = {
            "admin": {"password": "admin123", "role": "admin"},
            "manager": {"password": "manager123", "role": "manager"}
        }
        with open(USERS_FILE, 'w') as f:
            json.dump(default_users, f, indent=2)
    
    if not os.path.exists(CUSTOMERS_FILE):
        with open(CUSTOMERS_FILE, 'w') as f:
            json.dump([], f, indent=2)
    
    if not os.path.exists(TASKS_FILE):
        with open(TASKS_FILE, 'w') as f:
            json.dump([], f, indent=2)
    
    if not os.path.exists(BOOKINGS_FILE):
        with open(BOOKINGS_FILE, 'w') as f:
            json.dump([], f, indent=2)

# Load data from JSON file
def load_customers():
    if os.path.exists(CUSTOMERS_FILE):
        with open(CUSTOMERS_FILE, 'r') as f:
            return json.load(f)
    return []

# Save data to JSON file
def save_customers(customers):
    with open(CUSTOMERS_FILE, 'w') as f:
        json.dump(customers, f, indent=2)

# Load users from JSON file
def load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    return {}

# Load tasks from JSON file
def load_tasks():
    if os.path.exists(TASKS_FILE):
        with open(TASKS_FILE, 'r') as f:
            return json.load(f)
    return []

# Save tasks to JSON file
def save_tasks(tasks):
    with open(TASKS_FILE, 'w') as f:
        json.dump(tasks, f, indent=2)

# Load bookings from JSON file
def load_bookings():
    if os.path.exists(BOOKINGS_FILE):
        with open(BOOKINGS_FILE, 'r') as f:
            return json.load(f)
    return []

# Save bookings to JSON file
def save_bookings(bookings):
    with open(BOOKINGS_FILE, 'w') as f:
        json.dump(bookings, f, indent=2)

# Login endpoint
@app.route('/api/login', methods=['POST'])
def login():
    try:
        if not request.json:
            return jsonify({
                'success': False,
                'message': 'Invalid request data'
            }), 400
        
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        role = data.get('role', '').strip()
        
        if not username or not password or not role:
            return jsonify({
                'success': False,
                'message': 'Username, password, and role are required'
            }), 400
        
        users = load_users()
        
        if username in users:
            user = users[username]
            if user.get('password') == password and user.get('role') == role:
                return jsonify({
                    'success': True,
                    'user': {
                        'username': username,
                        'role': user['role']
                    }
                }), 200
        
        return jsonify({
            'success': False,
            'message': 'Invalid credentials or role mismatch'
        }), 401
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

# Get all customers
@app.route('/api/customers', methods=['GET'])
def get_customers():
    search_query = request.args.get('search', '').strip()
    customers = load_customers()
    
    if search_query:
        search_lower = search_query.lower()
        customers = [
            c for c in customers
            if (search_lower in c.get('name', '').lower() or
                search_lower in c.get('mobile', '').lower() or
                search_lower in c.get('plotNumber', '').lower() or
                search_lower in c.get('projectName', '').lower())
        ]
    
    return jsonify(customers), 200

# Add new customer
@app.route('/api/customers', methods=['POST'])
def add_customer():
    data = request.json
    
    # Validate required fields
    required_fields = ['name', 'mobile', 'plotNumber', 'squareFeet', 'projectName']
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                'success': False,
                'message': f'{field} is required'
            }), 400
    
    customers = load_customers()
    
    # Create new customer
    new_customer = {
        'id': str(int(datetime.now().timestamp() * 1000)),
        'name': data['name'].strip(),
        'mobile': data['mobile'].strip(),
        'plotNumber': data['plotNumber'].strip(),
        'squareFeet': data['squareFeet'].strip(),
        'projectName': data['projectName'].strip(),
        'createdAt': datetime.now().isoformat()
    }
    
    customers.append(new_customer)
    save_customers(customers)
    
    return jsonify({
        'success': True,
        'customer': new_customer
    }), 201

# Update customer
@app.route('/api/customers/<customer_id>', methods=['PUT'])
def update_customer(customer_id):
    data = request.json
    customers = load_customers()
    
    # Find customer
    customer_index = None
    for i, customer in enumerate(customers):
        if customer.get('id') == customer_id:
            customer_index = i
            break
    
    if customer_index is None:
        return jsonify({
            'success': False,
            'message': 'Customer not found'
        }), 404
    
    # Validate required fields
    required_fields = ['name', 'mobile', 'plotNumber', 'squareFeet', 'projectName']
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                'success': False,
                'message': f'{field} is required'
            }), 400
    
    # Update customer
    customers[customer_index].update({
        'name': data['name'].strip(),
        'mobile': data['mobile'].strip(),
        'plotNumber': data['plotNumber'].strip(),
        'squareFeet': data['squareFeet'].strip(),
        'projectName': data['projectName'].strip()
    })
    
    save_customers(customers)
    
    return jsonify({
        'success': True,
        'customer': customers[customer_index]
    }), 200

# Delete customer
@app.route('/api/customers/<customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    customers = load_customers()
    
    # Find and remove customer
    original_count = len(customers)
    customers = [c for c in customers if c.get('id') != customer_id]
    
    if len(customers) == original_count:
        return jsonify({
            'success': False,
            'message': 'Customer not found'
        }), 404
    
    save_customers(customers)
    
    # Delete all tasks related to this customer
    tasks = load_tasks()
    if not isinstance(tasks, list):
        tasks = []
    
    original_task_count = len(tasks)
    tasks = [t for t in tasks if t.get('customerId') != customer_id]
    deleted_task_count = original_task_count - len(tasks)
    
    if deleted_task_count > 0:
        save_tasks(tasks)
    
    message = 'Customer deleted successfully'
    if deleted_task_count > 0:
        message += f'. {deleted_task_count} related task(s) also deleted.'
    
    return jsonify({
        'success': True,
        'message': message,
        'deletedTasksCount': deleted_task_count
    }), 200

# Serve static HTML files
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<filename>')
def serve_html(filename):
    if filename.endswith('.html'):
        return send_from_directory('.', filename)
    elif filename.endswith('.js') or filename.endswith('.css'):
        return send_from_directory('.', filename)
    return send_from_directory('.', 'index.html')  # Default to index.html

# Add new task
@app.route('/api/tasks', methods=['POST'])
def add_task():
    try:
        if not request.json:
            return jsonify({
                'success': False,
                'message': 'Invalid request data'
            }), 400
        
        data = request.json
        customer_id = data.get('customerId')
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()
        task_date = data.get('taskDate')
        
        if not customer_id or not title or not task_date:
            return jsonify({
                'success': False,
                'message': 'Customer ID, title, and date are required'
            }), 400
        
        tasks = load_tasks()
        
        new_task = {
            'id': str(int(datetime.now().timestamp() * 1000)),
            'customerId': customer_id,
            'title': title,
            'description': description,
            'taskDate': task_date,
            'status': 'pending',
            'createdAt': datetime.now().isoformat()
        }
        
        tasks.append(new_task)
        save_tasks(tasks)
        
        return jsonify({
            'success': True,
            'task': new_task
        }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

# Get tasks by date (or all tasks if no date provided)
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    try:
        date_filter = request.args.get('date')
        include_completed = request.args.get('include_completed', 'false').lower() == 'true'
        customer_id = request.args.get('customerId')
        tasks = load_tasks()
        
        # Ensure tasks is a list
        if not isinstance(tasks, list):
            tasks = []
        
        # Filter by customer if customerId is provided
        if customer_id:
            tasks = [t for t in tasks if t.get('customerId') == customer_id]
        
        # Filter by date if provided
        if date_filter:
            tasks = [t for t in tasks if t.get('taskDate') == date_filter]
        
        # Filter out completed tasks unless include_completed is true
        if not include_completed:
            tasks = [t for t in tasks if t.get('status') != 'completed']
        
        return jsonify(tasks), 200
    except Exception as e:
        print(f"Error in get_tasks: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return empty array on error, not error object
        return jsonify([]), 200

# Update task status
@app.route('/api/tasks/<task_id>/status', methods=['PUT'])
def update_task_status(task_id):
    try:
        if not request.json:
            return jsonify({
                'success': False,
                'message': 'Invalid request data'
            }), 400
        
        data = request.json
        status = data.get('status')
        
        if not status:
            return jsonify({
                'success': False,
                'message': 'Status is required'
            }), 400
        
        tasks = load_tasks()
        task_index = None
        
        for i, task in enumerate(tasks):
            if task.get('id') == task_id:
                task_index = i
                break
        
        if task_index is None:
            return jsonify({
                'success': False,
                'message': 'Task not found'
            }), 404
        
        tasks[task_index]['status'] = status
        save_tasks(tasks)
        
        return jsonify({
            'success': True,
            'task': tasks[task_index]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

# Update task date
@app.route('/api/tasks/<task_id>/date', methods=['PUT'])
def update_task_date(task_id):
    try:
        if not request.json:
            return jsonify({
                'success': False,
                'message': 'Invalid request data'
            }), 400
        
        data = request.json
        new_date = data.get('taskDate')
        
        if not new_date:
            return jsonify({
                'success': False,
                'message': 'Task date is required'
            }), 400
        
        tasks = load_tasks()
        task_index = None
        
        for i, task in enumerate(tasks):
            if task.get('id') == task_id:
                task_index = i
                break
        
        if task_index is None:
            return jsonify({
                'success': False,
                'message': 'Task not found'
            }), 404
        
        tasks[task_index]['taskDate'] = new_date
        save_tasks(tasks)
        
        return jsonify({
            'success': True,
            'task': tasks[task_index]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

# Add new booking
@app.route('/api/bookings', methods=['POST'])
def add_booking():
    try:
        if not request.json:
            return jsonify({
                'success': False,
                'message': 'Invalid request data'
            }), 400
        
        data = request.json
        customer_id = data.get('customerId')
        date_from = data.get('dateFrom')
        date_to = data.get('dateTo')
        number_of_rooms = data.get('numberOfRooms')
        
        if not customer_id or not date_from or not date_to or not number_of_rooms:
            return jsonify({
                'success': False,
                'message': 'All fields are required'
            }), 400
        
        # Get customer info
        customers = load_customers()
        customer = next((c for c in customers if c.get('id') == customer_id), None)
        
        if not customer:
            return jsonify({
                'success': False,
                'message': 'Customer not found'
            }), 404
        
        bookings = load_bookings()
        
        new_booking = {
            'id': str(int(datetime.now().timestamp() * 1000)),
            'customerId': customer_id,
            'customerName': customer.get('name', 'Unknown'),
            'projectName': customer.get('projectName', ''),
            'dateFrom': date_from,
            'dateTo': date_to,
            'numberOfRooms': number_of_rooms,
            'createdAt': datetime.now().isoformat()
        }
        
        bookings.append(new_booking)
        save_bookings(bookings)
        
        return jsonify({
            'success': True,
            'booking': new_booking
        }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

# Get all bookings
@app.route('/api/bookings', methods=['GET'])
def get_bookings():
    try:
        project_filter = request.args.get('project')
        bookings = load_bookings()
        
        # Ensure bookings is a list
        if not isinstance(bookings, list):
            bookings = []
        
        # Filter by project if provided
        if project_filter:
            bookings = [b for b in bookings if b.get('projectName') == project_filter]
        
        return jsonify(bookings), 200
    except Exception as e:
        print(f"Error in get_bookings: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify([]), 200

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    init_data_files()
    print("Starting Flask server...")
    print("Access the application at http://localhost:5000")
    print("Login page: http://localhost:5000/index.html")
    app.run(debug=True, host='0.0.0.0', port=5000)

