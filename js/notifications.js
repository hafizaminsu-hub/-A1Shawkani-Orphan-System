/**
 * ============================================================
 * الملف: notifications.js
 * الوصف: وحدة التنبيهات - عرض، إدارة، تصفية، تحديث حالة التنبيهات
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
        table: document.getElementById('notificationsTable'),
        tableBody: document.getElementById('notificationsTableBody'),

        // حقول التصفية
        searchInput: document.getElementById('searchNotifications'),
        filterType: document.getElementById('filterNotificationType'),
        filterRead: document.getElementById('filterRead'),
        filterDateFrom: document.getElementById('filterNotifDateFrom'),
        filterDateTo: document.getElementById('filterNotifDateTo'),

        // أزرار الإجراءات
        markAllReadBtn: document.getElementById('markAllReadBtn'),
        deleteAllReadBtn: document.getElementById('deleteAllReadBtn'),
        exportBtn: document.getElementById('exportNotificationsBtn'),
        printBtn: document.getElementById('printNotificationsBtn'),
        refreshBtn: document.getElementById('refreshNotificationsBtn'),
        clearFiltersBtn: document.getElementById('clearNotifFiltersBtn'),

        // حاوية الإحصائيات
        statsContainer: document.getElementById('notifStats'),

        // عداد التنبيهات غير المقروءة (في الـ Navbar)
        badgeCount: document.getElementById('notificationBadge'),

        // عرض تفاصيل التنبيه (Modal)
        detailModal: document.getElementById('notifDetailModal'),
        detailContent: document.getElementById('notifDetailContent'),

        // قائمة التنبيهات السريعة (في الـ Navbar)
        quickList: document.getElementById('notificationQuickList'),
        quickListContainer: document.getElementById('notificationQuickListContainer'),
        quickListToggle: document.getElementById('notificationQuickListToggle')
    };

    // ============================================================
    // 2. متغيرات الحالة
    // ============================================================
    let notificationsData = [];
    let dataTable = null;
    let refreshInterval = null;
    const REFRESH_INTERVAL = 30000; // 30 ثانية

    // ============================================================
    // 3. الدوال الأساسية
    // ============================================================

    /**
     * جلب قائمة التنبيهات من الخادم
     * @param {Object} filters - معاملات التصفية (اختياري)
     * @returns {Promise<Array>} قائمة التنبيهات
     */
    async function fetchNotifications(filters = {}) {
        try {
            const response = await fetch('/api/notifications?' + new URLSearchParams(filters));
            if (!response.ok) throw new Error('فشل في جلب التنبيهات');
            const data = await response.json();
            notificationsData = data;
            
            // تحديث عداد التنبيهات غير المقروءة
            updateBadgeCount(data);
            
            return data;
        } catch (error) {
            console.error('❌ خطأ في جلب التنبيهات:', error.message);
            window.AlShawkani.App.showError('تعذر جلب التنبيهات. يرجى المحاولة مرة أخرى.');
            return [];
        }
    }

    /**
     * تحديث عداد التنبيهات غير المقروءة
     * @param {Array} notifications - قائمة التنبيهات
     */
    function updateBadgeCount(notifications) {
        if (!DOM.badgeCount) return;
        
        const unread = notifications ? notifications.filter(n => n.IsRead != 1).length : 0;
        DOM.badgeCount.textContent = unread;
        
        // إظهار/إخفاء العداد
        if (unread > 0) {
            DOM.badgeCount.style.display = 'inline-block';
            // تحديث عنوان الصفحة
            if (unread > 0) {
                document.title = `(${unread}) نظام الشوكاني`;
            } else {
                document.title = 'نظام الشوكاني';
            }
        } else {
            DOM.badgeCount.style.display = 'none';
            document.title = 'نظام الشوكاني';
        }
    }

    /**
     * تحديث حالة التنبيه (قراءة/غير مقروءة)
     * @param {number} notificationId - معرف التنبيه
     * @param {boolean} isRead - الحالة الجديدة
     * @returns {Promise<Object>} نتيجة التحديث
     */
    async function updateNotificationStatus(notificationId, isRead) {
        try {
            const response = await fetch(`/api/notifications/${notificationId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ isRead: isRead ? 1 : 0 })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في تحديث حالة التنبيه');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ خطأ في تحديث حالة التنبيه:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر تحديث حالة التنبيه.');
            throw error;
        }
    }

    /**
     * تحديث جميع التنبيهات كـ "مقروءة"
     * @returns {Promise<Object>} نتيجة التحديث
     */
    async function markAllAsRead() {
        try {
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'POST',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في تحديث التنبيهات');
            }

            const result = await response.json();
            window.AlShawkani.App.showSuccess('تم تحديث جميع التنبيهات كمقروءة');
            return result;
        } catch (error) {
            console.error('❌ خطأ في تحديث التنبيهات:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر تحديث التنبيهات.');
            throw error;
        }
    }

    /**
     * حذف جميع التنبيهات المقروءة
     * @returns {Promise<Object>} نتيجة الحذف
     */
    async function deleteAllRead() {
        try {
            const response = await fetch('/api/notifications/delete-read', {
                method: 'DELETE',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في حذف التنبيهات المقروءة');
            }

            const result = await response.json();
            window.AlShawkani.App.showSuccess('تم حذف جميع التنبيهات المقروءة');
            return result;
        } catch (error) {
            console.error('❌ خطأ في حذف التنبيهات المقروءة:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حذف التنبيهات المقروءة.');
            throw error;
        }
    }

    /**
     * حذف تنبيه فردي
     * @param {number} notificationId - معرف التنبيه
     * @returns {Promise<boolean>} نتيجة الحذف
     */
    async function deleteNotification(notificationId) {
        try {
            const response = await fetch(`/api/notifications/${notificationId}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في حذف التنبيه');
            }

            return true;
        } catch (error) {
            console.error('❌ خطأ في حذف التنبيه:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حذف التنبيه.');
            throw error;
        }
    }

    // ============================================================
    // 4. عرض التنبيهات
    // ============================================================

    /**
     * عرض التنبيهات في الجدول
     */
    function renderNotificationsTable() {
        if (!DOM.tableBody) return;

        if (dataTable) {
            dataTable.destroy();
            dataTable = null;
        }

        if (!notificationsData || notificationsData.length === 0) {
            DOM.tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <i class="fas fa-bell fa-2x d-block mb-2 text-muted"></i>
                        <h6 class="text-muted">لا توجد تنبيهات</h6>
                        <p class="text-muted small">ستظهر هنا التنبيهات الخاصة بالنظام</p>
                    </td>
                </tr>
            `;
            return;
        }

        let rows = '';
        notificationsData.forEach(notif => {
            const date = notif.CreatedAt ? 
                window.AlShawkani.App.formatDateTimeArabic(notif.CreatedAt) : '—';

            // حالة القراءة
            const readBadge = notif.IsRead == 1 ? 
                '<span class="badge bg-secondary">مقروء</span>' : 
                '<span class="badge bg-primary">غير مقروء</span>';

            // نوع التنبيه
            let typeBadge = '';
            switch (notif.NotificationType) {
                case 'معلومة':
                    typeBadge = '<span class="badge bg-info text-white">معلومة</span>';
                    break;
                case 'تحذير':
                    typeBadge = '<span class="badge bg-warning text-dark">تحذير</span>';
                    break;
                case 'خطأ':
                    typeBadge = '<span class="badge bg-danger">خطأ</span>';
                    break;
                case 'تذكير':
                    typeBadge = '<span class="badge bg-success">تذكير</span>';
                    break;
                default:
                    typeBadge = '<span class="badge bg-secondary">' + (notif.NotificationType || '—') + '</span>';
            }

            rows += `
                <tr data-id="${notif.NotificationID}" class="${notif.IsRead != 1 ? 'fw-bold' : ''}">
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <span class="${notif.IsRead != 1 ? 'text-primary' : 'text-muted'}">
                                <i class="fas ${notif.IsRead != 1 ? 'fa-circle' : 'fa-circle-check'}"></i>
                            </span>
                            ${notif.Title || '—'}
                        </div>
                    </td>
                    <td>${typeBadge}</td>
                    <td>${notif.Message || '—'}</td>
                    <td>${readBadge}</td>
                    <td>${date}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            ${notif.IsRead != 1 ? `
                            <button class="btn btn-outline-success mark-read" data-id="${notif.NotificationID}" title="تحديد كمقروء">
                                <i class="fas fa-check"></i>
                            </button>
                            ` : ''}
                            <button class="btn btn-outline-primary view-notif" data-id="${notif.NotificationID}" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-danger delete-notif" data-id="${notif.NotificationID}" title="حذف">
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
                dataTable = window.AlShawkani.App.initDataTable('#notificationsTable', {
                    order: [[4, 'desc']],
                    columnDefs: [
                        { targets: [5], orderable: false }
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
        document.querySelectorAll('.view-notif').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                viewNotificationDetail(id);
            });
        });

        document.querySelectorAll('.mark-read').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                handleMarkRead(id);
            });
        });

        document.querySelectorAll('.delete-notif').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                handleDeleteNotification(id);
            });
        });

        // عند النقر على صف التنبيه لفتح التفاصيل
        document.querySelectorAll('#notificationsTable tbody tr').forEach(row => {
            row.addEventListener('click', function(e) {
                // تجاهل النقر على الأزرار
                if (e.target.closest('.btn')) return;
                const id = this.dataset.id;
                if (id) {
                    viewNotificationDetail(id);
                }
            });
        });
    }

    // ============================================================
    // 5. عرض التفاصيل والإجراءات
    // ============================================================

    /**
     * عرض تفاصيل التنبيه
     * @param {number} id - معرف التنبيه
     */
    async function viewNotificationDetail(id) {
        try {
            const notif = notificationsData.find(n => n.NotificationID == id);
            if (!notif) {
                window.AlShawkani.App.showWarning('التنبيه غير موجود');
                return;
            }

            // تحديث الحالة إلى مقروء تلقائياً عند العرض
            if (notif.IsRead != 1) {
                await updateNotificationStatus(id, true);
                await loadNotifications();
            }

            const details = `
                <div dir="rtl" class="p-2">
                    <div class="row g-3">
                        <div class="col-12">
                            <h5 class="border-bottom pb-2">${notif.Title || 'تنبيه'}</h5>
                        </div>
                        <div class="col-6">
                            <strong>معرف التنبيه:</strong> ${notif.NotificationID || '—'}
                        </div>
                        <div class="col-6">
                            <strong>النوع:</strong> ${notif.NotificationType || '—'}
                        </div>
                        <div class="col-6">
                            <strong>الحالة:</strong> ${notif.IsRead == 1 ? 'مقروء' : 'غير مقروء'}
                        </div>
                        <div class="col-6">
                            <strong>التاريخ:</strong> ${notif.CreatedAt ? window.AlShawkani.App.formatDateTimeArabic(notif.CreatedAt) : '—'}
                        </div>
                        <div class="col-12">
                            <strong>الرسالة:</strong>
                            <div class="p-2 bg-light rounded mt-1">${notif.Message || '—'}</div>
                        </div>
                        ${notif.Link ? `
                        <div class="col-12">
                            <strong>رابط:</strong>
                            <a href="${notif.Link}" class="text-decoration-none">${notif.Link}</a>
                        </div>
                        ` : ''}
                        ${notif.ExpiryDate ? `
                        <div class="col-12">
                            <strong>تاريخ الانتهاء:</strong> ${window.AlShawkani.App.formatDateTimeArabic(notif.ExpiryDate)}
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;

            if (DOM.detailModal && DOM.detailContent) {
                DOM.detailContent.innerHTML = details;
                const modal = new bootstrap.Modal(DOM.detailModal);
                modal.show();
            } else {
                window.AlShawkani.App.showInfo(details, 10000);
            }

        } catch (error) {
            console.error('❌ خطأ في عرض التفاصيل:', error.message);
            window.AlShawkani.App.showError('تعذر عرض تفاصيل التنبيه.');
        }
    }

    /**
     * معالجة تحديث حالة التنبيه إلى مقروء
     * @param {number} id - معرف التنبيه
     */
    async function handleMarkRead(id) {
        try {
            await updateNotificationStatus(id, true);
            await loadNotifications();
            window.AlShawkani.App.showSuccess('تم تحديث حالة التنبيه إلى مقروء');
        } catch (error) {
            // الخطأ تم معالجته في updateNotificationStatus
        }
    }

    /**
     * معالجة حذف تنبيه
     * @param {number} id - معرف التنبيه
     */
    async function handleDeleteNotification(id) {
        const notif = notificationsData.find(n => n.NotificationID == id);
        if (!notif) return;

        const confirmed = await window.AlShawkani.App.confirmAction(
            `هل أنت متأكد من حذف التنبيه "${notif.Title}"؟`,
            'تأكيد الحذف',
            'نعم، حذف',
            'إلغاء'
        );

        if (!confirmed) return;

        try {
            await deleteNotification(id);
            await loadNotifications();
            window.AlShawkani.App.showSuccess('تم حذف التنبيه بنجاح');
        } catch (error) {
            // الخطأ تم معالجته في deleteNotification
        }
    }

    /**
     * معالجة تحديث جميع التنبيهات كمقروءة
     */
    async function handleMarkAllRead() {
        const unreadCount = notificationsData.filter(n => n.IsRead != 1).length;
        if (unreadCount === 0) {
            window.AlShawkani.App.showInfo('لا توجد تنبيهات غير مقروءة');
            return;
        }

        const confirmed = await window.AlShawkani.App.confirmAction(
            `هل أنت متأكد من تحديث جميع التنبيهات (${unreadCount}) كمقروءة؟`,
            'تأكيد التحديث',
            'نعم، تحديث',
            'إلغاء'
        );

        if (!confirmed) return;

        try {
            await markAllAsRead();
            await loadNotifications();
        } catch (error) {
            // الخطأ تم معالجته في markAllAsRead
        }
    }

    /**
     * معالجة حذف جميع التنبيهات المقروءة
     */
    async function handleDeleteAllRead() {
        const readCount = notificationsData.filter(n => n.IsRead == 1).length;
        if (readCount === 0) {
            window.AlShawkani.App.showInfo('لا توجد تنبيهات مقروءة لحذفها');
            return;
        }

        const confirmed = await window.AlShawkani.App.confirmAction(
            `هل أنت متأكد من حذف جميع التنبيهات المقروءة (${readCount})؟`,
            'تأكيد الحذف',
            'نعم، حذف',
            'إلغاء'
        );

        if (!confirmed) return;

        try {
            await deleteAllRead();
            await loadNotifications();
        } catch (error) {
            // الخطأ تم معالجته في deleteAllRead
        }
    }

    // ============================================================
    // 6. البحث والتصفية
    // ============================================================

    function filterNotifications() {
        const searchTerm = DOM.searchInput ? DOM.searchInput.value.toLowerCase().trim() : '';
        const typeFilter = DOM.filterType ? DOM.filterType.value : '';
        const readFilter = DOM.filterRead ? DOM.filterRead.value : '';
        const dateFrom = DOM.filterDateFrom ? DOM.filterDateFrom.value : '';
        const dateTo = DOM.filterDateTo ? DOM.filterDateTo.value : '';

        let filtered = notificationsData;

        if (searchTerm) {
            filtered = filtered.filter(n =>
                (n.Title && n.Title.toLowerCase().includes(searchTerm)) ||
                (n.Message && n.Message.toLowerCase().includes(searchTerm))
            );
        }

        if (typeFilter) {
            filtered = filtered.filter(n => n.NotificationType === typeFilter);
        }

        if (readFilter !== '') {
            filtered = filtered.filter(n => n.IsRead == parseInt(readFilter));
        }

        if (dateFrom) {
            filtered = filtered.filter(n => n.CreatedAt && n.CreatedAt >= dateFrom);
        }

        if (dateTo) {
            filtered = filtered.filter(n => n.CreatedAt && n.CreatedAt <= dateTo);
        }

        notificationsData = filtered;
        renderNotificationsTable();
        updateStats(filtered);
    }

    /**
     * مسح جميع عوامل التصفية
     */
    function clearFilters() {
        if (DOM.searchInput) DOM.searchInput.value = '';
        if (DOM.filterType) DOM.filterType.value = '';
        if (DOM.filterRead) DOM.filterRead.value = '';
        if (DOM.filterDateFrom) DOM.filterDateFrom.value = '';
        if (DOM.filterDateTo) DOM.filterDateTo.value = '';
        loadNotifications();
    }

    // ============================================================
    // 7. تحديث الإحصائيات
    // ============================================================

    function updateStats(notifications) {
        if (!DOM.statsContainer) return;

        const total = notifications ? notifications.length : 0;
        const unread = notifications ? notifications.filter(n => n.IsRead != 1).length : 0;
        const read = total - unread;

        // عدد التنبيهات حسب النوع
        const types = {};
        if (notifications) {
            notifications.forEach(n => {
                const type = n.NotificationType || 'أخرى';
                types[type] = (types[type] || 0) + 1;
            });
        }

        let typesHtml = '';
        const typeColors = {
            'معلومة': 'info',
            'تحذير': 'warning',
            'خطأ': 'danger',
            'تذكير': 'success'
        };

        Object.entries(types).forEach(([type, count]) => {
            const color = typeColors[type] || 'secondary';
            typesHtml += `
                <div class="col-md-2 col-4">
                    <div class="stat-card text-center p-2">
                        <div class="stat-number small">${count}</div>
                        <div class="stat-label small">${type}</div>
                    </div>
                </div>
            `;
        });

        DOM.statsContainer.innerHTML = `
            <div class="row g-2">
                <div class="col-md-3 col-6">
                    <div class="stat-card text-center p-3">
                        <div class="stat-number">${total}</div>
                        <div class="stat-label">إجمالي التنبيهات</div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="stat-card text-center p-3">
                        <div class="stat-number text-primary">${unread}</div>
                        <div class="stat-label">غير مقروءة</div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="stat-card text-center p-3">
                        <div class="stat-number text-success">${read}</div>
                        <div class="stat-label">مقروءة</div>
                    </div>
                </div>
                ${typesHtml}
            </div>
        `;
    }

    // ============================================================
    // 8. عرض التنبيهات السريعة (في الـ Navbar)
    // ============================================================

    /**
     * عرض التنبيهات السريعة في القائمة المنسدلة (Navbar)
     */
    function renderQuickNotifications() {
        if (!DOM.quickList) return;

        const notifications = notificationsData.slice(0, 10); // آخر 10 تنبيهات

        if (!notifications || notifications.length === 0) {
            DOM.quickList.innerHTML = `
                <li class="dropdown-item text-center text-muted py-3">
                    <i class="fas fa-bell-slash fa-2x d-block mb-2"></i>
                    لا توجد تنبيهات
                </li>
            `;
            return;
        }

        let items = '';
        notifications.forEach(notif => {
            const isUnread = notif.IsRead != 1;
            const date = notif.CreatedAt ? 
                window.AlShawkani.App.formatDateTimeArabic(notif.CreatedAt) : '';

            let icon = 'fa-bell';
            switch (notif.NotificationType) {
                case 'معلومة': icon = 'fa-info-circle'; break;
                case 'تحذير': icon = 'fa-exclamation-triangle'; break;
                case 'خطأ': icon = 'fa-times-circle'; break;
                case 'تذكير': icon = 'fa-clock'; break;
            }

            items += `
                <li class="dropdown-item quick-notif-item ${isUnread ? 'bg-light' : ''}" 
                    data-id="${notif.NotificationID}" style="cursor:pointer; border-bottom:1px solid #f0f2f5;">
                    <div class="d-flex align-items-start gap-2">
                        <div class="mt-1">
                            <i class="fas ${icon} ${isUnread ? 'text-primary' : 'text-muted'}"></i>
                        </div>
                        <div class="flex-grow-1">
                            <div class="fw-semibold ${isUnread ? '' : 'text-muted'}" style="font-size:0.9rem;">
                                ${notif.Title || 'تنبيه'}
                            </div>
                            <div class="text-muted small" style="font-size:0.75rem;">
                                ${notif.Message ? notif.Message.substring(0, 60) + (notif.Message.length > 60 ? '...' : '') : ''}
                            </div>
                            <div class="text-muted small" style="font-size:0.65rem;">${date}</div>
                        </div>
                        ${isUnread ? '<span class="badge bg-primary rounded-pill">جديد</span>' : ''}
                    </div>
                </li>
            `;
        });

        DOM.quickList.innerHTML = items;

        // ربط أحداث النقر على عناصر القائمة السريعة
        document.querySelectorAll('.quick-notif-item').forEach(item => {
            item.addEventListener('click', function() {
                const id = this.dataset.id;
                if (id) {
                    // إغلاق القائمة المنسدلة
                    const dropdown = document.querySelector('.dropdown-menu.show');
                    if (dropdown) {
                        const bsDropdown = bootstrap.Dropdown.getInstance(dropdown);
                        if (bsDropdown) bsDropdown.hide();
                    }
                    viewNotificationDetail(id);
                }
            });
        });

        // تحديث عداد التنبيهات في زر القائمة
        if (DOM.quickListToggle) {
            const unreadCount = notificationsData.filter(n => n.IsRead != 1).length;
            const badge = DOM.quickListToggle.querySelector('.badge');
            if (badge) {
                if (unreadCount > 0) {
                    badge.textContent = unreadCount;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    }

    // ============================================================
    // 9. تصدير وطباعة
    // ============================================================

    function exportNotifications() {
        if (!notificationsData || notificationsData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للتصدير.');
            return;
        }

        const headers = ['معرف التنبيه', 'العنوان', 'النوع', 'الرسالة', 'الحالة', 'التاريخ', 'الرابط', 'تاريخ الانتهاء'];

        const data = notificationsData.map(n => [
            n.NotificationID || '', n.Title || '', n.NotificationType || '', n.Message || '', 
            n.IsRead == 1 ? 'مقروء' : 'غير مقروء', 
            n.CreatedAt ? window.AlShawkani.App.formatDateTimeArabic(n.CreatedAt) : '—', 
            n.Link || '—', n.ExpiryDate || '—'
        ]);

        window.AlShawkani.App.exportToCSV(data, 'التنبيهات.csv', headers);
    }

    function printNotifications() {
        if (!notificationsData || notificationsData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للطباعة.');
            return;
        }

        const tableHTML = `
            <h3 style="text-align:center; margin-bottom:20px;">قائمة التنبيهات - نظام الشوكاني</h3>
            <p style="text-align:center; margin-bottom:20px;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
            <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse; text-align:right; font-size:11px;">
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th>العنوان</th>
                        <th>النوع</th>
                        <th>الرسالة</th>
                        <th>الحالة</th>
                        <th>التاريخ</th>
                    </tr>
                </thead>
                <tbody>
                    ${notificationsData.slice(0, 50).map(n => `
                        <tr>
                            <td>${n.Title || '—'}</td>
                            <td>${n.NotificationType || '—'}</td>
                            <td>${n.Message ? n.Message.substring(0, 50) + (n.Message.length > 50 ? '...' : '') : '—'}</td>
                            <td>${n.IsRead == 1 ? 'مقروء' : 'غير مقروء'}</td>
                            <td>${n.CreatedAt ? window.AlShawkani.App.formatDateTimeArabic(n.CreatedAt) : '—'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${notificationsData.length > 50 ? `<p style="text-align:center; margin-top:10px; font-size:11px; color:#999;">* تم عرض آخر 50 سجل فقط</p>` : ''}
            <p style="text-align:center; margin-top:20px; font-size:11px; color:#999;">
                تم الطباعة من نظام الشوكاني - تاريخ ${new Date().toLocaleDateString('ar-EG')}
            </p>
        `;

        window.AlShawkani.App.printElement(tableHTML, 'قائمة التنبيهات');
    }

    // ============================================================
    // 10. تحميل البيانات وتهيئة الوحدة
    // ============================================================

    /**
     * تحميل البيانات وتحديث الجدول
     */
    async function loadNotifications() {
        try {
            const data = await fetchNotifications();
            notificationsData = data;
            renderNotificationsTable();
            updateStats(data);
            renderQuickNotifications();
        } catch (error) {
            console.error('❌ خطأ في تحميل التنبيهات:', error.message);
        }
    }

    /**
     * بدء التحديث التلقائي
     */
    function startAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
        refreshInterval = setInterval(() => {
            // تحديث في الخلفية دون إظهار رسائل خطأ
            fetchNotifications().then(data => {
                notificationsData = data;
                // تحديث الجدول فقط إذا كان مفتوحاً (ليس ضرورياً)
                // نستخدم طريقة خفيفة لتحديث العداد والقائمة السريعة فقط
                updateBadgeCount(data);
                renderQuickNotifications();
            }).catch(() => {});
        }, REFRESH_INTERVAL);
    }

    /**
     * إيقاف التحديث التلقائي
     */
    function stopAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    /**
     * تهيئة وحدة التنبيهات
     */
    function initNotificationsModule() {
        console.log('🚀 تهيئة وحدة التنبيهات...');

        if (!DOM.tableBody) {
            console.warn('⚠️ جدول التنبيهات غير موجود في الصفحة.');
            // حتى لو لم يكن الجدول موجوداً، نستمر في تحديث العداد والقائمة السريعة
        }

        // ============================================================
        // 1. ربط أحداث البحث والتصفية
        // ============================================================
        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', filterNotifications);
        }

        if (DOM.filterType) {
            DOM.filterType.addEventListener('change', filterNotifications);
        }

        if (DOM.filterRead) {
            DOM.filterRead.addEventListener('change', filterNotifications);
        }

        if (DOM.filterDateFrom) {
            DOM.filterDateFrom.addEventListener('change', filterNotifications);
        }

        if (DOM.filterDateTo) {
            DOM.filterDateTo.addEventListener('change', filterNotifications);
        }

        // ============================================================
        // 2. ربط أزرار الإجراءات
        // ============================================================
        if (DOM.markAllReadBtn) {
            DOM.markAllReadBtn.addEventListener('click', handleMarkAllRead);
        }

        if (DOM.deleteAllReadBtn) {
            DOM.deleteAllReadBtn.addEventListener('click', handleDeleteAllRead);
        }

        if (DOM.exportBtn) {
            DOM.exportBtn.addEventListener('click', exportNotifications);
        }

        if (DOM.printBtn) {
            DOM.printBtn.addEventListener('click', printNotifications);
        }

        if (DOM.refreshBtn) {
            DOM.refreshBtn.addEventListener('click', loadNotifications);
        }

        if (DOM.clearFiltersBtn) {
            DOM.clearFiltersBtn.addEventListener('click', clearFilters);
        }

        // ============================================================
        // 3. ربط قائمة التنبيهات السريعة (Navbar)
        // ============================================================
        if (DOM.quickListToggle) {
            DOM.quickListToggle.addEventListener('shown.bs.dropdown', function() {
                // تحديث القائمة عند فتحها
                renderQuickNotifications();
            });
        }

        // ============================================================
        // 4. تحميل البيانات الأولية
        // ============================================================
        loadNotifications();

        // ============================================================
        // 5. بدء التحديث التلقائي
        // ============================================================
        startAutoRefresh();

        console.log('✅ تم تهيئة وحدة التنبيهات بنجاح.');
    }

    // ============================================================
    // 11. تشغيل التهيئة
    // ============================================================

    document.addEventListener('DOMContentLoaded', function() {
        initNotificationsModule();
    });

    // تنظيف عند مغادرة الصفحة
    window.addEventListener('beforeunload', function() {
        stopAutoRefresh();
    });

})();