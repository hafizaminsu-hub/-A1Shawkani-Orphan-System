-- ============================================================
-- بيانات وهمية لنظام الشوكاني - للتجربة فقط
-- ============================================================

-- 1. إضافة محافظات
INSERT OR IGNORE INTO tblGovernorates (GovernorateName) VALUES 
('صنعاء'), ('عدن'), ('تعز'), ('الحديدة'), ('إب');

-- 2. إضافة مديريات
INSERT OR IGNORE INTO tblDistricts (GovernorateID, DistrictName) VALUES 
(1, 'مديرية صنعاء القديمة'), (1, 'مديرية شعوب'), (1, 'مديرية الوحدة'),
(2, 'مديرية خور مكسر'), (2, 'مديرية كريتر'),
(3, 'مديرية القاهرة'), (3, 'مديرية صالة');

-- 3. إضافة قرى
INSERT OR IGNORE INTO tblVillages (DistrictID, VillageName) VALUES 
(1, 'حي الزبيري'), (1, 'حي القاع'), (2, 'حي الجراف'),
(3, 'حي التسعين'), (4, 'حي العريش'), (5, 'حي اتحاد');

-- 4. إضافة مدارس
INSERT OR IGNORE INTO tblSchools (SchoolName, SchoolType, Address) VALUES 
('مدرسة 22 مايو', 'عام', 'صنعاء'),
('مدرسة خالد بن الوليد', 'تحفيظ', 'عدن'),
('مدرسة النهضة', 'خاص', 'تعز'),
('مدرسة الفجر', 'عام', 'الحديدة');

-- 5. إضافة أسر
INSERT OR IGNORE INTO tblFamilies (FamilyNumber, FamilyName, GuardianName, GuardianPhone, Address, VillageID, MonthlyIncome, FamilyMembersCount, HousingType) VALUES 
('FAM-2026-001', 'آل العبسي', 'علي أحمد العبسي', '777111222', 'حي الزبيري', 1, 45000, 6, 'ملك'),
('FAM-2026-002', 'آل الشراعي', 'محمد حسن الشراعي', '777333444', 'حي القاع', 2, 30000, 4, 'إيجار'),
('FAM-2026-003', 'آل العمري', 'صالح عبدالله العمري', '777555666', 'حي الجراف', 3, 55000, 7, 'ملك');

-- 6. إضافة أيتام
INSERT OR IGNORE INTO tblOrphans (
    OrphanCode, FullName, Gender, BirthDate, BirthPlace, Nationality, HealthStatus, BloodType, FamilyID, 
    FatherStatus, MotherStatus, MotherName, MotherPhone, SchoolID, EducationLevel, Grade, OrphanStatus, AdmissionDate
) VALUES 
('YTM-0001', 'أحمد علي العبسي', 'ذكر', '2018-05-12', 'صنعاء', 'يمني', 'سليم', 'O+', 1, 'متوفي', 'حية', 'فاطمة العبسي', '777111333', 1, 'ابتدائي', 'الثالث', 'نشط', '2024-01-15'),
('YTM-0002', 'فاطمة علي العبسي', 'أنثى', '2020-08-25', 'صنعاء', 'يمني', 'سليم', 'A+', 1, 'متوفي', 'حية', 'فاطمة العبسي', '777111333', 1, 'تمهيدي', 'الثاني', 'نشط', '2024-01-15'),
('YTM-0003', 'محمد حسن الشراعي', 'ذكر', '2016-03-10', 'صنعاء', 'يمني', 'يحتاج رعاية', 'B+', 2, 'غائب', 'متوفاة', 'نورة الشراعي', '777333555', 2, 'ابتدائي', 'الرابع', 'نشط', '2024-02-20'),
('YTM-0004', 'سارة صالح العمري', 'أنثى', '2019-11-30', 'صنعاء', 'يمني', 'سليم', 'AB+', 3, 'متوفي', 'حية', 'أمينة العمري', '777555777', 3, 'تمهيدي', 'الأول', 'نشط', '2024-03-05'),
('YTM-0005', 'عبدالله صالح العمري', 'ذكر', '2021-07-18', 'صنعاء', 'يمني', 'مصاب بإعاقة', 'O-', 3, 'متوفي', 'حية', 'أمينة العمري', '777555777', 3, 'تمهيدي', 'الأول', 'نشط', '2024-03-05');

