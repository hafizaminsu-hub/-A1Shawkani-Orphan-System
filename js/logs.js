/**
 * ============================================================
 * الملف: logs.js
 * الوصف: وحدة سجل العمليات (Audit Log) - عرض، بحث، تصفية، تصدير، طباعة
 * يعتمد على: app.js (الدوال المساعدة)، DataTables
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
        table: document.getElementById('logsTable'),
        tableBody: document.getElementById('logsTableBody'),

        // حقول التصفية
        searchInput: document.getElementById('searchLogs'),
        filterAction: document.getElementById('filterAction'),
        filterTable: document.getElementById('filterTable'),
        filterUser: document.getElementById('filterUser'),
        filterDateFrom: document.getElementById('filterLogsDateFrom'),
        filterDateTo: document.getElementById('filterLogsDateTo'),

        // أزرار الإجراءات
        exportBtn: document.getElementById('exportLogsBtn'),
        printBtn: document.getElementById('printLogsBtn'),
        refreshBtn: document.getElementById('refreshLogsBtn'),
        clearFiltersBtn: document.getElementById('clearFiltersBtn'),

        // حاوية الإحصائيات
        statsContainer: document.getElementById('logsStats'),

        // عرض تفاصيل السجل (Modal)
        detailModal: document.getElementById('logDetailModal'),
        detailContent: document.getElementById('logDetailContent')
    };

    // ============================================================
    // 2. متغيرات الحالة
    // ============================================================
    let logsData = [];
    let usersList = [];
    let dataTable = null;

    // ============================================================
    // 3. الدوال الأساسية
    // ============================================================

    /**
     * جلب سجل العمليات من الخادم
     * @param {Object} filters - معاملات التصفية (اختياري)
     * @returns {Promise<Array>} قائمة السجلات
     */
    async function fetchLogs(filters = {}) {
        try {
            const response = await fetch('/api/logs?' + new URLSearchParams(filters));
            if (!response.ok) throw new Error('فشل في جلب سجل العمليات');
            const data = await response.json();
            logsData = data;
            return data;
        } catch (error) {
            console.error('❌ خطأ في جلب سجل العمليات:', error.message);
            window.AlShawkani.App.showError('تعذر جلب سجل العمليات. يرجى المحاولة مرة أخرى.');
            return [];
        }
    }

    /**
     * جلب قائمة المستخدمين للقائمة المنسدلة
     */
    async function fetchUsersList() {
        try {
            const response = await fetch('/api/users');
            if (!response.ok) throw new Error('فشل في جلب قائمة المستخدمين');
            usersList = await response.json();
            populateUserSelect();
        } catch (error) {
            console.error('❌ خطأ في جلب المستخدمين:', error.message);
        }
    }

    /**
     * ملء قائمة المستخدمين المنسدلة
     */
    function populateUserSelect() {
        if (!DOM.filterUser) return;
        
        const emptyOption = DOM.filterUser.querySelector('option[value=""]');
        DOM.filterUser.innerHTML = '';
        if (emptyOption) DOM.filterUser.appendChild(emptyOption);
        
        usersList.forEach(user => {
            const option = document.createElement('option');
            option.value = user.UserID;
            option.textContent = user.FullName || `@${user.Username}`;
            DOM.filterUser.appendChild(option);
        });
    }

    /**
     * عرض سجل العمليات في الجدول (باستخدام DataTables)
     */
    function renderLogsTable() {
        if (!DOM.tableBody) return;

        if (dataTable) {
            dataTable.destroy();
            dataTable = null;
        }

        if (!logsData || logsData.length === 0) {
            DOM.tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="fas fa-history fa-2x d-block mb-2 text-muted"></i>
                        <h6 class="text-muted">لا توجد سجلات عمليات</h6>
                        <p class="text-muted small">ستظهر هنا جميع العمليات التي يتم تنفيذها في النظام</p>
                    </td>
                </tr>
            `;
            return;
        }

        let rows = '';
        logsData.forEach(log => {
            const logDate = log.LogDate ? 
                window.AlShawkani.App.formatDateTimeArabic(log.LogDate) : '—';

            // اسم المستخدم
            const user = usersList.find(u => u.UserID == log.UserID);
            const userName = user ? user.FullName : (log.UserID || '—');

            // نوع الإجراء مع لون مناسب
            let actionBadge = '';
            switch (log.ActionType) {
                case 'إضافة':
                    actionBadge = '<span class="badge bg-success">إضافة</span>';
                    break;
                case 'تعديل':
                    actionBadge = '<span class="badge bg-warning text-dark">تعديل</span>';
                    break;
                case 'حذف':
                    actionBadge = '<span class="badge bg-danger">حذف</span>';
                    break;
                case 'تسجيل دخول':
                    actionBadge = '<span class="badge bg-primary">تسجيل دخول</span>';
                    break;
                case 'طباعة':
                    actionBadge = '<span class="badge bg-info text-white">طباعة</span>';
                    break;
                case 'تصدير':
                    actionBadge = '<span class="badge bg-secondary">تصدير</span>';
                    break;
                default:
                    actionBadge = '<span class="badge bg-secondary">' + (log.ActionType || '—') + '</span>';
            }

            // IP Address
            const ip = log.IPAddress || '—';

            rows += `
                <tr data-id="${log.LogID}">
                    <td>${logDate}</td>
                    <td>${userName}</td>
                    <td>${actionBadge}</td>
                    <td>${log.TableName || '—'}</td>
                    <td>${log.RecordID || '—'}</td>
                    <td>${ip}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary view-log" data-id="${log.LogID}" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        DOM.tableBody.innerHTML = rows;

        if (typeof $ !== 'undefined' && DOM.table) {
            try {
                dataTable = window.AlShawkani.App.initDataTable('#logsTable', {
                    order: [[0, 'desc']],
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
        document.querySelectorAll('.view-log').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                viewLogDetail(id);
            });
        });
    }

    // ============================================================
    // 4. عرض تفاصيل السجل
    // ============================================================

    /**
     * عرض تفاصيل السجل في نافذة منبثقة
     * @param {number} id - معرف السجل
     */
    async function viewLogDetail(id) {
        try {
            const log = logsData.find(l => l.LogID == id);
            if (!log) {
                window.AlShawkani.App.showWarning('السجل غير موجود');
                return;
            }

            const user = usersList.find(u => u.UserID == log.UserID);
            const userName = user ? user.FullName : (log.UserID || '—');

            // تنسيق البيانات القديمة والجديدة (إذا كانت موجودة)
            let oldDataHtml = '—';
            let newDataHtml = '—';
            
            if (log.OldData) {
                try {
                    const oldData = typeof log.OldData === 'string' ? JSON.parse(log.OldData) : log.OldData;
                    oldDataHtml = '<pre class="p-2 bg-light rounded" style="font-size:12px; max-height:200px; overflow-y:auto;">' + 
                        JSON.stringify(oldData, null, 2) + '</pre>';
                } catch (e) {
                    oldDataHtml = `<div class="p-2 bg-light rounded">${log.OldData}</div>`;
                }
            }

            if (log.NewData) {
                try {
                    const newData = typeof log.NewData === 'string' ? JSON.parse(log.NewData) : log.NewData;
                    newDataHtml = '<pre class="p-2 bg-light rounded" style="font-size:12px; max-height:200px; overflow-y:auto;">' + 
                        JSON.stringify(newData, null, 2) + '</pre>';
                } catch (e) {
                    newDataHtml = `<div class="p-2 bg-light rounded">${log.NewData}</div>`;
                }
            }

            const details = `
                <div dir="rtl" class="p-2">
                    <div class="row g-3">
                        <div class="col-6">
                            <strong>معرف السجل:</strong> ${log.LogID || '—'}
                        </div>
                        <div class="col-6">
                            <strong>التاريخ والوقت:</strong> ${log.LogDate ? window.AlShawkani.App.formatDateTimeArabic(log.LogDate) : '—'}
                        </div>
                        <div class="col-6">
                            <strong>المستخدم:</strong> ${userName}
                        </div>
                        <div class="col-6">
                            <strong>نوع الإجراء:</strong> ${log.ActionType || '—'}
                        </div>
                        <div class="col-6">
                            <strong>الجدول:</strong> ${log.TableName || '—'}
                        </div>
                        <div class="col-6">
                            <strong>معرف السجل:</strong> ${log.RecordID || '—'}
                        </div>
                        <div class="col-12">
                            <strong>عنوان IP:</strong> ${log.IPAddress || '—'}
                        </div>
                        <div class="col-12">
                            <strong>نوع المتصفح:</strong> ${log.UserAgent || '—'}
                        </div>
                        <div class="col-12">
                            <strong>البيانات القديمة:</strong>
                            ${oldDataHtml}
                        </div>
                        <div class="col-12">
                            <strong>البيانات الجديدة:</strong>
                            ${newDataHtml}
                        </div>
                    </div>
                </div>
            `;

            // عرض في Toast أو Modal
            if (DOM.detailModal && DOM.detailContent) {
                DOM.detailContent.innerHTML = details;
                const modal = new bootstrap.Modal(DOM.detailModal);
                modal.show();
            } else {
                window.AlShawkani.App.showInfo(details, 15000);
            }

        } catch (error) {
            console.error('❌ خطأ في عرض التفاصيل:', error.message);
            window.AlShawkani.App.showError('تعذر عرض تفاصيل السجل.');
        }
    }

    // ============================================================
    // 5. البحث والتصفية
    // ============================================================

    function filterLogs() {
        const searchTerm = DOM.searchInput ? DOM.searchInput.value.toLowerCase().trim() : '';
        const actionFilter = DOM.filterAction ? DOM.filterAction.value : '';
        const tableFilter = DOM.filterTable ? DOM.filterTable.value : '';
        const userFilter = DOM.filterUser ? DOM.filterUser.value : '';
        const dateFrom = DOM.filterDateFrom ? DOM.filterDateFrom.value : '';
        const dateTo = DOM.filterDateTo ? DOM.filterDateTo.value : '';

        let filtered = logsData;

        if (searchTerm) {
            filtered = filtered.filter(l =>
                (l.TableName && l.TableName.toLowerCase().includes(searchTerm)) ||
                (l.ActionType && l.ActionType.toLowerCase().includes(searchTerm)) ||
                (l.IPAddress && l.IPAddress.includes(searchTerm))
            );
        }

        if (actionFilter) {
            filtered = filtered.filter(l => l.ActionType === actionFilter);
        }

        if (tableFilter) {
            filtered = filtered.filter(l => l.TableName === tableFilter);
        }

        if (userFilter) {
            filtered = filtered.filter(l => l.UserID == userFilter);
        }

        if (dateFrom) {
            filtered = filtered.filter(l => l.LogDate && l.LogDate >= dateFrom);
        }

        if (dateTo) {
            filtered = filtered.filter(l => l.LogDate && l.LogDate <= dateTo);
        }

        logsData = filtered;
        renderLogsTable();
        updateStats(filtered);
    }

    /**
     * مسح جميع عوامل التصفية
     */
    function clearFilters() {
        if (DOM.searchInput) DOM.searchInput.value = '';
        if (DOM.filterAction) DOM.filterAction.value = '';
        if (DOM.filterTable) DOM.filterTable.value = '';
        if (DOM.filterUser) DOM.filterUser.value = '';
        if (DOM.filterDateFrom) DOM.filterDateFrom.value = '';
        if (DOM.filterDateTo) DOM.filterDateTo.value = '';
        loadLogs();
    }

    // ============================================================
    // 6. تحديث الإحصائيات
    // ============================================================

    function updateStats(logs) {
        if (!DOM.statsContainer) return;

        const total = logs ? logs.length : 0;
        
        // عدد العمليات حسب النوع
        const actions = {};
        if (logs) {
            logs.forEach(l => {
                const action = l.ActionType || 'أخرى';
                actions[action] = (actions[action] || 0) + 1;
            });
        }

        let actionsHtml = '';
        const actionColors = {
            'إضافة': 'success',
            'تعديل': 'warning',
            'حذف': 'danger',
            'تسجيل دخول': 'primary',
            'طباعة': 'info',
            'تصدير': 'secondary'
        };

        Object.entries(actions).forEach(([action, count]) => {
            const color = actionColors[action] || 'secondary';
            actionsHtml += `
                <div class="col-md-2 col-4">
                    <div class="stat-card text-center p-2">
                        <div class="stat-number small">${count}</div>
                        <div class="stat-label small">${action}</div>
                    </div>
                </div>
            `;
        });

        DOM.statsContainer.innerHTML = `
            <div class="row g-2">
                <div class="col-md-3 col-6">
                    <div class="stat-card text-center p-3">
                        <div class="stat-number">${total}</div>
                        <div class="stat-label">إجمالي العمليات</div>
                    </div>
                </div>
                ${actionsHtml}
            </div>
        `;
    }

    // ============================================================
    // 7. تصدير وطباعة
    // ============================================================

    function exportLogs() {
        if (!logsData || logsData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للتصدير.');
            return;
        }

        const headers = ['معرف السجل', 'التاريخ', 'المستخدم', 'نوع الإجراء', 'الجدول', 
            'معرف السجل المرتبط', 'عنوان IP', 'نوع المتصفح', 'البيانات القديمة', 'البيانات الجديدة'];

        const data = logsData.map(l => {
            const user = usersList.find(u => u.UserID == l.UserID);
            return [
                l.LogID || '', 
                l.LogDate ? window.AlShawkani.App.formatDateTimeArabic(l.LogDate) : '—', 
                user ? user.FullName : (l.UserID || '—'), 
                l.ActionType || '—', 
                l.TableName || '—', 
                l.RecordID || '—', 
                l.IPAddress || '—', 
                l.UserAgent || '—', 
                l.OldData || '—', 
                l.NewData || '—'
            ];
        });

        window.AlShawkani.App.exportToCSV(data, 'سجل_العمليات.csv', headers);
    }

    function printLogs() {
        if (!logsData || logsData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للطباعة.');
            return;
        }

        const tableHTML = `
            <h3 style="text-align:center; margin-bottom:20px;">سجل العمليات - نظام الشوكاني</h3>
            <p style="text-align:center; margin-bottom:20px;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
            <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse; text-align:right; font-size:11px;">
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th>التاريخ</th>
                        <th>المستخدم</th>
                        <th>نوع الإجراء</th>
                        <th>الجدول</th>
                        <th>معرف السجل</th>
                        <th>عنوان IP</th>
                    </tr>
                </thead>
                <tbody>
                    ${logsData.slice(0, 50).map(l => {
                        const user = usersList.find(u => u.UserID == l.UserID);
                        return `
                        <tr>
                            <td>${l.LogDate ? window.AlShawkani.App.formatDateTimeArabic(l.LogDate) : '—'}</td>
                            <td>${user ? user.FullName : (l.UserID || '—')}</td>
                            <td>${l.ActionType || '—'}</td>
                            <td>${l.TableName || '—'}</td>
                            <td>${l.RecordID || '—'}</td>
                            <td>${l.IPAddress || '—'}</td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
            ${logsData.length > 50 ? `<p style="text-align:center; margin-top:10px; font-size:11px; color:#999;">* تم عرض آخر 50 سجل فقط</p>` : ''}
            <p style="text-align:center; margin-top:20px; font-size:11px; color:#999;">
                تم الطباعة من نظام الشوكاني - تاريخ ${new Date().toLocaleDateString('ar-EG')}
            </p>
        `;

        window.AlShawkani.App.printElement(tableHTML, 'سجل العمليات');
    }

    // ============================================================
    // 8. تحميل البيانات وتهيئة الوحدة
    // ============================================================

    /**
     * تحميل البيانات وتحديث الجدول
     */
    async function loadLogs() {
        try {
            const data = await fetchLogs();
            logsData = data;
            renderLogsTable();
            updateStats(data);
        } catch (error) {
            console.error('❌ خطأ في تحميل سجل العمليات:', error.message);
        }
    }

    /**
     * تهيئة وحدة سجل العمليات
     */
    function initLogsModule() {
        console.log('🚀 تهيئة وحدة سجل العمليات...');

        if (!DOM.tableBody) {
            console.warn('⚠️ جدول سجل العمليات غير موجود في الصفحة.');
            return;
        }

        // ============================================================
        // 1. ربط أحداث البحث والتصفية
        // ============================================================
        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', filterLogs);
        }

        if (DOM.filterAction) {
            DOM.filterAction.addEventListener('change', filterLogs);
        }

        if (DOM.filterTable) {
            DOM.filterTable.addEventListener('change', filterLogs);
        }

        if (DOM.filterUser) {
            DOM.filterUser.addEventListener('change', filterLogs);
        }

        if (DOM.filterDateFrom) {
            DOM.filterDateFrom.addEventListener('change', filterLogs);
        }

        if (DOM.filterDateTo) {
            DOM.filterDateTo.addEventListener('change', filterLogs);
        }

        // ============================================================
        // 2. ربط أزرار الإجراءات
        // ============================================================
        if (DOM.exportBtn) {
            DOM.exportBtn.addEventListener('click', exportLogs);
        }

        if (DOM.printBtn) {
            DOM.printBtn.addEventListener('click', printLogs);
        }

        if (DOM.refreshBtn) {
            DOM.refreshBtn.addEventListener('click', loadLogs);
        }

        if (DOM.clearFiltersBtn) {
            DOM.clearFiltersBtn.addEventListener('click', clearFilters);
        }

        // ============================================================
        // 3. تحميل البيانات الأولية
        // ============================================================
        Promise.all([
            fetchUsersList(),
            loadLogs()
        ]).then(() => {
            console.log('✅ تم تهيئة وحدة سجل العمليات بنجاح.');
        }).catch(error => {
            console.error('❌ خطأ في التهيئة:', error.message);
        });
    }

    // ============================================================
    // 9. تشغيل التهيئة
    // ============================================================

    document.addEventListener('DOMContentLoaded', function() {
        initLogsModule();
    });

})();