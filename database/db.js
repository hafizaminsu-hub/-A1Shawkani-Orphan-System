const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'data.db');
const schemaPath = path.resolve(__dirname, 'schema.sql');

// تهيئة الاتصال بقاعدة البيانات
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
    } else {
        console.log('✔ تم الاتصال بقاعدة بيانات SQLite (data.db) بنجاح.');
        initDB();
    }
});

// إنشاء جدول تتبع التحديثات إذا لم يكن موجوداً
function createMigrationTable() {
    return new Promise((resolve, reject) => {
        db.run(`
            CREATE TABLE IF NOT EXISTS tblSchemaVersion (
                VersionID INTEGER PRIMARY KEY AUTOINCREMENT,
                VersionNumber INTEGER NOT NULL,
                AppliedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                Description TEXT
            )
        `, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// الحصول على آخر نسخة تم تطبيقها
function getCurrentVersion() {
    return new Promise((resolve, reject) => {
        db.get('SELECT MAX(VersionNumber) as version FROM tblSchemaVersion', (err, row) => {
            if (err) reject(err);
            else resolve(row?.version || 0);
        });
    });
}

// تطبيق التحديثات حسب النسخة
async function applyMigrations(currentVersion) {
    // التحديث 0 -> 1: إنشاء هيكل قاعدة البيانات الأساسي
    if (currentVersion < 1) {
        console.log('⏳ جاري تطبيق التحديث 1: إنشاء هيكل قاعدة البيانات الأساسي...');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await new Promise((resolve, reject) => {
                db.exec(schema, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log('✔ تم إنشاء هيكل قاعدة البيانات الأساسي بنجاح.');
        }
        await recordMigration(1, 'إنشاء هيكل قاعدة البيانات الأساسي');
    }
    
    // التحديث 1 -> 2: التأكد من وجود الأعمدة الجديدة (للتوافق مع الإصدارات القديمة)
    if (currentVersion < 2) {
        console.log('⏳ جاري تطبيق التحديث 2: إضافة الأعمدة الجديدة...');
        
        // إضافة عمود UserID لجدول التنبيهات إذا لم يكن موجوداً
        await addColumnIfNotExists('tblNotifications', 'UserID', 'INTEGER REFERENCES tblUsers(UserID) ON DELETE CASCADE');
        
        // إضافة الأعمدة الجديدة لجدول السجلات
        await addColumnIfNotExists('tblLogs', 'TableName', 'TEXT');
        await addColumnIfNotExists('tblLogs', 'RecordID', 'INTEGER');
        await addColumnIfNotExists('tblLogs', 'OldData', 'TEXT');
        await addColumnIfNotExists('tblLogs', 'NewData', 'TEXT');
        
        console.log('✔ تم إضافة الأعمدة الجديدة بنجاح.');
        await recordMigration(2, 'إضافة أعمدة UserID و TableName وغيرها');
    }
    
    // يمكنك إضافة المزيد من التحديثات هنا مستقبلاً
    // if (currentVersion < 3) { ... }
}

// دالة مساعدة: إضافة عمود إذا لم يكن موجوداً
function addColumnIfNotExists(tableName, columnName, columnDefinition) {
    return new Promise((resolve) => {
        // محاولة إضافة العمود (ستفشل بصمت إذا كان موجوداً)
        db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`, (err) => {
            if (err) {
                // إذا كان الخطأ لأن العمود موجود، نتجاهله
                if (err.message.includes('duplicate column name')) {
                    console.log(`   ℹ العمود ${columnName} موجود مسبقاً في جدول ${tableName}.`);
                } else {
                    console.warn(`   ⚠ تحذير عند إضافة العمود ${columnName}: ${err.message}`);
                }
            } else {
                console.log(`   ✔ تم إضافة العمود ${columnName} إلى جدول ${tableName}.`);
            }
            resolve(); // نستمر دائماً بغض النظر عن النتيجة
        });
    });
}

// تسجيل التحديث في جدول التتبع
function recordMigration(version, description) {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO tblSchemaVersion (VersionNumber, Description) VALUES (?, ?)',
            [version, description],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// دالة التحقق من بناء الجداول وتطبيق التحديثات
async function initDB() {
    try {
        // 1. إنشاء جدول التتبع
        await createMigrationTable();
        console.log('✔ جدول تتبع التحديثات جاهز.');
        
        // 2. معرفة النسخة الحالية
        const currentVersion = await getCurrentVersion();
        console.log(`ℹ النسخة الحالية لقاعدة البيانات: ${currentVersion}`);
        
        // 3. تطبيق التحديثات اللازمة
        await applyMigrations(currentVersion);
        
        // 4. التأكد من وجود جداول إضافية لم تكن موجودة (للتطوير المستقبلي)
        if (currentVersion === 0 && fs.existsSync(schemaPath)) {
            console.log('✔ جداول قاعدة البيانات (23 جدول) جاهزة ومحدثة.');
        }
        
        console.log('✔ تم الانتهاء من تهيئة قاعدة البيانات بنجاح.');
    } catch (err) {
        console.error('❌ خطأ في تهيئة قاعدة البيانات:', err.message);
        // لا نتوقف عن العمل، فقط نسجل الخطأ
    }
}

// تحويل دوال SQLite إلى Promises لتسهيل استخدام Async/Await في الخادم
const dbAsync = {
    run: (sql, params = []) => new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    }),
    get: (sql, params = []) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    }),
    all: (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    }),
    exec: (sql) => new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
            if (err) reject(err);
            else resolve();
        });
    }),
    close: () => new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    })
};

module.exports = dbAsync;