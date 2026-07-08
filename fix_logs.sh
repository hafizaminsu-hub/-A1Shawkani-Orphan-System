#!/bin/bash
sqlite3 database/data.db <<EOF
-- التأكد من وجود العمود ActionDescription
PRAGMA table_info(tblLogs);

-- حذف الجدول المؤقت إذا وجد
DROP TABLE IF EXISTS tblLogs_temp;

-- إنشاء جدول مؤقت بالهيكل الجديد (بدون NOT NULL على ActionDescription)
CREATE TABLE tblLogs_temp (
    LogID INTEGER PRIMARY KEY AUTOINCREMENT,
    UserID INTEGER,
    ActionType TEXT NOT NULL,
    ActionDescription TEXT,   -- هنا أزلنا NOT NULL
    TableName TEXT,
    RecordID INTEGER,
    OldData TEXT,
    NewData TEXT,
    IPAddress TEXT,
    UserAgent TEXT,
    LogDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    IsDeleted INTEGER DEFAULT 0,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES tblUsers(UserID) ON DELETE SET NULL
);

-- نسخ البيانات من الجدول القديم إلى الجديد (مع استبدال أي NULL بقيمة فارغة)
INSERT INTO tblLogs_temp (
    LogID, UserID, ActionType, ActionDescription, TableName, RecordID,
    OldData, NewData, IPAddress, UserAgent, LogDate, IsDeleted, CreatedAt, UpdatedAt
)
SELECT
    LogID, UserID, ActionType,
    COALESCE(ActionDescription, '') AS ActionDescription,
    TableName, RecordID, OldData, NewData, IPAddress, UserAgent,
    LogDate, IsDeleted, CreatedAt, UpdatedAt
FROM tblLogs;

-- حذف الجدول القديم
DROP TABLE tblLogs;

-- إعادة تسمية الجدول المؤقت إلى الاسم الأصلي
ALTER TABLE tblLogs_temp RENAME TO tblLogs;

-- إعادة بناء الفهارس (إن وجدت)
CREATE INDEX IF NOT EXISTS idx_logs_user ON tblLogs(UserID);
CREATE INDEX IF NOT EXISTS idx_logs_date ON tblLogs(LogDate);
CREATE INDEX IF NOT EXISTS idx_logs_table ON tblLogs(TableName);
EOF