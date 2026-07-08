/**
 * ============================================================
 * الملف: aid.js
 * الوصف: وحدة إدارة المساعدات - إضافة، تعديل، حذف، عرض، بحث، تصدير
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
        table: document.getElementById('aidTable'),
        tableBody: document.getElementById('aidTableBody'),

        // النموذج (إضافة/تعديل)
        form: document.getElementById('aidForm'),
        formModal: document.getElementById('aidModal'),
        formTitle: document.getElementById('aidFormTitle'),
        formSubmitBtn: document.getElementById('aidSubmitBtn'),
        formResetBtn: document.getElementById('aidResetBtn'),

        // حقول النموذج
        aidRecordId: document.getElementById('aidRecordId'),
        orphanId: document.getElementById('aidOrphanId'),
        aidTypeId: document.getElementById('aidTypeId'),
        aidDate: document.getElementById('aidDate'),
        amount: document.getElementById('aidAmount'),
        quantity: document.getElementById('aidQuantity'),
        unit: document.getElementById('aidUnit'),
        description: document.getElementById('aidDescription'),
        distributionMethod: document.getElementById('distributionMethod'),
        recipientName: document.getElementById('recipientName'),
        notes: document.getElementById('aidNotes'),

        // حقول إضافية للقراءة فقط
        orphanNameDisplay: document.getElementById('aidOrphanNameDisplay'),

        // أزرار البحث والتصفية
        searchInput: document.getElementById('searchAid'),
        filterType: document.getElementById('filterAidType'),
        filterDateFrom: document.getElementById('filterDateFrom'),
        filterDateTo: document.getElementById('filterDateTo'),

        // أزرار الإجراءات السريعة
        addBtn: document.getElementById('addAidBtn'),
        exportBtn: document.getElementById('exportAidBtn'),
        printBtn: document.getElementById('printAidBtn'),
        refreshBtn: document.getElementById('refreshAidBtn')
    };

    // ============================================================
    // 2. متغيرات الحالة
    // ============================================================
    let aidData = [];
    let orphansList = [];
    let aidTypesList = [];
    let dataTable = null;
    let isEditMode = false;

    // ============================================================
    // 3. الدوال الأساسية
    // ============================================================

    /**
     * جلب قائمة المساعدات من الخادم
     * @param {Object} filters - معاملات التصفية (اختياري)
     * @returns {Promise<Array>} قائمة المساعدات
     */
    async function fetchAid(filters = {}) {
        try {
            const response = await fetch('/api/aid?' + new URLSearchParams(filters));
            if (!response.ok) throw new Error('فشل في جلب بيانات المساعدات');
            const data = await response.json();
            aidData = data;
            return data;
        } catch (error) {
            console.error('❌ خطأ في جلب المساعدات:', error.message);
            window.AlShawkani.App.showError('تعذر جلب بيانات المساعدات. يرجى المحاولة مرة أخرى.');
            return [];
        }
    }

    /**
     * جلب قائمة الأيتام للقوائم المنسدلة
     */
    async function fetchOrphansList() {
        try {
            const response = await fetch('/api/orphans');
            if (!response.ok) throw new Error('فشل في جلب قائمة الأيتام');
            orphansList = await response.json();
            populateOrphanSelect();
        } catch (error) {
            console.error('❌ خطأ في جلب الأيتام:', error.message);
        }
    }

    /**
     * جلب قائمة أنواع المساعدات للقوائم المنسدلة
     */
    async function fetchAidTypesList() {
        try {
            const response = await fetch('/api/aid-types');
            if (!response.ok) throw new Error('فشل في جلب قائمة أنواع المساعدات');
            aidTypesList = await response.json();
            populateAidTypeSelect();
        } catch (error) {
            console.error('❌ خطأ في جلب أنواع المساعدات:', error.message);
        }
    }

    /**
     * ملء قائمة الأيتام المنسدلة
     */
    function populateOrphanSelect() {
        if (!DOM.orphanId) return;
        
        const emptyOption = DOM.orphanId.querySelector('option[value=""]');
        DOM.orphanId.innerHTML = '';
        if (emptyOption) DOM.orphanId.appendChild(emptyOption);
        
        orphansList.forEach(orphan => {
            const option = document.createElement('option');
            option.value = orphan.OrphanID;
            option.textContent = `${orphan.OrphanCode || ''} - ${orphan.FullName || ''}`;
            DOM.orphanId.appendChild(option);
        });
    }

    /**
     * ملء قائمة أنواع المساعدات المنسدلة
     */
    function populateAidTypeSelect() {
        if (!DOM.aidTypeId) return;
        
        const emptyOption = DOM.aidTypeId.querySelector('option[value=""]');
        DOM.aidTypeId.innerHTML = '';
        if (emptyOption) DOM.aidTypeId.appendChild(emptyOption);
        
        aidTypesList.forEach(type => {
            const option = document.createElement('option');
            option.value = type.AidTypeID;
            option.textContent = `${type.AidName || ''} (${type.AidCategory || ''})`;
            DOM.aidTypeId.appendChild(option);
        });
    }

    /**
     * عرض المساعدات في الجدول (باستخدام DataTables)
     */
    function renderAidTable() {
        if (!DOM.tableBody) return;

        if (dataTable) {
            dataTable.destroy();
            dataTable = null;
        }

        if (!aidData || aidData.length === 0) {
            DOM.tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <i class="fas fa-gift fa-2x d-block mb-2 text-muted"></i>
                        <h6 class="text-muted">لا توجد مساعدات مسجلة</h6>
                        <p class="text-muted small">يمكنك إضافة مساعدة جديدة بالضغط على زر "مساعدة جديدة"</p>
                    </td>
                </tr>
            `;
            return;
        }

        let rows = '';
        aidData.forEach(aid => {
            const aidDate = aid.AidDate ? 
                window.AlShawkani.App.formatDateArabic(aid.AidDate) : '—';
            const amount = aid.Amount ? 
                `${parseFloat(aid.Amount).toLocaleString('ar-EG')} ريال` : '—';
            const quantity = aid.Quantity ? 
                `${aid.Quantity} ${aid.Unit || ''}` : '—';

            // اسم اليتيم
            const orphan = orphansList.find(o => o.OrphanID == aid.OrphanID);
            const orphanName = orphan ? orphan.FullName : (aid.OrphanID || '—');

            // اسم نوع المساعدة
            const aidType = aidTypesList.find(t => t.AidTypeID == aid.AidTypeID);
            const aidTypeName = aidType ? aidType.AidName : (aid.AidTypeID || '—');

            rows += `
                <tr data-id="${aid.AidRecordID}">
                    <td>${orphanName}</td>
                    <td>${aidTypeName}</td>
                    <td>${aidDate}</td>
                    <td>${amount}</td>
                    <td>${quantity}</td>
                    <td>${aid.DistributionMethod || '—'}</td>
                    <td>${aid.RecipientName || '—'}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary view-aid" data-id="${aid.AidRecordID}" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-warning edit-aid" data-id="${aid.AidRecordID}" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger delete-aid" data-id="${aid.AidRecordID}" title="حذف">
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
                dataTable = window.AlShawkani.App.initDataTable('#aidTable', {
                    order: [[2, 'desc']],
                    columnDefs: [
                        { targets: [7], orderable: false }
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
        document.querySelectorAll('.view-aid').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                viewAid(id);
            });
        });

        document.querySelectorAll('.edit-aid').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                editAid(id);
            });
        });

        document.querySelectorAll('.delete-aid').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                deleteAid(id);
            });
        });
    }

    // ============================================================
    // 4. عمليات CRUD الأساسية
    // ============================================================

    /**
     * عرض تفاصيل مساعدة
     * @param {number} id - معرف المساعدة
     */
    async function viewAid(id) {
        try {
            const aid = aidData.find(a => a.AidRecordID == id);
            if (!aid) {
                window.AlShawkani.App.showWarning('المساعدة غير موجودة');
                return;
            }

            const orphan = orphansList.find(o => o.OrphanID == aid.OrphanID);
            const aidType = aidTypesList.find(t => t.AidTypeID == aid.AidTypeID);

            const details = `
                <div dir="rtl" class="p-3">
                    <h5 class="border-bottom pb-2 mb-3">تفاصيل المساعدة</h5>
                    <div class="row g-2">
                        <div class="col-6"><strong>معرف المساعدة:</strong> ${aid.AidRecordID || '—'}</div>
                        <div class="col-6"><strong>اليتيم:</strong> ${orphan ? orphan.FullName : (aid.OrphanID || '—')}</div>
                        <div class="col-6"><strong>نوع المساعدة:</strong> ${aidType ? aidType.AidName : (aid.AidTypeID || '—')}</div>
                        <div class="col-6"><strong>التاريخ:</strong> ${aid.AidDate ? window.AlShawkani.App.formatDateArabic(aid.AidDate) : '—'}</div>
                        <div class="col-6"><strong>المبلغ:</strong> ${aid.Amount ? parseFloat(aid.Amount).toLocaleString('ar-EG') + ' ريال' : '—'}</div>
                        <div class="col-6"><strong>الكمية:</strong> ${aid.Quantity ? aid.Quantity + ' ' + (aid.Unit || '') : '—'}</div>
                        <div class="col-12"><strong>الوصف:</strong> ${aid.Description || '—'}</div>
                        <div class="col-6"><strong>طريقة التوزيع:</strong> ${aid.DistributionMethod || '—'}</div>
                        <div class="col-6"><strong>اسم المستلم:</strong> ${aid.RecipientName || '—'}</div>
                        <div class="col-12"><strong>ملاحظات:</strong> ${aid.Notes || '—'}</div>
                    </div>
                </div>
            `;

            window.AlShawkani.App.showInfo(details, 10000);

        } catch (error) {
            console.error('❌ خطأ في عرض التفاصيل:', error.message);
            window.AlShawkani.App.showError('تعذر عرض تفاصيل المساعدة.');
        }
    }

    /**
     * فتح نموذج إضافة مساعدة جديدة
     */
    function addAid() {
        isEditMode = false;
        if (DOM.formTitle) DOM.formTitle.textContent = 'إضافة مساعدة جديدة';
        if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'إضافة';
        if (DOM.aidRecordId) DOM.aidRecordId.value = '';
        
        if (DOM.form) DOM.form.reset();
        
        // تعيين التاريخ إلى اليوم
        if (DOM.aidDate) {
            const today = new Date().toISOString().split('T')[0];
            DOM.aidDate.value = today;
        }

        if (DOM.formModal) {
            const modal = new bootstrap.Modal(DOM.formModal);
            modal.show();
        }
    }

    /**
     * فتح نموذج تعديل مساعدة موجودة
     * @param {number} id - معرف المساعدة
     */
    async function editAid(id) {
        try {
            const aid = aidData.find(a => a.AidRecordID == id);
            if (!aid) {
                window.AlShawkani.App.showWarning('المساعدة غير موجودة');
                return;
            }

            isEditMode = true;
            if (DOM.formTitle) DOM.formTitle.textContent = 'تعديل بيانات المساعدة';
            if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'تحديث';
            
            fillForm(aid);
            
            if (DOM.formModal) {
                const modal = new bootstrap.Modal(DOM.formModal);
                modal.show();
            }
        } catch (error) {
            console.error('❌ خطأ في فتح التعديل:', error.message);
            window.AlShawkani.App.showError('تعذر فتح بيانات المساعدة للتعديل.');
        }
    }

    /**
     * ملء نموذج التعديل بالبيانات
     * @param {Object} aid - بيانات المساعدة
     */
    function fillForm(aid) {
        if (DOM.aidRecordId) DOM.aidRecordId.value = aid.AidRecordID || '';
        if (DOM.orphanId) DOM.orphanId.value = aid.OrphanID || '';
        if (DOM.aidTypeId) DOM.aidTypeId.value = aid.AidTypeID || '';
        if (DOM.aidDate) DOM.aidDate.value = aid.AidDate || '';
        if (DOM.amount) DOM.amount.value = aid.Amount || '';
        if (DOM.quantity) DOM.quantity.value = aid.Quantity || '';
        if (DOM.unit) DOM.unit.value = aid.Unit || '';
        if (DOM.description) DOM.description.value = aid.Description || '';
        if (DOM.distributionMethod) DOM.distributionMethod.value = aid.DistributionMethod || '';
        if (DOM.recipientName) DOM.recipientName.value = aid.RecipientName || '';
        if (DOM.notes) DOM.notes.value = aid.Notes || '';
    }

    /**
     * حفظ المساعدة (إضافة أو تحديث)
     */
    async function saveAid(event) {
        event.preventDefault();

        const formData = new FormData(DOM.form);
        const data = Object.fromEntries(formData.entries());

        // التحقق من الحقول الأساسية
        if (!data.orphanId || !data.aidTypeId || !data.aidDate) {
            window.AlShawkani.App.showWarning('يرجى ملء جميع الحقول الأساسية (اليتيم، نوع المساعدة، التاريخ).');
            return;
        }

        // التأكد من وجود مبلغ أو كمية
        if (!data.amount && !data.quantity) {
            window.AlShawkani.App.showWarning('يرجى إدخال المبلغ أو الكمية للمساعدة.');
            return;
        }

        if (DOM.formSubmitBtn) {
            DOM.formSubmitBtn.disabled = true;
            DOM.formSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        }

        try {
            let response;
            const url = isEditMode ? `/api/aid/${data.aidRecordId}` : '/api/aid';
            const method = isEditMode ? 'PUT' : 'POST';

            response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في حفظ البيانات');
            }

            const result = await response.json();
            window.AlShawkani.App.showSuccess(isEditMode ? 'تم تحديث المساعدة بنجاح' : 'تم إضافة المساعدة بنجاح');

            if (DOM.formModal) {
                const modal = bootstrap.Modal.getInstance(DOM.formModal);
                if (modal) modal.hide();
            }

            await loadAid();

        } catch (error) {
            console.error('❌ خطأ في حفظ المساعدة:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حفظ البيانات. يرجى المحاولة مرة أخرى.');
        } finally {
            if (DOM.formSubmitBtn) {
                DOM.formSubmitBtn.disabled = false;
                DOM.formSubmitBtn.textContent = isEditMode ? 'تحديث' : 'إضافة';
            }
        }
    }

    /**
     * حذف مساعدة
     * @param {number} id - معرف المساعدة
     */
    async function deleteAid(id) {
        const aid = aidData.find(a => a.AidRecordID == id);
        if (!aid) return;

        const confirmed = await window.AlShawkani.App.confirmAction(
            `هل أنت متأكد من حذف المساعدة رقم ${aid.AidRecordID}؟`,
            'تأكيد الحذف',
            'نعم، حذف',
            'إلغاء'
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`/api/aid/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في حذف المساعدة');
            }

            window.AlShawkani.App.showSuccess('تم حذف المساعدة بنجاح');
            await loadAid();

        } catch (error) {
            console.error('❌ خطأ في حذف المساعدة:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حذف المساعدة.');
        }
    }

    // ============================================================
    // 5. البحث والتصفية
    // ============================================================

    function filterAid() {
        const searchTerm = DOM.searchInput ? DOM.searchInput.value.toLowerCase().trim() : '';
        const typeFilter = DOM.filterType ? DOM.filterType.value : '';
        const dateFrom = DOM.filterDateFrom ? DOM.filterDateFrom.value : '';
        const dateTo = DOM.filterDateTo ? DOM.filterDateTo.value : '';

        let filtered = aidData;

        if (searchTerm) {
            filtered = filtered.filter(a =>
                (a.OrphanID && a.OrphanID.toString().includes(searchTerm)) ||
                (a.AidTypeID && a.AidTypeID.toString().includes(searchTerm)) ||
                (a.RecipientName && a.RecipientName.toLowerCase().includes(searchTerm))
            );
        }

        if (typeFilter) {
            filtered = filtered.filter(a => a.AidTypeID == typeFilter);
        }

        if (dateFrom) {
            filtered = filtered.filter(a => a.AidDate && a.AidDate >= dateFrom);
        }

        if (dateTo) {
            filtered = filtered.filter(a => a.AidDate && a.AidDate <= dateTo);
        }

        aidData = filtered;
        renderAidTable();
    }

    // ============================================================
    // 6. تصدير وطباعة
    // ============================================================

    function exportAid() {
        if (!aidData || aidData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للتصدير.');
            return;
        }

        const headers = ['معرف المساعدة', 'معرف اليتيم', 'نوع المساعدة', 'التاريخ', 
            'المبلغ', 'الكمية', 'الوحدة', 'الوصف', 'طريقة التوزيع', 'اسم المستلم', 'ملاحظات'];

        const data = aidData.map(a => [
            a.AidRecordID || '', a.OrphanID || '', a.AidTypeID || '', a.AidDate || '', 
            a.Amount || '', a.Quantity || '', a.Unit || '', a.Description || '', 
            a.DistributionMethod || '', a.RecipientName || '', a.Notes || ''
        ]);

        window.AlShawkani.App.exportToCSV(data, 'المساعدات.csv', headers);
    }

    function printAid() {
        if (!aidData || aidData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للطباعة.');
            return;
        }

        const tableHTML = `
            <h3 style="text-align:center; margin-bottom:20px;">قائمة المساعدات - نظام الشوكاني</h3>
            <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; text-align:right; font-size:12px;">
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th>معرف المساعدة</th>
                        <th>معرف اليتيم</th>
                        <th>التاريخ</th>
                        <th>المبلغ</th>
                        <th>الكمية</th>
                        <th>طريقة التوزيع</th>
                    </tr>
                </thead>
                <tbody>
                    ${aidData.map(a => `
                        <tr>
                            <td>${a.AidRecordID || '—'}</td>
                            <td>${a.OrphanID || '—'}</td>
                            <td>${a.AidDate ? window.AlShawkani.App.formatDateArabic(a.AidDate) : '—'}</td>
                            <td>${a.Amount ? parseFloat(a.Amount).toLocaleString('ar-EG') + ' ريال' : '—'}</td>
                            <td>${a.Quantity ? a.Quantity + ' ' + (a.Unit || '') : '—'}</td>
                            <td>${a.DistributionMethod || '—'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p style="text-align:center; margin-top:20px; font-size:11px; color:#999;">
                تم الطباعة من نظام الشوكاني - تاريخ ${new Date().toLocaleDateString('ar-EG')}
            </p>
        `;

        window.AlShawkani.App.printElement(tableHTML, 'قائمة المساعدات');
    }

    // ============================================================
    // 7. ربط الأحداث وتهيئة الوحدة
    // ============================================================

    /**
     * تحميل البيانات وتحديث الجدول
     */
    async function loadAid() {
        try {
            const data = await fetchAid();
            aidData = data;
            renderAidTable();
        } catch (error) {
            console.error('❌ خطأ في تحميل المساعدات:', error.message);
        }
    }

    /**
     * تهيئة وحدة المساعدات
     */
    function initAidModule() {
        console.log('🚀 تهيئة وحدة إدارة المساعدات...');

        if (!DOM.tableBody) {
            console.warn('⚠️ جدول المساعدات غير موجود في الصفحة.');
            return;
        }

        // ============================================================
        // 1. ربط أحداث النموذج
        // ============================================================
        if (DOM.form) {
            DOM.form.addEventListener('submit', saveAid);
        }

        if (DOM.formResetBtn) {
            DOM.formResetBtn.addEventListener('click', function() {
                if (DOM.form) DOM.form.reset();
                if (DOM.aidRecordId) DOM.aidRecordId.value = '';
                isEditMode = false;
                if (DOM.formTitle) DOM.formTitle.textContent = 'إضافة مساعدة جديدة';
                if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'إضافة';
                
                if (DOM.aidDate) {
                    const today = new Date().toISOString().split('T')[0];
                    DOM.aidDate.value = today;
                }
            });
        }

        // ============================================================
        // 2. ربط أحداث البحث والتصفية
        // ============================================================
        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', function() {
                filterAid();
            });
        }

        if (DOM.filterType) {
            DOM.filterType.addEventListener('change', function() {
                filterAid();
            });
        }

        if (DOM.filterDateFrom) {
            DOM.filterDateFrom.addEventListener('change', function() {
                filterAid();
            });
        }

        if (DOM.filterDateTo) {
            DOM.filterDateTo.addEventListener('change', function() {
                filterAid();
            });
        }

        // ============================================================
        // 3. ربط أزرار الإجراءات السريعة
        // ============================================================
        if (DOM.addBtn) {
            DOM.addBtn.addEventListener('click', addAid);
        }

        if (DOM.exportBtn) {
            DOM.exportBtn.addEventListener('click', exportAid);
        }

        if (DOM.printBtn) {
            DOM.printBtn.addEventListener('click', printAid);
        }

        if (DOM.refreshBtn) {
            DOM.refreshBtn.addEventListener('click', loadAid);
        }

        // ============================================================
        // 4. تحميل البيانات الأولية
        // ============================================================
        Promise.all([
            fetchOrphansList(),
            fetchAidTypesList(),
            loadAid()
        ]).then(() => {
            console.log('✅ تم تهيئة وحدة إدارة المساعدات بنجاح.');
        }).catch(error => {
            console.error('❌ خطأ في التهيئة:', error.message);
        });
    }

    // ============================================================
    // 8. تشغيل التهيئة
    // ============================================================

    document.addEventListener('DOMContentLoaded', function() {
        initAidModule();
    });

})();