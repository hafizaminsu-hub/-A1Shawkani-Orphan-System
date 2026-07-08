/**
 * ============================================================
 * الملف: server.js
 * الوصف: الخادم الرئيسي لنظام الشوكاني - جميع نقاط API، المصادقة، إدارة الملفات، الجدولة
 * الإصدار: 1.0.3 (تم إعادة ترتيب الـ Routes وإصلاح نقاط API)
 * ============================================================
 */

const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');
const crypto = require('crypto');

// دالة تنسيق التاريخ بالعربية
function formatDateTimeArabic(dateStr) {
    if (!dateStr) return 'الآن';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
        return d.toLocaleString('ar-YE', options);
    } catch (e) {
        return dateStr;
    }
}

// ============================================================
// 1. إعداد التطبيق والمتغيرات العامة
// ============================================================
const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database', 'data.db');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const BACKUPS_DIR = path.join(__dirname, 'backups');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(path.join(UPLOADS_DIR, 'documents'))) fs.mkdirSync(path.join(UPLOADS_DIR, 'documents'), { recursive: true });
if (!fs.existsSync(path.join(UPLOADS_DIR, 'photos'))) fs.mkdirSync(path.join(UPLOADS_DIR, 'photos'), { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

// ============================================================
// 2. الاتصال بقاعدة البيانات
// ============================================================
let db;

function openDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) reject(err);
            else {
                console.log('✔ تم الاتصال بقاعدة البيانات.');
                resolve(db);
            }
        });
    });
}

function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// ============================================================
// 3. تهيئة قاعدة البيانات
// ============================================================
async function initializeDatabase() {
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
        console.warn('⚠️ schema.sql غير موجود.');
        return;
    }
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const statements = schema.split(';').filter(stmt => stmt.trim() !== '');
    for (let stmt of statements) {
        try {
            await runQuery(stmt);
        } catch (err) {
            if (!err.message.includes('already exists')) {
                console.error('خطأ في تنفيذ الاستعلام:', err.message);
            }
        }
    }
    console.log('✔ تم تهيئة قاعدة البيانات.');
}

// ============================================================
// 4. Middleware
// ============================================================
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'shawk@ni_secret_key_2026_secure',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// ============================================================
// 5. نقاط API (قبل الملفات الثابتة لتجنب تعارض المسارات)
// ============================================================

