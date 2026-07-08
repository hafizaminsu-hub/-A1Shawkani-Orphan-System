-- ============================================================
-- نظام إدارة الأيتام - مؤسسة الشوكاني
-- قاعدة البيانات (SQLite)
-- تم الإنشاء وفق أفضل الممارسات مع الحذف الناعم والفهارس
-- ============================================================

-- تفعيل قيود المفاتيح الخارجية
PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. جداول المواقع الجغرافية (التسلسل الهرمي)
-- ============================================================

-- جدول المحافظات
CREATE TABLE IF NOT EXISTS tblGovernorates (
    GovernorateID   INTEGER PRIMARY KEY AUTOINCREMENT,
    GovernorateName TEXT    NOT NULL UNIQUE,
    IsDeleted       INTEGER DEFAULT 0,
    CreatedAt       DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول المديريات
CREATE TABLE IF NOT EXISTS tblDistricts (
    DistrictID     INTEGER PRIMARY KEY AUTOINCREMENT,
    GovernorateID  INTEGER NOT NULL,
    DistrictName   TEXT    NOT NULL,
    IsDeleted      INTEGER DEFAULT 0,
    CreatedAt      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (GovernorateID) REFERENCES tblGovernorates(GovernorateID) ON DELETE CASCADE,
    UNIQUE(GovernorateID, DistrictName)
);

-- جدول القرى / المناطق
CREATE TABLE IF NOT EXISTS tblVillages (
    VillageID     INTEGER PRIMARY KEY AUTOINCREMENT,
    DistrictID    INTEGER NOT NULL,
    VillageName   TEXT    NOT NULL,
    IsDeleted     INTEGER DEFAULT 0,
    CreatedAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (DistrictID) REFERENCES tblDistricts(DistrictID) ON DELETE CASCADE,
    UNIQUE(DistrictID, VillageName)
);

-- ============================================================
-- 2. جدول المدارس
-- ============================================================

CREATE TABLE IF NOT EXISTS tblSchools (
    SchoolID     INTEGER PRIMARY KEY AUTOINCREMENT,
    SchoolName   TEXT    NOT NULL UNIQUE,
    SchoolType   TEXT    DEFAULT 'عام', -- عام / تحفيظ / خاص / معهد
    Address      TEXT,
    Phone        TEXT,
    IsDeleted    INTEGER DEFAULT 0,
    CreatedAt    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. جدول الأسر (العوائل)
-- ============================================================

CREATE TABLE IF NOT EXISTS tblFamilies (
    FamilyID          INTEGER PRIMARY KEY AUTOINCREMENT,
    FamilyNumber      TEXT    NOT NULL UNIQUE, -- رقم الأسرة الفريد (مثل: FAM-2024-001)
    FamilyName        TEXT    NOT NULL,        -- اسم العائلة
    GuardianName      TEXT    NOT NULL,        -- اسم ولي الأمر
    GuardianPhone     TEXT    NOT NULL,
    GuardianPhoneAlt  TEXT,
    GuardianIDNumber  TEXT    UNIQUE,          -- رقم هوية ولي الأمر
    Address           TEXT,
    VillageID         INTEGER,
    MonthlyIncome     REAL    DEFAULT 0,
    IncomeSource      TEXT,
    FamilyMembersCount INTEGER DEFAULT 1,
    HousingType       TEXT,                    -- ملك / إيجار / مؤقت
    HousingCondition  TEXT,                    -- جيد / متوسط / متداعٍ
    Notes             TEXT,
    IsDeleted         INTEGER DEFAULT 0,
    CreatedAt         DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt         DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (VillageID) REFERENCES tblVillages(VillageID) ON DELETE SET NULL
);

-- ============================================================
-- 4. جدول الأيتام (المحور الرئيسي)
-- ============================================================

CREATE TABLE IF NOT EXISTS tblOrphans (
    OrphanID          INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanCode        TEXT    NOT NULL UNIQUE, -- رمز فريد (مثل: YTM-2024-001)
    FullName          TEXT    NOT NULL,
    Gender            TEXT    CHECK (Gender IN ('ذكر', 'أنثى')) NOT NULL,
    BirthDate         DATE    NOT NULL,
    BirthPlace        TEXT,
    Nationality       TEXT    DEFAULT 'يمني',
    IDNumber          TEXT    UNIQUE,          -- رقم الهوية أو القيد
    HealthStatus      TEXT    DEFAULT 'سليم',  -- سليم / يحتاج رعاية / مصاب بإعاقة
    DisabilityType    TEXT,                    -- إن وجدت
    BloodType         TEXT,
    FamilyID          INTEGER NOT NULL,
    FatherStatus      TEXT    CHECK (FatherStatus IN ('متوفي', 'غائب', 'مجهول')) DEFAULT 'متوفي',
    FatherDeathDate   DATE,
    FatherDeathCause  TEXT,
    MotherStatus      TEXT    CHECK (MotherStatus IN ('حية', 'متوفاة', 'غائبة')) DEFAULT 'حية',
    MotherName        TEXT,
    MotherPhone       TEXT,
    SchoolID          INTEGER,
    EducationLevel    TEXT,                    -- تمهيدي / ابتدائي / إعدادي / ثانوي / جامعي
    Grade             TEXT,                    -- الصف الدراسي
    AcademicYear      TEXT,
    OrphanStatus      TEXT    CHECK (OrphanStatus IN ('نشط', 'منقطع', 'منتهي')) DEFAULT 'نشط',
    AdmissionDate     DATE    DEFAULT CURRENT_DATE,
    ReleaseDate       DATE,                    -- تاريخ انتهاء الكفالة أو التسجيل
    ReleaseReason     TEXT,
    Notes             TEXT,
    IsDeleted         INTEGER DEFAULT 0,
    CreatedAt         DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt         DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (FamilyID) REFERENCES tblFamilies(FamilyID) ON DELETE CASCADE,
    FOREIGN KEY (SchoolID) REFERENCES tblSchools(SchoolID) ON DELETE SET NULL
);

-- ============================================================
-- 5. جدول السجل التعليمي للأيتام
-- ============================================================

CREATE TABLE IF NOT EXISTS tblEducation (
    EducationID        INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID           INTEGER NOT NULL,
    SchoolID           INTEGER,
    AcademicYear       TEXT    NOT NULL,
    Grade              TEXT    NOT NULL,
    ClassName          TEXT,
    Average            REAL,
    IsPromoted         INTEGER DEFAULT 1, -- 1 ناجح / 0 راسب
    Notes              TEXT,
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE CASCADE,
    FOREIGN KEY (SchoolID) REFERENCES tblSchools(SchoolID) ON DELETE SET NULL
);

-- ============================================================
-- 6. جدول السجلات الصحية للأيتام
-- ============================================================

CREATE TABLE IF NOT EXISTS tblHealthRecords (
    HealthRecordID     INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID           INTEGER NOT NULL,
    RecordDate         DATE    DEFAULT CURRENT_DATE,
    Weight             REAL,
    Height             REAL,
    BloodPressure      TEXT,
    Diagnosis          TEXT,
    Treatment          TEXT,
    DoctorName         TEXT,
    HospitalName       TEXT,
    Cost               REAL    DEFAULT 0,
    IsCritical         INTEGER DEFAULT 0,
    Notes              TEXT,
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE CASCADE
);

-- ============================================================
-- 7. جدول سجل تحفيظ القرآن
-- ============================================================

CREATE TABLE IF NOT EXISTS tblQuranRecords (
    QuranRecordID      INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID           INTEGER NOT NULL,
    RecordDate         DATE    DEFAULT CURRENT_DATE,
    SurahName          TEXT    NOT NULL,
    VersesFrom         INTEGER,
    VersesTo           INTEGER,
    MemorizationLevel  TEXT    CHECK (MemorizationLevel IN ('حفظ جديد', 'مراجعة', 'إتقان')) DEFAULT 'حفظ جديد',
    Evaluation         TEXT,
    TeacherName        TEXT,
    Notes              TEXT,
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE CASCADE
);

-- ============================================================
-- 8. جدول التقييم السنوي للأيتام
-- ============================================================

CREATE TABLE IF NOT EXISTS tblAnnualAssessments (
    AssessmentID       INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID           INTEGER NOT NULL,
    Year               TEXT    NOT NULL, -- مثل: 2024
    AcademicRating     INTEGER CHECK (AcademicRating BETWEEN 1 AND 5),
    BehavioralRating   INTEGER CHECK (BehavioralRating BETWEEN 1 AND 5),
    HealthRating       INTEGER CHECK (HealthRating BETWEEN 1 AND 5),
    SocialRating       INTEGER CHECK (SocialRating BETWEEN 1 AND 5),
    GeneralNotes       TEXT,
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE CASCADE,
    UNIQUE(OrphanID, Year)
);

-- ============================================================
-- 9. جدول الكفلاء
-- ============================================================

CREATE TABLE IF NOT EXISTS tblSponsors (
    SponsorID          INTEGER PRIMARY KEY AUTOINCREMENT,
    SponsorCode        TEXT    NOT NULL UNIQUE,
    FullName           TEXT    NOT NULL,
    IDNumber           TEXT    UNIQUE,
    Phone              TEXT    NOT NULL,
    PhoneAlt           TEXT,
    Email              TEXT    UNIQUE,
    Address            TEXT,
    City               TEXT,
    SponsorType        TEXT    CHECK (SponsorType IN ('فرد', 'جهة', 'شركة')) DEFAULT 'فرد',
    IsActive           INTEGER DEFAULT 1,
    Notes              TEXT,
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 10. جدول الكفالات (ربط الكفيل باليتيم)
-- ============================================================

CREATE TABLE IF NOT EXISTS tblSponsorships (
    SponsorshipID      INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID           INTEGER NOT NULL,
    SponsorID          INTEGER NOT NULL,
    StartDate          DATE    NOT NULL DEFAULT CURRENT_DATE,
    EndDate            DATE,
    MonthlyAmount      REAL    NOT NULL DEFAULT 0,
    PaymentCurrency    TEXT    DEFAULT 'YER',
    PaymentMethod      TEXT    CHECK (PaymentMethod IN ('نقدي', 'تحويل بنكي', 'كي كارد', 'تحويل جوال')) DEFAULT 'نقدي',
    SponsorshipType    TEXT    CHECK (SponsorshipType IN ('شهرية', 'سنوية', 'مرة واحدة')) DEFAULT 'شهرية',
    Status             TEXT    CHECK (Status IN ('نشطة', 'موقفة', 'منتهية')) DEFAULT 'نشطة',
    Notes              TEXT,
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE CASCADE,
    FOREIGN KEY (SponsorID) REFERENCES tblSponsors(SponsorID) ON DELETE CASCADE,
    UNIQUE(OrphanID, SponsorID, StartDate) -- منع تكرار نفس الكفالة لنفس اليتيم والكفيل في نفس التاريخ
);

-- ============================================================
-- 11. جدول أنواع المساعدات
-- ============================================================

CREATE TABLE IF NOT EXISTS tblAidTypes (
    AidTypeID          INTEGER PRIMARY KEY AUTOINCREMENT,
    AidName            TEXT    NOT NULL UNIQUE,
    AidCategory        TEXT    CHECK (AidCategory IN ('مالية', 'غذائية', 'طبية', 'تعليمية', 'كسوة', 'أخرى')) DEFAULT 'مالية',
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 12. جدول سجل المساعدات
-- ============================================================

CREATE TABLE IF NOT EXISTS tblAidRecords (
    AidRecordID        INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID           INTEGER NOT NULL,
    AidTypeID          INTEGER NOT NULL,
    AidDate            DATE    DEFAULT CURRENT_DATE,
    Amount             REAL    DEFAULT 0,
    Quantity           REAL    DEFAULT 0,
    Unit               TEXT,   -- مثل: كيلو, لتر, حبة
    Description        TEXT,
    DistributionMethod TEXT    CHECK (DistributionMethod IN ('يدوي', 'بريد', 'تحويل')) DEFAULT 'يدوي',
    RecipientName      TEXT,   -- من استلم المساعدة (ولي الأمر أو اليتيم نفسه)
    Signature          TEXT,   -- مسار للتوقيع إن وجد
    Notes              TEXT,
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE CASCADE,
    FOREIGN KEY (AidTypeID) REFERENCES tblAidTypes(AidTypeID) ON DELETE CASCADE
);

-- ============================================================
-- 13. جدول الكسوة (الملابس)
-- ============================================================

CREATE TABLE IF NOT EXISTS tblClothing (
    ClothingID         INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID           INTEGER NOT NULL,
    DistributionDate   DATE    DEFAULT CURRENT_DATE,
    Season             TEXT    CHECK (Season IN ('صيفي', 'شتوي', 'ربيعي', 'خريفي')) DEFAULT 'شتوي',
    ClothingType       TEXT    NOT NULL, -- مثل: جاكيت, حذاء, بنطال, قميص
    Size               TEXT,
    Color              TEXT,
    Quantity           INTEGER DEFAULT 1,
    UnitPrice          REAL    DEFAULT 0,
    TotalPrice         REAL    DEFAULT 0,
    Notes              TEXT,
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE CASCADE
);

-- ============================================================
-- 14. جدول الوثائق العامة
-- ============================================================

CREATE TABLE IF NOT EXISTS tblDocuments (
    DocumentID         INTEGER PRIMARY KEY AUTOINCREMENT,
    DocumentTitle      TEXT    NOT NULL,
    DocumentType       TEXT    CHECK (DocumentType IN ('عقد كفالة', 'تقرير طبي', 'شهادة دراسية', 'إقرار', 'تقرير حالة', 'أخرى')) DEFAULT 'أخرى',
    OrphanID           INTEGER, -- قد تكون وثيقة خاصة بيتيم
    FamilyID           INTEGER, -- أو خاصة بأسرة
    ReferenceNumber    TEXT    UNIQUE,
    IssueDate          DATE,
    ExpiryDate         DATE,
    Content            TEXT,   -- نص الوثيقة أو ملخصها
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE CASCADE,
    FOREIGN KEY (FamilyID) REFERENCES tblFamilies(FamilyID) ON DELETE CASCADE,
    CHECK ((OrphanID IS NOT NULL) OR (FamilyID IS NOT NULL)) -- يجب أن تتبع واحداً منهما على الأقل
);

-- ============================================================
-- 15. جدول المرفقات (الملفات الفعلية)
-- ============================================================

CREATE TABLE IF NOT EXISTS tblAttachments (
    AttachmentID       INTEGER PRIMARY KEY AUTOINCREMENT,
    DocumentID         INTEGER NOT NULL,
    FileName           TEXT    NOT NULL,
    FilePath           TEXT    NOT NULL UNIQUE,
    FileSize           INTEGER, -- بالبايت
    MimeType           TEXT,
    UploadDate         DATETIME DEFAULT CURRENT_TIMESTAMP,
    UploadedBy         INTEGER, -- معرف المستخدم الذي رفع الملف
    Notes              TEXT,
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (DocumentID) REFERENCES tblDocuments(DocumentID) ON DELETE CASCADE
);

-- ============================================================
-- 16. جدول تاريخ حالة اليتيم (تتبع التغييرات)
-- ============================================================

CREATE TABLE IF NOT EXISTS tblOrphanStatusHistory (
    StatusHistoryID    INTEGER PRIMARY KEY AUTOINCREMENT,
    OrphanID           INTEGER NOT NULL,
    OldStatus          TEXT    CHECK (OldStatus IN ('نشط', 'منقطع', 'منتهي')),
    NewStatus          TEXT    CHECK (NewStatus IN ('نشط', 'منقطع', 'منتهی')) NOT NULL,
    ChangeReason       TEXT,
    ChangedBy          INTEGER, -- معرف المستخدم
    ChangeDate         DATETIME DEFAULT CURRENT_TIMESTAMP,
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrphanID) REFERENCES tblOrphans(OrphanID) ON DELETE CASCADE
);

-- ============================================================
-- 17. جدول الصلاحيات (الأدوار)
-- ============================================================

CREATE TABLE IF NOT EXISTS tblRoles (
    RoleID             INTEGER PRIMARY KEY AUTOINCREMENT,
    RoleName           TEXT    NOT NULL UNIQUE,
    RoleDescription    TEXT,
    Permissions        TEXT,   -- سيتم تخزين JSON مع الصلاحيات (مثل: {"orphans":"rw", "users":"r"})
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 18. جدول المستخدمين
-- ============================================================

CREATE TABLE IF NOT EXISTS tblUsers (
    UserID             INTEGER PRIMARY KEY AUTOINCREMENT,
    Username           TEXT    NOT NULL UNIQUE,
    PasswordHash       TEXT    NOT NULL,
    FullName           TEXT    NOT NULL,
    Email              TEXT    UNIQUE,
    Phone              TEXT,
    RoleID             INTEGER NOT NULL,
    IsActive           INTEGER DEFAULT 1,
    LastLogin          DATETIME,
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (RoleID) REFERENCES tblRoles(RoleID) ON DELETE CASCADE
);

-- ============================================================
-- 19. جدول الإعدادات العامة
-- ============================================================

CREATE TABLE IF NOT EXISTS tblSettings (
    SettingID          INTEGER PRIMARY KEY AUTOINCREMENT,
    SettingKey         TEXT    NOT NULL UNIQUE,
    SettingValue       TEXT,
    SettingGroup       TEXT    DEFAULT 'عام',
    SettingType        TEXT    CHECK (SettingType IN ('نص', 'رقم', 'منطقي', 'JSON', 'تاريخ')) DEFAULT 'نص',
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 20. جدول سجل العمليات (Audit Log)
-- ============================================================

CREATE TABLE IF NOT EXISTS tblLogs (
    LogID              INTEGER PRIMARY KEY AUTOINCREMENT,
    UserID             INTEGER,
    ActionType         TEXT    NOT NULL, -- مثل: إضافة, تعديل, حذف, تسجيل دخول, طباعة
    TableName          TEXT,            -- الجدول المتأثر
    RecordID           INTEGER,          -- معرف السجل المتأثر
    OldData            TEXT,            -- JSON للبيانات القديمة
    NewData            TEXT,            -- JSON للبيانات الجديدة
    IPAddress          TEXT,
    UserAgent          TEXT,
    LogDate            DATETIME DEFAULT CURRENT_TIMESTAMP,
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES tblUsers(UserID) ON DELETE SET NULL
);

-- ============================================================
-- 21. جدول التنبيهات
-- ============================================================

CREATE TABLE IF NOT EXISTS tblNotifications (
    NotificationID     INTEGER PRIMARY KEY AUTOINCREMENT,
    UserID             INTEGER, -- إذا كان null فهي تنبيه عام
    Title              TEXT    NOT NULL,
    Message            TEXT    NOT NULL,
    NotificationType   TEXT    CHECK (NotificationType IN ('معلومة', 'تحذير', 'خطأ', 'تذكير')) DEFAULT 'معلومة',
    IsRead             INTEGER DEFAULT 0,
    Link               TEXT,   -- رابط للانتقال السريع
    ExpiryDate         DATETIME,
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES tblUsers(UserID) ON DELETE CASCADE
);

-- ============================================================
-- 22. جدول النسخ الاحتياطية
-- ============================================================

CREATE TABLE IF NOT EXISTS tblBackups (
    BackupID           INTEGER PRIMARY KEY AUTOINCREMENT,
    BackupFileName     TEXT    NOT NULL UNIQUE,
    BackupPath         TEXT    NOT NULL UNIQUE,
    BackupSize         INTEGER, -- بالبايت
    BackupType         TEXT    CHECK (BackupType IN ('يدوي', 'آلي', 'استعادة')) DEFAULT 'يدوي',
    BackupDate         DATETIME DEFAULT CURRENT_TIMESTAMP,
    CreatedBy          INTEGER,
    Notes              TEXT,
    IsDeleted          INTEGER DEFAULT 0,
    CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CreatedBy) REFERENCES tblUsers(UserID) ON DELETE SET NULL
);

-- ============================================================
-- إنشاء الفهارس (Indexes) لتحسين الأداء
-- ============================================================

-- فهارس tblOrphans
CREATE INDEX idx_orphans_family ON tblOrphans(FamilyID);
CREATE INDEX idx_orphans_school ON tblOrphans(SchoolID);
CREATE INDEX idx_orphans_status ON tblOrphans(OrphanStatus);
CREATE INDEX idx_orphans_birthdate ON tblOrphans(BirthDate);
CREATE INDEX idx_orphans_code ON tblOrphans(OrphanCode);

-- فهارس tblFamilies
CREATE INDEX idx_families_village ON tblFamilies(VillageID);
CREATE INDEX idx_families_number ON tblFamilies(FamilyNumber);

-- فهارس tblSponsorships
CREATE INDEX idx_sponsorships_orphan ON tblSponsorships(OrphanID);
CREATE INDEX idx_sponsorships_sponsor ON tblSponsorships(SponsorID);
CREATE INDEX idx_sponsorships_status ON tblSponsorships(Status);

-- فهارس tblAidRecords
CREATE INDEX idx_aid_orphan ON tblAidRecords(OrphanID);
CREATE INDEX idx_aid_type ON tblAidRecords(AidTypeID);
CREATE INDEX idx_aid_date ON tblAidRecords(AidDate);

-- فهارس tblClothing
CREATE INDEX idx_clothing_orphan ON tblClothing(OrphanID);

-- فهارس tblUsers
CREATE INDEX idx_users_role ON tblUsers(RoleID);
CREATE INDEX idx_users_active ON tblUsers(IsActive);

-- فهارس tblLogs
CREATE INDEX idx_logs_user ON tblLogs(UserID);
CREATE INDEX idx_logs_date ON tblLogs(LogDate);
CREATE INDEX idx_logs_table ON tblLogs(TableName);

-- فهارس tblNotifications
CREATE INDEX idx_notifications_user ON tblNotifications(UserID);
CREATE INDEX idx_notifications_read ON tblNotifications(IsRead);

-- فهارس tblDocuments
CREATE INDEX idx_documents_orphan ON tblDocuments(OrphanID);
CREATE INDEX idx_documents_family ON tblDocuments(FamilyID);

-- فهارس tblEducation
CREATE INDEX idx_education_orphan ON tblEducation(OrphanID);

-- فهارس tblHealthRecords
CREATE INDEX idx_health_orphan ON tblHealthRecords(OrphanID);

-- فهارس tblQuranRecords
CREATE INDEX idx_quran_orphan ON tblQuranRecords(OrphanID);

-- ============================================================
-- إدخال بيانات أولية (Seed Data)
-- ============================================================

-- إدراج صلاحية المدير الأساسية (Admin)
INSERT OR IGNORE INTO tblRoles (RoleID, RoleName, RoleDescription, Permissions)
VALUES (1, 'مدير النظام', 'صلاحية كاملة على جميع وحدات النظام', '{"all":"rw"}' );

-- إدراج صلاحية المشرف
INSERT OR IGNORE INTO tblRoles (RoleID, RoleName, RoleDescription, Permissions)
VALUES (2, 'مشرف', 'صلاحية إدارة الأيتام والكفالات والمساعدات', '{"orphans":"rw","sponsorships":"rw","aid":"rw","families":"rw"}' );

-- إدراج صلاحية المستخدم العادي (مشاهد فقط)
INSERT OR IGNORE INTO tblRoles (RoleID, RoleName, RoleDescription, Permissions)
VALUES (3, 'مستخدم', 'صلاحية عرض البيانات فقط', '{"orphans":"r","families":"r","sponsorships":"r"}' );

-- إدراج مستخدم المدير (كلمة المرور: Admin@123) سيتم تشفيرها في تطبيق Node.js، لكن نضعها كقيمة افتراضية مؤقتة
-- سيتم استبدال هذه القيمة عند أول تشغيل للتطبيق عبر كود Node.js
INSERT OR IGNORE INTO tblUsers (UserID, Username, PasswordHash, FullName, Email, RoleID, IsActive)
VALUES (1, 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mr/.cZxqB2eB5Y4fL5WZ3QxYvG6QnUu', 'مدير النظام', 'admin@alshawkani.org', 1, 1);

-- إدراج إعدادات افتراضية
INSERT OR IGNORE INTO tblSettings (SettingKey, SettingValue, SettingGroup, SettingType)
VALUES 
('app_name', 'نظام الشوكاني لإدارة الأيتام', 'عام', 'نص'),
('app_version', '1.0.0', 'عام', 'نص'),
('default_currency', 'YER', 'مالي', 'نص'),
('monthly_sponsorship_default', '15000', 'مالي', 'رقم'),
('backup_auto_enabled', 'true', 'نسخ احتياطي', 'منطقي'),
('backup_auto_interval', '24', 'نسخ احتياطي', 'رقم'),
('school_year_start', '2024-09-01', 'تعليمي', 'تاريخ');

-- إدراج بعض أنواع المساعدات الأساسية
INSERT OR IGNORE INTO tblAidTypes (AidTypeID, AidName, AidCategory)
VALUES 
(1, 'مساعدات مالية شهرية', 'مالية'),
(2, 'سلة غذائية', 'غذائية'),
(3, 'علاج طبي', 'طبية'),
(4, 'رسوم دراسية', 'تعليمية'),
(5, 'كسوة عيد', 'كسوة'),
(6, 'مساعدات عاجلة', 'أخرى');

-- ============================================================
-- نهاية ملف schema.sql
-- ============================================================