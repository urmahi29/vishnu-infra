-- ============================================================
-- Road Construction & Infrastructure Management System
-- Database Schema v1.0
-- ============================================================

CREATE DATABASE IF NOT EXISTS road_construction_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE road_construction_erp;

-- ============================================================
-- 1. USERS & AUTHENTICATION
-- ============================================================

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id VARCHAR(20) UNIQUE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL DEFAULT '',
  firebase_uid VARCHAR(255) DEFAULT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  phone VARCHAR(20),
  designation VARCHAR(100),
  department VARCHAR(100),
  avatar VARCHAR(255),
  address TEXT,
  status ENUM('active', 'inactive', 'suspended', 'pending', 'rejected') DEFAULT 'pending',
  rejection_reason VARCHAR(255) DEFAULT NULL,
  email_verified_at TIMESTAMP NULL,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_status (status),
  INDEX idx_firebase_uid (firebase_uid)
);

-- ============================================================
-- 2. PROJECTS
-- ============================================================

CREATE TABLE projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_name VARCHAR(255) DEFAULT NULL,
  manager_name VARCHAR(255) DEFAULT NULL,
  project_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  project_type ENUM('road_construction', 'bridge', 'highway', 'flyover', 'tunnel', 'maintenance', 'other') DEFAULT 'road_construction',
  total_budget DECIMAL(15, 2) DEFAULT 0.00,
  allocated_budget DECIMAL(15, 2) DEFAULT 0.00,
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  status ENUM('planned', 'in_progress', 'on_hold', 'completed', 'cancelled') DEFAULT 'planned',
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  assigned_manager_id INT,
  completion_percentage DECIMAL(5, 2) DEFAULT 0.00,
  client_name VARCHAR(200),
  client_contact VARCHAR(100),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_manager_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_project_type (project_type),
  INDEX idx_priority (priority),
  INDEX idx_manager (assigned_manager_id)
);