// 5.1 المصادقة والجلسات
app.get('/api/session', (req, res) => {
    if (req.session.userId) {
        res.json({
            loggedIn: true,
            userId: req.session.userId,
            username: req.session.username,
            fullName: req.session.fullName,
            roleId: req.session.roleId
        });
    } else {
        res.json({ loggedIn: false });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('يرجى ملء جميع الحقول.');
    }

    try {
        const user = await getQuery(
            'SELECT UserID, Username, PasswordHash, FullName, RoleID FROM tblUsers WHERE Username = ? AND IsDeleted = 0',
            [username]
        );

        if (!user) {
            return res.status(401).send('اسم المستخدم أو كلمة المرور غير صحيحة.');
        }

        const isMatch = bcrypt.compareSync(password, user.PasswordHash);
        if (!isMatch) {
            return res.status(401).send('اسم المستخدم أو كلمة المرور غير صحيحة.');
        }

        req.session.userId = user.UserID;
        req.session.username = user.Username;
        req.session.fullName = user.FullName;
        req.session.roleId = user.RoleID;

        await runQuery(
            'UPDATE tblUsers SET LastLogin = CURRENT_TIMESTAMP WHERE UserID = ?',
            [user.UserID]
        );

        await auditLog(user.UserID, 'تسجيل دخول', 'tblUsers', user.UserID, null, null, req, 'تسجيل دخول المستخدم');

        res.redirect('/dashboard');

    } catch (err) {
        console.error('خطأ في تسجيل الدخول:', err.message);
        res.status(500).send('حدث خطأ داخلي في الخادم.');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// 5.2 لوحة التحكم (الإحصائيات)
app.get('/api/stats', requireAuth, async (req, res) => {
    try {
        const totalOrphans = await getQuery('SELECT COUNT(*) as count FROM tblOrphans WHERE IsDeleted = 0');
        const activeSponsorships = await getQuery('SELECT COUNT(*) as count FROM tblSponsorships WHERE Status = "نشطة" AND IsDeleted = 0');
        const totalFamilies = await getQuery('SELECT COUNT(*) as count FROM tblFamilies WHERE IsDeleted = 0');
        const totalAid = await getQuery('SELECT COUNT(*) as count FROM tblAidRecords WHERE IsDeleted = 0');

        res.json({
            totalOrphans: totalOrphans.count || 0,
            activeSponsorships: activeSponsorships.count || 0,
            totalFamilies: totalFamilies.count || 0,
            totalAid: totalAid.count || 0
        });
    } catch (err) {
        console.error('خطأ في جلب الإحصائيات:', err.message);
        res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
    }
});

app.get('/api/chart-data', requireAuth, async (req, res) => {
    try {
        const result = await allQuery('SELECT OrphanStatus, COUNT(*) as count FROM tblOrphans WHERE IsDeleted = 0 GROUP BY OrphanStatus');
        const labels = result.map(r => r.OrphanStatus || 'غير محدد');
        const values = result.map(r => r.count);
        res.json({ labels, values });
    } catch (err) {
        console.error('خطأ في جلب بيانات المخطط:', err.message);
        res.json({ labels: ['نشط', 'منقطع', 'منتهي'], values: [0, 0, 0] });
    }
});

app.get('/api/activities', requireAuth, async (req, res) => {
    try {
        const logs = await allQuery(`
            SELECT l.*, u.FullName as UserName 
            FROM tblLogs l 
            LEFT JOIN tblUsers u ON l.UserID = u.UserID 
            WHERE l.IsDeleted = 0 
            ORDER BY l.LogDate DESC 
            LIMIT 10
        `);
        const activities = logs.map(log => {
            let icon = 'fa-circle';
            let iconClass = 'bg-secondary-subtle text-secondary';
            switch (log.ActionType) {
                case 'إضافة': icon = 'fa-plus-circle'; iconClass = 'bg-success-subtle text-success'; break;
                case 'تعديل': icon = 'fa-edit'; iconClass = 'bg-primary-subtle text-primary'; break;
                case 'حذف': icon = 'fa-trash'; iconClass = 'bg-danger-subtle text-danger'; break;
                case 'تسجيل دخول': icon = 'fa-sign-in-alt'; iconClass = 'bg-info-subtle text-info'; break;
                case 'طباعة': icon = 'fa-print'; iconClass = 'bg-warning-subtle text-warning'; break;
                default: icon = 'fa-circle';
            }
            const time = formatDateTimeArabic(log.LogDate);
            return {
                icon: icon,
                iconClass: iconClass,
                title: `${log.ActionType || 'نشاط'} في ${log.TableName || 'النظام'}`,
                time: time
            };
        });
        res.json(activities);
    } catch (err) {
        console.error('خطأ في جلب النشاطات:', err.message);
        res.json([]);
    }
});

// 5.3 إدارة الأيتام (CRUD)
app.get('/api/orphans', requireAuth, async (req, res) => {
    try {
        const { status, gender, search } = req.query;
        let sql = 'SELECT * FROM tblOrphans WHERE IsDeleted = 0';
        const params = [];
        if (status) {
            sql += ' AND OrphanStatus = ?';
            params.push(status);
        }
        if (gender) {
            sql += ' AND Gender = ?';
            params.push(gender);
        }
        if (search) {
            sql += ' AND (FullName LIKE ? OR OrphanCode LIKE ? OR IDNumber LIKE ?)';
            const s = '%' + search + '%';
            params.push(s, s, s);
        }
        sql += ' ORDER BY OrphanID DESC';
        const rows = await allQuery(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('خطأ في جلب الأيتام:', err.message);
        res.status(500).json({ error: 'خطأ في جلب الأيتام' });
    }
});

app.post('/api/orphans', requireAuth, async (req, res) => {
    try {
        const data = req.body;
        if (!data.orphanCode) {
            const max = await getQuery('SELECT MAX(OrphanID) as max FROM tblOrphans');
            const nextId = (max.max || 0) + 1;
            data.orphanCode = 'YTM-' + String(nextId).padStart(4, '0');
        }
        const sql = `
            INSERT INTO tblOrphans (
                OrphanCode, FullName, Gender, BirthDate, BirthPlace, Nationality, IDNumber,
                HealthStatus, DisabilityType, BloodType, FamilyID, FatherStatus, FatherDeathDate,
                FatherDeathCause, MotherStatus, MotherName, MotherPhone, SchoolID, EducationLevel,
                Grade, AcademicYear, OrphanStatus, AdmissionDate, ReleaseDate, ReleaseReason, Notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            data.orphanCode, data.fullName, data.gender, data.birthDate, data.birthPlace,
            data.nationality || 'يمني', data.idNumber, data.healthStatus || 'سليم',
            data.disabilityType, data.bloodType, data.familyId, data.fatherStatus || 'متوفي',
            data.fatherDeathDate, data.fatherDeathCause, data.motherStatus || 'حية',
            data.motherName, data.motherPhone, data.schoolId, data.educationLevel,
            data.grade, data.academicYear, data.orphanStatus || 'نشط',
            data.admissionDate || new Date().toISOString().split('T')[0],
            data.releaseDate, data.releaseReason, data.notes
        ];
        const result = await runQuery(sql, params);
        await auditLog(req.session.userId, 'إضافة', 'tblOrphans', result.lastID, null, data, req, 'إضافة يتيم جديد');
        res.status(201).json({ id: result.lastID, message: 'تم إضافة اليتيم بنجاح' });
    } catch (err) {
        console.error('خطأ في إضافة اليتيم:', err.message);
        res.status(500).json({ error: 'خطأ في إضافة اليتيم' });
    }
});

app.put('/api/orphans/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const oldData = await getQuery('SELECT * FROM tblOrphans WHERE OrphanID = ?', [id]);
        if (!oldData) {
            return res.status(404).json({ error: 'اليتيم غير موجود' });
        }
        const sql = `
            UPDATE tblOrphans SET
                OrphanCode = ?, FullName = ?, Gender = ?, BirthDate = ?, BirthPlace = ?,
                Nationality = ?, IDNumber = ?, HealthStatus = ?, DisabilityType = ?, BloodType = ?,
                FamilyID = ?, FatherStatus = ?, FatherDeathDate = ?, FatherDeathCause = ?,
                MotherStatus = ?, MotherName = ?, MotherPhone = ?, SchoolID = ?, EducationLevel = ?,
                Grade = ?, AcademicYear = ?, OrphanStatus = ?, AdmissionDate = ?, ReleaseDate = ?,
                ReleaseReason = ?, Notes = ?, UpdatedAt = CURRENT_TIMESTAMP
            WHERE OrphanID = ?
        `;
        const params = [
            data.orphanCode, data.fullName, data.gender, data.birthDate, data.birthPlace,
            data.nationality || 'يمني', data.idNumber, data.healthStatus || 'سليم',
            data.disabilityType, data.bloodType, data.familyId, data.fatherStatus || 'متوفي',
            data.fatherDeathDate, data.fatherDeathCause, data.motherStatus || 'حية',
            data.motherName, data.motherPhone, data.schoolId, data.educationLevel,
            data.grade, data.academicYear, data.orphanStatus || 'نشط',
            data.admissionDate, data.releaseDate, data.releaseReason, data.notes, id
        ];
        await runQuery(sql, params);
        await auditLog(req.session.userId, 'تعديل', 'tblOrphans', id, oldData, data, req, 'تعديل بيانات يتيم');
        res.json({ message: 'تم تحديث اليتيم بنجاح' });
    } catch (err) {
        console.error('خطأ في تحديث اليتيم:', err.message);
        res.status(500).json({ error: 'خطأ في تحديث اليتيم' });
    }
});

app.delete('/api/orphans/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const oldData = await getQuery('SELECT * FROM tblOrphans WHERE OrphanID = ?', [id]);
        if (!oldData) {
            return res.status(404).json({ error: 'اليتيم غير موجود' });
        }
        await runQuery('UPDATE tblOrphans SET IsDeleted = 1, UpdatedAt = CURRENT_TIMESTAMP WHERE OrphanID = ?', [id]);
        await auditLog(req.session.userId, 'حذف', 'tblOrphans', id, oldData, null, req, 'حذف يتيم');
        res.json({ message: 'تم حذف اليتيم بنجاح' });
    } catch (err) {
        console.error('خطأ في حذف اليتيم:', err.message);
        res.status(500).json({ error: 'خطأ في حذف اليتيم' });
    }
});

// 5.4 إدارة الأسر (CRUD)
app.get('/api/families', requireAuth, async (req, res) => {
    try {
        const sql = 'SELECT * FROM tblFamilies WHERE IsDeleted = 0 ORDER BY FamilyID DESC';
        const rows = await allQuery(sql);
        res.json(rows);
    } catch (err) {
        console.error('خطأ في جلب الأسر:', err.message);
        res.status(500).json({ error: 'خطأ في جلب الأسر' });
    }
});

app.post('/api/families', requireAuth, async (req, res) => {
    try {
        const data = req.body;
        if (!data.familyNumber) {
            const max = await getQuery('SELECT MAX(FamilyID) as max FROM tblFamilies');
            const nextId = (max.max || 0) + 1;
            const year = new Date().getFullYear();
            data.familyNumber = `FAM-${year}-${String(nextId).padStart(3, '0')}`;
        }
        const sql = `
            INSERT INTO tblFamilies (
                FamilyNumber, FamilyName, GuardianName, GuardianPhone, GuardianPhoneAlt,
                GuardianIDNumber, Address, VillageID, MonthlyIncome, IncomeSource,
                FamilyMembersCount, HousingType, HousingCondition, Notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            data.familyNumber, data.familyName, data.guardianName, data.guardianPhone,
            data.guardianPhoneAlt, data.guardianIdNumber, data.address, data.villageId,
            data.monthlyIncome || 0, data.incomeSource, data.familyMembersCount || 1,
            data.housingType, data.housingCondition, data.notes
        ];
        const result = await runQuery(sql, params);
        await auditLog(req.session.userId, 'إضافة', 'tblFamilies', result.lastID, null, data, req, 'إضافة أسرة جديدة');
        res.status(201).json({ id: result.lastID, message: 'تم إضافة الأسرة بنجاح' });
    } catch (err) {
        console.error('خطأ في إضافة الأسرة:', err.message);
        res.status(500).json({ error: 'خطأ في إضافة الأسرة' });
    }
});

app.put('/api/families/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const oldData = await getQuery('SELECT * FROM tblFamilies WHERE FamilyID = ?', [id]);
        if (!oldData) {
            return res.status(404).json({ error: 'الأسرة غير موجودة' });
        }
        const sql = `
            UPDATE tblFamilies SET
                FamilyNumber = ?, FamilyName = ?, GuardianName = ?, GuardianPhone = ?,
                GuardianPhoneAlt = ?, GuardianIDNumber = ?, Address = ?, VillageID = ?,
                MonthlyIncome = ?, IncomeSource = ?, FamilyMembersCount = ?, HousingType = ?,
                HousingCondition = ?, Notes = ?, UpdatedAt = CURRENT_TIMESTAMP
            WHERE FamilyID = ?
        `;
        const params = [
            data.familyNumber, data.familyName, data.guardianName, data.guardianPhone,
            data.guardianPhoneAlt, data.guardianIdNumber, data.address, data.villageId,
            data.monthlyIncome || 0, data.incomeSource, data.familyMembersCount || 1,
            data.housingType, data.housingCondition, data.notes, id
        ];
        await runQuery(sql, params);
        await auditLog(req.session.userId, 'تعديل', 'tblFamilies', id, oldData, data, req, 'تعديل أسرة');
        res.json({ message: 'تم تحديث الأسرة بنجاح' });
    } catch (err) {
        console.error('خطأ في تحديث الأسرة:', err.message);
        res.status(500).json({ error: 'خطأ في تحديث الأسرة' });
    }
});

app.delete('/api/families/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const oldData = await getQuery('SELECT * FROM tblFamilies WHERE FamilyID = ?', [id]);
        if (!oldData) {
            return res.status(404).json({ error: 'الأسرة غير موجودة' });
        }
        await runQuery('UPDATE tblFamilies SET IsDeleted = 1, UpdatedAt = CURRENT_TIMESTAMP WHERE FamilyID = ?', [id]);
        await auditLog(req.session.userId, 'حذف', 'tblFamilies', id, oldData, null, req, 'حذف أسرة');
        res.json({ message: 'تم حذف الأسرة بنجاح' });
    } catch (err) {
        console.error('خطأ في حذف الأسرة:', err.message);
        res.status(500).json({ error: 'خطأ في حذف الأسرة' });
    }
});

