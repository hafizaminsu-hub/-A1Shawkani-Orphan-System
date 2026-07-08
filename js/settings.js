/**
 * ============================================================
 * الملف: settings.js
 * الوصف: وحدة إعدادات النظام - عرض وتعديل الإعدادات العامة، إعدادات الكفالات، التقارير، النسخ الاحتياطي
 * يعتمد على: app.js (الدوال المساعدة)
 * الإصدار: 1.0.0
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. عناصر DOM الخاصة بالوحدة
    // ============================================================
    const DOM = {
        // علامات التبويب (Tabs)
        tabGeneral: document.getElementById('tabGeneral'),
        tabSponsorships: document.getElementById('tabSponsorships'),
        tabReports: document.getElementById('tabReports'),
        tabBackup: document.getElementById('tabBackup'),
        tabNotifications: document.getElementById('tabNotifications'),

        // نموذج الإعدادات العامة
        formGeneral: document.getElementById('settingsGeneralForm'),
        appName: document.getElementById('appName'),
        appVersion: document.getElementById('appVersion'),
        defaultCurrency: document.getElementById('defaultCurrency'),
        language: document.getElementById('language'),
        timezone: document.getElementById('timezone'),
        saveGeneralBtn: document.getElementById('saveGeneralBtn'),

        // نموذج إعدادات الكفالات
        formSponsorships: document.getElementById('settingsSponsorshipsForm'),
        defaultMonthlyAmount: document.getElementById('defaultMonthlyAmount'),
        minSponsorshipAmount: document.getElementById('minSponsorshipAmount'),
        maxSponsorshipAmount: document.getElementById('maxSponsorshipAmount'),
        autoRenewEnabled: document.getElementById('autoRenewEnabled'),
        reminderDays: document.getElementById('reminderDays'),
        saveSponsorshipsBtn: document.getElementById('saveSponsorshipsBtn'),

        // نموذج إعدادات التقارير
        formReports: document.getElementById('settingsReportsForm'),
        reportFooterText: document.getElementById('reportFooterText'),
        reportLogoEnabled: document.getElementById('reportLogoEnabled'),
        reportPageSize: document.getElementById('reportPageSize'),
        reportOrientation: document.getElementById('reportOrientation'),
        saveReportsBtn: document.getElementById('saveReportsBtn'),

        // نموذج إعدادات النسخ الاحتياطي
        formBackup: document.getElementById('settingsBackupForm'),
        backupAutoEnabled: document.getElementById('backupAutoEnabled'),
        backupInterval: document.getElementById('backupInterval'),
        backupLocation: document.getElementById('backupLocation'),
        backupRetention: document.getElementById('backupRetention'),
        createBackupBtn: document.getElementById('createBackupBtn'),
        backupStatus: document.getElementById('backupStatus'),

        // نموذج إعدادات التنبيهات
        formNotifications: document.getElementById('settingsNotificationsForm'),
        notifyOnOrphanAdd: document.getElementById('notifyOnOrphanAdd'),
        notifyOnSponsorshipEnd: document.getElementById('notifyOnSponsorshipEnd'),
        notifyOnAidDistribution: document.getElementById('notifyOnAidDistribution'),
        notifyOnClothingDistribution: document.getElementById('notifyOnClothingDistribution'),
        notificationEmail: document.getElementById('notificationEmail'),
        saveNotificationsBtn: document.getElementById('saveNotificationsBtn'),

        // قائمة النسخ الاحتياطية
        backupList: document.getElementById('backupList'),
        backupTableBody: document.getElementById('backupTableBody')
    };

    // ============================================================
    // 2. متغيرات الحالة
    // ============================================================
    let settingsData = {};
    let backupsList = [];

    // ============================================================
    // 3. الدوال الأساسية
    // ============================================================

    /**
     * جلب إعدادات النظام من الخادم
     * @returns {Promise<Object>} إعدادات النظام
     */
    async function fetchSettings() {
        try {
            const response = await fetch('/api/settings');
            if (!response.ok) throw new Error('فشل في جلب إعدادات النظام');
            const data = await response.json();
            settingsData = data;
            return data;
        } catch (error) {
            console.error('❌ خطأ في جلب الإعدادات:', error.message);
            window.AlShawkani.App.showError('تعذر جلب إعدادات النظام. يرجى المحاولة مرة أخرى.');
            return {};
        }
    }

    /**
     * حفظ إعدادات النظام
     * @param {Object} settings - الإعدادات المراد حفظها
     * @param {string} group - مجموعة الإعدادات (عام، كفالات، تقارير، نسخ احتياطي، تنبيهات)
     * @returns {Promise<Object>} نتيجة الحفظ
     */
    async function saveSettings(settings, group = 'general') {
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ group, settings })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في حفظ الإعدادات');
            }

            const result = await response.json();
            window.AlShawkani.App.showSuccess('تم حفظ الإعدادات بنجاح');
            return result;
        } catch (error) {
            console.error('❌ خطأ في حفظ الإعدادات:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حفظ الإعدادات. يرجى المحاولة مرة أخرى.');
            throw error;
        }
    }

    /**
     * جلب قائمة النسخ الاحتياطية
     * @returns {Promise<Array>} قائمة النسخ الاحتياطية
     */
    async function fetchBackups() {
        try {
            const response = await fetch('/api/backups');
            if (!response.ok) throw new Error('فشل في جلب قائمة النسخ الاحتياطية');
            const data = await response.json();
            backupsList = data;
            return data;
        } catch (error) {
            console.error('❌ خطأ في جلب النسخ الاحتياطية:', error.message);
            window.AlShawkani.App.showError('تعذر جلب قائمة النسخ الاحتياطية.');
            return [];
        }
    }

    /**
     * إنشاء نسخة احتياطية جديدة
     * @param {string} type - نوع النسخة (يدوي أو آلي)
     * @returns {Promise<Object>} نتيجة الإنشاء
     */
    async function createBackup(type = 'يدوي') {
        try {
            const response = await fetch('/api/backups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ type })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في إنشاء النسخة الاحتياطية');
            }

            const result = await response.json();
            window.AlShawkani.App.showSuccess('تم إنشاء النسخة الاحتياطية بنجاح');
            await loadBackupsList();
            return result;
        } catch (error) {
            console.error('❌ خطأ في إنشاء النسخة الاحتياطية:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر إنشاء النسخة الاحتياطية.');
            throw error;
        }
    }

    /**
     * استعادة نسخة احتياطية
     * @param {number} backupId - معرف النسخة الاحتياطية
     * @returns {Promise<Object>} نتيجة الاستعادة
     */
    async function restoreBackup(backupId) {
        try {
            const response = await fetch(`/api/backups/${backupId}/restore`, {
                method: 'POST',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في استعادة النسخة الاحتياطية');
            }

            const result = await response.json();
            window.AlShawkani.App.showSuccess('تم استعادة النسخة الاحتياطية بنجاح');
            return result;
        } catch (error) {
            console.error('❌ خطأ في استعادة النسخة الاحتياطية:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر استعادة النسخة الاحتياطية.');
            throw error;
        }
    }

    /**
     * حذف نسخة احتياطية
     * @param {number} backupId - معرف النسخة الاحتياطية
     * @returns {Promise<Object>} نتيجة الحذف
     */
    async function deleteBackup(backupId) {
        try {
            const response = await fetch(`/api/backups/${backupId}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في حذف النسخة الاحتياطية');
            }

            window.AlShawkani.App.showSuccess('تم حذف النسخة الاحتياطية بنجاح');
            await loadBackupsList();
            return true;
        } catch (error) {
            console.error('❌ خطأ في حذف النسخة الاحتياطية:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حذف النسخة الاحتياطية.');
            throw error;
        }
    }

    /**
     * تحميل ملف النسخة الاحتياطية للتحميل
     * @param {number} backupId - معرف النسخة الاحتياطية
     */
    async function downloadBackup(backupId) {
        try {
            const response = await fetch(`/api/backups/${backupId}/download`);
            if (!response.ok) throw new Error('فشل في تحميل النسخة الاحتياطية');
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // استخراج اسم الملف من رأس Content-Disposition
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `backup_${backupId}.sqlite`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            window.AlShawkani.App.showSuccess('تم تحميل النسخة الاحتياطية بنجاح');
        } catch (error) {
            console.error('❌ خطأ في تحميل النسخة الاحتياطية:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر تحميل النسخة الاحتياطية.');
        }
    }

    // ============================================================
    // 4. عرض الإعدادات في النماذج
    // ============================================================

    /**
     * ملء نماذج الإعدادات بالبيانات
     */
    function populateSettingsForms(settings) {
        // الإعدادات العامة
        if (DOM.appName) DOM.appName.value = settings.app_name || 'نظام الشوكاني لإدارة الأيتام';
        if (DOM.appVersion) DOM.appVersion.value = settings.app_version || '1.0.0';
        if (DOM.defaultCurrency) DOM.defaultCurrency.value = settings.default_currency || 'YER';
        if (DOM.language) DOM.language.value = settings.language || 'ar';
        if (DOM.timezone) DOM.timezone.value = settings.timezone || 'Asia/Riyadh';

        // إعدادات الكفالات
        if (DOM.defaultMonthlyAmount) DOM.defaultMonthlyAmount.value = settings.default_monthly_amount || '15000';
        if (DOM.minSponsorshipAmount) DOM.minSponsorshipAmount.value = settings.min_sponsorship_amount || '5000';
        if (DOM.maxSponsorshipAmount) DOM.maxSponsorshipAmount.value = settings.max_sponsorship_amount || '50000';
        if (DOM.autoRenewEnabled) DOM.autoRenewEnabled.checked = settings.auto_renew_enabled == 'true' || settings.auto_renew_enabled == true;
        if (DOM.reminderDays) DOM.reminderDays.value = settings.reminder_days || '30';

        // إعدادات التقارير
        if (DOM.reportFooterText) DOM.reportFooterText.value = settings.report_footer_text || 'نظام الشوكاني - إدارة الأيتام';
        if (DOM.reportLogoEnabled) DOM.reportLogoEnabled.checked = settings.report_logo_enabled == 'true' || settings.report_logo_enabled == true;
        if (DOM.reportPageSize) DOM.reportPageSize.value = settings.report_page_size || 'A4';
        if (DOM.reportOrientation) DOM.reportOrientation.value = settings.report_orientation || 'portrait';

        // إعدادات النسخ الاحتياطي
        if (DOM.backupAutoEnabled) DOM.backupAutoEnabled.checked = settings.backup_auto_enabled == 'true' || settings.backup_auto_enabled == true;
        if (DOM.backupInterval) DOM.backupInterval.value = settings.backup_auto_interval || '24';
        if (DOM.backupLocation) DOM.backupLocation.value = settings.backup_location || './backups';
        if (DOM.backupRetention) DOM.backupRetention.value = settings.backup_retention || '30';

        // إعدادات التنبيهات
        if (DOM.notifyOnOrphanAdd) DOM.notifyOnOrphanAdd.checked = settings.notify_on_orphan_add == 'true' || settings.notify_on_orphan_add == true;
        if (DOM.notifyOnSponsorshipEnd) DOM.notifyOnSponsorshipEnd.checked = settings.notify_on_sponsorship_end == 'true' || settings.notify_on_sponsorship_end == true;
        if (DOM.notifyOnAidDistribution) DOM.notifyOnAidDistribution.checked = settings.notify_on_aid_distribution == 'true' || settings.notify_on_aid_distribution == true;
        if (DOM.notifyOnClothingDistribution) DOM.notifyOnClothingDistribution.checked = settings.notify_on_clothing_distribution == 'true' || settings.notify_on_clothing_distribution == true;
        if (DOM.notificationEmail) DOM.notificationEmail.value = settings.notification_email || '';
    }

    // ============================================================
    // 5. عرض قائمة النسخ الاحتياطية
    // ============================================================

    /**
     * عرض قائمة النسخ الاحتياطية في الجدول
     */
    function renderBackupsList() {
        if (!DOM.backupTableBody) return;

        if (!backupsList || backupsList.length === 0) {
            DOM.backupTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-3">
                        <i class="fas fa-database fa-2x d-block mb-2 text-muted"></i>
                        <p class="text-muted small">لا توجد نسخ احتياطية</p>
                    </td>
                </tr>
            `;
            return;
        }

        let rows = '';
        backupsList.forEach(backup => {
            const date = backup.BackupDate ? 
                window.AlShawkani.App.formatDateTimeArabic(backup.BackupDate) : '—';
            const size = backup.BackupSize ? 
                (backup.BackupSize / 1024 / 1024).toFixed(2) + ' MB' : '—';

            let typeBadge = '';
            switch (backup.BackupType) {
                case 'يدوي':
                    typeBadge = '<span class="badge bg-primary">يدوي</span>';
                    break;
                case 'آلي':
                    typeBadge = '<span class="badge bg-success">آلي</span>';
                    break;
                default:
                    typeBadge = '<span class="badge bg-secondary">غير محدد</span>';
            }

            rows += `
                <tr>
                    <td>${backup.BackupFileName || '—'}</td>
                    <td>${typeBadge}</td>
                    <td>${date}</td>
                    <td>${size}</td>
                    <td>${backup.CreatedBy || '—'}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary download-backup" data-id="${backup.BackupID}" title="تحميل">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="btn btn-outline-success restore-backup" data-id="${backup.BackupID}" title="استعادة">
                                <i class="fas fa-undo"></i>
                            </button>
                            <button class="btn btn-outline-danger delete-backup" data-id="${backup.BackupID}" title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        DOM.backupTableBody.innerHTML = rows;

        // ربط أحداث الأزرار
        document.querySelectorAll('.download-backup').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                downloadBackup(id);
            });
        });

        document.querySelectorAll('.restore-backup').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                handleRestoreBackup(id);
            });
        });

        document.querySelectorAll('.delete-backup').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                handleDeleteBackup(id);
            });
        });
    }

    /**
     * معالجة استعادة نسخة احتياطية
     * @param {number} backupId - معرف النسخة الاحتياطية
     */
    async function handleRestoreBackup(backupId) {
        const backup = backupsList.find(b => b.BackupID == backupId);
        if (!backup) return;

        const confirmed = await window.AlShawkani.App.confirmAction(
            `هل أنت متأكد من استعادة النسخة الاحتياطية "${backup.BackupFileName}"؟\nملاحظة: سيتم استبدال جميع البيانات الحالية بالبيانات الموجودة في النسخة الاحتياطية.`,
            'تأكيد الاستعادة',
            'نعم، استعادة',
            'إلغاء'
        );

        if (!confirmed) return;

        await restoreBackup(backupId);
        await loadBackupsList();
    }

    /**
     * معالجة حذف نسخة احتياطية
     * @param {number} backupId - معرف النسخة الاحتياطية
     */
    async function handleDeleteBackup(backupId) {
        const backup = backupsList.find(b => b.BackupID == backupId);
        if (!backup) return;

        const confirmed = await window.AlShawkani.App.confirmAction(
            `هل أنت متأكد من حذف النسخة الاحتياطية "${backup.BackupFileName}"؟`,
            'تأكيد الحذف',
            'نعم، حذف',
            'إلغاء'
        );

        if (!confirmed) return;

        await deleteBackup(backupId);
        await loadBackupsList();
    }

    // ============================================================
    // 6. معالجة حفظ الإعدادات
    // ============================================================

    /**
     * حفظ الإعدادات العامة
     */
    async function saveGeneralSettings(event) {
        event.preventDefault();

        const settings = {
            app_name: DOM.appName ? DOM.appName.value : '',
            app_version: DOM.appVersion ? DOM.appVersion.value : '',
            default_currency: DOM.defaultCurrency ? DOM.defaultCurrency.value : '',
            language: DOM.language ? DOM.language.value : '',
            timezone: DOM.timezone ? DOM.timezone.value : ''
        };

        try {
            await saveSettings(settings, 'general');
        } catch (error) {
            // الخطأ تم معالجته في saveSettings
        }
    }

    /**
     * حفظ إعدادات الكفالات
     */
    async function saveSponsorshipsSettings(event) {
        event.preventDefault();

        const settings = {
            default_monthly_amount: DOM.defaultMonthlyAmount ? DOM.defaultMonthlyAmount.value : '',
            min_sponsorship_amount: DOM.minSponsorshipAmount ? DOM.minSponsorshipAmount.value : '',
            max_sponsorship_amount: DOM.maxSponsorshipAmount ? DOM.maxSponsorshipAmount.value : '',
            auto_renew_enabled: DOM.autoRenewEnabled ? (DOM.autoRenewEnabled.checked ? 'true' : 'false') : 'false',
            reminder_days: DOM.reminderDays ? DOM.reminderDays.value : ''
        };

        try {
            await saveSettings(settings, 'sponsorships');
        } catch (error) {
            // الخطأ تم معالجته في saveSettings
        }
    }

    /**
     * حفظ إعدادات التقارير
     */
    async function saveReportsSettings(event) {
        event.preventDefault();

        const settings = {
            report_footer_text: DOM.reportFooterText ? DOM.reportFooterText.value : '',
            report_logo_enabled: DOM.reportLogoEnabled ? (DOM.reportLogoEnabled.checked ? 'true' : 'false') : 'false',
            report_page_size: DOM.reportPageSize ? DOM.reportPageSize.value : '',
            report_orientation: DOM.reportOrientation ? DOM.reportOrientation.value : ''
        };

        try {
            await saveSettings(settings, 'reports');
        } catch (error) {
            // الخطأ تم معالجته في saveSettings
        }
    }

    /**
     * حفظ إعدادات النسخ الاحتياطي
     */
    async function saveBackupSettings(event) {
        event.preventDefault();

        const settings = {
            backup_auto_enabled: DOM.backupAutoEnabled ? (DOM.backupAutoEnabled.checked ? 'true' : 'false') : 'false',
            backup_auto_interval: DOM.backupInterval ? DOM.backupInterval.value : '',
            backup_location: DOM.backupLocation ? DOM.backupLocation.value : '',
            backup_retention: DOM.backupRetention ? DOM.backupRetention.value : ''
        };

        try {
            await saveSettings(settings, 'backup');
        } catch (error) {
            // الخطأ تم معالجته في saveSettings
        }
    }

    /**
     * حفظ إعدادات التنبيهات
     */
    async function saveNotificationsSettings(event) {
        event.preventDefault();

        const settings = {
            notify_on_orphan_add: DOM.notifyOnOrphanAdd ? (DOM.notifyOnOrphanAdd.checked ? 'true' : 'false') : 'false',
            notify_on_sponsorship_end: DOM.notifyOnSponsorshipEnd ? (DOM.notifyOnSponsorshipEnd.checked ? 'true' : 'false') : 'false',
            notify_on_aid_distribution: DOM.notifyOnAidDistribution ? (DOM.notifyOnAidDistribution.checked ? 'true' : 'false') : 'false',
            notify_on_clothing_distribution: DOM.notifyOnClothingDistribution ? (DOM.notifyOnClothingDistribution.checked ? 'true' : 'false') : 'false',
            notification_email: DOM.notificationEmail ? DOM.notificationEmail.value : ''
        };

        try {
            await saveSettings(settings, 'notifications');
        } catch (error) {
            // الخطأ تم معالجته في saveSettings
        }
    }

    // ============================================================
    // 7. تحميل البيانات
    // ============================================================

    /**
     * تحميل الإعدادات وتحديث النماذج
     */
    async function loadSettings() {
        try {
            const settings = await fetchSettings();
            populateSettingsForms(settings);
        } catch (error) {
            console.error('❌ خطأ في تحميل الإعدادات:', error.message);
        }
    }

    /**
     * تحميل قائمة النسخ الاحتياطية
     */
    async function loadBackupsList() {
        try {
            const backups = await fetchBackups();
            renderBackupsList();
        } catch (error) {
            console.error('❌ خطأ في تحميل قائمة النسخ الاحتياطية:', error.message);
        }
    }

    // ============================================================
    // 8. تهيئة الوحدة
    // ============================================================

    /**
     * تهيئة وحدة الإعدادات
     */
    function initSettingsModule() {
        console.log('🚀 تهيئة وحدة الإعدادات...');

        // ============================================================
        // 1. ربط أحداث النماذج
        // ============================================================
        if (DOM.formGeneral) {
            DOM.formGeneral.addEventListener('submit', saveGeneralSettings);
        }

        if (DOM.formSponsorships) {
            DOM.formSponsorships.addEventListener('submit', saveSponsorshipsSettings);
        }

        if (DOM.formReports) {
            DOM.formReports.addEventListener('submit', saveReportsSettings);
        }

        if (DOM.formBackup) {
            DOM.formBackup.addEventListener('submit', saveBackupSettings);
        }

        if (DOM.formNotifications) {
            DOM.formNotifications.addEventListener('submit', saveNotificationsSettings);
        }

        // ============================================================
        // 2. ربط زر إنشاء نسخة احتياطية
        // ============================================================
        if (DOM.createBackupBtn) {
            DOM.createBackupBtn.addEventListener('click', async function() {
                await createBackup('يدوي');
            });
        }

        // ============================================================
        // 3. تحميل البيانات الأولية
        // ============================================================
        Promise.all([
            loadSettings(),
            loadBackupsList()
        ]).then(() => {
            console.log('✅ تم تهيئة وحدة الإعدادات بنجاح.');
        }).catch(error => {
            console.error('❌ خطأ في التهيئة:', error.message);
        });

        // ============================================================
        // 4. تفعيل علامات التبويب (Tabs) باستخدام Bootstrap
        // ============================================================
        const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');
        if (tabs.length > 0 && typeof bootstrap !== 'undefined') {
            tabs.forEach(tab => {
                tab.addEventListener('shown.bs.tab', function(e) {
                    // إعادة رسم أي مخططات أو جداول عند التبديل
                    console.log('تم التبديل إلى علامة التبويب:', e.target.textContent);
                });
            });
        }

        console.log('✅ تم تهيئة وحدة الإعدادات بنجاح.');
    }

    // ============================================================
    // 9. تشغيل التهيئة
    // ============================================================

    document.addEventListener('DOMContentLoaded', function() {
        initSettingsModule();
    });

})();