-- Project Staff
CREATE TABLE project_staff (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  staff_name VARCHAR(255) NOT NULL,
  work_role VARCHAR(255) DEFAULT NULL,
  joining_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  salary DECIMAL(15, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Project Vehicles
CREATE TABLE project_vehicles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  vehicle_name VARCHAR(255) NOT NULL,
  vehicle_number VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Project Milestones
CREATE TABLE project_milestones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE,
  completion_date DATE,
  status ENUM('pending', 'in_progress', 'completed', 'delayed') DEFAULT 'pending',
  budget_allocated DECIMAL(15, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project (project_id),
  INDEX idx_status (status)
);

-- ============================================================
-- 3. TASKS
-- ============================================================

CREATE TABLE tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_code VARCHAR(20) UNIQUE NOT NULL,
  project_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  task_type ENUM('survey', 'design', 'clearing', 'excavation', 'paving', 'concrete', 'painting', 'inspection', 'other') DEFAULT 'other',
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  status ENUM('todo', 'in_progress', 'review', 'completed', 'cancelled') DEFAULT 'todo',
  assigned_to INT,
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMP NULL,
  estimated_hours DECIMAL(8, 2),
  actual_hours DECIMAL(8, 2),
  progress_percentage DECIMAL(5, 2) DEFAULT 0.00,
  location_details VARCHAR(255),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_project (project_id),
  INDEX idx_assigned (assigned_to),
  INDEX idx_status (status),
  INDEX idx_priority (priority)
);

-- Task Comments
CREATE TABLE task_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Task Attachments
CREATE TABLE task_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size INT,
  file_type VARCHAR(50),
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- 4. EQUIPMENT
-- ============================================================

CREATE TABLE equipment (
  id INT PRIMARY KEY AUTO_INCREMENT,
  equipment_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  type ENUM('excavator', 'bulldozer', 'crane', 'roller', 'grader', 'dump_truck', 'concrete_mixer', 'paver', 'drill', 'compressor', 'generator', 'other') NOT NULL,
  company_name VARCHAR(200),
  brand VARCHAR(100),
  model VARCHAR(100),
  year INT,
  vehicle_number VARCHAR(50),
  plate_number VARCHAR(50),
  engine_number VARCHAR(100),
  chassis_number VARCHAR(100),
  insurance_number VARCHAR(100),
  insurance_expiry DATE,
  fitness_certificate DATE,
  pollution_certificate DATE,
  fuel_type ENUM('diesel', 'petrol', 'electric', 'hybrid') DEFAULT 'diesel',
  capacity VARCHAR(100),
  status ENUM('available', 'in_use', 'maintenance', 'out_of_service', 'retired') DEFAULT 'available',
  current_project_id INT,
  assigned_operator_id INT,
  purchase_date DATE,
  purchase_cost DECIMAL(15, 2),
  current_value DECIMAL(15, 2),
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  maintenance_interval_days INT DEFAULT 90,
  location VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (current_project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_operator_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_project (current_project_id)
);

-- Equipment Maintenance Log
CREATE TABLE equipment_maintenance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  equipment_id INT NOT NULL,
  maintenance_type ENUM('routine', 'repair', 'emergency', 'inspection') DEFAULT 'routine',
  description TEXT NOT NULL,
  maintenance_date DATE NOT NULL,
  completion_date DATE,
  cost DECIMAL(15, 2) DEFAULT 0.00,
  provider VARCHAR(200),
  provider_contact VARCHAR(100),
  odometer_reading INT,
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
  notes TEXT,
  performed_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_equipment (equipment_id),
  INDEX idx_status (status)
);

-- Equipment Fuel Log
CREATE TABLE equipment_fuel (
  id INT PRIMARY KEY AUTO_INCREMENT,
  equipment_id INT NOT NULL,
  fuel_date DATE NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_cost DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(12, 2) NOT NULL,
  provider VARCHAR(200),
  receipt_number VARCHAR(50),
  operator_id INT,
  odometer_reading INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_equipment (equipment_id),
  INDEX idx_date (fuel_date)
);

-- ============================================================
-- 5. MATERIALS / INVENTORY
-- ============================================================

CREATE TABLE materials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  material_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  category ENUM('aggregate', 'asphalt', 'concrete', 'steel', 'wood', 'paint', 'pipe', 'electrical', 'safety', 'other') NOT NULL,
  unit ENUM('kg', 'ton', 'm3', 'm2', 'm', 'liter', 'bag', 'piece', 'box', 'roll') NOT NULL,
  unit_price DECIMAL(12, 2) DEFAULT 0.00,
  current_stock DECIMAL(12, 2) DEFAULT 0.00,
  minimum_stock DECIMAL(12, 2) DEFAULT 0.00,
  maximum_stock DECIMAL(12, 2) DEFAULT 0.00,
  location VARCHAR(255),
  supplier_id INT,
  description TEXT,
  status ENUM('active', 'discontinued', 'out_of_stock') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_supplier (supplier_id)
);

-- Material Suppliers
CREATE TABLE suppliers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  supplier_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  gst_number VARCHAR(50),
  payment_terms VARCHAR(200),
  status ENUM('active', 'inactive') DEFAULT 'active',
  rating INT DEFAULT 3,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE materials ADD FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- Material Stock Movements
CREATE TABLE stock_movements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  material_id INT NOT NULL,
  project_id INT,
  movement_type ENUM('purchase', 'issue', 'return', 'transfer', 'adjustment') NOT NULL,
  quantity DECIMAL(12, 2) NOT NULL,
  unit_price DECIMAL(12, 2),
  total_price DECIMAL(15, 2),
  reference_number VARCHAR(50),
  remarks TEXT,
  performed_by INT,
  movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_material (material_id),
  INDEX idx_project (project_id),
  INDEX idx_type (movement_type),
  INDEX idx_date (movement_date)
);

-- Material Purchase Orders
CREATE TABLE purchase_orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  po_number VARCHAR(20) UNIQUE NOT NULL,
  supplier_id INT NOT NULL,
  project_id INT,
  order_date DATE NOT NULL,
  expected_delivery DATE,
  delivery_date DATE,
  status ENUM('draft', 'pending', 'approved', 'delivered', 'cancelled') DEFAULT 'draft',
  subtotal DECIMAL(15, 2) DEFAULT 0.00,
  tax_amount DECIMAL(15, 2) DEFAULT 0.00,
  total_amount DECIMAL(15, 2) DEFAULT 0.00,
  payment_status ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
  notes TEXT,
  created_by INT,
  approved_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_supplier (supplier_id)
);