// 5.5 إدارة الكفالات (CRUD)
app.get('/api/sponsorships', requireAuth, async (req, res) => {
    try {
        const { status, sponsorId } = req.query;
        let sql = 'SELECT * FROM tblSponsorships WHERE IsDeleted = 0';
        const params = [];
        if (status) {
            sql += ' AND Status = ?';
            params.push(status);
        }
        if (sponsorId) {
            sql += ' AND SponsorID = ?';
            params.push(sponsorId);
        }
        sql += ' ORDER BY SponsorshipID DESC';
        const rows = await allQuery(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('خطأ في جلب الكفالات:', err.message);
        res.status(500).json({ error: 'خطأ في جلب الكفالات' });
    }
});

app.post('/api/sponsorships', requireAuth, async (req, res) => {
    try {
        const data = req.body;
        const sql = `
            INSERT INTO tblSponsorships (
                OrphanID, SponsorID, StartDate, EndDate, MonthlyAmount, PaymentCurrency,
                PaymentMethod, SponsorshipType, Status, Notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            data.orphanId, data.sponsorId, data.startDate, data.endDate,
            data.monthlyAmount || 0, data.paymentCurrency || 'YER',
            data.paymentMethod || 'نقدي', data.sponsorshipType || 'شهرية',
            data.status || 'نشطة', data.notes
        ];
        const result = await runQuery(sql, params);
        await auditLog(req.session.userId, 'إضافة', 'tblSponsorships', result.lastID, null, data, req, 'إضافة كفالة');
        res.status(201).json({ id: result.lastID, message: 'تم إضافة الكفالة بنجاح' });
    } catch (err) {
        console.error('خطأ في إضافة الكفالة:', err.message);
        res.status(500).json({ error: 'خطأ في إضافة الكفالة' });
    }
});

app.put('/api/sponsorships/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const oldData = await getQuery('SELECT * FROM tblSponsorships WHERE SponsorshipID = ?', [id]);
        if (!oldData) {
            return res.status(404).json({ error: 'الكفالة غير موجودة' });
        }
        const sql = `
            UPDATE tblSponsorships SET
                OrphanID = ?, SponsorID = ?, StartDate = ?, EndDate = ?, MonthlyAmount = ?,
                PaymentCurrency = ?, PaymentMethod = ?, SponsorshipType = ?, Status = ?, Notes = ?,
                UpdatedAt = CURRENT_TIMESTAMP
            WHERE SponsorshipID = ?
        `;
        const params = [
            data.orphanId, data.sponsorId, data.startDate, data.endDate,
            data.monthlyAmount || 0, data.paymentCurrency || 'YER',
            data.paymentMethod || 'نقدي', data.sponsorshipType || 'شهرية',
            data.status || 'نشطة', data.notes, id
        ];
        await runQuery(sql, params);
        await auditLog(req.session.userId, 'تعديل', 'tblSponsorships', id, oldData, data, req, 'تعديل كفالة');
        res.json({ message: 'تم تحديث الكفالة بنجاح' });
    } catch (err) {
        console.error('خطأ في تحديث الكفالة:', err.message);
        res.status(500).json({ error: 'خطأ في تحديث الكفالة' });
    }
});

app.delete('/api/sponsorships/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const oldData = await getQuery('SELECT * FROM tblSponsorships WHERE SponsorshipID = ?', [id]);
        if (!oldData) {
            return res.status(404).json({ error: 'الكفالة غير موجودة' });
        }
        await runQuery('UPDATE tblSponsorships SET IsDeleted = 1, UpdatedAt = CURRENT_TIMESTAMP WHERE SponsorshipID = ?', [id]);
        await auditLog(req.session.userId, 'حذف', 'tblSponsorships', id, oldData, null, req, 'حذف كفالة');
        res.json({ message: 'تم حذف الكفالة بنجاح' });
    } catch (err) {
        console.error('خطأ في حذف الكفالة:', err.message);
        res.status(500).json({ error: 'خطأ في حذف الكفالة' });
    }
});

// 5.6 إدارة المساعدات (CRUD)
app.get('/api/aid', requireAuth, async (req, res) => {
    try {
        const { type, dateFrom, dateTo } = req.query;
        let sql = 'SELECT * FROM tblAidRecords WHERE IsDeleted = 0';
        const params = [];
        if (type) {
            sql += ' AND AidTypeID = ?';
            params.push(type);
        }
        if (dateFrom) {
            sql += ' AND AidDate >= ?';
            params.push(dateFrom);
        }
        if (dateTo) {
            sql += ' AND AidDate <= ?';
            params.push(dateTo);
        }
        sql += ' ORDER BY AidRecordID DESC';
        const rows = await allQuery(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('خطأ في جلب المساعدات:', err.message);
        res.status(500).json({ error: 'خطأ في جلب المساعدات' });
    }
});

app.post('/api/aid', requireAuth, async (req, res) => {
    try {
        const data = req.body;
        const sql = `
            INSERT INTO tblAidRecords (
                OrphanID, AidTypeID, AidDate, Amount, Quantity, Unit, Description,
                DistributionMethod, RecipientName, Notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            data.orphanId, data.aidTypeId, data.aidDate || new Date().toISOString().split('T')[0],
            data.amount || 0, data.quantity || 0, data.unit, data.description,
            data.distributionMethod || 'يدوي', data.recipientName, data.notes
        ];
        const result = await runQuery(sql, params);
        await auditLog(req.session.userId, 'إضافة', 'tblAidRecords', result.lastID, null, data, req, 'إضافة مساعدة');
        res.status(201).json({ id: result.lastID, message: 'تم إضافة المساعدة بنجاح' });
    } catch (err) {
        console.error('خطأ في إضافة المساعدة:', err.message);
        res.status(500).json({ error: 'خطأ في إضافة المساعدة' });
    }
});

app.put('/api/aid/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const oldData = await getQuery('SELECT * FROM tblAidRecords WHERE AidRecordID = ?', [id]);
        if (!oldData) {
            return res.status(404).json({ error: 'المساعدة غير موجودة' });
        }
        const sql = `
            UPDATE tblAidRecords SET
                OrphanID = ?, AidTypeID = ?, AidDate = ?, Amount = ?, Quantity = ?,
                Unit = ?, Description = ?, DistributionMethod = ?, RecipientName = ?, Notes = ?,
                UpdatedAt = CURRENT_TIMESTAMP
            WHERE AidRecordID = ?
        `;
        const params = [
            data.orphanId, data.aidTypeId, data.aidDate, data.amount || 0,
            data.quantity || 0, data.unit, data.description, data.distributionMethod || 'يدوي',
            data.recipientName, data.notes, id
        ];
        await runQuery(sql, params);
        await auditLog(req.session.userId, 'تعديل', 'tblAidRecords', id, oldData, data, req, 'تعديل مساعدة');
        res.json({ message: 'تم تحديث المساعدة بنجاح' });
    } catch (err) {
        console.error('خطأ في تحديث المساعدة:', err.message);
        res.status(500).json({ error: 'خطأ في تحديث المساعدة' });
    }
});

