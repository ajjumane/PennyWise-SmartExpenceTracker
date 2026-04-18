import psycopg2
from psycopg2.extras import RealDictCursor
import sqlite3
import bcrypt
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import os
import webbrowser
import threading
import time
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

DATABASE_URL = os.environ.get('DATABASE_URL')
IS_POSTGRES = DATABASE_URL is not None and DATABASE_URL.startswith('postgres')

def get_db():
    if IS_POSTGRES:
        try:
            conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
            return conn
        except Exception as e:
            print(f"Postgres connection error: {e}")
            return None
    else:
        try:
            conn = sqlite3.connect('database.db')
            conn.row_factory = sqlite3.Row
            return conn
        except Exception as e:
            print(f"SQLite connection error: {e}")
            return None

def init_db():
    conn = get_db()
    if not conn:
        print("Skipping DB initialization (No connection)")
        return
    
    with conn:
        cursor = conn.cursor()
        if IS_POSTGRES:
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    email TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS expenses (
                    id TEXT PRIMARY KEY,
                    userId INTEGER NOT NULL,
                    amount REAL NOT NULL,
                    category TEXT NOT NULL,
                    description TEXT,
                    date TEXT NOT NULL,
                    createdAt BIGINT NOT NULL,
                    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS budgets (
                    id SERIAL PRIMARY KEY,
                    userId INTEGER NOT NULL,
                    category TEXT NOT NULL,
                    amount_limit REAL NOT NULL,
                    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE(userId, category)
                );
            ''')
        else:
            # SQLite Syntax
            cursor.executescript('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    email TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS expenses (
                    id TEXT PRIMARY KEY,
                    userId INTEGER NOT NULL,
                    amount REAL NOT NULL,
                    category TEXT NOT NULL,
                    description TEXT,
                    date TEXT NOT NULL,
                    createdAt INTEGER NOT NULL,
                    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS budgets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL,
                    category TEXT NOT NULL,
                    amount_limit REAL NOT NULL,
                    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE(userId, category)
                );
            ''')
        conn.commit()
    conn.close()

# Helper for cross-db execution
def db_exec(cursor, query, params=()):
    if not IS_POSTGRES:
        query = query.replace('%s', '?')
    cursor.execute(query, params)
    return cursor

@app.route('/')
def index():
    return render_template('index.html')

# Serve static files correctly
@app.route('/css/<path:path>')
def send_css(path):
    return send_from_directory('static/css', path)

@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('static/js', path)

@app.route('/manifest.json')
def serve_manifest():
    return send_from_directory('static', 'manifest.json')

@app.route('/sw.js')
def serve_sw():
    return send_from_directory('static', 'sw.js')

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    conn = get_db()
    if not conn: return jsonify({'error': 'Database unavailable'}), 500

    try:
        pw_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        with conn:
            cursor = conn.cursor()
            if IS_POSTGRES:
                cursor.execute('INSERT INTO users (username, password_hash, email) VALUES (%s, %s, %s) RETURNING id',
                             (username, pw_hash, email))
                user_id = cursor.fetchone()['id']
            else:
                cursor.execute('INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
                             (username, pw_hash, email))
                user_id = cursor.lastrowid
            conn.commit()
            return jsonify({'message': 'User created successfully', 'userId': user_id})
    except (psycopg2.IntegrityError, sqlite3.IntegrityError):
        return jsonify({'error': 'Username already exists'}), 400
    except Exception as e:
        print(f"Signup error: {e}")
        return jsonify({'error': 'Internal server error'}), 500
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    conn = get_db()
    if not conn: return jsonify({'error': 'Database unavailable'}), 500

    cursor = conn.cursor()
    db_exec(cursor, 'SELECT * FROM users WHERE username = %s', (username,))
    user = cursor.fetchone()
    conn.close()

    if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        return jsonify({
            'userId': user['id'],
            'username': user['username'],
            'message': 'Login successful'
        })
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@app.get('/api/data/<int:user_id>')
def get_data(user_id):
    conn = get_db()
    if not conn: return jsonify({'error': 'Database unavailable'}), 500

    cursor = conn.cursor()
    db_exec(cursor, 'SELECT * FROM expenses WHERE userId = %s', (user_id,))
    expenses = [dict(row) for row in cursor.fetchall()]
    
    db_exec(cursor, 'SELECT * FROM budgets WHERE userId = %s', (user_id,))
    budgets = [{'category': row['category'], 'limit': row['amount_limit']} for row in cursor.fetchall()]
    
    conn.close()
    return jsonify({'expenses': expenses, 'budgets': budgets})

