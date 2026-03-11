import express from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from './server/db';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password: string, storedHash: string) => {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use('/uploads', express.static('uploads'));

  // --- Auth Routes ---

  app.get('/api/auth/status', (req, res) => {
    const admin = db.prepare('SELECT id FROM members WHERE is_admin = 1').get();
    res.json({ hasAdmin: !!admin });
  });

  app.get('/api/auth/admins', (req, res) => {
    const admins = db.prepare('SELECT id, name FROM members WHERE is_admin = 1').all();
    res.json(admins);
  });

  app.post('/api/auth/setup', (req, res) => {
    const { name, password } = req.body;
    const admin = db.prepare('SELECT id FROM members WHERE is_admin = 1').get();
    if (admin) {
      return res.status(400).json({ error: 'Admin already exists' });
    }

    const passwordHash = hashPassword(password);
    const info = db.prepare('INSERT INTO members (name, role, is_admin, password_hash) VALUES (?, ?, 1, ?)').run(name, 'Admin', passwordHash);
    res.json({ success: true, id: info.lastInsertRowid });
  });

  app.post('/api/auth/login', (req, res) => {
    const { memberId, password } = req.body;
    
    let admin;
    if (memberId) {
      admin = db.prepare('SELECT * FROM members WHERE id = ? AND is_admin = 1').get(memberId) as any;
    } else {
      // Fallback for legacy or initial setup (though UI should force selection)
      // Or if only one admin exists?
      // Let's require memberId for clarity, or default to the first one if not provided?
      // Better to require it if we want multi-user support.
      // But for backward compatibility with my previous code (which didn't send memberId), 
      // I'll check if there's only one admin.
      const admins = db.prepare('SELECT * FROM members WHERE is_admin = 1').all() as any[];
      if (admins.length === 1) {
        admin = admins[0];
      } else {
         return res.status(400).json({ error: 'Member ID required' });
      }
    }
    
    if (!admin) {
      return res.status(400).json({ error: 'Admin not found' });
    }

    if (verifyPassword(password, admin.password_hash)) {
      res.json({ success: true, token: 'dummy-token', member: { id: admin.id, name: admin.name } });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  });

  app.post('/api/auth/change-password', (req, res) => {
    const { memberId, oldPassword, newPassword } = req.body;
    // If memberId is not provided, assume current logged in user (but we don't have session).
    // So we must provide memberId or oldPassword must match *some* admin?
    // Let's assume the UI sends memberId.
    
    if (!memberId) return res.status(400).json({ error: 'Member ID required' });

    const admin = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) as any;

    if (!admin) {
      return res.status(400).json({ error: 'User not found' });
    }

    if (verifyPassword(oldPassword, admin.password_hash)) {
      const newHash = hashPassword(newPassword);
      db.prepare('UPDATE members SET password_hash = ? WHERE id = ?').run(newHash, admin.id);
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid old password' });
    }
  });

  // --- Families Routes ---

  app.get('/api/families', (req, res) => {
    const families = db.prepare('SELECT * FROM families').all();
    res.json(families);
  });

  app.post('/api/families', (req, res) => {
    const { name } = req.body;
    const info = db.prepare('INSERT INTO families (name) VALUES (?)').run(name);
    res.json({ id: info.lastInsertRowid, name });
  });

  app.delete('/api/families/:id', (req, res) => {
    db.prepare('DELETE FROM families WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // --- Export/Import Routes ---

  app.get('/api/export', (req, res) => {
    const data = {
      members: db.prepare('SELECT * FROM members').all(),
      families: db.prepare('SELECT * FROM families').all(),
      member_families: db.prepare('SELECT * FROM member_families').all(),
      asset_categories: db.prepare('SELECT * FROM asset_categories').all(),
      accounts: db.prepare('SELECT * FROM accounts').all(),
      records: db.prepare('SELECT * FROM records').all(),
      record_history: db.prepare('SELECT * FROM record_history').all(),
      renqing_records: db.prepare('SELECT * FROM renqing_records').all(),
      renqing_events: db.prepare('SELECT * FROM renqing_events').all(),
      family_events: db.prepare('SELECT * FROM family_events').all(),
      insurance_policies: db.prepare('SELECT * FROM insurance_policies').all(),
      benefits: db.prepare('SELECT * FROM benefits').all(),
      benefit_usages: db.prepare('SELECT * FROM benefit_usages').all(),
      insurance_payments: db.prepare('SELECT * FROM insurance_payments').all(),
    };
    res.json(data);
  });

  app.post('/api/import', (req, res) => {
    const data = req.body;
    
    // Basic validation
    if (!data.members || !data.accounts) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    const transaction = db.transaction(() => {
      // Clear all tables
      db.prepare('DELETE FROM insurance_payments').run();
      db.prepare('DELETE FROM benefit_usages').run();
      db.prepare('DELETE FROM benefits').run();
      db.prepare('DELETE FROM insurance_policies').run();
      db.prepare('DELETE FROM family_events').run();
      db.prepare('DELETE FROM record_history').run();
      db.prepare('DELETE FROM records').run();
      db.prepare('DELETE FROM accounts').run();
      db.prepare('DELETE FROM member_families').run();
      db.prepare('DELETE FROM families').run();
      db.prepare('DELETE FROM members').run();
      db.prepare('DELETE FROM asset_categories').run();
      db.prepare('DELETE FROM renqing_records').run();
      db.prepare('DELETE FROM renqing_events').run();

      // Insert data
      // Helper to insert
      const insert = (table: string, rows: any[]) => {
        if (!rows || rows.length === 0) return;
        const keys = Object.keys(rows[0]);
        const placeholders = keys.map(() => '?').join(',');
        const stmt = db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`);
        rows.forEach(row => stmt.run(...Object.values(row)));
      };

      insert('members', data.members);
      insert('families', data.families || []);
      insert('member_families', data.member_families || []);
      insert('asset_categories', data.asset_categories);
      insert('accounts', data.accounts);
      insert('records', data.records);
      insert('record_history', data.record_history || []);
      insert('renqing_records', data.renqing_records || []);
      insert('renqing_events', data.renqing_events || []);
      insert('family_events', data.family_events || []);
      insert('insurance_policies', data.insurance_policies || []);
      insert('benefits', data.benefits || []);
      insert('benefit_usages', data.benefit_usages || []);
      insert('insurance_payments', data.insurance_payments || []);
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      console.error('Import failed:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // --- API Routes ---

  // Members
  app.get('/api/members', (req, res) => {
    const members = db.prepare('SELECT * FROM members').all() as any[];
    // Fetch families for each member
    const memberFamilies = db.prepare('SELECT * FROM member_families').all() as any[];
    
    const membersWithFamilies = members.map(m => ({
      ...m,
      familyIds: memberFamilies.filter(mf => mf.member_id === m.id).map(mf => mf.family_id)
    }));
    
    res.json(membersWithFamilies);
  });

  app.post('/api/members', (req, res) => {
    const { name, role, familyIds, is_admin, password } = req.body;
    
    const transaction = db.transaction(() => {
      let passwordHash = null;
      if (is_admin && password) {
        passwordHash = hashPassword(password);
      }

      const info = db.prepare('INSERT INTO members (name, role, is_admin, password_hash) VALUES (?, ?, ?, ?)').run(name, role, is_admin ? 1 : 0, passwordHash);
      const memberId = info.lastInsertRowid;

      if (familyIds && Array.isArray(familyIds)) {
        const insertFamily = db.prepare('INSERT INTO member_families (member_id, family_id) VALUES (?, ?)');
        familyIds.forEach((familyId: number) => {
          insertFamily.run(memberId, familyId);
        });
      }
      return { id: memberId, name, role, familyIds, is_admin };
    });

    try {
      const result = transaction();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/members/:id', (req, res) => {
    const { name, role, familyIds, is_admin, password } = req.body;
    const memberId = req.params.id;

    const transaction = db.transaction(() => {
      // Update basic info
      let sql = 'UPDATE members SET name = ?, role = ?, is_admin = ?';
      const params = [name, role, is_admin ? 1 : 0];

      if (password) {
        const passwordHash = hashPassword(password);
        sql += ', password_hash = ?';
        params.push(passwordHash);
      }
      
      sql += ' WHERE id = ?';
      params.push(memberId);

      db.prepare(sql).run(...params);

      // Update families
      if (familyIds && Array.isArray(familyIds)) {
        db.prepare('DELETE FROM member_families WHERE member_id = ?').run(memberId);
        const insertFamily = db.prepare('INSERT INTO member_families (member_id, family_id) VALUES (?, ?)');
        familyIds.forEach((familyId: number) => {
          insertFamily.run(memberId, familyId);
        });
      }
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/members/:id', (req, res) => {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM member_families WHERE member_id = ?').run(req.params.id);
      db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
    });
    transaction();
    res.json({ success: true });
  });

  // Categories
  app.get('/api/categories', (req, res) => {
    const categories = db.prepare('SELECT * FROM asset_categories ORDER BY type, name').all();
    res.json(categories);
  });

  app.post('/api/categories', (req, res) => {
    const { name, type } = req.body;
    const info = db.prepare('INSERT INTO asset_categories (name, type) VALUES (?, ?)').run(name, type);
    res.json({ id: info.lastInsertRowid, name, type });
  });

  app.delete('/api/categories/:id', (req, res) => {
    const category = db.prepare('SELECT is_system FROM asset_categories WHERE id = ?').get(req.params.id) as any;
    if (category && category.is_system) {
      return res.status(400).json({ error: 'Cannot delete system categories' });
    }
    db.prepare('DELETE FROM asset_categories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Accounts
  app.get('/api/accounts', (req, res) => {
    const accounts = db.prepare(`
      SELECT a.*, c.name as category_name, c.type as category_type, m.name as member_name 
      FROM accounts a 
      LEFT JOIN asset_categories c ON a.category_id = c.id
      LEFT JOIN members m ON a.member_id = m.id
      ORDER BY m.name, c.type, a.name
    `).all();
    res.json(accounts);
  });

  app.post('/api/accounts', (req, res) => {
    const { name, category_id, member_id, currency, notes, repayment_day, attributes } = req.body;
    const info = db.prepare(`
      INSERT INTO accounts (name, category_id, member_id, currency, notes, repayment_day, attributes) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, category_id, member_id, currency, notes, repayment_day, attributes ? JSON.stringify(attributes) : null);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/accounts/:id', (req, res) => {
    const { name, category_id, member_id, currency, notes, repayment_day, attributes, is_active } = req.body;
    db.prepare(`
      UPDATE accounts 
      SET name = ?, category_id = ?, member_id = ?, currency = ?, notes = ?, repayment_day = ?, attributes = ?, is_active = ?
      WHERE id = ?
    `).run(name, category_id, member_id, currency, notes, repayment_day, attributes ? JSON.stringify(attributes) : null, is_active !== undefined ? is_active : 1, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/accounts/:id', (req, res) => {
    const transaction = db.transaction(() => {
      // First delete record history
      db.prepare(`
        DELETE FROM record_history 
        WHERE record_id IN (SELECT id FROM records WHERE account_id = ?)
      `).run(req.params.id);
      // Then delete records
      db.prepare('DELETE FROM records WHERE account_id = ?').run(req.params.id);
      // Then delete the account
      db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);
    });
    transaction();
    res.json({ success: true });
  });

  // Records
  app.get('/api/records', (req, res) => {
    const { month } = req.query;
    const records = db.prepare(`
      SELECT r.*, a.name as account_name, m.name as member_name
      FROM records r
      JOIN accounts a ON r.account_id = a.id
      JOIN members m ON a.member_id = m.id
      WHERE strftime('%Y-%m', r.record_date) = ?
    `).all(month);
    res.json(records);
  });

  app.post('/api/records/batch', (req, res) => {
    const { date, records, operator_name } = req.body;
    const transaction = db.transaction(() => {
      records.forEach((r: any) => {
        const existing = db.prepare('SELECT * FROM records WHERE account_id = ? AND record_date = ?').get(r.account_id, date) as any;
        const itemsJson = r.items ? JSON.stringify(r.items) : null;
        
        if (existing) {
          if (existing.amount !== r.amount || existing.notes !== r.notes || 
              existing.repayment_principal !== r.repayment_principal || 
              existing.repayment_interest !== r.repayment_interest ||
              existing.shares !== r.shares ||
              existing.items !== itemsJson) {
            
            db.prepare(`
              INSERT INTO record_history (record_id, old_amount, new_amount, old_notes, new_notes, 
                old_repayment_principal, new_repayment_principal, old_repayment_interest, new_repayment_interest, old_shares, new_shares, old_items, new_items, change_reason, operator_name)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(existing.id, existing.amount, r.amount, existing.notes, r.notes,
                   existing.repayment_principal, r.repayment_principal, existing.repayment_interest, r.repayment_interest, existing.shares, r.shares, existing.items, itemsJson, 'Update', operator_name || 'Admin');

            db.prepare(`
              UPDATE records 
              SET amount = ?, notes = ?, repayment_principal = ?, repayment_interest = ?, shares = ?, items = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(r.amount, r.notes, r.repayment_principal, r.repayment_interest, r.shares, itemsJson, existing.id);
          }
        } else {
          db.prepare(`
            INSERT INTO records (account_id, record_date, amount, notes, repayment_principal, repayment_interest, shares, items)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(r.account_id, date, r.amount, r.notes, r.repayment_principal, r.repayment_interest, r.shares, itemsJson);
        }
      });
    });
    transaction();
    res.json({ success: true });
  });

  app.get('/api/records/history/:id', (req, res) => {
    const history = db.prepare('SELECT * FROM record_history WHERE record_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json(history);
  });

  app.post('/api/records/copy-previous', (req, res) => {
    const { currentMonth } = req.body;
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() - 1);
    const prevMonth = date.toISOString().slice(0, 7);

    const transaction = db.transaction(() => {
      const recordsToCopy = db.prepare(`
        SELECT * FROM records WHERE strftime('%Y-%m', record_date) = ?
      `).all(prevMonth);

      let count = 0;
      recordsToCopy.forEach((r: any) => {
        const existing = db.prepare('SELECT id FROM records WHERE account_id = ? AND record_date = ?').get(r.account_id, currentMonth);
        if (!existing) {
          db.prepare(`
            INSERT INTO records (account_id, record_date, amount, notes, repayment_principal, repayment_interest, shares, items)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(r.account_id, currentMonth, r.amount, r.notes, r.repayment_principal, r.repayment_interest, r.shares, r.items);
          count++;
        }
      });
      return count;
    });

    const count = transaction();
    res.json({ success: true, count });
  });

  // Renqing
  app.get('/api/renqing', (req, res) => {
    const { person, event, type } = req.query;
    let query = 'SELECT * FROM renqing_records WHERE 1=1';
    const params: any[] = [];

    if (person) {
      query += ' AND person LIKE ?';
      params.push(`%${person}%`);
    }
    if (event) {
      query += ' AND event LIKE ?';
      params.push(`%${event}%`);
    }
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY record_date DESC';
    const renqing = db.prepare(query).all(...params);
    res.json(renqing);
  });

  app.get('/api/renqing/events', (req, res) => {
    const events = db.prepare('SELECT * FROM renqing_events ORDER BY name ASC').all();
    res.json(events);
  });

  app.post('/api/renqing/events', (req, res) => {
    const { name } = req.body;
    try {
      const info = db.prepare('INSERT INTO renqing_events (name) VALUES (?)').run(name);
      res.json({ id: info.lastInsertRowid, name });
    } catch (e: any) {
      if (e.message.includes('UNIQUE constraint failed')) {
        const existing = db.prepare('SELECT * FROM renqing_events WHERE name = ?').get(name);
        res.json(existing);
      } else {
        res.status(500).json({ error: e.message });
      }
    }
  });

  app.get('/api/renqing/stats', (req, res) => {
    const byPerson = db.prepare(`
      SELECT 
        person,
        SUM(CASE WHEN type = 'IN' THEN amount ELSE 0 END) as total_in,
        SUM(CASE WHEN type = 'OUT' THEN amount ELSE 0 END) as total_out,
        COUNT(*) as count
      FROM renqing_records
      GROUP BY person
      ORDER BY total_in + total_out DESC
    `).all();

    const byEvent = db.prepare(`
      SELECT 
        event,
        SUM(CASE WHEN type = 'IN' THEN amount ELSE 0 END) as total_in,
        SUM(CASE WHEN type = 'OUT' THEN amount ELSE 0 END) as total_out,
        COUNT(*) as count
      FROM renqing_records
      GROUP BY event
      ORDER BY total_in + total_out DESC
    `).all();

    res.json({ byPerson, byEvent });
  });

  app.post('/api/renqing', (req, res) => {
    const { type, amount, person, event, item, record_date, notes } = req.body;
    const info = db.prepare(`
      INSERT INTO renqing_records (type, amount, person, event, item, record_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(type, amount, person, event, item, record_date, notes);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/renqing/:id', (req, res) => {
    const { type, amount, person, event, item, record_date, notes } = req.body;
    db.prepare(`
      UPDATE renqing_records
      SET type = ?, amount = ?, person = ?, event = ?, item = ?, record_date = ?, notes = ?
      WHERE id = ?
    `).run(type, amount, person, event, item, record_date, notes, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/renqing/:id', (req, res) => {
    db.prepare('DELETE FROM renqing_records WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Family Events
  app.get('/api/events', (req, res) => {
    const { month } = req.query;
    let events;
    if (month) {
      events = db.prepare(`SELECT * FROM family_events WHERE strftime('%Y-%m', event_date) = ? ORDER BY event_date DESC`).all(month);
    } else {
      events = db.prepare('SELECT * FROM family_events ORDER BY event_date DESC').all();
    }
    res.json(events);
  });

  app.post('/api/events', (req, res) => {
    const { title, description, event_date, family_id } = req.body;
    const info = db.prepare(`
      INSERT INTO family_events (title, description, event_date, family_id)
      VALUES (?, ?, ?, ?)
    `).run(title, description, event_date, family_id);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/events/:id', (req, res) => {
    const { title, description, event_date, family_id } = req.body;
    db.prepare(`
      UPDATE family_events
      SET title = ?, description = ?, event_date = ?, family_id = ?
      WHERE id = ?
    `).run(title, description, event_date, family_id, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/events/:id', (req, res) => {
    db.prepare('DELETE FROM family_events WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Insurance Policies
  app.get('/api/insurance', (req, res) => {
    const policies = db.prepare(`
      SELECT i.*, m.name as member_name 
      FROM insurance_policies i
      LEFT JOIN members m ON i.insured_member_id = m.id
      ORDER BY i.created_at DESC
    `).all() as any[];
    
    const payments = db.prepare(`
      SELECT p.*, a.name as account_name 
      FROM insurance_payments p
      LEFT JOIN accounts a ON p.payment_account_id = a.id
      ORDER BY p.payment_date DESC
    `).all() as any[];
    
    const policiesWithPayments = policies.map(p => ({
      ...p,
      payments: payments.filter(pay => pay.policy_id === p.id)
    }));
    
    res.json(policiesWithPayments);
  });

  app.post('/api/insurance', upload.single('policy_file'), (req, res) => {
    const { name, type, company, premium_amount, premium_period, insured_member_id, beneficiary, start_date, end_date, renewal_date, benefits_desc } = req.body;
    const policy_file_url = req.file ? `/uploads/${req.file.filename}` : null;
    
    const info = db.prepare(`
      INSERT INTO insurance_policies (name, type, company, premium_amount, premium_period, insured_member_id, beneficiary, start_date, end_date, renewal_date, benefits_desc, policy_file_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, type, company, premium_amount, premium_period, insured_member_id, beneficiary, start_date, end_date, renewal_date, benefits_desc, policy_file_url);
    res.json({ id: info.lastInsertRowid, policy_file_url });
  });

  app.put('/api/insurance/:id', upload.single('policy_file'), (req, res) => {
    const { name, type, company, premium_amount, premium_period, insured_member_id, beneficiary, start_date, end_date, renewal_date, benefits_desc } = req.body;
    
    let sql = `
      UPDATE insurance_policies
      SET name = ?, type = ?, company = ?, premium_amount = ?, premium_period = ?, insured_member_id = ?, beneficiary = ?, start_date = ?, end_date = ?, renewal_date = ?, benefits_desc = ?
    `;
    const params = [name, type, company, premium_amount, premium_period, insured_member_id, beneficiary, start_date, end_date, renewal_date, benefits_desc];

    if (req.file) {
      sql += `, policy_file_url = ?`;
      params.push(`/uploads/${req.file.filename}`);
    }
    
    sql += ` WHERE id = ?`;
    params.push(req.params.id);

    db.prepare(sql).run(...params);
    res.json({ success: true });
  });

  app.delete('/api/insurance/:id', (req, res) => {
    const policy = db.prepare('SELECT policy_file_url FROM insurance_policies WHERE id = ?').get(req.params.id) as any;
    if (policy && policy.policy_file_url) {
      const filePath = path.join(process.cwd(), policy.policy_file_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM insurance_payments WHERE policy_id = ?').run(req.params.id);
      db.prepare('DELETE FROM insurance_policies WHERE id = ?').run(req.params.id);
    });
    transaction();
    res.json({ success: true });
  });

  app.post('/api/insurance/:id/payments', (req, res) => {
    const { amount, currency, payment_date, account_id, notes } = req.body;
    const policyId = req.params.id;
    
    const info = db.prepare(`
      INSERT INTO insurance_payments (policy_id, amount, currency, payment_date, payment_account_id, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(policyId, amount, currency || 'CNY', payment_date || new Date().toISOString().split('T')[0], account_id, notes);
    
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/insurance/payments/:id', (req, res) => {
    const { amount, currency, payment_date, account_id, notes } = req.body;
    db.prepare(`
      UPDATE insurance_payments 
      SET amount = ?, currency = ?, payment_date = ?, payment_account_id = ?, notes = ?
      WHERE id = ?
    `).run(amount, currency || 'CNY', payment_date, account_id, notes, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/insurance/payments/:id', (req, res) => {
    db.prepare('DELETE FROM insurance_payments WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/insurance/:id/payments', (req, res) => {
    const payments = db.prepare(`
      SELECT ip.*, a.name as account_name
      FROM insurance_payments ip
      LEFT JOIN accounts a ON ip.payment_account_id = a.id
      WHERE ip.policy_id = ?
      ORDER BY ip.payment_date DESC
    `).all(req.params.id);
    res.json(payments);
  });

  app.put('/api/insurance/payments/:paymentId', (req, res) => {
    const { amount, currency, payment_date, account_id, notes } = req.body;
    db.prepare(`
      UPDATE insurance_payments
      SET amount = ?, currency = ?, payment_date = ?, payment_account_id = ?, notes = ?
      WHERE id = ?
    `).run(amount, currency || 'CNY', payment_date, account_id, notes, req.params.paymentId);
    res.json({ success: true });
  });

  app.delete('/api/insurance/payments/:paymentId', (req, res) => {
    db.prepare('DELETE FROM insurance_payments WHERE id = ?').run(req.params.paymentId);
    res.json({ success: true });
  });

  // Benefits
  app.get('/api/benefits', (req, res) => {
    const benefits = db.prepare('SELECT * FROM benefits ORDER BY created_at DESC').all() as any[];
    const usages = db.prepare('SELECT * FROM benefit_usages ORDER BY usage_date DESC').all() as any[];
    
    const benefitsWithUsages = benefits.map(b => ({
      ...b,
      usages: usages.filter(u => u.benefit_id === b.id)
    }));
    
    res.json(benefitsWithUsages);
  });

  app.post('/api/benefits', (req, res) => {
    const { name, source, expiration_date, total_count, notes, type, period } = req.body;
    const info = db.prepare(`
      INSERT INTO benefits (name, source, expiration_date, total_count, notes, type, period)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, source, expiration_date, total_count, notes, type || 'TOTAL', period);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/benefits/:id', (req, res) => {
    const { name, source, expiration_date, total_count, used_count, status, notes, type, period } = req.body;
    db.prepare(`
      UPDATE benefits
      SET name = ?, source = ?, expiration_date = ?, total_count = ?, used_count = ?, status = ?, notes = ?, type = ?, period = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, source, expiration_date, total_count, used_count, status, notes, type || 'TOTAL', period, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/benefits/:id', (req, res) => {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM benefit_usages WHERE benefit_id = ?').run(req.params.id);
      db.prepare('DELETE FROM benefits WHERE id = ?').run(req.params.id);
    });
    transaction();
    res.json({ success: true });
  });

  app.post('/api/benefits/:id/use', (req, res) => {
    const { usage_date, notes, operator_name } = req.body;
    const benefitId = req.params.id;
    
    const transaction = db.transaction(() => {
      const benefit = db.prepare('SELECT * FROM benefits WHERE id = ?').get(benefitId) as any;
      if (!benefit) throw new Error('Benefit not found');
      
      db.prepare(`
        INSERT INTO benefit_usages (benefit_id, usage_date, notes, operator_name)
        VALUES (?, ?, ?, ?)
      `).run(benefitId, usage_date || new Date().toISOString().split('T')[0], notes, operator_name || null);
      
      const newUsedCount = benefit.used_count + 1;
      let newStatus = benefit.status;
      if (benefit.type === 'TOTAL' && benefit.total_count && newUsedCount >= benefit.total_count) {
        newStatus = 'USED_UP';
      }
      
      db.prepare(`
        UPDATE benefits SET used_count = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(newUsedCount, newStatus, benefitId);
    });
    
    transaction();
    res.json({ success: true });
  });

  app.put('/api/benefit-usages/:id', (req, res) => {
    const { usage_date, notes, operator_name } = req.body;
    db.prepare(`
      UPDATE benefit_usages 
      SET usage_date = ?, notes = ?, operator_name = ?
      WHERE id = ?
    `).run(usage_date, notes, operator_name || null, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/benefit-usages/:id', (req, res) => {
    const usageId = req.params.id;
    const transaction = db.transaction(() => {
      const usage = db.prepare('SELECT * FROM benefit_usages WHERE id = ?').get(usageId) as any;
      if (!usage) throw new Error('Usage not found');
      
      const benefit = db.prepare('SELECT * FROM benefits WHERE id = ?').get(usage.benefit_id) as any;
      if (benefit) {
        const newUsedCount = Math.max(0, benefit.used_count - 1);
        let newStatus = benefit.status;
        if (newStatus === 'USED_UP' && benefit.total_count && newUsedCount < benefit.total_count) {
          newStatus = 'ACTIVE';
        }
        db.prepare(`
          UPDATE benefits SET used_count = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(newUsedCount, newStatus, benefit.id);
      }
      
      db.prepare('DELETE FROM benefit_usages WHERE id = ?').run(usageId);
    });
    
    transaction();
    res.json({ success: true });
  });

  app.get('/api/benefits/usages', (req, res) => {
    const { month } = req.query;
    let query = `
      SELECT bu.*, b.name as benefit_name
      FROM benefit_usages bu
      JOIN benefits b ON bu.benefit_id = b.id
      ORDER BY bu.usage_date DESC
    `;
    let params: any[] = [];
    
    if (month) {
      query = `
        SELECT bu.*, b.name as benefit_name
        FROM benefit_usages bu
        JOIN benefits b ON bu.benefit_id = b.id
        WHERE bu.usage_date LIKE ?
        ORDER BY bu.usage_date DESC
      `;
      params = [`${month}%`];
    }
    
    const usages = db.prepare(query).all(...params);
    res.json(usages);
  });

  // Dashboard Summary
  app.get('/api/dashboard/summary', (req, res) => {
    const { month, familyId } = req.query;
    
    let familyFilter = '';
    const params = [month];
    if (familyId) {
      familyFilter = `AND m.id IN (SELECT member_id FROM member_families WHERE family_id = ?)`;
      params.push(familyId);
    }

    const summary = db.prepare(`
      SELECT 
        SUM(CASE WHEN c.type = 'ASSET' THEN r.amount ELSE 0 END) as totalAssets,
        SUM(CASE WHEN c.type = 'LIABILITY' THEN r.amount ELSE 0 END) as totalLiabilities,
        SUM(CASE WHEN c.type = 'ASSET' THEN r.amount ELSE -r.amount END) as netWorth
      FROM records r
      JOIN accounts a ON r.account_id = a.id
      JOIN members m ON a.member_id = m.id
      JOIN asset_categories c ON a.category_id = c.id
      WHERE strftime('%Y-%m', r.record_date) = ? ${familyFilter}
    `).get(...params);

    const breakdown = db.prepare(`
      SELECT 
        c.name as category_name, 
        c.type, 
        SUM(r.amount) as amount
      FROM records r
      JOIN accounts a ON r.account_id = a.id
      JOIN asset_categories c ON a.category_id = c.id
      JOIN members m ON a.member_id = m.id
      WHERE strftime('%Y-%m', r.record_date) = ? ${familyFilter}
      GROUP BY c.name, c.type
    `).all(...params);

    const result = {
      totalAssets: summary?.totalAssets || 0,
      totalLiabilities: summary?.totalLiabilities || 0,
      netWorth: summary?.netWorth || 0,
      breakdown: breakdown || []
    };

    res.json(result);
  });

  app.get('/api/dashboard/trend', (req, res) => {
    const { groupBy, period, familyId } = req.query; // groupBy: 'family' | 'member'; period: 'month' | 'year' | 'week' | 'quarter'; familyId: optional filter
    
    let timeFormat = '%Y-%m';
    let timeSelect = `strftime('${timeFormat}', r.record_date)`;

    if (period === 'year') {
      timeFormat = '%Y';
      timeSelect = `strftime('${timeFormat}', r.record_date)`;
    } else if (period === 'week') {
      timeFormat = '%Y-%W';
      timeSelect = `strftime('${timeFormat}', r.record_date)`;
    } else if (period === 'quarter') {
      // SQLite doesn't have %Q, so we construct it: YYYY-Qx
      timeSelect = `strftime('%Y', r.record_date) || '-Q' || ((CAST(strftime('%m', r.record_date) AS INTEGER) + 2) / 3)`;
    }

    let familyFilter = '';
    const params: any[] = [];
    if (familyId) {
      familyFilter = `AND m.id IN (SELECT member_id FROM member_families WHERE family_id = ?)`;
      params.push(familyId);
    }

    if (groupBy === 'member') {
      const trend = db.prepare(`
        SELECT 
          ${timeSelect} as time_period,
          m.name as member_name,
          SUM(CASE WHEN c.type = 'ASSET' THEN r.amount ELSE 0 END) as assets,
          SUM(CASE WHEN c.type = 'LIABILITY' THEN r.amount ELSE 0 END) as liabilities,
          SUM(CASE WHEN c.type = 'ASSET' THEN r.amount ELSE -r.amount END) as net_worth
        FROM records r
        JOIN accounts a ON r.account_id = a.id
        JOIN members m ON a.member_id = m.id
        JOIN asset_categories c ON a.category_id = c.id
        WHERE 1=1 ${familyFilter}
        GROUP BY time_period, member_name
        ORDER BY time_period ASC
        LIMIT 100
      `).all(...params);
      
      const result: any[] = [];
      const timeMap = new Map<string, any>();

      trend.forEach((row: any) => {
        if (!timeMap.has(row.time_period)) {
          timeMap.set(row.time_period, { name: row.time_period }); // 'name' is used for XAxis
          result.push(timeMap.get(row.time_period));
        }
        const entry = timeMap.get(row.time_period);
        entry[`${row.member_name}_assets`] = row.assets || 0;
        entry[`${row.member_name}_liabilities`] = row.liabilities || 0;
        entry[`${row.member_name}_net_worth`] = row.net_worth || 0;
      });

      res.json(result);
    } else {
      // Default: Family view (Aggregated)
      const trend = db.prepare(`
        SELECT 
          ${timeSelect} as time_period,
          SUM(CASE WHEN c.type = 'ASSET' THEN r.amount ELSE 0 END) as assets,
          SUM(CASE WHEN c.type = 'LIABILITY' THEN r.amount ELSE 0 END) as liabilities,
          SUM(CASE WHEN c.type = 'ASSET' THEN r.amount ELSE -r.amount END) as net_worth
        FROM records r
        JOIN accounts a ON r.account_id = a.id
        JOIN members m ON a.member_id = m.id
        JOIN asset_categories c ON a.category_id = c.id
        WHERE 1=1 ${familyFilter}
        GROUP BY time_period
        ORDER BY time_period ASC
        LIMIT 50
      `).all(...params);
      
      const result = trend.map((t: any) => ({
        name: t.time_period,
        assets: t.assets || 0,
        liabilities: t.liabilities || 0,
        net_worth: t.net_worth || 0
      }));

      res.json(result);
    }
  });

  app.get('/api/dashboard/events', (req, res) => {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'Month required' });

    const events = db.prepare(`SELECT * FROM family_events WHERE strftime('%Y-%m', event_date) = ? ORDER BY event_date DESC`).all(month);
    const renqing = db.prepare(`SELECT * FROM renqing_records WHERE strftime('%Y-%m', record_date) = ? ORDER BY record_date DESC`).all(month);
    const benefitUsages = db.prepare(`
      SELECT bu.*, b.name as benefit_name
      FROM benefit_usages bu
      JOIN benefits b ON bu.benefit_id = b.id
      WHERE strftime('%Y-%m', bu.usage_date) = ?
      ORDER BY bu.usage_date DESC
    `).all(month);
    const insurancePayments = db.prepare(`
      SELECT ip.*, p.name as policy_name
      FROM insurance_payments ip
      JOIN insurance_policies p ON ip.policy_id = p.id
      WHERE strftime('%Y-%m', ip.payment_date) = ?
      ORDER BY ip.payment_date DESC
    `).all(month);

    res.json({ events, renqing, benefitUsages, insurancePayments });
  });

  // Mock Data Endpoint
  app.post('/api/mock', (req, res) => {
    try {
      const { memberId } = req.body || {};
      
      const generateMockData = db.transaction(() => {
        // Ensure we have at least one member
        let member;
        if (memberId) {
          member = db.prepare('SELECT id FROM members WHERE id = ?').get(memberId) as any;
        }
        
        if (!member) {
          member = db.prepare('SELECT id FROM members LIMIT 1').get() as any;
        }
        
        if (!member) {
          const stmt = db.prepare('INSERT INTO members (name, relation) VALUES (?, ?)');
          const info = stmt.run('Mock User', 'Self');
          member = { id: info.lastInsertRowid };
        }

        // Ensure we have categories
        let assetCat = db.prepare('SELECT id FROM asset_categories WHERE type = ? LIMIT 1').get('ASSET') as any;
        if (!assetCat) {
          const stmt = db.prepare('INSERT INTO asset_categories (name, type) VALUES (?, ?)');
          const info = stmt.run('Cash', 'ASSET');
          assetCat = { id: info.lastInsertRowid };
        }

        let liabCat = db.prepare('SELECT id FROM asset_categories WHERE type = ? LIMIT 1').get('LIABILITY') as any;
        if (!liabCat) {
          const stmt = db.prepare('INSERT INTO asset_categories (name, type) VALUES (?, ?)');
          const info = stmt.run('Credit Card', 'LIABILITY');
          liabCat = { id: info.lastInsertRowid };
        }

        // Create accounts
        const accStmt = db.prepare('INSERT INTO accounts (name, category_id, member_id, currency) VALUES (?, ?, ?, ?)');
        const bankInfo = accStmt.run('Mock Bank', assetCat.id, member.id, 'CNY');
        const cardInfo = accStmt.run('Mock Card', liabCat.id, member.id, 'CNY');

        // Create records for the last 3 months
        const today = new Date();
        const recStmt = db.prepare('INSERT INTO records (account_id, amount, record_date) VALUES (?, ?, ?)');
        const eventStmt = db.prepare('INSERT INTO family_events (title, description, event_date, family_id) VALUES (?, ?, ?, ?)');
        const renqingStmt = db.prepare('INSERT INTO renqing_records (person, event, item, amount, type, record_date) VALUES (?, ?, ?, ?, ?, ?)');
        
        for (let i = 0; i < 3; i++) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 15);
          const dateStr = d.toISOString().substring(0, 10);
          
          recStmt.run(bankInfo.lastInsertRowid, 50000 + Math.random() * 10000, dateStr);
          recStmt.run(cardInfo.lastInsertRowid, 2000 + Math.random() * 1000, dateStr);
          
          eventStmt.run(`Mock Event ${i}`, 'This is a mock event', dateStr, null);
          renqingStmt.run('Mock Uncle', 'Wedding', 'Cash', 1000, 'OUT', dateStr);
        }

        // Add insurance
        const insStmt = db.prepare('INSERT INTO insurance_policies (name, type, company, premium, payment_period, start_date, end_date, insured_member_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        insStmt.run('Mock Health Protect', 'Health', 'Mock Insurance Co', 5000, 'Yearly', '2023-01-01', '2024-01-01', member.id);
      });

      generateMockData();
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate mock data' });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