app.delete('/api/aid/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const oldData = await getQuery('SELECT * FROM tblAidRecords WHERE AidRecordID = ?', [id]);
        if (!oldData) {
            return res.status(404).json({ error: 'المساعدة غير موجودة' });
        }
        await runQuery('UPDATE tblAidRecords SET IsDeleted = 1, UpdatedAt = CURRENT_TIMESTAMP WHERE AidRecordID = ?', [id]);
        await auditLog(req.session.userId, 'حذف', 'tblAidRecords', id, oldData, null, req, 'حذف مساعدة');
        res.json({ message: 'تم حذف المساعدة بنجاح' });
    } catch (err) {
        console.error('خطأ في حذف المساعدة:', err.message);
        res.status(500).json({ error: 'خطأ في حذف المساعدة' });
    }
});

app.get('/api/aid-types', requireAuth, async (req, res) => {
    try {
        const rows = await allQuery('SELECT * FROM tblAidTypes WHERE IsDeleted = 0 ORDER BY AidName');
        res.json(rows);
    } catch (err) {
        console.error('خطأ في جلب أنواع المساعدات:', err.message);
        res.status(500).json({ error: 'خطأ في جلب أنواع المساعدات' });
    }
});

// 5.7 إدارة الكسوة (CRUD)
app.get('/api/clothing', requireAuth, async (req, res) => {
    try {
        const { season, dateFrom, dateTo } = req.query;
        let sql = 'SELECT * FROM tblClothing WHERE IsDeleted = 0';
        const params = [];
        if (season) {
            sql += ' AND Season = ?';
            params.push(season);
        }
        if (dateFrom) {
            sql += ' AND DistributionDate >= ?';
            params.push(dateFrom);
        }
        if (dateTo) {
            sql += ' AND DistributionDate <= ?';
            params.push(dateTo);
        }
        sql += ' ORDER BY ClothingID DESC';
        const rows = await allQuery(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('خطأ في جلب الكسوة:', err.message);
        res.status(500).json({ error: 'خطأ في جلب الكسوة' });
    }
});

app.post('/api/clothing', requireAuth, async (req, res) => {
    try {
        const data = req.body;
        const sql = `
            INSERT INTO tblClothing (
                OrphanID, DistributionDate, Season, ClothingType, Size, Color,
                Quantity, UnitPrice, TotalPrice, Notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            data.orphanId, data.distributionDate || new Date().toISOString().split('T')[0],
            data.season || 'شتوي', data.clothingType, data.size, data.color,
            data.quantity || 1, data.unitPrice || 0, data.totalPrice || 0, data.notes
        ];
        const result = await runQuery(sql, params);
        await auditLog(req.session.userId, 'إضافة', 'tblClothing', result.lastID, null, data, req, 'إضافة كسوة');
        res.status(201).json({ id: result.lastID, message: 'تم إضافة الكسوة بنجاح' });
    } catch (err) {
        console.error('خطأ في إضافة الكسوة:', err.message);
        res.status(500).json({ error: 'خطأ في إضافة الكسوة' });
    }
});

app.put('/api/clothing/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const oldData = await getQuery('SELECT * FROM tblClothing WHERE ClothingID = ?', [id]);
        if (!oldData) {
            return res.status(404).json({ error: 'الكسوة غير موجودة' });
        }
        const sql = `
            UPDATE tblClothing SET
                OrphanID = ?, DistributionDate = ?, Season = ?, ClothingType = ?,
                Size = ?, Color = ?, Quantity = ?, UnitPrice = ?, TotalPrice = ?, Notes = ?,
                UpdatedAt = CURRENT_TIMESTAMP
            WHERE ClothingID = ?
        `;
        const params = [
            data.orphanId, data.distributionDate, data.season, data.clothingType,
            data.size, data.color, data.quantity || 1, data.unitPrice || 0,
            data.totalPrice || 0, data.notes, id
        ];
        await runQuery(sql, params);
        await auditLog(req.session.userId, 'تعديل', 'tblClothing', id, oldData, data, req, 'تعديل كسوة');
        res.json({ message: 'تم تحديث الكسوة بنجاح' });
    } catch (err) {
        console.error('خطأ في تحديث الكسوة:', err.message);
        res.status(500).json({ error: 'خطأ في تحديث الكسوة' });
    }
});

app.delete('/api/clothing/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const oldData = await getQuery('SELECT * FROM tblClothing WHERE ClothingID = ?', [id]);
        if (!oldData) {
            return res.status(404).json({ error: 'الكسوة غير موجودة' });
        }
        await runQuery('UPDATE tblClothing SET IsDeleted = 1, UpdatedAt = CURRENT_TIMESTAMP WHERE ClothingID = ?', [id]);
        await auditLog(req.session.userId, 'حذف', 'tblClothing', id, oldData, null, req, 'حذف كسوة');
        res.json({ message: 'تم حذف الكسوة بنجاح' });
    } catch (err) {
        console.error('خطأ في حذف الكسوة:', err.message);
        res.status(500).json({ error: 'خطأ في حذف الكسوة' });
    }
});

// 5.8 إدارة الوثائق (CRUD)
app.get('/api/documents', requireAuth, async (req, res) => {
    try {
        const { type, dateFrom, dateTo } = req.query;
        let sql = 'SELECT * FROM tblDocuments WHERE IsDeleted = 0';
        const params = [];
        if (type) {
            sql += ' AND DocumentType = ?';
            params.push(type);
        }
        if (dateFrom) {
            sql += ' AND IssueDate >= ?';
            params.push(dateFrom);
        }
        if (dateTo) {
            sql += ' AND IssueDate <= ?';
            params.push(dateTo);
        }
        sql += ' ORDER BY DocumentID DESC';
        const rows = await allQuery(sql, params);
        for (let row of rows) {
            const att = await getQuery('SELECT COUNT(*) as count FROM tblAttachments WHERE DocumentID = ? AND IsDeleted = 0', [row.DocumentID]);
            row.hasAttachment = att.count > 0;
        }
        res.json(rows);
    } catch (err) {
        console.error('خطأ في جلب الوثائق:', err.message);
        res.status(500).json({ error: 'خطأ في جلب الوثائق' });
    }
});

app.post('/api/documents', requireAuth, upload.single('attachmentFile'), async (req, res) => {
    try {
        const data = req.body;
        const sql = `
            INSERT INTO tblDocuments (
                DocumentTitle, DocumentType, OrphanID, FamilyID, ReferenceNumber,
                IssueDate, ExpiryDate, Content, Notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            data.documentTitle, data.documentType, data.orphanId || null,
            data.familyId || null, data.referenceNumber, data.issueDate,
            data.expiryDate, data.content, data.notes
        ];
        const result = await runQuery(sql, params);
        const docId = result.lastID;

        if (req.file) {
            const filePath = req.file.path;
            const fileName = req.file.filename;
            const fileSize = req.file.size;
            const mimeType = req.file.mimetype;
            const attSql = `
                INSERT INTO tblAttachments (DocumentID, FileName, FilePath, FileSize, MimeType, UploadDate, UploadedBy)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
            `;
            await runQuery(attSql, [docId, fileName, filePath, fileSize, mimeType, req.session.userId]);
        }

        await auditLog(req.session.userId, 'إضافة', 'tblDocuments', docId, null, data, req, 'إضافة وثيقة');
        res.status(201).json({ id: docId, message: 'تم إضافة الوثيقة بنجاح' });
    } catch (err) {
        console.error('خطأ في إضافة الوثيقة:', err.message);
        res.status(500).json({ error: 'خطأ في إضافة الوثيقة' });
    }
});

app.put('/api/documents/:id', requireAuth, upload.single('attachmentFile'), async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const oldData = await getQuery('SELECT * FROM tblDocuments WHERE DocumentID = ?', [id]);
        if (!oldData) {
            return res.status(404).json({ error: 'الوثيقة غير موجودة' });
        }
        const sql = `
            UPDATE tblDocuments SET
                DocumentTitle = ?, DocumentType = ?, OrphanID = ?, FamilyID = ?,
                ReferenceNumber = ?, IssueDate = ?, ExpiryDate = ?, Content = ?, Notes = ?,
                UpdatedAt = CURRENT_TIMESTAMP
            WHERE DocumentID = ?
        `;
        const params = [
            data.documentTitle, data.documentType, data.orphanId || null,
            data.familyId || null, data.referenceNumber, data.issueDate,
            data.expiryDate, data.content, data.notes, id
        ];
        await runQuery(sql, params);

        if (req.file) {
            const oldAtts = await allQuery('SELECT * FROM tblAttachments WHERE DocumentID = ? AND IsDeleted = 0', [id]);
            for (let att of oldAtts) {
                if (fs.existsSync(att.FilePath)) {
                    fs.unlinkSync(att.FilePath);
                }
                await runQuery('UPDATE tblAttachments SET IsDeleted = 1 WHERE AttachmentID = ?', [att.AttachmentID]);
            }
            const filePath = req.file.path;
            const fileName = req.file.filename;
            const fileSize = req.file.size;
            const mimeType = req.file.mimetype;
            const attSql = `
                INSERT INTO tblAttachments (DocumentID, FileName, FilePath, FileSize, MimeType, UploadDate, UploadedBy)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
            `;
            await runQuery(attSql, [id, fileName, filePath, fileSize, mimeType, req.session.userId]);
        }

        await auditLog(req.session.userId, 'تعديل', 'tblDocuments', id, oldData, data, req, 'تعديل وثيقة');
        res.json({ message: 'تم تحديث الوثيقة بنجاح' });
    } catch (err) {
        console.error('خطأ في تحديث الوثيقة:', err.message);
        res.status(500).json({ error: 'خطأ في تحديث الوثيقة' });
    }
});