-- Purchase Order Items
CREATE TABLE purchase_order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  po_id INT NOT NULL,
  material_id INT NOT NULL,
  quantity DECIMAL(12, 2) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  total_price DECIMAL(15, 2) NOT NULL,
  received_quantity DECIMAL(12, 2) DEFAULT 0.00,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id),
  INDEX idx_po (po_id)
);

-- ============================================================
-- 6. BUDGET & FINANCE
-- ============================================================

CREATE TABLE budget_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE budget_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  category_id INT,
  description VARCHAR(255) NOT NULL,
  estimated_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  approved_amount DECIMAL(15, 2) DEFAULT 0.00,
  spent_amount DECIMAL(15, 2) DEFAULT 0.00,
  status ENUM('planned', 'approved', 'spent', 'over_budget') DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE SET NULL,
  INDEX idx_project (project_id)
);

CREATE TABLE expenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT,
  budget_item_id INT,
  expense_code VARCHAR(20) UNIQUE NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  expense_date DATE NOT NULL,
  category ENUM('labor', 'material', 'equipment', 'transport', 'permit', 'utility', 'miscellaneous') NOT NULL,
  payment_method ENUM('cash', 'check', 'bank_transfer', 'card', 'other') DEFAULT 'bank_transfer',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  bill_reference VARCHAR(100),
  receipt_file VARCHAR(255),
  paid_to VARCHAR(200),
  notes TEXT,
  created_by INT,
  approved_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (budget_item_id) REFERENCES budget_items(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_project (project_id),
  INDEX idx_category (category),
  INDEX idx_date (expense_date),
  INDEX idx_status (status)
);

CREATE TABLE project_expenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT NOT NULL,
  paid_by VARCHAR(255) NOT NULL,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_expenses_project (project_id)
);

CREATE TABLE invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_number VARCHAR(20) UNIQUE NOT NULL,
  project_id INT,
  client_name VARCHAR(200) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(15, 2) NOT NULL,
  tax_percentage DECIMAL(5, 2) DEFAULT 0.00,
  tax_amount DECIMAL(15, 2) DEFAULT 0.00,
  total_amount DECIMAL(15, 2) NOT NULL,
  amount_paid DECIMAL(15, 2) DEFAULT 0.00,
  balance DECIMAL(15, 2) DEFAULT 0.00,
  status ENUM('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_project (project_id),
  INDEX idx_due_date (due_date)
);

-- Invoice Payments
CREATE TABLE invoice_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_id INT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('cash', 'check', 'bank_transfer', 'card') NOT NULL,
  reference_number VARCHAR(100),
  notes TEXT,
  received_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- 7. WORKFORCE / HR
-- ============================================================

