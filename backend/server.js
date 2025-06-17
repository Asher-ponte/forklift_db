
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001; // Backend server port

const dbDir = path.join(__dirname, 'db');
const dbPath = path.join(dbDir, 'forklift_check_app.sqlite');

// Ensure db directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log(`Connected to the SQLite database at ${dbPath}`);
    // Create tables if they don't exist (simple check, initDb.js is more robust)
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('operator', 'supervisor'))
    )`, (tableErr) => {
      if (tableErr) console.error("Error ensuring users table exists", tableErr.message);
    });
  }
});

// Middleware
app.use(cors({
  origin: 'http://localhost:9003', // Allow requests from Next.js dev server
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); // For parsing application/json

// API Endpoints

// Check if username exists
app.get('/api/users', (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ message: "Username query parameter is required." });
  }
  db.all("SELECT id, username, role FROM users WHERE username = ?", [username], (err, rows) => {
    if (err) {
      console.error("Error querying users", err.message);
      return res.status(500).json({ message: "Database error checking user." });
    }
    res.json(rows); // Returns an array; empty if not found, or array with user(s)
  });
});

// User Signup
app.post('/api/users', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: "Username, password, and role are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long." });
  }
  if (!['operator', 'supervisor'].includes(role)) {
    return res.status(400).json({ message: "Invalid role. Must be 'operator' or 'supervisor'." });
  }

  // Check if username already exists
  db.get("SELECT id FROM users WHERE username = ?", [username], async (err, row) => {
    if (err) {
      console.error("Error checking existing user", err.message);
      return res.status(500).json({ message: "Database error during signup." });
    }
    if (row) {
      return res.status(409).json({ message: "Username already exists." });
    }

    // Hash password and insert new user
    try {
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);
      const id = crypto.randomUUID();

      db.run("INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)",
        [id, username, password_hash, role],
        function (insertErr) { // Use function keyword to access `this`
          if (insertErr) {
            console.error("Error inserting new user", insertErr.message);
            return res.status(500).json({ message: "Database error creating user." });
          }
          res.status(201).json({ id, username, role });
        }
      );
    } catch (hashError) {
      console.error("Error hashing password", hashError);
      res.status(500).json({ message: "Server error during signup." });
    }
  });
});

// User Login (Placeholder - implement actual password verification)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (err) {
      console.error("Database error during login:", err.message);
      return res.status(500).json({ message: "Error logging in." });
    }
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (passwordMatch) {
      // In a real app, you'd generate a JWT token here
      res.json({ id: user.id, username: user.username, role: user.role });
    } else {
      res.status(401).json({ message: "Invalid username or password." });
    }
  });
});


// Placeholder for other CRUD operations (Departments, MHEs, etc.)
// These will be added based on the frontend requirements.
// Example:
// app.get('/api/departments', (req, res) => { /* ... fetch departments ... */ });
// app.post('/api/departments', (req, res) => { /* ... create department ... */ });

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`SQLite database is at: ${dbPath}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Closed the database connection.');
    process.exit(0);
  });
});