app.delete('/api/documents/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const oldData = await getQuery('SELECT * FROM tblDocuments WHERE DocumentID = ?', [id]);
        if (!oldData) {
            return res.status(404).json({ error: 'الوثيقة غير موجودة' });
        }
        const atts = await allQuery('SELECT * FROM tblAttachments WHERE DocumentID = ? AND IsDeleted = 0', [id]);
        for (let att of atts) {
            if (fs.existsSync(att.FilePath)) {
                fs.unlinkSync(att.FilePath);
            }
            await runQuery('UPDATE tblAttachments SET IsDeleted = 1 WHERE AttachmentID = ?', [att.AttachmentID]);
        }
        await runQuery('UPDATE tblDocuments SET IsDeleted = 1, UpdatedAt = CURRENT_TIMESTAMP WHERE DocumentID = ?', [id]);
        await auditLog(req.session.userId, 'حذف', 'tblDocuments', id, oldData, null, req, 'حذف وثيقة');
        res.json({ message: 'تم حذف الوثيقة بنجاح' });
    } catch (err) {
        console.error('خطأ في حذف الوثيقة:', err.message);
        res.status(500).json({ error: 'خطأ في حذف الوثيقة' });
    }
});

app.get('/api/documents/:id/attachment', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const att = await getQuery('SELECT * FROM tblAttachments WHERE DocumentID = ? AND IsDeleted = 0', [id]);
        if (!att) {
            return res.status(404).json({ error: 'لا يوجد مرفق لهذه الوثيقة' });
        }
        if (!fs.existsSync(att.FilePath)) {
            return res.status(404).json({ error: 'الملف غير موجود على الخادم' });
        }
        res.download(att.FilePath, att.FileName);
    } catch (err) {
        console.error('خطأ في تحميل المرفق:', err.message);
        res.status(500).json({ error: 'خطأ في تحميل المرفق' });
    }
});

// 5.9 التقارير
app.get('/api/reports', requireAuth, async (req, res) => {
    try {
        const { type, dateFrom, dateTo } = req.query;
        let labels = [];
        let values = [];
        let total = 0;
        let details = {};

        switch (type) {
            case 'orphans-status':
                const statusData = await allQuery('SELECT OrphanStatus, COUNT(*) as count FROM tblOrphans WHERE IsDeleted = 0 GROUP BY OrphanStatus');
                labels = statusData.map(r => r.OrphanStatus || 'غير محدد');
                values = statusData.map(r => r.count);
                total = values.reduce((a, b) => a + b, 0);
                break;

            case 'sponsorships-status':
                const sponsorData = await allQuery('SELECT Status, COUNT(*) as count FROM tblSponsorships WHERE IsDeleted = 0 GROUP BY Status');
                labels = sponsorData.map(r => r.Status || 'غير محدد');
                values = sponsorData.map(r => r.count);
                total = values.reduce((a, b) => a + b, 0);
                break;

            case 'aid-summary':
                const aidData = await allQuery(`
                    SELECT at.AidName, COUNT(ar.AidRecordID) as count 
                    FROM tblAidRecords ar 
                    JOIN tblAidTypes at ON ar.AidTypeID = at.AidTypeID 
                    WHERE ar.IsDeleted = 0 
                    GROUP BY ar.AidTypeID
                `);
                labels = aidData.map(r => r.AidName || 'غير محدد');
                values = aidData.map(r => r.count);
                total = values.reduce((a, b) => a + b, 0);
                break;

            case 'clothing-summary':
                const clothData = await allQuery('SELECT Season, COUNT(*) as count FROM tblClothing WHERE IsDeleted = 0 GROUP BY Season');
                labels = clothData.map(r => r.Season || 'غير محدد');
                values = clothData.map(r => r.count);
                total = values.reduce((a, b) => a + b, 0);
                break;

            case 'monthly-statistics':
                const monthlyData = await allQuery(`
                    SELECT strftime('%Y-%m', CreatedAt) as month, COUNT(*) as count 
                    FROM tblOrphans 
                    WHERE IsDeleted = 0 
                    GROUP BY strftime('%Y-%m', CreatedAt) 
                    ORDER BY month DESC 
                    LIMIT 12
                `);
                labels = monthlyData.map(r => r.month || '—');
                values = monthlyData.map(r => r.count);
                total = values.reduce((a, b) => a + b, 0);
                break;

            case 'families-summary':
                const familyData = await allQuery('SELECT HousingType, COUNT(*) as count FROM tblFamilies WHERE IsDeleted = 0 GROUP BY HousingType');
                labels = familyData.map(r => r.HousingType || 'غير محدد');
                values = familyData.map(r => r.count);
                total = values.reduce((a, b) => a + b, 0);
                break;

            default:
                labels = ['بيانات'];
                values = [0];
                total = 0;
        }

        res.json({ labels, values, total, details });
    } catch (err) {
        console.error('خطأ في جلب بيانات التقرير:', err.message);
        res.status(500).json({ error: 'خطأ في جلب بيانات التقرير' });
    }
});