-- 7. إضافة كفيل
INSERT OR IGNORE INTO tblSponsors (SponsorCode, FullName, Phone, Email, SponsorType, City, IsActive) VALUES 
('SP-0001', 'مؤسسة الوفاق الخيرية', '777888999', 'info@wfaq.org', 'جهة', 'صنعاء', 1);

-- 8. إضافة كفالات
INSERT OR IGNORE INTO tblSponsorships (
    OrphanID, SponsorID, StartDate, MonthlyAmount, PaymentCurrency, PaymentMethod, SponsorshipType, Status
) VALUES 
(1, 1, '2024-01-15', 15000, 'YER', 'تحويل بنكي', 'شهرية', 'نشطة'),
(3, 1, '2024-02-20', 12000, 'YER', 'نقدي', 'شهرية', 'نشطة');

-- 9. إضافة أنواع المساعدات
INSERT OR IGNORE INTO tblAidTypes (AidName, AidCategory) VALUES 
('سلة غذائية', 'غذائية'),
('علاج طبي', 'طبية'),
('رسوم دراسية', 'تعليمية'),
('كسوة عيد', 'كسوة');

-- 10. إضافة سجلات مساعدات
INSERT OR IGNORE INTO tblAidRecords (
    OrphanID, AidTypeID, AidDate, Amount, Description, DistributionMethod, RecipientName
) VALUES 
(1, 1, '2025-01-20', 5000, 'سلة غذائية رمضان', 'يدوي', 'فاطمة العبسي'),
(3, 2, '2025-02-15', 10000, 'علاج طبي عاجل', 'يدوي', 'نورة الشراعي'),
(4, 3, '2025-03-01', 3000, 'رسوم دراسية فصل أول', 'تحويل', 'أمينة العمري');

-- 11. إضافة سجلات كسوة
INSERT OR IGNORE INTO tblClothing (
    OrphanID, DistributionDate, Season, ClothingType, Size, Color, Quantity, UnitPrice, TotalPrice
) VALUES 
(1, '2024-12-20', 'شتوي', 'جاكيت', 'M', 'أزرق', 2, 2500, 5000),
(2, '2024-12-20', 'شتوي', 'حذاء', '32', 'بني', 1, 3000, 3000),
(3, '2025-01-10', 'شتوي', 'بنطال', 'L', 'أسود', 3, 1500, 4500);

-- 12. إضافة مستخدم تجريبي (كلمة المرور: 123456)
INSERT OR IGNORE INTO tblUsers (Username, PasswordHash, FullName, Email, RoleID, IsActive) VALUES 
('user1', '$2a$10$YhJzQYqUeK5qUeK5qUeK5u', 'مستخدم تجريبي', 'user1@alshawkani.org', 3, 1);

-- 13. إضافة إعدادات افتراضية
INSERT OR IGNORE INTO tblSettings (SettingKey, SettingValue, SettingGroup, SettingType) VALUES 
('app_name', 'نظام الشوكاني لإدارة الأيتام', 'عام', 'نص'),
('app_version', '1.0.0', 'عام', 'نص'),
('default_currency', 'YER', 'مالي', 'نص'),
('backup_auto_enabled', 'true', 'نسخ احتياطي', 'منطقي');

-- 14. إضافة تنبيهات تجريبية
INSERT OR IGNORE INTO tblNotifications (UserID, Title, Message, NotificationType, IsRead, CreatedAt) VALUES 
(NULL, 'مرحباً بك في نظام الشوكاني', 'تم إعداد النظام بنجاح، يمكنك البدء في إدارة الأيتام.', 'معلومة', 0, CURRENT_TIMESTAMP),
(1, 'تنبيه: كفالة قاربت على الانتهاء', 'كفالة اليتيم أحمد العبسي ستنتهي بعد 30 يوماً.', 'تذكير', 0, CURRENT_TIMESTAMP);

-- 15. إضافة سجل عمليات تجريبي
INSERT OR IGNORE INTO tblLogs (UserID, ActionType, TableName, RecordID, LogDate) VALUES 
(1, 'تسجيل دخول', 'tblUsers', 1, CURRENT_TIMESTAMP),
(1, 'إضافة', 'tblOrphans', 1, datetime('now', '-1 day')),
(1, 'إضافة', 'tblSponsorships', 1, datetime('now', '-2 days'));

-- ============================================================
-- نهاية البيانات الوهمية
-- ============================================================
