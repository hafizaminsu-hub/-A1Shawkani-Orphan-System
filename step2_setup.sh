#!/data/data/com.termux/files/usr/bin/bash

echo "=================================================="
echo "  بدء الخطوة الثانية: تأسيس محرك AlShawkani"
echo "=================================================="

BASE="$HOME/storage/shared/AlShawkani"
cd "$BASE" || exit

# 1. إنشاء ملف package.json
echo "[-] كتابة ملف package.json..."
cat << 'EOF' > package.json
{
  "name": "alshawkani-orphans-system",
  "version": "1.0.0",
  "description": "نظام إدارة الأيتام المكتبي الاحترافي - مؤسسة الشوكاني",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "dev": "nodemon server.js"
  },
  "author": "AlShawkani Dev Team",
  "license": "ISC",
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "express": "^4.18.2",
    "moment": "^2.29.4",
    "sqlite3": "^5.1.6"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "nodemon": "^3.0.1"
  }
}
EOF

# 2. إنشاء قاعدة البيانات الكاملة (23 جدول + الجداول المساعدة)
echo "[-] كتابة ملف database/schema.sql (23 جدول)..."
cat << 'EOF' > database/schema.sql
-- تفعيل التكامل المرجعي للعلاقات
PRAGMA foreign_keys = ON;

