/**
 * ============================================================
 * الملف: test.js
 * الوصف: اختبار سريع لمكونات النظام الأساسية
 * الإصدار: 1.0.0
 * ============================================================
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

// ============================================================
// 1. تكوين المسارات
// ============================================================
const DB_PATH = path.join(__dirname, 'database', 'data.db');
const SCHEMA_PATH = path.join(__dirname, 'database', 'schema.sql');

// ============================================================
// 2. دوال مساعدة للاختبار
// ============================================================
function logSuccess(msg) {
    console.log('\x1b[32m✔\x1b[0m', msg);
}

function logError(msg) {
    console.log('\x1b[31m✘\x1b[0m', msg);
}

function logInfo(msg) {
    console.log('\x1b[36mℹ\x1b[0m', msg);
}

function logTest(name) {
    console.log(`\n\x1b[33m📌 اختبار: ${name}\x1b[0m`);
}

// ============================================================
// 3. الاختبارات
// ============================================================

async function runTests() {
    console.log('\n\x1b[35m═══════════════════════════════════════════════\x1b[0m');
    console.log('\x1b[35m   بدء اختبار مكونات نظام الشوكاني   \x1b[0m');
    console.log('\x1b[35m═══════════════════════════════════════════════\x1b[0m');

    // --------------------------------------------
    // اختبار 1: وجود ملف قاعدة البيانات
    // --------------------------------------------
    logTest('وجود ملف قاعدة البيانات');
    if (fs.existsSync(DB_PATH)) {
        logSuccess(`ملف قاعدة البيانات موجود: ${DB_PATH}`);
    } else {
        logError(`ملف قاعدة البيانات غير موجود: ${DB_PATH}`);
        return;
    }

    // --------------------------------------------
    // اختبار 2: الاتصال بقاعدة البيانات
    // --------------------------------------------
    logTest('الاتصال بقاعدة البيانات');
    let db;
    try {
        db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE);
        logSuccess('تم الاتصال بقاعدة البيانات بنجاح.');
    } catch (err) {
        logError(`فشل الاتصال: ${err.message}`);
        return;
    }

    // --------------------------------------------
    // اختبار 3: وجود الجداول الأساسية
    // --------------------------------------------
    logTest('وجود الجداول الأساسية');
    const requiredTables = ['tblUsers', 'tblOrphans', 'tblFamilies', 'tblSponsorships', 'tblAidRecords', 'tblLogs'];
    const missingTables = [];

    for (const table of requiredTables) {
        try {
            const row = await new Promise((resolve, reject) => {
                db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            if (row) {
                logSuccess(`الجدول ${table} موجود.`);
            } else {
                missingTables.push(table);
                logError(`الجدول ${table} غير موجود.`);
            }
        } catch (err) {
            logError(`خطأ في التحقق من الجدول ${table}: ${err.message}`);
        }
    }

    if (missingTables.length > 0) {
        logError(`الجداول المفقودة: ${missingTables.join(', ')}`);
    } else {
        logSuccess('جميع الجداول الأساسية موجودة.');
    }

    // --------------------------------------------
    // اختبار 4: وجود المستخدم admin
    // --------------------------------------------
    logTest('وجود المستخدم admin');
    try {
        const user = await new Promise((resolve, reject) => {
            db.get(`SELECT UserID, Username, PasswordHash, FullName FROM tblUsers WHERE Username = 'admin' AND IsDeleted = 0`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (user) {
            logSuccess(`المستخدم admin موجود (ID: ${user.UserID}, الاسم: ${user.FullName}).`);
            // --------------------------------------------
            // اختبار 5: صلاحية كلمة المرور
            // --------------------------------------------
            logTest('صلاحية كلمة المرور Admin@123');
            const isMatch = bcrypt.compareSync('Admin@123', user.PasswordHash);
            if (isMatch) {
                logSuccess('كلمة المرور Admin@123 صحيحة.');
            } else {
                logError('كلمة المرور Admin@123 غير صحيحة.');
            }
        } else {
            logError('المستخدم admin غير موجود.');
        }
    } catch (err) {
        logError(`خطأ في البحث عن المستخدم admin: ${err.message}`);
    }

    // --------------------------------------------
    // اختبار 6: وجود ملف schema.sql
    // --------------------------------------------
    logTest('وجود ملف schema.sql');
    if (fs.existsSync(SCHEMA_PATH)) {
        logSuccess(`ملف schema.sql موجود: ${SCHEMA_PATH}`);
        // عرض أول 5 أسطر من الملف
        try {
            const content = fs.readFileSync(SCHEMA_PATH, 'utf8');
            const lines = content.split('\n').slice(0, 5).join('\n');
            logInfo(`أول 5 أسطر من schema.sql:\n${lines}...`);
        } catch (err) {
            logError(`تعذر قراءة schema.sql: ${err.message}`);
        }
    } else {
        logError(`ملف schema.sql غير موجود: ${SCHEMA_PATH}`);
    }

    // --------------------------------------------
    // اختبار 7: اختبار واجهات API (اختياري)
    // --------------------------------------------
    logTest('اختبار واجهات API الأساسية (محاكاة)');
    logInfo('لاختبار واجهات API، قم بتشغيل الخادم واستخدم curl أو المتصفح.');
    logInfo('   - /api/session');
    logInfo('   - /api/stats');
    logInfo('   - /api/chart-data');

    // --------------------------------------------
    // اختبار 8: أداء قاعدة البيانات (استعلام بسيط)
    // --------------------------------------------
    logTest('أداء استعلام بسيط');
    try {
        const start = performance.now();
        const count = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM tblUsers`, (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
        const end = performance.now();
        logSuccess(`عدد المستخدمين: ${count} (وقت الاستعلام: ${(end - start).toFixed(2)} مللي ثانية)`);
    } catch (err) {
        logError(`خطأ في الاستعلام: ${err.message}`);
    }

    // --------------------------------------------
    // إغلاق قاعدة البيانات
    // --------------------------------------------
    db.close((err) => {
        if (err) {
            logError(`خطأ في إغلاق قاعدة البيانات: ${err.message}`);
        } else {
            logSuccess('تم إغلاق قاعدة البيانات.');
        }
    });

    console.log('\n\x1b[35m═══════════════════════════════════════════════\x1b[0m');
    console.log('\x1b[35m   انتهت الاختبارات   \x1b[0m');
    console.log('\x1b[35m═══════════════════════════════════════════════\x1b[0m\n');
}

// ============================================================
// 4. تشغيل الاختبارات
// ============================================================
runTests().catch(err => {
    console.error('خطأ غير متوقع:', err);
});