// 5.10 إدارة المستخدمين (CRUD)
app.get('/api/users', requireAuth, async (req, res) => {
    try {
        const { role, active } = req.query;
        let sql = 'SELECT * FROM tblUsers WHERE IsDeleted = 0';
        const params = [];
        if (role) {
            sql += ' AND RoleID = ?';
            params.push(role);
        }
        if (active !== undefined) {
            sql += ' AND IsActive = ?';
            params.push(active);
        }
        sql += ' ORDER BY UserID DESC';
        const rows = await allQuery(sql, params);
        rows.forEach(row => delete row.PasswordHash);
        res.json(rows);
    } catch (err) {
        console.error('خطأ في جلب المستخدمين:', err.message);
        res.status(500).json({ error: 'خطأ في جلب المستخدمين' });
    }
});

app.post('/api/users', requireAuth, requireRole(1), async (req, res) => {
    try {
        const data = req.body;
        if (!data.password || data.password.length < 6) {
            return res.status(400).json({ error: 'كلمة المرور يجب أن تكون على الأقل 6 أحرف' });
        }
        const hash = bcrypt.hashSync(data.password, 10);
        const sql = `
            INSERT INTO tblUsers (Username, PasswordHash, FullName, Email, Phone, RoleID, IsActive)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            data.username, hash, data.fullName, data.email, data.phone,
            data.roleId || 3, data.isActive !== undefined ? data.isActive : 1
        ];
        const result = await runQuery(sql, params);
        await auditLog(req.session.userId, 'إضافة', 'tblUsers', result.lastID, null, data, req, 'إضافة مستخدم جديد');
        res.status(201).json({ id: result.lastID, message: 'تم إضافة المستخدم بنجاح' });
    } catch (err) {
        console.error('خطأ في إضافة المستخدم:', err.message);
        res.status(500).json({ error: 'خطأ في إضافة المستخدم' });
    }
});

app.put('/api/users/:id', requireAuth, requireRole(1), async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const oldData = await getQuery('SELECT * FROM tblUsers WHERE UserID = ?', [id]);
        if (!oldData) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }
        let sql = `
            UPDATE tblUsers SET
                Username = ?, FullName = ?, Email = ?, Phone = ?, RoleID = ?, IsActive = ?,
                UpdatedAt = CURRENT_TIMESTAMP
        `;
        const params = [data.username, data.fullName, data.email, data.phone, data.roleId || 3, data.isActive !== undefined ? data.isActive : 1];
        if (data.password && data.password.length >= 6) {
            const hash = bcrypt.hashSync(data.password, 10);
            sql += ', PasswordHash = ?';
            params.push(hash);
        }
        sql += ' WHERE UserID = ?';
        params.push(id);
        await runQuery(sql, params);
        await auditLog(req.session.userId, 'تعديل', 'tblUsers', id, oldData, data, req, 'تعديل مستخدم');
        res.json({ message: 'تم تحديث المستخدم بنجاح' });
    } catch (err) {
        console.error('خطأ في تحديث المستخدم:', err.message);
        res.status(500).json({ error: 'خطأ في تحديث المستخدم' });
    }
});

app.delete('/api/users/:id', requireAuth, requireRole(1), async (req, res) => {
    try {
        const id = req.params.id;
        const user = await getQuery('SELECT * FROM tblUsers WHERE UserID = ?', [id]);
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }
        if (user.Username === 'admin') {
            return res.status(403).json({ error: 'لا يمكن حذف المستخدم المدير الرئيسي' });
        }
        await runQuery('UPDATE tblUsers SET IsDeleted = 1, IsActive = 0, UpdatedAt = CURRENT_TIMESTAMP WHERE UserID = ?', [id]);
        await auditLog(req.session.userId, 'حذف', 'tblUsers', id, user, null, req, 'حذف مستخدم');
        res.json({ message: 'تم حذف المستخدم بنجاح' });
    } catch (err) {
        console.error('خطأ في حذف المستخدم:', err.message);
        res.status(500).json({ error: 'خطأ في حذف المستخدم' });
    }
});

app.post('/api/users/:id/reset-password', requireAuth, requireRole(1), async (req, res) => {
    try {
        const id = req.params.id;
        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'كلمة المرور يجب أن تكون على الأقل 6 أحرف' });
        }
        const hash = bcrypt.hashSync(password, 10);
        await runQuery('UPDATE tblUsers SET PasswordHash = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE UserID = ?', [hash, id]);
        await auditLog(req.session.userId, 'تعديل', 'tblUsers', id, null, { password: '***' }, req, 'إعادة تعيين كلمة مرور');
        res.json({ message: 'تم إعادة تعيين كلمة المرور بنجاح' });
    } catch (err) {
        console.error('خطأ في إعادة تعيين كلمة المرور:', err.message);
        res.status(500).json({ error: 'خطأ في إعادة تعيين كلمة المرور' });
    }
});

app.get('/api/roles', requireAuth, async (req, res) => {
    try {
        const rows = await allQuery('SELECT * FROM tblRoles WHERE IsDeleted = 0 ORDER BY RoleID');
        res.json(rows);
    } catch (err) {
        console.error('خطأ في جلب الأدوار:', err.message);
        res.status(500).json({ error: 'خطأ في جلب الأدوار' });
    }
});

// 5.11 إعدادات النظام
app.get('/api/settings', requireAuth, async (req, res) => {
    try {
        const rows = await allQuery('SELECT SettingKey, SettingValue FROM tblSettings WHERE IsDeleted = 0');
        const settings = {};
        rows.forEach(row => {
            settings[row.SettingKey] = row.SettingValue;
        });
        res.json(settings);
    } catch (err) {
        console.error('خطأ في جلب الإعدادات:', err.message);
        res.status(500).json({ error: 'خطأ في جلب الإعدادات' });
    }
});

app.post('/api/settings', requireAuth, requireRole(1), async (req, res) => {
    try {
        const { group, settings } = req.body;
        for (let [key, value] of Object.entries(settings)) {
            const exists = await getQuery('SELECT SettingKey FROM tblSettings WHERE SettingKey = ?', [key]);
            if (exists) {
                await runQuery('UPDATE tblSettings SET SettingValue = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE SettingKey = ?', [value, key]);
            } else {
                await runQuery('INSERT INTO tblSettings (SettingKey, SettingValue, SettingGroup, SettingType) VALUES (?, ?, ?, ?)', [key, value, group || 'عام', 'نص']);
            }
        }
        await auditLog(req.session.userId, 'تعديل', 'tblSettings', null, null, { group, settings }, req, 'تعديل إعدادات النظام');
        res.json({ message: 'تم حفظ الإعدادات بنجاح' });
    } catch (err) {
        console.error('خطأ في حفظ الإعدادات:', err.message);
        res.status(500).json({ error: 'خطأ في حفظ الإعدادات' });
    }
});

// 5.12 النسخ الاحتياطي
app.get('/api/backups', requireAuth, async (req, res) => {
    try {
        const rows = await allQuery('SELECT * FROM tblBackups WHERE IsDeleted = 0 ORDER BY BackupDate DESC');
        res.json(rows);
    } catch (err) {
        console.error('خطأ في جلب النسخ الاحتياطية:', err.message);
        res.status(500).json({ error: 'خطأ في جلب النسخ الاحتياطية' });
    }
});

app.post('/api/backups', requireAuth, requireRole(1), async (req, res) => {
    try {
        const { type = 'يدوي', notes = '' } = req.body;
        const result = await createBackupFile(type, req.session.userId);
        await auditLog(req.session.userId, 'إضافة', 'tblBackups', result.BackupID, null, { type, notes }, req, 'إنشاء نسخة احتياطية');
        res.status(201).json({ id: result.BackupID, message: 'تم إنشاء النسخة الاحتياطية بنجاح' });
    } catch (err) {
        console.error('خطأ في إنشاء النسخة الاحتياطية:', err.message);
        res.status(500).json({ error: 'خطأ في إنشاء النسخة احتياطية' });
    }
});

app.post('/api/backups/:id/restore', requireAuth, requireRole(1), async (req, res) => {
    try {
        const id = req.params.id;
        const backup = await getQuery('SELECT * FROM tblBackups WHERE BackupID = ?', [id]);
        if (!backup) {
            return res.status(404).json({ error: 'النسخة الاحتياطية غير موجودة' });
        }
        if (!fs.existsSync(backup.BackupPath)) {
            return res.status(404).json({ error: 'ملف النسخة الاحتياطية غير موجود' });
        }
        fs.copyFileSync(backup.BackupPath, DB_PATH);
        await auditLog(req.session.userId, 'استعادة', 'tblBackups', id, null, { restored: backup.BackupFileName }, req, 'استعادة نسخة احتياطية');
        res.json({ message: 'تم استعادة النسخة الاحتياطية بنجاح' });
    } catch (err) {
        console.error('خطأ في استعادة النسخة الاحتياطية:', err.message);
        res.status(500).json({ error: 'خطأ في استعادة النسخة الاحتياطية' });
    }
});

app.delete('/api/backups/:id', requireAuth, requireRole(1), async (req, res) => {
    try {
        const id = req.params.id;
        const backup = await getQuery('SELECT * FROM tblBackups WHERE BackupID = ?', [id]);
        if (!backup) {
            return res.status(404).json({ error: 'النسخة الاحتياطية غير موجودة' });
        }
        if (fs.existsSync(backup.BackupPath)) {
            fs.unlinkSync(backup.BackupPath);
        }
        await runQuery('UPDATE tblBackups SET IsDeleted = 1 WHERE BackupID = ?', [id]);
        await auditLog(req.session.userId, 'حذف', 'tblBackups', id, backup, null, req, 'حذف نسخة احتياطية');
        res.json({ message: 'تم حذف النسخة الاحتياطية بنجاح' });
    } catch (err) {
        console.error('خطأ في حذف النسخة الاحتياطية:', err.message);
        res.status(500).json({ error: 'خطأ في حذف النسخة الاحتياطية' });
    }
});

app.get('/api/backups/:id/download', requireAuth, requireRole(1), async (req, res) => {
    try {
        const id = req.params.id;
        const backup = await getQuery('SELECT * FROM tblBackups WHERE BackupID = ?', [id]);
        if (!backup || !fs.existsSync(backup.BackupPath)) {
            return res.status(404).json({ error: 'الملف غير موجود' });
        }
        res.download(backup.BackupPath, backup.BackupFileName);
    } catch (err) {
        console.error('خطأ في تحميل النسخة الاحتياطية:', err.message);
        res.status(500).json({ error: 'خطأ في تحميل النسخة الاحتياطية' });
    }
});

app.get('/api/backups/:id/verify', requireAuth, requireRole(1), async (req, res) => {
    try {
        const id = req.params.id;
        const backup = await getQuery('SELECT * FROM tblBackups WHERE BackupID = ?', [id]);
        if (!backup || !fs.existsSync(backup.BackupPath)) {
            return res.status(404).json({ error: 'الملف غير موجود' });
        }
        const testDb = new sqlite3.Database(backup.BackupPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                return res.json({ valid: false, error: err.message });
            }
            testDb.close();
            res.json({ valid: true });
        });
    } catch (err) {
        console.error('خطأ في التحقق من النسخة الاحتياطية:', err.message);
        res.status(500).json({ error: 'خطأ في التحقق من النسخة الاحتياطية' });
    }
});

// 5.13 سجل العمليات
app.get('/api/logs', requireAuth, async (req, res) => {
    try {
        const { action, table, user, dateFrom, dateTo, limit = 100 } = req.query;
        let sql = 'SELECT * FROM tblLogs WHERE IsDeleted = 0';
        const params = [];
        if (action) {
            sql += ' AND ActionType = ?';
            params.push(action);
        }
        if (table) {
            sql += ' AND TableName = ?';
            params.push(table);
        }
        if (user) {
            sql += ' AND UserID = ?';
            params.push(user);
        }
        if (dateFrom) {
            sql += ' AND LogDate >= ?';
            params.push(dateFrom);
        }
        if (dateTo) {
            sql += ' AND LogDate <= ?';
            params.push(dateTo);
        }
        sql += ' ORDER BY LogDate DESC LIMIT ?';
        params.push(parseInt(limit) || 100);
        const rows = await allQuery(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('خطأ في جلب سجل العمليات:', err.message);
        res.status(500).json({ error: 'خطأ في جلب سجل العمليات' });
    }
});

// 5.14 التنبيهات
app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
        const { type, read, dateFrom, dateTo } = req.query;
        let sql = 'SELECT * FROM tblNotifications WHERE (UserID = ? OR UserID IS NULL) AND IsDeleted = 0';
        const params = [req.session.userId];
        if (type) {
            sql += ' AND NotificationType = ?';
            params.push(type);
        }
        if (read !== undefined) {
            sql += ' AND IsRead = ?';
            params.push(read);
        }
        if (dateFrom) {
            sql += ' AND CreatedAt >= ?';
            params.push(dateFrom);
        }
        if (dateTo) {
            sql += ' AND CreatedAt <= ?';
            params.push(dateTo);
        }
        sql += ' ORDER BY CreatedAt DESC';
        const rows = await allQuery(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('خطأ في جلب التنبيهات:', err.message);
        res.status(500).json({ error: 'خطأ في جلب التنبيهات' });
    }
});

app.patch('/api/notifications/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const { isRead } = req.body;
        const notif = await getQuery('SELECT * FROM tblNotifications WHERE NotificationID = ? AND (UserID = ? OR UserID IS NULL)', [id, req.session.userId]);
        if (!notif) {
            return res.status(404).json({ error: 'التنبيه غير موجود' });
        }
        await runQuery('UPDATE tblNotifications SET IsRead = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE NotificationID = ?', [isRead, id]);
        res.json({ message: 'تم تحديث حالة التنبيه بنجاح' });
    } catch (err) {
        console.error('خطأ في تحديث حالة التنبيه:', err.message);
        res.status(500).json({ error: 'خطأ في تحديث حالة التنبيه' });
    }
});

app.post('/api/notifications/mark-all-read', requireAuth, async (req, res) => {
    try {
        await runQuery('UPDATE tblNotifications SET IsRead = 1, UpdatedAt = CURRENT_TIMESTAMP WHERE (UserID = ? OR UserID IS NULL) AND IsDeleted = 0', [req.session.userId]);
        res.json({ message: 'تم تحديث جميع التنبيهات كمقروءة' });
    } catch (err) {
        console.error('خطأ في تحديث التنبيهات:', err.message);
        res.status(500).json({ error: 'خطأ في تحديث التنبيهات' });
    }
});

app.delete('/api/notifications/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        await runQuery('UPDATE tblNotifications SET IsDeleted = 1, UpdatedAt = CURRENT_TIMESTAMP WHERE NotificationID = ? AND (UserID = ? OR UserID IS NULL)', [id, req.session.userId]);
        res.json({ message: 'تم حذف التنبيه بنجاح' });
    } catch (err) {
        console.error('خطأ في حذف التنبيه:', err.message);
        res.status(500).json({ error: 'خطأ في حذف التنبيه' });
    }
});

app.delete('/api/notifications/delete-read', requireAuth, async (req, res) => {
    try {
        await runQuery('UPDATE tblNotifications SET IsDeleted = 1 WHERE (UserID = ? OR UserID IS NULL) AND IsRead = 1 AND IsDeleted = 0', [req.session.userId]);
        res.json({ message: 'تم حذف جميع التنبيهات المقروءة' });
    } catch (err) {
        console.error('خطأ في حذف التنبيهات المقروءة:', err.message);
        res.status(500).json({ error: 'خطأ في حذف التنبيهات المقروءة' });
    }
});

// ============================================================
// 6. الملفات الثابتة (بعد نقاط API)
// ============================================================
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================
// 7. الصفحات (بعد الملفات الثابتة)
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'login.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.sendFile(path.join(__dirname, 'pages', 'dashboard.html'));
});

// ============================================================
// 8. الدوال المساعدة
// ============================================================
async function auditLog(userId, actionType, tableName, recordId, oldData = null, newData = null, req = null, description = 'عملية نظام') {
    try {
        const ip = req ? req.ip || req.connection.remoteAddress : null;
        const userAgent = req ? req.headers['user-agent'] : null;
        const sql = `
            INSERT INTO tblLogs (UserID, ActionType, TableName, RecordID, OldData, NewData, IPAddress, UserAgent, LogDate, ActionDescription)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        `;
        await runQuery(sql, [
            userId,
            actionType,
            tableName,
            recordId,
            oldData ? JSON.stringify(oldData) : null,
            newData ? JSON.stringify(newData) : null,
            ip,
            userAgent,
            description
        ]);
    } catch (error) {
        console.error('❌ خطأ في تسجيل سجل العمليات:', error.message);
    }
}

function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'غير مصرح به. يرجى تسجيل الدخول.' });
    }
    next();
}

function requireRole(roleId) {
    return (req, res, next) => {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'غير مصرح به.' });
        }
        if (req.session.roleId !== 1 && req.session.roleId !== roleId) {
            return res.status(403).json({ error: 'ليس لديك صلاحية للقيام بهذه العملية.' });
        }
        next();
    };
}

function generateUUID() {
    return crypto.randomUUID();
}

// ============================================================
// 9. إدارة الملفات (Multer)
// ============================================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = path.join(UPLOADS_DIR, 'documents');
        if (file.fieldname === 'photo') {
            uploadPath = path.join(UPLOADS_DIR, 'photos');
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('نوع الملف غير مسموح به'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: fileFilter
});

// ============================================================
// 10. النسخ الاحتياطي
// ============================================================
async function createBackupFile(type = 'يدوي', userId = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${timestamp}.sqlite`;
    const backupPath = path.join(BACKUPS_DIR, fileName);
    
    fs.copyFileSync(DB_PATH, backupPath);
    
    const stats = fs.statSync(backupPath);
    const size = stats.size;
    
    const sql = `
        INSERT INTO tblBackups (BackupFileName, BackupPath, BackupSize, BackupType, BackupDate, CreatedBy, Notes)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
    `;
    const result = await runQuery(sql, [fileName, backupPath, size, type, userId, `نسخ ${type}`]);
    
    const backups = await allQuery('SELECT BackupID, BackupPath FROM tblBackups ORDER BY BackupDate DESC OFFSET 30');
    for (let old of backups) {
        try {
            if (fs.existsSync(old.BackupPath)) {
                fs.unlinkSync(old.BackupPath);
            }
            await runQuery('DELETE FROM tblBackups WHERE BackupID = ?', [old.BackupID]);
        } catch (err) {
            console.error('خطأ في حذف نسخة قديمة:', err.message);
        }
    }
    
    return { BackupID: result.lastID, FileName: fileName, Path: backupPath, Size: size };
}

async function addNotification(userId, title, message, type = 'معلومة', link = null, expiryDate = null) {
    try {
        const sql = `
            INSERT INTO tblNotifications (UserID, Title, Message, NotificationType, Link, ExpiryDate, CreatedAt)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        await runQuery(sql, [userId, title, message, type, link, expiryDate]);
    } catch (err) {
        console.error('خطأ في إضافة التنبيه:', err.message);
    }
}

// ============================================================
// 11. إنشاء المستخدم admin تلقائياً
// ============================================================
async function ensureAdminUser() {
    try {
        console.log('🔄 جارٍ التحقق من المستخدم admin...');
        const admin = await getQuery('SELECT UserID, PasswordHash FROM tblUsers WHERE Username = ?', ['admin']);
        
        const newHash = bcrypt.hashSync('Admin@123', 10);
        
        if (!admin) {
            console.log('⚠️ المستخدم admin غير موجود، جاري إنشائه...');
            await runQuery(
                `INSERT INTO tblUsers (Username, PasswordHash, FullName, Email, RoleID, IsActive, IsDeleted)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['admin', newHash, 'مدير النظام', 'admin@alshawkani.org', 1, 1, 0]
            );
            console.log('✔ تم إنشاء المستخدم admin بنجاح.');
        } else {
            console.log('🔑 تحديث كلمة مرور المستخدم admin...');
            await runQuery(
                'UPDATE tblUsers SET PasswordHash = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE UserID = ?',
                [newHash, admin.UserID]
            );
            console.log('✔ تم تحديث كلمة مرور المستخدم admin بنجاح.');
        }
    } catch (err) {
        console.error('❌ خطأ في التأكد من وجود المستخدم admin:', err.message);
        console.error(err);
    }
}