-- 1. جدول الإعدادات العامة للمؤسسة
CREATE TABLE IF NOT EXISTS tblSettings (
    SettingID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrganizationName TEXT DEFAULT 'مؤسسة الشوكاني لرعاية الأيتام',
    LogoPath TEXT,
    SignaturePath TEXT,
    StampPath TEXT,
    CurrentAcademicYear TEXT DEFAULT '2025-2026',
    BackupPath TEXT DEFAULT '/backups',
    AttachmentsPath TEXT DEFAULT '/uploads',
    LastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. جدول المحافظات (ترميز جغرافي)
CREATE TABLE IF NOT EXISTS tblGovernorates (
    GovernorateID INTEGER PRIMARY KEY AUTOINCREMENT,
    GovernorateName TEXT NOT NULL UNIQUE
);

-- 3. جدول المديريات
CREATE TABLE IF NOT EXISTS tblDistricts (
    DistrictID INTEGER PRIMARY KEY AUTOINCREMENT,
    GovernorateID INTEGER NOT NULL,
    DistrictName TEXT NOT NULL,
    FOREIGN KEY (GovernorateID) REFERENCES tblGovernorates(GovernorateID)
);

-- 4. جدول القرى / الأحياء
CREATE TABLE IF NOT EXISTS tblVillages (
    VillageID INTEGER PRIMARY KEY AUTOINCREMENT,
    DistrictID INTEGER NOT NULL,
    VillageName TEXT NOT NULL,
    FOREIGN KEY (DistrictID) REFERENCES tblDistricts(DistrictID)
);

-- 5. جدول المدارس
CREATE TABLE IF NOT EXISTS tblSchools (
    SchoolID INTEGER PRIMARY KEY AUTOINCREMENT,
    SchoolName TEXT NOT NULL UNIQUE,
    EducationLevel TEXT, -- ابتدائي، إعدادي، ثانوي
    DistrictID INTEGER,
    FOREIGN KEY (DistrictID) REFERENCES tblDistricts(DistrictID)
);

-- 6. جدول الأسر (يمنع تكرار الأسرة للإخوة)
CREATE TABLE IF NOT EXISTS tblFamilies (
    FamilyID INTEGER PRIMARY KEY AUTOINCREMENT,
    FamilyNumber TEXT NOT NULL UNIQUE, -- رقم الأسرة المستقل
    MotherName TEXT NOT NULL,
    MotherNationalID TEXT UNIQUE,
    MotherPhone TEXT,
    FatherName TEXT NOT NULL,
    FatherDeathDate DATE NOT NULL,
    FatherDeathReason TEXT,
    HousingTypeID INTEGER, -- ملك، إيجار، شعبي، وقف
    HousingAddress TEXT,
    MonthlyIncome REAL DEFAULT 0.0,
    IncomeSource TEXT,
    GuardianName TEXT, -- إذا لم تكن الأم
    GuardianRelation TEXT,
    GuardianPhone TEXT,
    Notes TEXT,
    IsDeleted INTEGER DEFAULT 0, -- Soft Delete
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. جدول الأيتام (الجدول الأساسي)
CREATE TABLE IF NOT EXISTS tblOrphans (
    OrphanID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanNumber TEXT NOT NULL UNIQUE, -- الترقيم التلقائي
    FamilyID INTEGER NOT NULL,
    FullName TEXT NOT NULL,
    Gender TEXT CHECK(Gender IN ('ذكر', 'أنثى')) NOT NULL,
    BirthDate DATE NOT NULL,
    BirthPlace TEXT,
    InternalExternal TEXT DEFAULT 'داخلي', -- كفالة داخلية أو خارجية
    Status TEXT DEFAULT 'نشط', -- نشط، خريج، منسحب، متوفي، مفصول
    PhotoPath TEXT,
    FileNumber TEXT UNIQUE,
    DrawerNumber TEXT,
    IsDeleted INTEGER DEFAULT 0,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (FamilyID) REFERENCES tblFamilies(FamilyID) ON DELETE RESTRICT
);

-- 8. جدول التعليم والحالة الدراسية
CREATE TABLE IF NOT EXISTS tblEducation (
    EducationID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID INTEGER NOT NULL,
    SchoolID INTEGER,
    AcademicYear TEXT NOT NULL,
    GradeLevel TEXT NOT NULL, -- الصف الدراسي
    PerformanceScore REAL, -- المعدل التراكمي
    ResultStatus TEXT DEFAULT 'ناجح', -- ناجح، راسب، متسرب
    Notes TEXT,
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE CASCADE,
    FOREIGN KEY (SchoolID) REFERENCES tblSchools(SchoolID)
);

-- 9. جدول الكفلاء والجهات الداعمة
CREATE TABLE IF NOT EXISTS tblSponsors (
    SponsorID INTEGER PRIMARY KEY AUTOINCREMENT,
    SponsorName TEXT NOT NULL UNIQUE,
    SponsorType TEXT DEFAULT 'فرد', -- فرد، مؤسسة، جمعية خيرية
    Phone1 TEXT,
    Phone2 TEXT,
    Email TEXT,
    Country TEXT,
    Address TEXT,
    IsActive INTEGER DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. جدول الكفالات (سجل تاريخي لا يتم تعديل القديم بل إنشاء جديد)
CREATE TABLE IF NOT EXISTS tblSponsorships (
    SponsorshipID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID INTEGER NOT NULL,
    SponsorID INTEGER NOT NULL,
    SponsorshipType TEXT DEFAULT 'شاملة', -- مالية، تعليمية، صحية، شاملة
    MonthlyAmount REAL NOT NULL,
    Currency TEXT DEFAULT 'YER',
    StartDate DATE NOT NULL,
    EndDate DATE,
    Status TEXT DEFAULT 'نشطة', -- نشطة، موقوفة، منتهية
    StopReason TEXT,
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE RESTRICT,
    FOREIGN KEY (SponsorID) REFERENCES tblSponsors(SponsorID)
);

-- 11. جدول أنواع المساعدات (ديناميكي لتمكين إضافة أنواع جديدة)
CREATE TABLE IF NOT EXISTS tblAidTypes (
    AidTypeID INTEGER PRIMARY KEY AUTOINCREMENT,
    TypeName TEXT NOT NULL UNIQUE, -- كسوة، حقيبة، سلة غذائية، مبلغ مالي، عيدية
    Category TEXT DEFAULT 'عيني', -- نقدي، عيني، خدماتي
    Description TEXT
);

-- 12. جدول سجل المساعدات المصروفة
CREATE TABLE IF NOT EXISTS tblAidRecords (
    AidRecordID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID INTEGER NOT NULL,
    AidTypeID INTEGER NOT NULL,
    ReceiptDate DATE NOT NULL,
    Quantity INTEGER DEFAULT 1,
    EstimatedValue REAL,
    ReceivedBy TEXT, -- المستلم الفعلي (الأم، الولي، اليتيم)
    Notes TEXT,
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE RESTRICT,
    FOREIGN KEY (AidTypeID) REFERENCES tblAidTypes(AidTypeID)
);

-- 13. جدول الكسوة والمقاسات التاريخية
CREATE TABLE IF NOT EXISTS tblClothing (
    ClothingID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID INTEGER NOT NULL,
    RecordDate DATE DEFAULT CURRENT_DATE,
    ShoeSize TEXT,
    BootSize TEXT,
    ThobeSize TEXT, -- الثوب
    PantsSize TEXT, -- البنطال
    JacketSize TEXT,
    ShirtSize TEXT,
    CustomSizeName TEXT, -- حقل مرن لأي مقاس جديد
    CustomSizeValue TEXT,
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE CASCADE
);

-- 14. جدول أنواع الوثائق المطلوبة
CREATE TABLE IF NOT EXISTS tblDocuments (
    DocumentID INTEGER PRIMARY KEY AUTOINCREMENT,
    DocumentName TEXT NOT NULL UNIQUE, -- شهادة ميلاد، شهادة وفاة، بطاقة ولي الأمر، حصر وراثة
    IsMandatory INTEGER DEFAULT 1 -- 1 إلزامي، 0 اختياري
);

-- 15. جدول المرفقات وأرشيف الملفات (يحسب المكتمل والناقص تلقائياً)
CREATE TABLE IF NOT EXISTS tblAttachments (
    AttachmentID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID INTEGER,
    FamilyID INTEGER,
    DocumentID INTEGER NOT NULL,
    FilePath TEXT NOT NULL,
    UploadDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    Status TEXT DEFAULT 'موجود', -- موجود، ناقص، يحتاج تجديد
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE CASCADE,
    FOREIGN KEY (FamilyID) REFERENCES tblFamilies(FamilyID) ON DELETE CASCADE,
    FOREIGN KEY (DocumentID) REFERENCES tblDocuments(DocumentID)
);

-- 16. جدول السجل الصحي
CREATE TABLE IF NOT EXISTS tblHealthRecords (
    HealthID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID INTEGER NOT NULL,
    HealthStatus TEXT DEFAULT 'سليم', -- سليم، مرض مزمن، إعاقة، يحتاج تدخل
    DiseaseName TEXT,
    TreatmentDetails TEXT,
    DoctorOrHospital TEXT,
    CheckupDate DATE,
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE CASCADE
);

-- 17. جدول حفظ القرآن الكريم والأنشطة التربوية
CREATE TABLE IF NOT EXISTS tblQuranRecords (
    QuranID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID INTEGER NOT NULL,
    MemorizationLevel TEXT, -- عدد الأجزاء أو السور
    CenterName TEXT,
    SheikhName TEXT,
    EvaluationDate DATE,
    Rating TEXT, -- ممتاز، جيد جداً، جيد
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE CASCADE
);

-- 18. جدول الأرشيف والتغير التاريخي لحالة اليتيم
CREATE TABLE IF NOT EXISTS tblOrphanStatusHistory (
    HistoryID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID INTEGER NOT NULL,
    OldStatus TEXT,
    NewStatus TEXT NOT NULL, -- خريج، منسحب، مفصول...
    ChangeDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    Reason TEXT NOT NULL,
    ChangedByUsername TEXT NOT NULL,
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE CASCADE
);

-- 19. جدول التقييم السنوي الشامل
CREATE TABLE IF NOT EXISTS tblAnnualAssessments (
    AssessmentID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID INTEGER NOT NULL,
    AssessmentYear TEXT NOT NULL,
    SocialScore INTEGER, -- تقييم من 10
    EducationalScore INTEGER,
    BehavioralScore INTEGER,
    SupervisorName TEXT,
    GeneralRecommendations TEXT,
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE CASCADE
);

-- 20. جدول الصلاحيات والأدوار
CREATE TABLE IF NOT EXISTS tblRoles (
    RoleID INTEGER PRIMARY KEY AUTOINCREMENT,
    RoleName TEXT NOT NULL UNIQUE, -- مدير النظام، موظف التسجيل، مسؤول التقارير
    Permissions JSON NOT NULL -- حفظ الصلاحيات على شكل JSON متطور
);

-- 21. جدول المستخدمين
CREATE TABLE IF NOT EXISTS tblUsers (
    UserID INTEGER PRIMARY KEY AUTOINCREMENT,
    Username TEXT NOT NULL UNIQUE,
    PasswordHash TEXT NOT NULL,
    FullName TEXT NOT NULL,
    RoleID INTEGER NOT NULL,
    IsActive INTEGER DEFAULT 1,
    LastLogin DATETIME,
    FOREIGN KEY (RoleID) REFERENCES tblRoles(RoleID)
);

-- 22. جدول سجل العمليات (Audit Logs - مراقبة النظام)
CREATE TABLE IF NOT EXISTS tblLogs (
    LogID INTEGER PRIMARY KEY AUTOINCREMENT,
    UserID INTEGER,
    Username TEXT,
    ActionType TEXT NOT NULL, -- إضافة، تعديل، حذف منطقي، تصدير، تسجيل دخول
    TargetTable TEXT,
    RecordID INTEGER,
    ActionDescription TEXT NOT NULL,
    ActionTime DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 23. جدول التنبيهات الآلية
CREATE TABLE IF NOT EXISTS tblNotifications (
    NotificationID INTEGER PRIMARY KEY AUTOINCREMENT,
    Title TEXT NOT NULL,
    Message TEXT NOT NULL,
    NotificationType TEXT, -- انتهاء كفالة، ملف ناقص، سن الرشد
    IsRead INTEGER DEFAULT 0,
    TargetUserRole TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 24. جدول إدارة النسخ الاحتياطي
CREATE TABLE IF NOT EXISTS tblBackups (
    BackupID INTEGER PRIMARY KEY AUTOINCREMENT,
    BackupFileName TEXT NOT NULL,
    BackupPath TEXT NOT NULL,
    FileSizeKB REAL,
    CreatedBy TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 25. جدول تبادل البيانات (للرابط المستقبلي أو التزامن)
CREATE TABLE IF NOT EXISTS tblDataExchange (
    ExchangeID INTEGER PRIMARY KEY AUTOINCREMENT,
    ExchangeType TEXT, -- Import, Export
    DataModule TEXT, -- Orphans, Families...
    TotalRecords INTEGER,
    Status TEXT DEFAULT 'Success',
    ExecutedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء الفهارس (Indexes) لضمان السرعة الفائقة في البحث حتى مع 100,000 سجل
CREATE INDEX IF NOT EXISTS idx_orphans_name ON tblOrphans(FullName);
CREATE INDEX IF NOT EXISTS idx_orphans_number ON tblOrphans(OrphanNumber);
CREATE INDEX IF NOT EXISTS idx_orphans_family ON tblOrphans(FamilyID);
CREATE INDEX IF NOT EXISTS idx_families_number ON tblFamilies(FamilyNumber);
CREATE INDEX IF NOT EXISTS idx_families_mother_id ON tblFamilies(MotherNationalID);
CREATE INDEX IF NOT EXISTS idx_sponsorships_status ON tblSponsorships(Status);
CREATE INDEX IF NOT EXISTS idx_logs_time ON tblLogs(ActionTime);

-- إدراج بيانات أولية أساسية لتشغيل النظام مباشرة
INSERT OR IGNORE INTO tblSettings (OrganizationName) VALUES ('مؤسسة الشوكاني لرعاية الأيتام');
INSERT OR IGNORE INTO tblRoles (RoleID, RoleName, Permissions) VALUES 
(1, 'مدير النظام', '{"all": true}'),
(2, 'موظف التسجيل', '{"orphans": true, "families": true, "aid": true}'),
(3, 'مسؤول التقارير', '{"reports": true, "export": true}');

INSERT OR IGNORE INTO tblUsers (UserID, Username, PasswordHash, FullName, RoleID) VALUES 
(1, 'admin', '$2a$10$X7.1.1.1.1.1.1.1.1.1.1uO/X7.1.1.1.1.1.1.1.1.1.1u', 'المدير العام', 1);
EOF

echo "=================================================="
echo "تم بنجاح إعداد package.json وكتابة schema.sql"
echo "الموقع: $BASE/database/schema.sql"
echo "=================================================="
