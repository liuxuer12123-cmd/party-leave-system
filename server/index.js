const express = require('express');
const Database = require('better-sqlite3');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'party-leave-secret-2024';

// ── Middleware ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Database ───────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin'
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    deadline TEXT DEFAULT '',
    location TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    student_id TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS participations (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    will_attend INTEGER DEFAULT 1,
    leave_reason TEXT DEFAULT '',
    leave_file_path TEXT DEFAULT '',
    leave_file_name TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (activity_id) REFERENCES activities(id),
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS leave_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );
`);

// Seed default leave categories
const defaultCategories = ['外出实习', '生病', '考试', '上课', '面试', '家中有事', '其他'];
const insertCat = db.prepare('INSERT OR IGNORE INTO leave_categories (name) VALUES (?)');
for (const c of defaultCategories) insertCat.run(c);

// Seed default admin: admin / admin123
const existingAdmin = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
if (!existingAdmin) {
  const hash = bcrypt.hashSync('1234', 10);
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', hash);
}

// ── File upload config ────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.docx', '.doc', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('不支持的文件类型，请上传 .docx / .pdf / 图片'));
  }
});

// ── Auth middleware ────────────────────────────────────────
function authRequired(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '请先登录' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

// ── Auth routes ────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const token = jwt.sign({ id: admin.id, username: admin.username, role: admin.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username: admin.username, role: admin.role });
});

app.post('/api/auth/change-password', authRequired, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, admin.password_hash)) {
    return res.status(400).json({ error: '原密码错误' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true });
});

// Migrate: add deadline column if missing
const cols = db.prepare("PRAGMA table_info(activities)").all().map(c => c.name);
if (!cols.includes('deadline')) {
  db.exec("ALTER TABLE activities ADD COLUMN deadline TEXT DEFAULT ''");
}

// Migrate: add is_absent column if missing
const partCols = db.prepare("PRAGMA table_info(participations)").all().map(c => c.name);
if (!partCols.includes('is_absent')) {
  db.exec("ALTER TABLE participations ADD COLUMN is_absent INTEGER DEFAULT 0");
}

app.get('/api/activities/:id/download-zip', authRequired, async (req, res, next) => {
  try {
    const archiver = require('archiver');
    const activity = db.prepare('SELECT name FROM activities WHERE id = ?').get(req.params.id);
    if (!activity) return res.status(404).json({ error: '活动不存在' });

    const files = db.prepare(`
      SELECT p.leave_file_path, p.leave_file_name, m.name as member_name
      FROM participations p
      JOIN members m ON m.id = p.member_id
      WHERE p.activity_id = ? AND p.leave_file_path != ''
    `).all(req.params.id);

    if (files.length === 0) return res.status(404).json({ error: '该活动没有请假单文件' });

    // Collect zip into buffer (like single file download pattern)
    const chunks = [];
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('error', (err) => next(err));
    archive.on('end', () => {
      const buf = Buffer.concat(chunks);
      const safeName = activity.name.replace(/[\\/:*?"<>|]/g, '_');
      res.setHeader('Content-Type', 'application/zip');
      const zipFileName = `${safeName}-请假单.zip`;
      const encodedName = encodeURIComponent(zipFileName);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);
      res.send(buf);
    });

    for (const f of files) {
      const filePath = path.join(__dirname, 'uploads', f.leave_file_path);
      if (fs.existsSync(filePath)) {
        const entryName = `${f.member_name}_请假条${path.extname(f.leave_file_path)}`;
        archive.file(filePath, { name: entryName });
      }
    }

    archive.finalize();
  } catch (e) {
    next(e);
  }
});

// ── Activity routes (admin only) ───────────────────────────
app.get('/api/activities', (req, res) => {
  const rows = db.prepare('SELECT * FROM activities ORDER BY date DESC').all();
  res.json(rows);
});

app.get('/api/activities/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '活动不存在' });
  res.json(row);
});

app.post('/api/activities', authRequired, (req, res) => {
  const { name, date, location, description, deadline } = req.body;
  if (!name || !date) return res.status(400).json({ error: '活动名称和日期不能为空' });
  const id = uuidv4();
  db.prepare('INSERT INTO activities (id, name, date, deadline, location, description) VALUES (?,?,?,?,?,?)')
    .run(id, name, date, deadline || '', location || '', description || '');
  res.json({ id, name, date, deadline: deadline || '', location: location || '', description: description || '' });
});

app.put('/api/activities/:id', authRequired, (req, res) => {
  const { name, date, location, description, deadline } = req.body;
  db.prepare('UPDATE activities SET name=?, date=?, deadline=?, location=?, description=? WHERE id=?')
    .run(name, date, deadline || '', location || '', description || '', req.params.id);
  res.json({ success: true });
});

app.delete('/api/activities/:id', authRequired, (req, res) => {
  db.prepare('DELETE FROM participations WHERE activity_id = ?').run(req.params.id);
  db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Activity stats
app.get('/api/activities/:id/stats', authRequired, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as cnt FROM participations WHERE activity_id = ?').get(req.params.id).cnt;
  const attending = db.prepare('SELECT COUNT(*) as cnt FROM participations WHERE activity_id = ? AND will_attend = 1 AND is_absent = 0').get(req.params.id).cnt;
  const onLeave = db.prepare('SELECT COUNT(*) as cnt FROM participations WHERE activity_id = ? AND will_attend = 0 AND is_absent = 0').get(req.params.id).cnt;
  const absent = db.prepare('SELECT COUNT(*) as cnt FROM participations WHERE activity_id = ? AND is_absent = 1').get(req.params.id).cnt;
  res.json({ total, attending, onLeave, absent });
});

// ── Member routes - guest self-registration ────────────────
app.post('/api/members', (req, res) => {
  const { name, student_id, phone } = req.body;
  if (!name) return res.status(400).json({ error: '姓名不能为空' });

  // Look up existing member by name + student_id
  let member = db.prepare('SELECT * FROM members WHERE name = ? AND student_id = ?').get(name, student_id || '');
  if (!member) {
    const id = uuidv4();
    db.prepare('INSERT INTO members (id, name, student_id, phone) VALUES (?,?,?,?)')
      .run(id, name, student_id || '', phone || '');
    member = { id, name, student_id: student_id || '', phone: phone || '' };
  }
  res.json(member);
});

// ── Participation routes (guest submit) ────────────────────
app.post('/api/participations', upload.single('leave_file'), (req, res) => {
  const { activity_id, member_id, will_attend, leave_reason } = req.body;
  if (!activity_id || !member_id) return res.status(400).json({ error: '缺少必要信息' });

  // Check deadline
  const activity = db.prepare('SELECT deadline FROM activities WHERE id = ?').get(activity_id);
  if (activity && activity.deadline) {
    const now = new Date();
    const deadlineDate = new Date(activity.deadline);
    if (now > deadlineDate) {
      return res.status(400).json({ error: '报名已截止，该活动的报名截止时间为 ' + activity.deadline });
    }
  }

  // Check duplicate
  const existing = db.prepare('SELECT id FROM participations WHERE activity_id = ? AND member_id = ?')
    .get(activity_id, member_id);
  if (existing) {
    return res.status(400).json({ error: '您已经提交过该活动的参与信息' });
  }

  const id = uuidv4();
  const attending = will_attend === 'true' || will_attend === true || will_attend === '1' || will_attend === 1 ? 1 : 0;

  // Build display filename: 姓名_请假条.ext
  let leaveFileName = '';
  if (req.file) {
    const member = db.prepare('SELECT name FROM members WHERE id = ?').get(member_id);
    const ext = path.extname(req.file.originalname);
    leaveFileName = `${member ? member.name : '未知'}_请假条${ext}`;
  }

  db.prepare('INSERT INTO participations (id, activity_id, member_id, will_attend, leave_reason, leave_file_path, leave_file_name) VALUES (?,?,?,?,?,?,?)')
    .run(id, activity_id, member_id, attending, leave_reason || '', req.file ? req.file.filename : '', leaveFileName);
  res.json({ id, success: true });
});

// Get my participations
app.get('/api/members/:memberId/participations', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, a.name as activity_name, a.date as activity_date
    FROM participations p
    JOIN activities a ON a.id = p.activity_id
    WHERE p.member_id = ?
    ORDER BY a.date DESC
  `).all(req.params.memberId);
  res.json(rows);
});