// ============================================================
// 12. تشغيل الخادم
// ============================================================
async function startServer() {
    try {
        await openDatabase();
        await initializeDatabase();
        await ensureAdminUser();

        app.listen(PORT, '0.0.0.0', () => {
            console.log('==================================================');
            console.log(`🚀 خادم الشوكاني يعمل على المنفذ: ${PORT}`);
            console.log(`🌐 افتح المتصفح على: http://localhost:${PORT}`);
            console.log('==================================================');
        });

        setInterval(async () => {
            try {
                const settings = await allQuery('SELECT SettingValue FROM tblSettings WHERE SettingKey = "backup_auto_enabled"');
                if (settings.length > 0 && settings[0].SettingValue === 'true') {
                    console.log('⏰ تشغيل النسخ الاحتياطي التلقائي...');
                    await createBackupFile('آلي', null);
                }
            } catch (err) {
                console.error('خطأ في النسخ الاحتياطي التلقائي:', err.message);
            }
        }, 24 * 60 * 60 * 1000);

        try {
            await addNotification(null, 'نظام الشوكاني جاهز للعمل', 'تم تشغيل النظام بنجاح، يمكنك البدء في إدارة الأيتام.', 'معلومة');
        } catch (err) {
            // تجاهل
        }

    } catch (err) {
        console.error('✘ فشل بدء التشغيل:', err.message);
        process.exit(1);
    }
}

startServer();

process.on('SIGINT', () => {
    console.log('🛑 إيقاف الخادم...');
    if (db) {
        db.close(() => {
            console.log('✔ تم إغلاق قاعدة البيانات.');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

module.exports = app;