CREATE TABLE workforce (
  id INT PRIMARY KEY AUTO_INCREMENT,
  worker_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20) NOT NULL,
  emergency_contact VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  date_of_birth DATE,
  gender ENUM('male', 'female', 'other') DEFAULT 'male',
  designation VARCHAR(100),
  department VARCHAR(100),
  worker_type ENUM('permanent', 'contract', 'daily_wage', 'intern') DEFAULT 'contract',
  skill_set TEXT,
  experience_years INT DEFAULT 0,
  qualification VARCHAR(200),
  avatar VARCHAR(255),
  pan_number VARCHAR(20),
  current_project_id INT,
  supervisor_id INT,
  date_of_joining DATE,
  leaving_date DATE,
  basic_salary DECIMAL(12, 2) DEFAULT 0.00,
  hourly_rate DECIMAL(10, 2) DEFAULT 0.00,
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  ifsc_code VARCHAR(20),
  aadhar_number VARCHAR(20),
  status ENUM('active', 'inactive', 'on_leave', 'terminated') DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (current_project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (supervisor_id) REFERENCES workforce(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_type (worker_type),
  INDEX idx_project (current_project_id)
);

-- Attendance
CREATE TABLE attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  worker_id INT NOT NULL,
  project_id INT,
  attendance_date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  hours_worked DECIMAL(5, 2),
  status ENUM('present', 'absent', 'half_day', 'overtime', 'holiday') DEFAULT 'present',
  overtime_hours DECIMAL(5, 2) DEFAULT 0.00,
  notes TEXT,
  marked_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workforce(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_attendance (worker_id, attendance_date),
  INDEX idx_worker (worker_id),
  INDEX idx_date (attendance_date),
  INDEX idx_status (status)
);

-- Payroll
CREATE TABLE payroll (
  id INT PRIMARY KEY AUTO_INCREMENT,
  worker_id INT NOT NULL,
  payroll_month DATE NOT NULL,
  basic_pay DECIMAL(12, 2) DEFAULT 0.00,
  overtime_pay DECIMAL(12, 2) DEFAULT 0.00,
  allowances DECIMAL(12, 2) DEFAULT 0.00,
  deductions DECIMAL(12, 2) DEFAULT 0.00,
  net_pay DECIMAL(12, 2) DEFAULT 0.00,
  payment_date DATE,
  payment_method ENUM('cash', 'bank_transfer', 'check') DEFAULT 'bank_transfer',
  status ENUM('pending', 'processed', 'paid') DEFAULT 'pending',
  notes TEXT,
  processed_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workforce(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_worker (worker_id),
  INDEX idx_month (payroll_month),
  INDEX idx_status (status)
);

-- ============================================================
-- 8. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
  category ENUM('project', 'task', 'equipment', 'material', 'budget', 'workforce', 'safety', 'system') DEFAULT 'system',
  reference_type VARCHAR(50),
  reference_id INT,
  is_read TINYINT(1) DEFAULT 0,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_read (is_read),
  INDEX idx_type (type),
  INDEX idx_created (created_at)
);

-- ============================================================
-- 9. DOCUMENTS
-- ============================================================

CREATE TABLE documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  document_code VARCHAR(20) UNIQUE NOT NULL,
  project_id INT,
  equipment_id INT,
  workforce_id INT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  document_type ENUM('blueprint', 'contract', 'permit', 'report', 'photo', 'invoice', 'safety_doc', 'specification', 'rc', 'insurance', 'fitness', 'aadhaar', 'pan', 'resume', 'appointment_letter', 'bank_details', 'other') DEFAULT 'other',
  file_path VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) DEFAULT NULL,
  file_size INT,
  file_type VARCHAR(50),
  version INT DEFAULT 1,
  status ENUM('draft', 'final', 'archived') DEFAULT 'draft',
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  FOREIGN KEY (workforce_id) REFERENCES workforce(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_project (project_id),
  INDEX idx_equipment (equipment_id),
  INDEX idx_workforce (workforce_id),
  INDEX idx_type (document_type),
  INDEX idx_uploader (uploaded_by)
);

-- Document Versions
CREATE TABLE document_versions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  document_id INT NOT NULL,
  version INT NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INT,
  change_notes TEXT,
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_document (document_id)
);

-- ============================================================
-- 10. SITE SAFETY & COMPLIANCE
-- ============================================================

CREATE TABLE safety_incidents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  incident_code VARCHAR(20) UNIQUE NOT NULL,
  project_id INT,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  incident_date DATE NOT NULL,
  incident_time TIME,
  location VARCHAR(255),
  severity ENUM('minor', 'major', 'critical', 'fatal') DEFAULT 'minor',
  type ENUM('injury', 'property_damage', 'near_miss', 'environmental', 'fire', 'other') DEFAULT 'other',
  root_cause TEXT,
  action_taken TEXT,
  corrective_actions TEXT,
  status ENUM('reported', 'investigating', 'resolved', 'closed') DEFAULT 'reported',
  reported_by INT,
  investigated_by INT,
  affected_persons INT DEFAULT 0,
  property_damage_estimate DECIMAL(15, 2) DEFAULT 0.00,
  lost_work_hours INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (investigated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_project (project_id),
  INDEX idx_severity (severity),
  INDEX idx_status (status),
  INDEX idx_date (incident_date)
);

