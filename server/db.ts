import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const db = new Database(path.join(dataDir, 'family_assets.db'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS asset_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('ASSET', 'LIABILITY')),
    icon TEXT
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    category_id INTEGER,
    name TEXT NOT NULL,
    currency TEXT DEFAULT 'CNY',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (category_id) REFERENCES asset_categories(id)
  );

  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    record_date TEXT NOT NULL, -- YYYY-MM-DD (usually 1st of month)
    amount REAL NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    repayment_principal REAL,
    repayment_interest REAL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    UNIQUE(account_id, record_date)
  );

  CREATE TABLE IF NOT EXISTS renqing_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')), -- IN: Received, OUT: Given
    person TEXT NOT NULL,
    event TEXT NOT NULL,
    item TEXT NOT NULL, -- Gift name or 'Red Envelope'
    amount REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS renqing_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS families (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS member_families (
    member_id INTEGER,
    family_id INTEGER,
    PRIMARY KEY (member_id, family_id),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS family_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    event_date TEXT NOT NULL,
    family_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS insurance_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    company TEXT,
    premium_amount REAL,
    premium_period TEXT,
    insured_member_id INTEGER,
    beneficiary TEXT,
    start_date TEXT,
    end_date TEXT,
    renewal_date TEXT,
    benefits_desc TEXT,
    policy_file_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrations for new columns
const runMigration = (table: string, column: string, type: string) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  const hasColumn = columns.some(c => c.name === column);
  if (!hasColumn) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`Added column ${column} to ${table}`);
    } catch (e) {
      console.error(`Failed to add column ${column} to ${table}:`, e);
    }
  }
};

runMigration('members', 'password_hash', 'TEXT');
runMigration('members', 'is_admin', 'INTEGER DEFAULT 0');

runMigration('accounts', 'credit_card_billing_day', 'INTEGER');
runMigration('accounts', 'loan_interest_rate', 'REAL');
runMigration('accounts', 'loan_term_months', 'INTEGER');
runMigration('accounts', 'loan_start_date', 'TEXT');
runMigration('accounts', 'repayment_day', 'INTEGER');
runMigration('accounts', 'repayment_method', 'TEXT');

runMigration('records', 'updated_at', 'DATETIME');
runMigration('records', 'repayment_principal', 'REAL');
runMigration('records', 'repayment_interest', 'REAL');
runMigration('records', 'shares', 'REAL');

runMigration('records', 'items', 'TEXT');
runMigration('asset_categories', 'is_system', 'INTEGER DEFAULT 0');
runMigration('insurance_payments', 'account_id', 'INTEGER');

runMigration('record_history', 'old_items', 'TEXT');
runMigration('record_history', 'new_items', 'TEXT');

// Create History Table
db.exec(`
  CREATE TABLE IF NOT EXISTS record_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER,
    old_amount REAL,
    new_amount REAL,
    old_notes TEXT,
    new_notes TEXT,
    old_repayment_principal REAL,
    new_repayment_principal REAL,
    old_repayment_interest REAL,
    new_repayment_interest REAL,
    old_shares REAL,
    new_shares REAL,
    old_items TEXT,
    new_items TEXT,
    change_reason TEXT,
    operator_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (record_id) REFERENCES records(id)
  );
  
  CREATE TABLE IF NOT EXISTS benefits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source TEXT,
    expiration_date TEXT,
    total_count INTEGER,
    used_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS benefit_usages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    benefit_id INTEGER,
    usage_date TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (benefit_id) REFERENCES benefits(id)
  );

  CREATE TABLE IF NOT EXISTS insurance_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_id INTEGER,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'CNY',
    payment_date TEXT NOT NULL,
    payment_account_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (policy_id) REFERENCES insurance_policies(id),
    FOREIGN KEY (payment_account_id) REFERENCES accounts(id)
  );
`);

runMigration('benefits', 'type', "TEXT DEFAULT 'TOTAL'");
runMigration('benefits', 'period', "TEXT");

runMigration('accounts', 'attributes', 'TEXT');
runMigration('accounts', 'is_active', 'INTEGER DEFAULT 1');
runMigration('record_history', 'operator_name', 'TEXT');
runMigration('benefit_usages', 'operator_name', 'TEXT');

// Migrate Category Names
try {
  db.prepare("UPDATE asset_categories SET name = 'Cash & Demand Deposits' WHERE name = 'Cash & Deposits'").run();
  db.prepare("UPDATE asset_categories SET name = 'Investment Insurance' WHERE name = 'Insurance'").run();
  db.prepare("UPDATE asset_categories SET name = 'Stocks' WHERE name = 'Stocks & Funds'").run();
  
  const fundsExist = db.prepare("SELECT count(*) as count FROM asset_categories WHERE name = 'Funds'").get() as { count: number };
  if (fundsExist.count === 0) {
    db.prepare("INSERT INTO asset_categories (name, type, icon) VALUES (?, ?, ?)").run('Funds', 'ASSET', 'pie-chart');
  }
} catch (e) {
  console.error("Error migrating categories:", e);
}

// Seed initial categories if empty
const categoriesCount = db.prepare('SELECT count(*) as count FROM asset_categories').get() as { count: number };
if (categoriesCount.count === 0) {
  const insertCategory = db.prepare('INSERT INTO asset_categories (name, type, icon, is_system) VALUES (?, ?, ?, ?)');
  const categories = [
    ['Cash & Demand Deposits', 'ASSET', 'wallet', 1],
    ['Time Deposits', 'ASSET', 'piggy-bank', 1],
    ['Investment Insurance', 'ASSET', 'shield', 1],
    ['Funds', 'ASSET', 'pie-chart', 1],
    ['Stocks', 'ASSET', 'trending-up', 1],
    ['Receivables', 'ASSET', 'arrow-down-left', 1],
    ['Loans', 'LIABILITY', 'landmark', 1],
    ['Real Estate', 'ASSET', 'home', 0],
    ['Vehicles', 'ASSET', 'car', 0],
    ['Credit Cards', 'LIABILITY', 'credit-card', 0],
    ['Other Liabilities', 'LIABILITY', 'alert-circle', 0]
  ];
  categories.forEach(c => insertCategory.run(c));
} else {
  // Ensure system categories exist and are marked as system
  const systemCategories = [
    ['Cash & Demand Deposits', 'ASSET', 'wallet'],
    ['Time Deposits', 'ASSET', 'piggy-bank'],
    ['Investment Insurance', 'ASSET', 'shield'],
    ['Funds', 'ASSET', 'pie-chart'],
    ['Stocks', 'ASSET', 'trending-up'],
    ['Receivables', 'ASSET', 'arrow-down-left'],
    ['Loans', 'LIABILITY', 'landmark']
  ];
  const updateSystem = db.prepare('UPDATE asset_categories SET is_system = 1 WHERE name = ?');
  const insertSystem = db.prepare('INSERT INTO asset_categories (name, type, icon, is_system) VALUES (?, ?, ?, 1)');
  
  systemCategories.forEach(c => {
    const info = updateSystem.run(c[0]);
    if (info.changes === 0) {
      insertSystem.run(c);
    }
  });
}

export default db;