// ── Admin participation management ─────────────────────────
app.get('/api/activities/:id/participations', authRequired, (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, m.name as member_name, m.student_id, m.phone
    FROM participations p
    JOIN members m ON m.id = p.member_id
    WHERE p.activity_id = ?
    ORDER BY p.created_at DESC
  `).all(req.params.id);
  res.json(rows);
});

app.put('/api/participations/:id', authRequired, upload.single('leave_file'), (req, res) => {
  const { will_attend, leave_reason, status, is_absent } = req.body;
  const updates = [];
  const params = [];

  if (will_attend !== undefined) {
    // will_attend can be string "true"/"false" or number 1/0
    const val = will_attend === 'true' || will_attend === true || will_attend === '1' || will_attend === 1 ? 1 : 0;
    updates.push('will_attend = ?'); params.push(val);
  }
  if (leave_reason !== undefined) { updates.push('leave_reason = ?'); params.push(leave_reason); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (is_absent !== undefined) {
    const val = is_absent === 'true' || is_absent === true || is_absent === '1' || is_absent === 1 ? 1 : 0;
    updates.push('is_absent = ?'); params.push(val);
  }

  // Handle file upload for status change (admin editing participation)
  if (req.file) {
    const p = db.prepare(`
      SELECT m.name as member_name FROM participations p
      JOIN members m ON m.id = p.member_id WHERE p.id = ?
    `).get(req.params.id);
    const ext = path.extname(req.file.originalname);
    const leaveFileName = `${p && p.member_name ? p.member_name : '未知'}_请假条${ext}`;
    updates.push('leave_file_path = ?'); params.push(req.file.filename);
    updates.push('leave_file_name = ?'); params.push(leaveFileName);
  }

  if (updates.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  params.push(req.params.id);
  db.prepare(`UPDATE participations SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

// Toggle absent status
app.patch('/api/participations/:id/toggle-absent', authRequired, (req, res) => {
  const p = db.prepare('SELECT is_absent FROM participations WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: '记录不存在' });
  const newVal = p.is_absent ? 0 : 1;
  db.prepare('UPDATE participations SET is_absent = ? WHERE id = ?').run(newVal, req.params.id);
  res.json({ is_absent: newVal });
});

app.delete('/api/participations/:id', authRequired, (req, res) => {
  const p = db.prepare('SELECT leave_file_path FROM participations WHERE id = ?').get(req.params.id);
  if (p && p.leave_file_path) {
    const filePath = path.join(__dirname, 'uploads', p.leave_file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.prepare('DELETE FROM participations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Batch add participations for an activity (admin)
app.post('/api/activities/:id/participations/batch', authRequired, (req, res) => {
  const { names, will_attend, leave_reason } = req.body;
  // names can be string (newline-separated) or array
  const nameList = Array.isArray(names)
    ? names.map(n => n.trim()).filter(Boolean)
    : (names || '').split('\n').map(n => n.trim()).filter(Boolean);

  if (nameList.length === 0) return res.status(400).json({ error: '请至少输入一个姓名' });

  const insertMember = db.prepare('INSERT INTO members (id, name) VALUES (?,?)');
  const insertPart = db.prepare('INSERT INTO participations (id, activity_id, member_id, will_attend, leave_reason, is_absent) VALUES (?,?,?,?,?,?)');
  const checkExisting = db.prepare('SELECT id FROM participations WHERE activity_id = ? AND member_id = ?');

  const results = [];
  for (const name of nameList) {
    // Find or create member
    let member = db.prepare('SELECT * FROM members WHERE name = ?').get(name);
    if (!member) {
      const mid = uuidv4();
      insertMember.run(mid, name);
      member = { id: mid };
    }
    // Skip duplicate
    if (checkExisting.get(req.params.id, member.id)) continue;

    const pid = uuidv4();
    // will_attend: 'attend'=参加, 'leave'=请假, 'absent'=缺勤
    const attending = will_attend === 'leave' ? 0 : 1;
    const absent = will_attend === 'absent' ? 1 : 0;
    insertPart.run(pid, req.params.id, member.id, attending, leave_reason || '', absent);
    results.push({ name, id: pid });
  }

  res.json({ count: results.length, results });
});

// Delete member and all their participations (admin)
app.delete('/api/admin/members/:id', authRequired, (req, res) => {
  const parts = db.prepare('SELECT leave_file_path FROM participations WHERE member_id = ?').all(req.params.id);
  for (const p of parts) {
    if (p.leave_file_path) {
      const filePath = path.join(__dirname, 'uploads', p.leave_file_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }
  db.prepare('DELETE FROM participations WHERE member_id = ?').run(req.params.id);
  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Download leave file (admin only)
app.get('/api/files/:filename', authRequired, (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: '文件不存在' });
  res.sendFile(filePath);
});

// ── Member history stats (admin) ───────────────────────────
app.get('/api/admin/members', authRequired, (req, res) => {
  const rows = db.prepare(`
    SELECT m.*,
      (SELECT COUNT(*) FROM participations WHERE member_id = m.id) as total_activities,
      (SELECT COUNT(*) FROM participations WHERE member_id = m.id AND will_attend = 1 AND is_absent = 0) as attended,
      (SELECT COUNT(*) FROM participations WHERE member_id = m.id AND will_attend = 0 AND is_absent = 0) as leave_count,
      (SELECT COUNT(*) FROM participations WHERE member_id = m.id AND is_absent = 1) as absent_count
    FROM members m
    ORDER BY m.name
  `).all();
  res.json(rows);
});

app.get('/api/admin/members/:id/detail', authRequired, (req, res) => {
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: '成员不存在' });

  const participations = db.prepare(`
    SELECT p.*, a.name as activity_name, a.date as activity_date
    FROM participations p
    JOIN activities a ON a.id = p.activity_id
    WHERE p.member_id = ?
    ORDER BY a.date DESC
  `).all(req.params.id);

  const stats = {
    total: participations.length,
    attended: participations.filter(p => p.will_attend === 1 && p.is_absent === 0).length,
    onLeave: participations.filter(p => p.will_attend === 0 && p.is_absent === 0).length,
    absent: participations.filter(p => p.is_absent === 1).length
  };

  res.json({ member, participations, stats });
});

// ── Leave categories ───────────────────────────────────────
app.get('/api/categories', (req, res) => {
  const rows = db.prepare('SELECT * FROM leave_categories ORDER BY id').all();
  res.json(rows);
});

// ── Export (admin) ─────────────────────────────────────────
app.get('/api/admin/export', authRequired, (req, res) => {
  const { type, activity_id } = req.query;

  if (type === 'activity' && activity_id) {
    // Export a specific activity's participation list
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activity_id);
    if (!activity) return res.status(404).json({ error: '活动不存在' });
    const rows = db.prepare(`
      SELECT m.name, m.student_id, m.phone,
        p.will_attend, p.is_absent, p.leave_reason, p.leave_file_name, p.status
      FROM participations p
      JOIN members m ON m.id = p.member_id
      WHERE p.activity_id = ?
      ORDER BY p.will_attend, m.name
    `).all(activity_id);
    res.json({ activity, rows });
  } else if (type === 'member') {
    // Export all members with stats
    const rows = db.prepare(`
      SELECT m.name, m.student_id, m.phone,
        COUNT(p.id) as total_activities,
        SUM(CASE WHEN p.will_attend = 1 THEN 1 ELSE 0 END) as attended,
        SUM(CASE WHEN p.will_attend = 0 THEN 1 ELSE 0 END) as leave_count,
        GROUP_CONCAT(CASE WHEN p.will_attend = 0 THEN p.leave_reason END, '; ') as leave_reasons
      FROM members m
      LEFT JOIN participations p ON p.member_id = m.id
      GROUP BY m.id
      ORDER BY m.name
    `).all();
    res.json(rows);
  } else {
    res.status(400).json({ error: '请指定导出类型' });
  }
});

// ── Serve static files in production ───────────────────────
const buildPath = path.join(__dirname, '../client/build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});