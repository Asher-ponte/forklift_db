
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'db');
const dbPath = path.join(dbDir, 'forklift_check_app.sqlite');

// Create the db directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('operator', 'supervisor'))
    )`, (err) => {
      if (err) {
        console.error("Error creating users table", err.message);
      } else {
        console.log("Users table created or already exists.");
      }
    });

    // Departments Table
    db.run(`CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    )`, (err) => {
      if (err) console.error("Error creating departments table", err.message);
      else console.log("Departments table created or already exists.");
    });

    // MHE Units Table
    db.run(`CREATE TABLE IF NOT EXISTS mhe_units (
      id TEXT PRIMARY KEY,
      unit_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      department_id TEXT,
      type TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'maintenance')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    )`, (err) => {
      if (err) console.error("Error creating mhe_units table", err.message);
      else console.log("MHE Units table created or already exists.");
    });

    // Checklist Master Items Table
    db.run(`CREATE TABLE IF NOT EXISTS checklist_master_items (
      id TEXT PRIMARY KEY,
      qr_code_data TEXT,
      part_name TEXT NOT NULL,
      description TEXT,
      question TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    )`, (err) => {
      if (err) console.error("Error creating checklist_master_items table", err.message);
      else console.log("Checklist Master Items table created or already exists.");
    });

    // Inspection Reports Table
    db.run(`CREATE TABLE IF NOT EXISTS inspection_reports (
      id TEXT PRIMARY KEY,
      unit_id_fk TEXT NOT NULL,
      unit_code_display TEXT NOT NULL,
      date TEXT NOT NULL,
      operator_username TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Safe', 'Unsafe')),
      user_id_fk TEXT NOT NULL,
      FOREIGN KEY (unit_id_fk) REFERENCES mhe_units(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id_fk) REFERENCES users(id) ON DELETE CASCADE
    )`, (err) => {
      if (err) console.error("Error creating inspection_reports table", err.message);
      else console.log("Inspection Reports table created or already exists.");
    });

    // Inspection Report Items Table
    db.run(`CREATE TABLE IF NOT EXISTS inspection_report_items (
      id TEXT PRIMARY KEY,
      report_id_fk TEXT NOT NULL,
      checklist_item_id_fk TEXT,
      part_name_snapshot TEXT NOT NULL,
      question_snapshot TEXT NOT NULL,
      is_safe INTEGER,
      photo_url TEXT,
      timestamp TEXT,
      remarks TEXT,
      FOREIGN KEY (report_id_fk) REFERENCES inspection_reports(id) ON DELETE CASCADE,
      FOREIGN KEY (checklist_item_id_fk) REFERENCES checklist_master_items(id) ON DELETE SET NULL
    )`, (err) => {
      if (err) console.error("Error creating inspection_report_items table", err.message);
      else console.log("Inspection Report Items table created or already exists.");
    });

    // Downtime Logs Table
    db.run(`CREATE TABLE IF NOT EXISTS downtime_logs (
      id TEXT PRIMARY KEY,
      unit_id_fk TEXT NOT NULL,
      unit_code_display TEXT NOT NULL,
      reason TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      logged_at TEXT NOT NULL,
      source_report_id_fk TEXT,
      user_id_fk TEXT NOT NULL,
      FOREIGN KEY (unit_id_fk) REFERENCES mhe_units(id) ON DELETE CASCADE,
      FOREIGN KEY (source_report_id_fk) REFERENCES inspection_reports(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id_fk) REFERENCES users(id) ON DELETE CASCADE
    )`, (err) => {
      if (err) console.error("Error creating downtime_logs table", err.message);
      else console.log("Downtime Logs table created or already exists.");
    });
    
    // Downtime Unsafe Items Table
    db.run(`CREATE TABLE IF NOT EXISTS downtime_unsafe_items (
      id TEXT PRIMARY KEY,
      downtime_log_id_fk TEXT NOT NULL,
      part_name TEXT NOT NULL,
      remarks TEXT,
      photo_url TEXT,
      FOREIGN KEY (downtime_log_id_fk) REFERENCES downtime_logs(id) ON DELETE CASCADE
    )`, (err) => {
      if (err) console.error("Error creating downtime_unsafe_items table", err.message);
      else console.log("Downtime Unsafe Items table created or already exists.");
    });

    // PMS Task Masters Table
    db.run(`CREATE TABLE IF NOT EXISTS pms_task_masters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      frequency_unit TEXT NOT NULL CHECK(frequency_unit IN ('days', 'weeks', 'months', 'operating_hours')),
      frequency_value INTEGER NOT NULL,
      category TEXT,
      estimated_duration_minutes INTEGER,
      is_active INTEGER DEFAULT 1
    )`, (err) => {
      if (err) console.error("Error creating pms_task_masters table", err.message);
      else console.log("PMS Task Masters table created or already exists.");
    });
    
    // PMS Schedule Entries Table
    db.run(`CREATE TABLE IF NOT EXISTS pms_schedule_entries (
      id TEXT PRIMARY KEY,
      mhe_unit_id_fk TEXT NOT NULL,
      pms_task_master_id_fk TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'In Progress', 'Completed', 'Overdue', 'Skipped')),
      completion_date TEXT,
      serviced_by_user_id_fk TEXT,
      serviced_by_username_display TEXT,
      notes TEXT,
      FOREIGN KEY (mhe_unit_id_fk) REFERENCES mhe_units(id) ON DELETE CASCADE,
      FOREIGN KEY (pms_task_master_id_fk) REFERENCES pms_task_masters(id) ON DELETE CASCADE,
      FOREIGN KEY (serviced_by_user_id_fk) REFERENCES users(id) ON DELETE SET NULL
    )`, (err) => {
      if (err) console.error("Error creating pms_schedule_entries table", err.message);
      else console.log("PMS Schedule Entries table created or already exists.");
    });

    db.close((err) => {
      if (err) {
        console.error(err.message);
      }
      console.log('Closed the database connection.');
    });
  });
}
