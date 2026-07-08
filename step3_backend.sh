#!/data/data/com.termux/files/usr/bin/bash

echo "=================================================="
echo "  بدء الخطوة الثالثة: إعداد محرك Node.js و Electron"
echo "=================================================="

BASE="$HOME/storage/shared/AlShawkani"
cd "$BASE" || exit

# 1. إنشاء محرك قاعدة البيانات (db.js) يدعم Async/Await
echo "[-] كتابة ملف database/db.js..."
cat << 'EOF' > database/db.js
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

// دالة التحقق من بناء الجداول
function initDB() {
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema, (err) => {
            if (err) {
                console.error('❌ خطأ في بناء جداول قاعدة البيانات:', err.message);
            } else {
                console.log('✔ جداول قاعدة البيانات (23 جدول) جاهزة ومحدثة.');
            }
        });
    } else {
        console.warn('⚠ ملف schema.sql غير موجود، تم تخطي البناء التلقائي.');
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
EOF

# 2. إنشاء خادم Express (server.js)
echo "[-] كتابة ملف server.js..."
cat << 'EOF' > server.js
const express = require('express');
const path = require('path');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات الـ Middleware لمعالجة البيانات المرسلة
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// إتاحة المجلدات الثابتة (Static Files) للواجهة الأمامية
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));

// المسار الافتراضي: توجيه المستخدم إلى صفحة تسجيل الدخول
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages/login.html'));
});

// ==========================================
// مسارات الفحص والاختبار (API Routes)
// ==========================================

// فحص حالة النظام وقراءة إعدادات المؤسسة
app.get('/api/status', async (req, res) => {
    try {
        const settings = await db.get("SELECT * FROM tblSettings LIMIT 1");
        const orphansCount = await db.get("SELECT COUNT(*) as count FROM tblOrphans WHERE IsDeleted = 0");
        const familiesCount = await db.get("SELECT COUNT(*) as count FROM tblFamilies WHERE IsDeleted = 0");

        res.json({
            status: "success",
            message: "محرك نظام الشوكاني يعمل بكفاءة عالية 🚀",
            data: {
                organization: settings ? settings.OrganizationName : "غير معرف",
                academicYear: settings ? settings.CurrentAcademicYear : "غير معرف",
                stats: {
                    orphans: orphansCount.count,
                    families: familiesCount.count
                }
            }
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// تشغيل الخادم
const server = app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 الخادم المحلي يعمل الآن على المنفذ: ${PORT}`);
    console.log(`🌐 افتح المتصفح على: http://localhost:${PORT}`);
    console.log(`==================================================`);
});

module.exports = server;
EOF

# 3. إنشاء ملف الدخول لـ Electron (main.js)
echo "[-] كتابة ملف main.js الخاص بـ Electron..."
cat << 'EOF' > main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

// تشغيل خادم Node.js الداخلي عند بدء تشغيل البرنامج
require('./server');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 768,
        title: "نظام إدارة الأيتام - مؤسسة الشوكاني",
        icon: path.join(__dirname, 'assets/icons/logo.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        show: false // إخفاء النافذة حتى تكتمل التحميل لظهور سلس
    });

    // تحميل الواجهة من الخادم المحلي الداخلي
    mainWindow.loadURL('http://localhost:3000');

    // إظهار النافذة وتكبيرها فور جهوزيتها
    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize();
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
EOF

echo "=================================================="
echo "✔ تم إنشاء db.js و server.js و main.js بنجاح!"
echo "=================================================="
