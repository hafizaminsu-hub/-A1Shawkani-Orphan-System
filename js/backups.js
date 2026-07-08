/**
 * ============================================================
 * الملف: backups.js
 * الوصف: وحدة النسخ الاحتياطي المتقدمة - جدولة، إدارة، استعادة، تحقق، تصدير
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
        // الجدول
        table: document.getElementById('backupsTable'),
        tableBody: document.getElementById('backupsTableBody'),

        // حقول التصفية
        searchInput: document.getElementById('searchBackups'),
        filterType: document.getElementById('filterBackupType'),
        filterDateFrom: document.getElementById('filterBackupDateFrom'),
        filterDateTo: document.getElementById('filterBackupDateTo'),

        // أزرار الإجراءات
        createBackupBtn: document.getElementById('createBackupBtn'),
        exportBackupBtn: document.getElementById('exportBackupBtn'),
        refreshBackupsBtn: document.getElementById('refreshBackupsBtn'),

        // حاوية الإحصائيات
        statsContainer: document.getElementById('backupStats'),

        // حالة الجدولة
        scheduleStatus: document.getElementById('scheduleStatus'),
        scheduleInterval: document.getElementById('scheduleInterval'),
        scheduleToggle: document.getElementById('scheduleToggle'),
        lastBackupTime: document.getElementById('lastBackupTime'),

        // شريط التقدم
        progressBar: document.getElementById('backupProgress'),
        progressText: document.getElementById('backupProgressText'),

        // إعدادات الجدولة
        scheduleModal: document.getElementById('scheduleModal'),
        scheduleForm: document.getElementById('scheduleForm'),
        scheduleIntervalInput: document.getElementById('scheduleIntervalInput'),
        scheduleUnit: document.getElementById('scheduleUnit'),
        scheduleSaveBtn: document.getElementById('scheduleSaveBtn')
    };

    // ============================================================
    // 2. متغيرات الحالة
    // ============================================================
    let backupsData = [];
    let dataTable = null;
    let scheduleTimer = null;
    let isScheduled = false;
    let currentProgress = 0;

    // ============================================================
    // 3. الدوال الأساسية
    // ============================================================

    /**
     * جلب قائمة النسخ الاحتياطية من الخادم
     * @param {Object} filters - معاملات التصفية (اختياري)
     * @returns {Promise<Array>} قائمة النسخ الاحتياطية
     */
    async function fetchBackups(filters = {}) {
        try {
            const response = await fetch('/api/backups?' + new URLSearchParams(filters));
            if (!response.ok) throw new Error('فشل في جلب قائمة النسخ الاحتياطية');
            const data = await response.json();
            backupsData = data;
            return data;
        } catch (error) {
            console.error('❌ خطأ في جلب النسخ الاحتياطية:', error.message);
            window.AlShawkani.App.showError('تعذر جلب قائمة النسخ الاحتياطية. يرجى المحاولة مرة أخرى.');
            return [];
        }
    }

    /**
     * إنشاء نسخة احتياطية جديدة
     * @param {string} type - نوع النسخة (يدوي أو آلي)
     * @param {string} notes - ملاحظات إضافية
     * @returns {Promise<Object>} نتيجة الإنشاء
     */
    async function createBackup(type = 'يدوي', notes = '') {
        if (DOM.progressBar) {
            DOM.progressBar.style.width = '0%';
            DOM.progressBar.setAttribute('aria-valuenow', 0);
            DOM.progressBar.textContent = '0%';
        }
        if (DOM.progressText) {
            DOM.progressText.textContent = 'جاري إنشاء النسخة الاحتياطية...';
        }

        try {
            // محاكاة تقدم العملية
            simulateProgress();

            const response = await fetch('/api/backups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ type, notes })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في إنشاء النسخة الاحتياطية');
            }

            const result = await response.json();
            window.AlShawkani.App.showSuccess('تم إنشاء النسخة الاحتياطية بنجاح');
            
            // تحديث شريط التقدم
            if (DOM.progressBar) {
                DOM.progressBar.style.width = '100%';
                DOM.progressBar.setAttribute('aria-valuenow', 100);
                DOM.progressBar.textContent = '100%';
            }
            if (DOM.progressText) {
                DOM.progressText.textContent = '✅ تم الإنشاء بنجاح';
            }

            // تحديث وقت آخر نسخة
            updateLastBackupTime();

            // تحديث الإحصائيات والجدول
            await loadBackups();

            return result;

        } catch (error) {
            console.error('❌ خطأ في إنشاء النسخة الاحتياطية:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر إنشاء النسخة الاحتياطية.');
            if (DOM.progressText) {
                DOM.progressText.textContent = '❌ فشل الإنشاء';
            }
            throw error;
        }
    }

    /**
     * محاكاة تقدم العملية
     */
    function simulateProgress() {
        let progress = 0;
        if (DOM.progressBar) {
            const interval = setInterval(() => {
                progress += Math.random() * 10 + 5;
                if (progress > 95) {
                    clearInterval(interval);
                    return;
                }
                DOM.progressBar.style.width = progress + '%';
                DOM.progressBar.setAttribute('aria-valuenow', progress);
                DOM.progressBar.textContent = Math.round(progress) + '%';
            }, 300);
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
     * @returns {Promise<boolean>} نتيجة الحذف
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
            return true;

        } catch (error) {
            console.error('❌ خطأ في حذف النسخة الاحتياطية:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حذف النسخة الاحتياطية.');
            throw error;
        }
    }

    /**
     * تحميل ملف النسخة الاحتياطية
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

    /**
     * التحقق من سلامة النسخة الاحتياطية
     * @param {number} backupId - معرف النسخة الاحتياطية
     * @returns {Promise<Object>} نتيجة التحقق
     */
    async function verifyBackup(backupId) {
        try {
            const response = await fetch(`/api/backups/${backupId}/verify`);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في التحقق من النسخة الاحتياطية');
            }

            const result = await response.json();
            if (result.valid) {
                window.AlShawkani.App.showSuccess('النسخة الاحتياطية سليمة وصالحة للاستخدام.');
            } else {
                window.AlShawkani.App.showWarning('النسخة الاحتياطية تالفة أو غير صالحة للاستخدام.');
            }
            return result;

        } catch (error) {
            console.error('❌ خطأ في التحقق من النسخة الاحتياطية:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر التحقق من النسخة الاحتياطية.');
            throw error;
        }
    }

    // ============================================================
    // 4. إدارة الجدولة التلقائية
    // ============================================================

    /**
     * بدء الجدولة التلقائية
     * @param {number} interval - الفاصل الزمني بالساعات
     */
    function startSchedule(interval = 24) {
        if (scheduleTimer) {
            clearInterval(scheduleTimer);
            scheduleTimer = null;
        }

        const intervalMs = interval * 60 * 60 * 1000;
        scheduleTimer = setInterval(() => {
            console.log(`⏰ تشغيل النسخ الاحتياطي التلقائي (كل ${interval} ساعة)`);
            createBackup('آلي', 'نسخ احتياطي تلقائي مجدول');
        }, intervalMs);

        isScheduled = true;
        if (DOM.scheduleStatus) {
            DOM.scheduleStatus.textContent = `✅ نشط (كل ${interval} ساعة)`;
            DOM.scheduleStatus.className = 'text-success';
        }
        if (DOM.scheduleToggle) {
            DOM.scheduleToggle.textContent = 'إيقاف الجدولة';
            DOM.scheduleToggle.className = 'btn btn-danger';
        }

        // حفظ حالة الجدولة في localStorage
        localStorage.setItem('backupSchedule', JSON.stringify({ enabled: true, interval }));
    }

    /**
     * إيقاف الجدولة التلقائية
     */
    function stopSchedule() {
        if (scheduleTimer) {
            clearInterval(scheduleTimer);
            scheduleTimer = null;
        }

        isScheduled = false;
        if (DOM.scheduleStatus) {
            DOM.scheduleStatus.textContent = '⏸ غير نشط';
            DOM.scheduleStatus.className = 'text-muted';
        }
        if (DOM.scheduleToggle) {
            DOM.scheduleToggle.textContent = 'تفعيل الجدولة';
            DOM.scheduleToggle.className = 'btn btn-success';
        }

        localStorage.removeItem('backupSchedule');
    }

    /**
     * تبديل حالة الجدولة
     */
    function toggleSchedule() {
        if (isScheduled) {
            stopSchedule();
        } else {
            // فتح نموذج إعداد الجدولة
            if (DOM.scheduleModal) {
                const modal = new bootstrap.Modal(DOM.scheduleModal);
                modal.show();
            }
        }
    }

    /**
     * حفظ إعدادات الجدولة من النموذج
     */
    function saveScheduleSettings(event) {
        event.preventDefault();

        const interval = parseInt(DOM.scheduleIntervalInput ? DOM.scheduleIntervalInput.value : 24);
        const unit = DOM.scheduleUnit ? DOM.scheduleUnit.value : 'hours';

        let intervalMs = interval;
        if (unit === 'hours') {
            intervalMs = interval;
        } else if (unit === 'days') {
            intervalMs = interval * 24;
        } else if (unit === 'weeks') {
            intervalMs = interval * 24 * 7;
        }

        startSchedule(intervalMs);

        if (DOM.scheduleModal) {
            const modal = bootstrap.Modal.getInstance(DOM.scheduleModal);
            if (modal) modal.hide();
        }

        window.AlShawkani.App.showSuccess(`تم تفعيل الجدولة التلقائية كل ${interval} ${unit === 'hours' ? 'ساعة' : unit === 'days' ? 'يوم' : 'أسبوع'}`);
    }

    /**
     * استعادة حالة الجدولة من localStorage
     */
    function restoreScheduleState() {
        try {
            const saved = localStorage.getItem('backupSchedule');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.enabled && data.interval) {
                    startSchedule(data.interval);
                }
            }
        } catch (error) {
            console.warn('⚠️ تعذر استعادة حالة الجدولة:', error.message);
        }
    }

    // ============================================================
    // 5. تحديث واجهة المستخدم
    // ============================================================

    /**
     * تحديث وقت آخر نسخة احتياطية
     */
    function updateLastBackupTime() {
        if (!DOM.lastBackupTime) return;

        const now = new Date();
        const timeStr = window.AlShawkani.App.formatDateTimeArabic(now);
        DOM.lastBackupTime.textContent = timeStr;
    }

    /**
     * عرض قائمة النسخ الاحتياطية في الجدول
     */
    function renderBackupsTable() {
        if (!DOM.tableBody) return;

        if (dataTable) {
            dataTable.destroy();
            dataTable = null;
        }

        if (!backupsData || backupsData.length === 0) {
            DOM.tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="fas fa-database fa-2x d-block mb-2 text-muted"></i>
                        <h6 class="text-muted">لا توجد نسخ احتياطية</h6>
                        <p class="text-muted small">يمكنك إنشاء نسخة احتياطية جديدة بالضغط على زر "إنشاء نسخة احتياطية"</p>
                    </td>
                </tr>
            `;
            return;
        }

        let rows = '';
        backupsData.forEach(backup => {
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

            // حالة صحة النسخة (افتراضية)
            const statusBadge = backup.IsValid !== undefined ? 
                (backup.IsValid ? '<span class="badge bg-success">سليمة</span>' : '<span class="badge bg-danger">تالفة</span>') :
                '<span class="badge bg-secondary">غير معروف</span>';

            rows += `
                <tr data-id="${backup.BackupID}">
                    <td>${backup.BackupFileName || '—'}</td>
                    <td>${typeBadge}</td>
                    <td>${date}</td>
                    <td>${size}</td>
                    <td>${statusBadge}</td>
                    <td>${backup.CreatedBy || '—'}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-info verify-backup" data-id="${backup.BackupID}" title="التحقق من الصحة">
                                <i class="fas fa-check-circle"></i>
                            </button>
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

        DOM.tableBody.innerHTML = rows;

        if (typeof $ !== 'undefined' && DOM.table) {
            try {
                dataTable = window.AlShawkani.App.initDataTable('#backupsTable', {
                    order: [[2, 'desc']],
                    columnDefs: [
                        { targets: [6], orderable: false }
                    ],
                    drawCallback: function() {
                        bindTableEvents();
                    }
                });
            } catch (error) {
                console.warn('⚠️ تعذر تهيئة DataTables:', error.message);
                bindTableEvents();
            }
        } else {
            bindTableEvents();
        }
    }

    /**
     * ربط أحداث الأزرار داخل الجدول
     */
    function bindTableEvents() {
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

        document.querySelectorAll('.verify-backup').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                handleVerifyBackup(id);
            });
        });
    }

    /**
     * معالجة استعادة نسخة احتياطية
     * @param {number} backupId - معرف النسخة الاحتياطية
     */
    async function handleRestoreBackup(backupId) {
        const backup = backupsData.find(b => b.BackupID == backupId);
        if (!backup) return;

        const confirmed = await window.AlShawkani.App.confirmAction(
            `هل أنت متأكد من استعادة النسخة الاحتياطية "${backup.BackupFileName}"؟\n\n⚠️ تحذير: سيتم استبدال جميع البيانات الحالية بالبيانات الموجودة في النسخة الاحتياطية. لا يمكن التراجع عن هذه العملية.`,
            'تأكيد الاستعادة',
            'نعم، استعادة',
            'إلغاء'
        );

        if (!confirmed) return;

        await restoreBackup(backupId);
        await loadBackups();
    }

    /**
     * معالجة حذف نسخة احتياطية
     * @param {number} backupId - معرف النسخة الاحتياطية
     */
    async function handleDeleteBackup(backupId) {
        const backup = backupsData.find(b => b.BackupID == backupId);
        if (!backup) return;

        const confirmed = await window.AlShawkani.App.confirmAction(
            `هل أنت متأكد من حذف النسخة الاحتياطية "${backup.BackupFileName}"؟`,
            'تأكيد الحذف',
            'نعم، حذف',
            'إلغاء'
        );

        if (!confirmed) return;

        await deleteBackup(backupId);
        await loadBackups();
    }

    /**
     * معالجة التحقق من صحة النسخة الاحتياطية
     * @param {number} backupId - معرف النسخة الاحتياطية
     */
    async function handleVerifyBackup(backupId) {
        await verifyBackup(backupId);
        await loadBackups(); // تحديث الجدول لإظهار الحالة الجديدة
    }

    /**
     * تحديث الإحصائيات
     */
    function updateStats(backups) {
        if (!DOM.statsContainer) return;

        const total = backups ? backups.length : 0;
        const totalSize = backups ? backups.reduce((sum, b) => sum + (b.BackupSize || 0), 0) : 0;
        const totalSizeMB = totalSize > 0 ? (totalSize / 1024 / 1024).toFixed(2) : '0';

        // حساب عدد النسخ حسب النوع
        const manual = backups ? backups.filter(b => b.BackupType === 'يدوي').length : 0;
        const auto = backups ? backups.filter(b => b.BackupType === 'آلي').length : 0;

        DOM.statsContainer.innerHTML = `
            <div class="row g-3">
                <div class="col-md-3 col-6">
                    <div class="stat-card text-center p-3">
                        <div class="stat-number">${total}</div>
                        <div class="stat-label">إجمالي النسخ</div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="stat-card text-center p-3">
                        <div class="stat-number">${totalSizeMB}</div>
                        <div class="stat-label">الحجم الكلي (MB)</div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="stat-card text-center p-3">
                        <div class="stat-number">${manual}</div>
                        <div class="stat-label">يدوي</div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="stat-card text-center p-3">
                        <div class="stat-number">${auto}</div>
                        <div class="stat-label">آلي</div>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================================
    // 6. البحث والتصفية
    // ============================================================

    function filterBackups() {
        const searchTerm = DOM.searchInput ? DOM.searchInput.value.toLowerCase().trim() : '';
        const typeFilter = DOM.filterType ? DOM.filterType.value : '';
        const dateFrom = DOM.filterDateFrom ? DOM.filterDateFrom.value : '';
        const dateTo = DOM.filterDateTo ? DOM.filterDateTo.value : '';

        let filtered = backupsData;

        if (searchTerm) {
            filtered = filtered.filter(b =>
                (b.BackupFileName && b.BackupFileName.toLowerCase().includes(searchTerm)) ||
                (b.CreatedBy && b.CreatedBy.toLowerCase().includes(searchTerm))
            );
        }

        if (typeFilter) {
            filtered = filtered.filter(b => b.BackupType === typeFilter);
        }

        if (dateFrom) {
            filtered = filtered.filter(b => b.BackupDate && b.BackupDate >= dateFrom);
        }

        if (dateTo) {
            filtered = filtered.filter(b => b.BackupDate && b.BackupDate <= dateTo);
        }

        backupsData = filtered;
        renderBackupsTable();
        updateStats(filtered);
    }

    // ============================================================
    // 7. تصدير البيانات
    // ============================================================

    function exportBackups() {
        if (!backupsData || backupsData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للتصدير.');
            return;
        }

        const headers = ['معرف النسخة', 'اسم الملف', 'النوع', 'التاريخ', 'الحجم (MB)', 'الحالة', 'المنشئ', 'ملاحظات'];

        const data = backupsData.map(b => [
            b.BackupID || '', b.BackupFileName || '', b.BackupType || '', 
            b.BackupDate ? window.AlShawkani.App.formatDateTimeArabic(b.BackupDate) : '—', 
            b.BackupSize ? (b.BackupSize / 1024 / 1024).toFixed(2) : '0', 
            b.IsValid !== undefined ? (b.IsValid ? 'سليمة' : 'تالفة') : 'غير معروف',
            b.CreatedBy || '—', b.Notes || ''
        ]);

        window.AlShawkani.App.exportToCSV(data, 'النسخ_الاحتياطية.csv', headers);
    }

    // ============================================================
    // 8. تحميل البيانات وتهيئة الوحدة
    // ============================================================

    /**
     * تحميل البيانات وتحديث الجدول
     */
    async function loadBackups() {
        try {
            const data = await fetchBackups();
            backupsData = data;
            renderBackupsTable();
            updateStats(data);
            
            // تحديث وقت آخر نسخة من أول عنصر في القائمة
            if (data && data.length > 0 && data[0].BackupDate) {
                const lastDate = window.AlShawkani.App.formatDateTimeArabic(data[0].BackupDate);
                if (DOM.lastBackupTime) {
                    DOM.lastBackupTime.textContent = lastDate;
                }
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل النسخ الاحتياطية:', error.message);
        }
    }

    /**
     * تهيئة وحدة النسخ الاحتياطي
     */
    function initBackupsModule() {
        console.log('🚀 تهيئة وحدة النسخ الاحتياطي...');

        if (!DOM.tableBody) {
            console.warn('⚠️ جدول النسخ الاحتياطية غير موجود في الصفحة.');
            return;
        }

        // ============================================================
        // 1. ربط أحداث الأزرار
        // ============================================================
        if (DOM.createBackupBtn) {
            DOM.createBackupBtn.addEventListener('click', async function() {
                await createBackup('يدوي', 'نسخة احتياطية يدوية');
            });
        }

        if (DOM.exportBackupBtn) {
            DOM.exportBackupBtn.addEventListener('click', exportBackups);
        }

        if (DOM.refreshBackupsBtn) {
            DOM.refreshBackupsBtn.addEventListener('click', loadBackups);
        }

        if (DOM.scheduleToggle) {
            DOM.scheduleToggle.addEventListener('click', toggleSchedule);
        }

        // ============================================================
        // 2. ربط أحداث البحث والتصفية
        // ============================================================
        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', filterBackups);
        }

        if (DOM.filterType) {
            DOM.filterType.addEventListener('change', filterBackups);
        }

        if (DOM.filterDateFrom) {
            DOM.filterDateFrom.addEventListener('change', filterBackups);
        }

        if (DOM.filterDateTo) {
            DOM.filterDateTo.addEventListener('change', filterBackups);
        }

        // ============================================================
        // 3. ربط نموذج الجدولة
        // ============================================================
        if (DOM.scheduleForm) {
            DOM.scheduleForm.addEventListener('submit', saveScheduleSettings);
        }

        // ============================================================
        // 4. تحميل البيانات الأولية
        // ============================================================
        loadBackups();

        // ============================================================
        // 5. استعادة حالة الجدولة
        // ============================================================
        restoreScheduleState();

        // ============================================================
        // 6. تحديث وقت آخر نسخة
        // ============================================================
        updateLastBackupTime();

        console.log('✅ تم تهيئة وحدة النسخ الاحتياطي بنجاح.');
    }

    // ============================================================
    // 9. تشغيل التهيئة
    // ============================================================

    document.addEventListener('DOMContentLoaded', function() {
        initBackupsModule();
    });

})();