-- Safety Inspections
CREATE TABLE safety_inspections (
  id INT PRIMARY KEY AUTO_INCREMENT,
  inspection_code VARCHAR(20) UNIQUE NOT NULL,
  project_id INT,
  title VARCHAR(200) NOT NULL,
  inspection_date DATE NOT NULL,
  inspector_name VARCHAR(100) NOT NULL,
  area_inspected VARCHAR(255),
  findings TEXT,
  recommendations TEXT,
  overall_rating ENUM('excellent', 'good', 'satisfactory', 'needs_improvement', 'poor') DEFAULT 'good',
  status ENUM('scheduled', 'completed', 'closed') DEFAULT 'scheduled',
  follow_up_date DATE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_project (project_id),
  INDEX idx_status (status),
  INDEX idx_date (inspection_date)
);

-- Safety Training
CREATE TABLE safety_training (
  id INT PRIMARY KEY AUTO_INCREMENT,
  training_code VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  training_date DATE NOT NULL,
  trainer_name VARCHAR(100),
  duration_hours DECIMAL(5, 2),
  location VARCHAR(255),
  topics TEXT,
  status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Safety Training Attendees
CREATE TABLE safety_training_attendees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  training_id INT NOT NULL,
  worker_id INT,
  user_id INT,
  attended TINYINT(1) DEFAULT 0,
  certificate_issued TINYINT(1) DEFAULT 0,
  FOREIGN KEY (training_id) REFERENCES safety_training(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES workforce(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_created (created_at)
);

-- Fuel Entries
CREATE TABLE fuel_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  equipment_id INT NOT NULL,
  fuel_date DATE NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(12, 2) NOT NULL,
  operator_id INT,
  odometer_reading INT,
  location VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_fuel_equipment (equipment_id),
  INDEX idx_fuel_date (fuel_date)
);

-- Staff Expenses
CREATE TABLE staff_expenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  expense_date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_status ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
  description TEXT,
  rejection_reason VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_expense_user (user_id),
  INDEX idx_expense_date (expense_date)
);

-- Trips
CREATE TABLE trips (
  id INT PRIMARY KEY AUTO_INCREMENT,
  trip_code VARCHAR(50) UNIQUE NOT NULL,
  equipment_id INT NOT NULL,
  driver_id INT NOT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME DEFAULT NULL,
  start_location VARCHAR(255) NOT NULL,
  end_location VARCHAR(255) NOT NULL,
  distance_covered DECIMAL(10, 2) DEFAULT 0.00,
  fuel_used DECIMAL(10, 2) DEFAULT 0.00,
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_trip_equipment (equipment_id),
  INDEX idx_trip_driver (driver_id)
);

-- ============================================================
-- INSERT SEED DATA
-- ============================================================

-- Default Admin User (password: Admin@123)
INSERT INTO users (employee_id, name, email, password, role, phone, designation, department, status) VALUES
('ADM001', 'System Administrator', 'admin@roadconstruction.com', '$2a$10$xVqYLFMJD5pMzbVZKw3XaeJq5kDmGpC0hFpRQrKXqR0kGvCx9pYdi', 'admin', '+1-555-0100', 'Project Director', 'Management', 'active');

-- Default User (password: User@123)
INSERT INTO users (employee_id, name, email, password, role, phone, designation, department, status) VALUES
('EMP001', 'John Engineer', 'user@roadconstruction.com', '$2a$10$8KzQMGY5sMF8GqZrHqYcXOQmT5oG6oFqMx3bZyRvLw0lKtDpV7e2e', 'user', '+1-555-0101', 'Site Engineer', 'Engineering', 'active');

-- Insert some sample data for categories
INSERT INTO budget_categories (name, description) VALUES
('Materials', 'Cost of raw materials and supplies'),
('Labor', 'Workforce and contractor costs'),
('Equipment', 'Machinery and equipment costs'),
('Transportation', 'Logistics and transport costs'),
('Permits & Licenses', 'Government fees and permits'),
('Administrative', 'Office and administrative expenses'),
('Contingency', 'Emergency and contingency funds');
