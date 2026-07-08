const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// تأكد من المسار الصحيح لملف schema.sql
const dbPath = path.join(__dirname, 'database', 'data.db');
const schemaPath = path.join(__dirname, 'database', 'schema.sql'); // عدّله إذا كان في مكان آخر

// فتح قاعدة البيانات أولاً
const db = new sqlite3.Database(dbPath);

// استخراج أسماء الأعمدة لكل جدول من ملف schema.sql
function parseSchema(schemaContent) {
    const tableColumns = {};
    const tableRegex = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/g;
    let match;
    while ((match = tableRegex.exec(schemaContent)) !== null) {
        const tableName = match[1];
        const columnsText = match[2];
        const lines = columnsText.split(',').map(c => c.trim()).filter(c =>
            !c.startsWith('FOREIGN KEY') && !c.startsWith('CHECK') && !c.startsWith('UNIQUE')
        );
        const columnNames = [];
        for (const def of lines) {
            const nameMatch = def.match(/^"?(\w+)"?\s/);
            if (nameMatch && !['PRIMARY', 'FOREIGN', 'CHECK', 'UNIQUE'].includes(nameMatch[1].toUpperCase())) {
                columnNames.push(nameMatch[1]);
            }
        }
        tableColumns[tableName] = columnNames;
    }
    return tableColumns;
}

// الحصول على الأعمدة الموجودة في الجدول
function getExistingColumns(tableName) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
            if (err) {
                if (err.message.includes('no such table')) resolve(null);
                else reject(err);
            } else {
                resolve(rows.map(r => r.name));
            }
        });
    });
}

async function fixAllColumns() {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const requiredColumns = parseSchema(schemaContent);

    for (const [tableName, columns] of Object.entries(requiredColumns)) {
        const existing = await getExistingColumns(tableName);
        if (existing === null) {
            console.log(`⚠️ الجدول ${tableName} غير موجود، تخطي.`);
            continue;
        }
        const missing = columns.filter(col => !existing.includes(col));
        for (const col of missing) {
            // استخراج تعريف العمود من schema
            const tableDef = schemaContent.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}\\s*\\(([\\s\\S]*?)\\);`));
            if (tableDef) {
                const colDefRegex = new RegExp(`"?${col}"?\\s+([^,]+)`);
                const colMatch = tableDef[1].match(colDefRegex);
                if (colMatch) {
                    const colType = colMatch[1].trim();
                    await new Promise((resolve, reject) => {
                        db.run(`ALTER TABLE ${tableName} ADD COLUMN ${col} ${colType}`, (err) => {
                            if (err) {
                                if (!err.message.includes('duplicate column name')) console.warn(`فشل: ${tableName}.${col}: ${err.message}`);
                                else console.log(`موجود مسبقاً: ${tableName}.${col}`);
                            } else {
                                console.log(`✔️ أضيف ${col} إلى ${tableName}`);
                            }
                            resolve();
                        });
                    });
                }
            }
        }
    }

    db.close(() => {
        console.log('🎉 تم إصلاح جميع الأعمدة الناقصة. أعد تشغيل التطبيق.');
    });
}

fixAllColumns().catch(console.error);