/**
 * ============================================================
 * الملف: app.js
 * الوصف: الملف الرئيسي للتطبيق - دوال مشتركة، أدوات مساعدة، تهيئة عامة
 * الإصدار: 1.0.0
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. دوال مساعدة للتواريخ (باستخدام Date API)
    // ============================================================

    /**
     * تنسيق تاريخ بتنسيق عربي (مثال: 15 يناير 2025)
     * @param {Date|string} date - التاريخ المراد تنسيقه
     * @returns {string} التاريخ المنسق
     */
    function formatDateArabic(date) {
        if (!date) return '—';
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '—';
        
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return d.toLocaleDateString('ar-EG', options);
    }

    /**
     * تنسيق التاريخ والوقت (مثال: 15 يناير 2025، 03:30 م)
     * @param {Date|string} date - التاريخ المراد تنسيقه
     * @returns {string} التاريخ والوقت المنسق
     */
    function formatDateTimeArabic(date) {
        if (!date) return '—';
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '—';
        
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return d.toLocaleDateString('ar-EG', options);
    }

    /**
     * حساب الفرق بين تاريخين بالأيام
     * @param {Date|string} date1 - التاريخ الأول
     * @param {Date|string} date2 - التاريخ الثاني (اختياري، افتراضياً اليوم)
     * @returns {number} عدد الأيام بين التاريخين
     */
    function daysDifference(date1, date2) {
        const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
        const d2 = date2 ? (typeof date2 === 'string' ? new Date(date2) : date2) : new Date();
        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
        
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * التحقق من صحة التاريخ
     * @param {string} dateString - التاريخ بصيغة YYYY-MM-DD
     * @returns {boolean} صحة التاريخ
     */
    function isValidDate(dateString) {
        if (!dateString) return false;
        const pattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!pattern.test(dateString)) return false;
        
        const date = new Date(dateString);
        return !isNaN(date.getTime()) && 
               date.toISOString().slice(0, 10) === dateString;
    }

    // ============================================================
    // 2. دوال مساعدة للواجهة (UI)
    // ============================================================

    /**
     * عرض تنبيه نجاح (Toast) في أعلى الصفحة
     * @param {string} message - رسالة النجاح
     * @param {number} duration - مدة الظهور بالمللي ثانية (افتراضي 3000)
     */
    function showSuccess(message, duration = 3000) {
        showToast(message, 'success', duration);
    }

    /**
     * عرض تنبيه خطأ (Toast)
     * @param {string} message - رسالة الخطأ
     * @param {number} duration - مدة الظهور بالمللي ثانية (افتراضي 5000)
     */
    function showError(message, duration = 5000) {
        showToast(message, 'danger', duration);
    }

    /**
     * عرض تنبيه تحذيري (Toast)
     * @param {string} message - رسالة التحذير
     * @param {number} duration - مدة الظهور بالمللي ثانية (افتراضي 4000)
     */
    function showWarning(message, duration = 4000) {
        showToast(message, 'warning', duration);
    }

    /**
     * عرض تنبيه معلوماتي (Toast)
     * @param {string} message - رسالة المعلومات
     * @param {number} duration - مدة الظهور بالمللي ثانية (افتراضي 3000)
     */
    function showInfo(message, duration = 3000) {
        showToast(message, 'info', duration);
    }

    /**
     * الدالة الأساسية لعرض التنبيهات (Toast)
     * @param {string} message - نص الرسالة
     * @param {string} type - نوع التنبيه (success, danger, warning, info)
     * @param {number} duration - مدة الظهور
     */
    function showToast(message, type = 'info', duration = 3000) {
        // إنشاء حاوية التنبيهات إذا لم تكن موجودة
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                left: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(toastContainer);
        }

        // إنشاء عنصر التنبيه
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: ${type === 'success' ? '#d4edda' : 
                         type === 'danger' ? '#f8d7da' : 
                         type === 'warning' ? '#fff3cd' : 
                         '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : 
                    type === 'danger' ? '#721c24' : 
                    type === 'warning' ? '#856404' : 
                    '#0c5460'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : 
                               type === 'danger' ? '#f5c6cb' : 
                               type === 'warning' ? '#ffeeba' : 
                               '#bee5eb'};
            border-radius: 12px;
            padding: 14px 24px;
            font-size: 0.95rem;
            font-weight: 500;
            box-shadow: 0 8px 30px rgba(0,0,0,0.12);
            max-width: 520px;
            width: 100%;
            text-align: right;
            pointer-events: auto;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            font-family: 'Segoe UI', Tahoma, sans-serif;
        `;

        // إضافة أيقونة حسب النوع
        const iconMap = {
            success: 'fa-check-circle',
            danger: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        const icon = iconMap[type] || 'fa-info-circle';
        toast.innerHTML = `
            <span style="display: flex; align-items: center; gap: 10px;">
                <i class="fas ${icon}" style="font-size: 1.2rem;"></i>
                ${message}
            </span>
            <button type="button" style="
                background: transparent;
                border: none;
                font-size: 1.3rem;
                cursor: pointer;
                padding: 0 6px;
                color: inherit;
                opacity: 0.6;
                transition: opacity 0.2s;
                line-height: 1;
            " aria-label="إغلاق التنبيه">&times;</button>
        `;

        // إضافة الحدث لإغلاق التنبيه
        const closeBtn = toast.querySelector('button');
        closeBtn.addEventListener('click', function() {
            closeToast(toast);
        });

        // إضافة التنبيه إلى الحاوية
        toastContainer.appendChild(toast);

        // ظهور التنبيه مع تأثير
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // إغلاق تلقائي بعد المدة المحددة
        const timeoutId = setTimeout(() => {
            closeToast(toast);
        }, duration);

        // حفظ الـ timeout في خاصية للتنبيه لإمكانية إلغائه
        toast._timeoutId = timeoutId;

        // عند تمرير الماوس فوق التنبيه، نلغي الإغلاق التلقائي
        toast.addEventListener('mouseenter', function() {
            clearTimeout(this._timeoutId);
        });

        // عند مغادرة الماوس، نعيد الإغلاق التلقائي بعد 3 ثوان إضافية
        toast.addEventListener('mouseleave', function() {
            this._timeoutId = setTimeout(() => {
                closeToast(this);
            }, 3000);
        });
    }

    /**
     * إغلاق تنبيه مع تأثير انزلاقي
     * @param {HTMLElement} toast - عنصر التنبيه
     */
    function closeToast(toast) {
        if (!toast || toast._closed) return;
        toast._closed = true;
        
        // إلغاء أي timeout معلق
        if (toast._timeoutId) {
            clearTimeout(toast._timeoutId);
        }

        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';

        // إزالة العنصر بعد انتهاء التأثير
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            // إذا أصبحت الحاوية فارغة، نحذفها
            const container = document.getElementById('toastContainer');
            if (container && container.children.length === 0) {
                container.remove();
            }
        }, 400);
    }

    /**
     * عرض مربع حوار تأكيد (Confirm Dialog) باستخدام Bootstrap Modal
     * @param {string} message - رسالة التأكيد
     * @param {string} title - عنوان المربع (اختياري)
     * @param {string} confirmText - نص زر التأكيد (اختياري)
     * @param {string} cancelText - نص زر الإلغاء (اختياري)
     * @returns {Promise<boolean>} وعد بنتيجة التأكيد
     */
    function confirmAction(message, title = 'تأكيد العملية', confirmText = 'نعم، تأكيد', cancelText = 'إلغاء') {
        return new Promise((resolve) => {
            // البحث عن عنصر المودال أو إنشائه
            let modal = document.getElementById('confirmModal');
            if (!modal) {
                // إنشاء المودال
                modal = document.createElement('div');
                modal.id = 'confirmModal';
                modal.className = 'modal fade';
                modal.setAttribute('tabindex', '-1');
                modal.setAttribute('aria-labelledby', 'confirmModalLabel');
                modal.setAttribute('aria-hidden', 'true');
                modal.innerHTML = `
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="confirmModalLabel">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="إغلاق"></button>
                            </div>
                            <div class="modal-body" id="confirmModalBody">
                                ${message}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" id="confirmCancelBtn">${cancelText}</button>
                                <button type="button" class="btn btn-primary" id="confirmOkBtn">${confirmText}</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            } else {
                // تحديث محتوى المودال الموجود
                const titleEl = modal.querySelector('.modal-title');
                const bodyEl = document.getElementById('confirmModalBody');
                const okBtn = document.getElementById('confirmOkBtn');
                const cancelBtn = document.getElementById('confirmCancelBtn');
                
                if (titleEl) titleEl.textContent = title;
                if (bodyEl) bodyEl.textContent = message;
                if (okBtn) okBtn.textContent = confirmText;
                if (cancelBtn) cancelBtn.textContent = cancelText;
            }

            // الحصول على عناصر المودال
            const modalInstance = new bootstrap.Modal(modal);
            const okBtn = document.getElementById('confirmOkBtn');
            const cancelBtn = document.getElementById('confirmCancelBtn');

            // إزالة المستمعات القديمة لتجنب التكرار
            const newOkBtn = okBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);
            okBtn.parentNode.replaceChild(newOkBtn, okBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

            // معالجة أحداث الأزرار
            let resolved = false;

            function cleanup() {
                if (!resolved) {
                    resolved = true;
                    modalInstance.hide();
                    resolve(false);
                }
            }

            newOkBtn.addEventListener('click', function() {
                if (!resolved) {
                    resolved = true;
                    modalInstance.hide();
                    resolve(true);
                }
            });

            newCancelBtn.addEventListener('click', cleanup);

            // عند إغلاق المودال بأي طريقة (زر الإغلاق أو النقر خارج المودال)
            modal.addEventListener('hidden.bs.modal', function() {
                cleanup();
            });

            // عرض المودال
            modalInstance.show();
        });
    }

    // ============================================================
    // 3. دوال مساعدة للتعامل مع الـ API
    // ============================================================

    /**
     * جلب البيانات من الخادم باستخدام GET
     * @param {string} url - عنوان النقطة (Endpoint)
     * @param {Object} params - معاملات الاستعلام (اختياري)
     * @returns {Promise<Object>} البيانات المسترجعة
     */
    async function apiGet(url, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;
        
        try {
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `فشل الطلب (${response.status})`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ خطأ في apiGet:', error.message);
            throw error;
        }
    }

    /**
     * إرسال بيانات إلى الخادم باستخدام POST
     * @param {string} url - عنوان النقطة (Endpoint)
     * @param {Object} data - البيانات المراد إرسالها
     * @param {string} contentType - نوع المحتوى (افتراضي application/json)
     * @returns {Promise<Object>} استجابة الخادم
     */
    async function apiPost(url, data, contentType = 'application/json') {
        try {
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': contentType,
                },
                credentials: 'same-origin',
                body: contentType === 'application/json' ? JSON.stringify(data) : data
            };
            
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `فشل الطلب (${response.status})`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ خطأ في apiPost:', error.message);
            throw error;
        }
    }

    /**
     * تحديث بيانات على الخادم باستخدام PUT
     * @param {string} url - عنوان النقطة (Endpoint)
     * @param {Object} data - البيانات المراد تحديثها
     * @returns {Promise<Object>} استجابة الخادم
     */
    async function apiPut(url, data) {
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `فشل الطلب (${response.status})`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ خطأ في apiPut:', error.message);
            throw error;
        }
    }

    /**
     * حذف بيانات من الخادم باستخدام DELETE
     * @param {string} url - عنوان النقطة (Endpoint)
     * @returns {Promise<Object>} استجابة الخادم
     */
    async function apiDelete(url) {
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `فشل الطلب (${response.status})`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ خطأ في apiDelete:', error.message);
            throw error;
        }
    }

    // ============================================================
    // 4. دوال لإدارة الجلسة والصلاحيات
    // ============================================================

    /**
     * التحقق من حالة الجلسة
     * @returns {Promise<Object>} معلومات المستخدم أو null
     */
    async function getSessionInfo() {
        try {
            const response = await fetch('/api/session', {
                credentials: 'same-origin'
            });
            if (!response.ok) return null;
            const data = await response.json();
            return data.loggedIn ? data : null;
        } catch (error) {
            console.warn('⚠️ تعذر جلب معلومات الجلسة:', error.message);
            return null;
        }
    }

    /**
     * التحقق من وجود صلاحية معينة للمستخدم
     * @param {string} permission - اسم الصلاحية (مثل 'orphans.write')
     * @returns {Promise<boolean>} هل لديه الصلاحية
     */
    async function hasPermission(permission) {
        try {
            const session = await getSessionInfo();
            if (!session) return false;
            // في الإصدارات المستقبلية، سيكون هناك منطق للصلاحيات
            // حالياً، مدير النظام (RoleID = 1) لديه كل الصلاحيات
            return session.roleId === 1;
        } catch (error) {
            console.warn('⚠️ تعذر التحقق من الصلاحية:', error.message);
            return false;
        }
    }

    /**
     * تسجيل الخروج
     */
    async function logout() {
        try {
            const response = await fetch('/logout', {
                method: 'GET',
                credentials: 'same-origin'
            });
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('❌ خطأ في تسجيل الخروج:', error.message);
            window.location.href = '/';
        }
    }

    // ============================================================
    // 5. دوال للطباعة والنسخ الاحتياطي
    // ============================================================

    /**
     * طباعة المحتوى المحدد (باستخدام window.print)
     * @param {string|HTMLElement} element - العنصر المراد طباعته
     * @param {string} title - عنوان الصفحة المطبوعة
     */
    function printElement(element, title = 'نظام الشوكاني') {
        let content;
        if (typeof element === 'string') {
            const el = document.querySelector(element);
            if (!el) {
                showError('العنصر المطلوب غير موجود.');
                return;
            }
            content = el.innerHTML;
        } else if (element instanceof HTMLElement) {
            content = element.innerHTML;
        } else {
            showError('معطى غير صالح للطباعة.');
            return;
        }

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            showError('تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <style>
                    body { padding: 2rem; background: #fff; }
                    .no-print { display: none !important; }
                    @media print {
                        body { padding: 0.5rem; }
                    }
                </style>
            </head>
            <body>
                ${content}
                <script>
                    window.onload = function() { window.print(); }
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    /**
     * تصدير البيانات إلى ملف CSV
     * @param {Array<Object>} data - مصفوفة من الكائنات
     * @param {string} filename - اسم الملف
     * @param {Array<string>} headers - أسماء الأعمدة
     */
    function exportToCSV(data, filename = 'export.csv', headers = null) {
        if (!data || data.length === 0) {
            showWarning('لا توجد بيانات للتصدير.');
            return;
        }

        // إذا لم يتم تحديد العناوين، نأخذها من مفاتيح الكائن الأول
        const keys = headers || Object.keys(data[0]);
        
        // إنشاء صف العناوين
        let csv = keys.join(',') + '\n';
        
        // إنشاء صفوف البيانات
        data.forEach(row => {
            const values = keys.map(key => {
                let value = row[key];
                if (value === null || value === undefined) value = '';
                if (typeof value === 'string' && value.includes(',')) {
                    value = `"${value}"`;
                }
                return value;
            });
            csv += values.join(',') + '\n';
        });

        // إنشاء رابط التحميل
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        showSuccess(`تم تصدير البيانات بنجاح إلى ${filename}`);
    }

    // ============================================================
    // 6. دوال مساعدة للجداول (DataTables)
    // ============================================================

    /**
     * تهيئة جدول DataTables مع إعدادات RTL
     * @param {string} selector - محدد الجدول
     * @param {Object} options - خيارات إضافية
     */
    function initDataTable(selector, options = {}) {
        if (typeof $ === 'undefined') {
            console.warn('⚠️ jQuery غير محمل، تعذر تهيئة DataTable.');
            return null;
        }

        const defaultOptions = {
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.8/i18n/ar.json'
            },
            rtl: true,
            responsive: true,
            pageLength: 25,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, 'الكل']],
            dom: 'Bfrtip',
            buttons: ['copy', 'csv', 'excel', 'pdf', 'print']
        };

        const mergedOptions = { ...defaultOptions, ...options };
        return $(selector).DataTable(mergedOptions);
    }

    // ============================================================
    // 7. التهيئة العامة للتطبيق
    // ============================================================

    /**
     * تهيئة عامة عند تحميل الصفحة
     */
    function initApp() {
        console.log('🚀 بدء تهيئة التطبيق...');
        
        // تعيين التاريخ الحالي في أي عنصر يحمل class="current-date"
        const dateElements = document.querySelectorAll('.current-date');
        if (dateElements.length > 0) {
            const now = new Date();
            const dateStr = formatDateArabic(now);
            dateElements.forEach(el => {
                el.textContent = dateStr;
            });
        }

        // إضافة معالجة لأزرار تسجيل الخروج (class="logout-btn")
        document.querySelectorAll('.logout-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                confirmAction('هل أنت متأكد من رغبتك في تسجيل الخروج؟')
                    .then(confirmed => {
                        if (confirmed) {
                            logout();
                        }
                    });
            });
        });

        console.log('✅ تم تهيئة التطبيق بنجاح.');
    }

    // ============================================================
    // 8. تصدير الدوال العامة للاستخدام في الملفات الأخرى
    // ============================================================

    // تعريض الدوال للنطاق العام (window)
    window.AlShawkani = window.AlShawkani || {};
    const App = {
        // التواريخ
        formatDateArabic,
        formatDateTimeArabic,
        daysDifference,
        isValidDate,
        
        // واجهة المستخدم
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showToast,
        closeToast,
        confirmAction,
        
        // API
        apiGet,
        apiPost,
        apiPut,
        apiDelete,
        
        // الجلسة والصلاحيات
        getSessionInfo,
        hasPermission,
        logout,
        
        // الطباعة والتصدير
        printElement,
        exportToCSV,
        
        // الجداول
        initDataTable,
        
        // التهيئة
        initApp
    };

    // تعريض الكائن للنطاق العام
    window.AlShawkani.App = App;

    // ============================================================
    // 9. تشغيل التهيئة تلقائياً عند تحميل الصفحة
    // ============================================================

    // استخدام DOMContentLoaded لتشغيل التهيئة
    document.addEventListener('DOMContentLoaded', function() {
        // ننتظر قليلاً للتأكد من تحميل كل شيء
        setTimeout(() => {
            initApp();
        }, 100);
    });

    console.log('📦 تم تحميل ملف app.js بنجاح.');
})();