@app.route('/api/sync', methods=['POST'])
def sync():
    data = request.json
    user_id = data.get('userId')
    expenses = data.get('expenses', [])
    budgets = data.get('budgets', [])

    if not user_id:
        return jsonify({'error': 'User ID required'}), 400

    conn = get_db()
    if not conn: return jsonify({'error': 'Database unavailable'}), 500

    try:
        with conn:
            cursor = conn.cursor()
            # Sync Expenses
            for exp in expenses:
                if IS_POSTGRES:
                    cursor.execute('''
                        INSERT INTO expenses (id, userId, amount, category, description, date, createdAt)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                        amount = EXCLUDED.amount, 
                        category = EXCLUDED.category,
                        description = EXCLUDED.description,
                        date = EXCLUDED.date
                    ''', (exp['id'], user_id, exp['amount'], exp['category'], exp.get('description', ''), exp['date'], exp['createdAt']))
                else:
                    cursor.execute('''
                        INSERT OR REPLACE INTO expenses (id, userId, amount, category, description, date, createdAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (exp['id'], user_id, exp['amount'], exp['category'], exp.get('description', ''), exp['date'], exp['createdAt']))
            
            # Sync Budgets
            for bud in budgets:
                if IS_POSTGRES:
                    cursor.execute('''
                        INSERT INTO budgets (userId, category, amount_limit)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (userId, category) DO UPDATE SET
                        amount_limit = EXCLUDED.amount_limit
                    ''', (user_id, bud['category'], bud.get('limit', bud.get('amount_limit'))))
                else:
                    cursor.execute('''
                        INSERT OR REPLACE INTO budgets (userId, category, amount_limit)
                        VALUES (?, ?, ?)
                    ''', (user_id, bud['category'], bud.get('limit', bud.get('amount_limit'))))
            
            conn.commit()
            return jsonify({'message': 'Sync successful'})
    except Exception as e:
        print(f"Sync error: {e}")
        return jsonify({'error': 'Sync failed'}), 500
    finally:
        conn.close()

@app.route('/api/expenses/delete', methods=['POST'])
def delete_expense():
    data = request.json
    user_id = data.get('userId')
    expense_id = data.get('expenseId')
    conn = get_db()
    if not conn: return jsonify({'error': 'Database unavailable'}), 500
    
    cursor = conn.cursor()
    db_exec(cursor, 'DELETE FROM expenses WHERE id = %s AND userId = %s', (expense_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Expense deleted'})

@app.route('/api/budgets/delete', methods=['POST'])
def delete_budget():
    data = request.json
    user_id = data.get('userId')
    category = data.get('category')
    conn = get_db()
    if not conn: return jsonify({'error': 'Database unavailable'}), 500
    
    cursor = conn.cursor()
    db_exec(cursor, 'DELETE FROM budgets WHERE userId = %s AND category = %s', (user_id, category))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Budget deleted'})

def open_browser():
    time.sleep(1.5)
    webbrowser.open("http://127.0.0.1:5000")

if __name__ == '__main__':
    init_db()
    if not os.environ.get("WERKZEUG_RUN_MAIN") and not os.environ.get("VERCEL"):
        threading.Thread(target=open_browser).start()
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
