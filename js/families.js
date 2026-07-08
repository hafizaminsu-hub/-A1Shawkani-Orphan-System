/**
 * ============================================================
 * الملف: families.js
 * الوصف: وحدة إدارة الأسر - إضافة، تعديل، حذف، عرض، بحث، تصدير
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
        table: document.getElementById('familiesTable'),
        tableBody: document.getElementById('familiesTableBody'),

        // النموذج (إضافة/تعديل)
        form: document.getElementById('familyForm'),
        formModal: document.getElementById('familyModal'),
        formTitle: document.getElementById('familyFormTitle'),
        formSubmitBtn: document.getElementById('familySubmitBtn'),
        formResetBtn: document.getElementById('familyResetBtn'),

        // حقول النموذج
        familyId: document.getElementById('familyId'),
        familyNumber: document.getElementById('familyNumber'),
        familyName: document.getElementById('familyName'),
        guardianName: document.getElementById('guardianName'),
        guardianPhone: document.getElementById('guardianPhone'),
        guardianPhoneAlt: document.getElementById('guardianPhoneAlt'),
        guardianIdNumber: document.getElementById('guardianIdNumber'),
        address: document.getElementById('address'),
        villageId: document.getElementById('villageId'),
        monthlyIncome: document.getElementById('monthlyIncome'),
        incomeSource: document.getElementById('incomeSource'),
        familyMembersCount: document.getElementById('familyMembersCount'),
        housingType: document.getElementById('housingType'),
        housingCondition: document.getElementById('housingCondition'),
        notes: document.getElementById('familyNotes'),

        // أزرار البحث والتصفية
        searchInput: document.getElementById('searchFamilies'),
        filterVillage: document.getElementById('filterVillage'),

        // أزرار الإجراءات السريعة
        addBtn: document.getElementById('addFamilyBtn'),
        exportBtn: document.getElementById('exportFamiliesBtn'),
        printBtn: document.getElementById('printFamiliesBtn'),
        refreshBtn: document.getElementById('refreshFamiliesBtn')
    };

    // ============================================================
    // 2. متغيرات الحالة
    // ============================================================
    let familiesData = [];
    let dataTable = null;
    let isEditMode = false;

    // ============================================================
    // 3. الدوال الأساسية
    // ============================================================

    /**
     * جلب قائمة الأسر من الخادم
     * @param {Object} filters - معاملات التصفية (اختياري)
     * @returns {Promise<Array>} قائمة الأسر
     */
    async function fetchFamilies(filters = {}) {
        try {
            const response = await fetch('/api/families?' + new URLSearchParams(filters));
            if (!response.ok) throw new Error('فشل في جلب بيانات الأسر');
            const data = await response.json();
            familiesData = data;
            return data;
        } catch (error) {
            console.error('❌ خطأ في جلب الأسر:', error.message);
            window.AlShawkani.App.showError('تعذر جلب بيانات الأسر. يرجى المحاولة مرة أخرى.');
            return [];
        }
    }

    /**
     * عرض الأسر في الجدول (باستخدام DataTables)
     */
    function renderFamiliesTable() {
        if (!DOM.tableBody) return;

        // إذا كان DataTables موجوداً، ندمره ونعيد إنشائه
        if (dataTable) {
            dataTable.destroy();
            dataTable = null;
        }

        // إذا لم توجد بيانات، نعرض رسالة "لا توجد بيانات"
        if (!familiesData || familiesData.length === 0) {
            DOM.tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-4">
                        <i class="fas fa-users fa-2x d-block mb-2 text-muted"></i>
                        <h6 class="text-muted">لا توجد أسر مسجلة</h6>
                        <p class="text-muted small">يمكنك إضافة أسرة جديدة بالضغط على زر "إضافة أسرة"</p>
                    </td>
                </tr>
            `;
            return;
        }

        // بناء صفوف الجدول
        let rows = '';
        familiesData.forEach(family => {
            // تنسيق الدخل الشهري
            const income = family.MonthlyIncome ? 
                `${parseFloat(family.MonthlyIncome).toLocaleString('ar-EG')} ريال` : '—';

            rows += `
                <tr data-id="${family.FamilyID}">
                    <td>${family.FamilyNumber || '—'}</td>
                    <td>
                        <span class="fw-semibold">${family.FamilyName || '—'}</span>
                        <br>
                        <small class="text-muted">${family.GuardianName || '—'}</small>
                    </td>
                    <td>${family.GuardianPhone || '—'}</td>
                    <td>${family.VillageID || '—'}</td>
                    <td>${income}</td>
                    <td>${family.FamilyMembersCount || '—'}</td>
                    <td>${family.HousingType || '—'}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary view-family" data-id="${family.FamilyID}" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-warning edit-family" data-id="${family.FamilyID}" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger delete-family" data-id="${family.FamilyID}" title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        DOM.tableBody.innerHTML = rows;

        // تهيئة DataTables (إذا كان jQuery متاحاً)
        if (typeof $ !== 'undefined' && DOM.table) {
            try {
                dataTable = window.AlShawkani.App.initDataTable('#familiesTable', {
                    order: [[0, 'asc']],
                    columnDefs: [
                        { targets: [7], orderable: false } // العمود الأخير (الإجراءات)
                    ],
                    drawCallback: function() {
                        // إعادة ربط أحداث الأزرار بعد إعادة رسم الجدول
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
        // زر عرض التفاصيل
        document.querySelectorAll('.view-family').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                viewFamily(id);
            });
        });

        // زر تعديل
        document.querySelectorAll('.edit-family').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                editFamily(id);
            });
        });

        // زر حذف
        document.querySelectorAll('.delete-family').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                deleteFamily(id);
            });
        });
    }

    // ============================================================
    // 4. عمليات CRUD الأساسية
    // ============================================================

    /**
     * عرض تفاصيل أسرة
     * @param {number} id - معرف الأسرة
     */
    async function viewFamily(id) {
        try {
            const family = familiesData.find(f => f.FamilyID == id);
            if (!family) {
                window.AlShawkani.App.showWarning('الأسرة غير موجودة');
                return;
            }

            const details = `
                <div dir="rtl" class="p-3">
                    <h5 class="border-bottom pb-2 mb-3">${family.FamilyName}</h5>
                    <div class="row g-2">
                        <div class="col-6"><strong>رقم الأسرة:</strong> ${family.FamilyNumber || '—'}</div>
                        <div class="col-6"><strong>اسم ولي الأمر:</strong> ${family.GuardianName || '—'}</div>
                        <div class="col-6"><strong>هاتف ولي الأمر:</strong> ${family.GuardianPhone || '—'}</div>
                        <div class="col-6"><strong>هاتف بديل:</strong> ${family.GuardianPhoneAlt || '—'}</div>
                        <div class="col-12"><strong>رقم هوية ولي الأمر:</strong> ${family.GuardianIDNumber || '—'}</div>
                        <div class="col-12"><strong>العنوان:</strong> ${family.Address || '—'}</div>
                        <div class="col-6"><strong>القرية:</strong> ${family.VillageID || '—'}</div>
                        <div class="col-6"><strong>الدخل الشهري:</strong> ${family.MonthlyIncome ? parseFloat(family.MonthlyIncome).toLocaleString('ar-EG') + ' ريال' : '—'}</div>
                        <div class="col-6"><strong>مصدر الدخل:</strong> ${family.IncomeSource || '—'}</div>
                        <div class="col-6"><strong>عدد أفراد الأسرة:</strong> ${family.FamilyMembersCount || '—'}</div>
                        <div class="col-6"><strong>نوع السكن:</strong> ${family.HousingType || '—'}</div>
                        <div class="col-6"><strong>حالة السكن:</strong> ${family.HousingCondition || '—'}</div>
                        <div class="col-12"><strong>ملاحظات:</strong> ${family.Notes || '—'}</div>
                    </div>
                </div>
            `;

            window.AlShawkani.App.showInfo(details, 10000);

        } catch (error) {
            console.error('❌ خطأ في عرض التفاصيل:', error.message);
            window.AlShawkani.App.showError('تعذر عرض تفاصيل الأسرة.');
        }
    }

    /**
     * فتح نموذج إضافة أسرة جديدة
     */
    function addFamily() {
        isEditMode = false;
        if (DOM.formTitle) DOM.formTitle.textContent = 'إضافة أسرة جديدة';
        if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'إضافة';
        if (DOM.familyId) DOM.familyId.value = '';
        
        // إعادة تعيين النموذج
        if (DOM.form) DOM.form.reset();
        
        // توليد رقم أسرة تلقائي (يمكن تحسينه لاحقاً)
        if (DOM.familyNumber) {
            const date = new Date();
            const year = date.getFullYear();
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            DOM.familyNumber.value = `FAM-${year}-${random}`;
        }

        // عرض النموذج
        if (DOM.formModal) {
            const modal = new bootstrap.Modal(DOM.formModal);
            modal.show();
        }
    }

    /**
     * فتح نموذج تعديل أسرة موجودة
     * @param {number} id - معرف الأسرة
     */
    async function editFamily(id) {
        try {
            const family = familiesData.find(f => f.FamilyID == id);
            if (!family) {
                window.AlShawkani.App.showWarning('الأسرة غير موجودة');
                return;
            }

            isEditMode = true;
            if (DOM.formTitle) DOM.formTitle.textContent = 'تعديل بيانات الأسرة';
            if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'تحديث';
            
            // ملء الحقول بالبيانات
            fillForm(family);
            
            // عرض النموذج
            if (DOM.formModal) {
                const modal = new bootstrap.Modal(DOM.formModal);
                modal.show();
            }
        } catch (error) {
            console.error('❌ خطأ في فتح التعديل:', error.message);
            window.AlShawkani.App.showError('تعذر فتح بيانات الأسرة للتعديل.');
        }
    }

    /**
     * ملء نموذج التعديل بالبيانات
     * @param {Object} family - بيانات الأسرة
     */
    function fillForm(family) {
        if (DOM.familyId) DOM.familyId.value = family.FamilyID || '';
        if (DOM.familyNumber) DOM.familyNumber.value = family.FamilyNumber || '';
        if (DOM.familyName) DOM.familyName.value = family.FamilyName || '';
        if (DOM.guardianName) DOM.guardianName.value = family.GuardianName || '';
        if (DOM.guardianPhone) DOM.guardianPhone.value = family.GuardianPhone || '';
        if (DOM.guardianPhoneAlt) DOM.guardianPhoneAlt.value = family.GuardianPhoneAlt || '';
        if (DOM.guardianIdNumber) DOM.guardianIdNumber.value = family.GuardianIDNumber || '';
        if (DOM.address) DOM.address.value = family.Address || '';
        if (DOM.villageId) DOM.villageId.value = family.VillageID || '';
        if (DOM.monthlyIncome) DOM.monthlyIncome.value = family.MonthlyIncome || '';
        if (DOM.incomeSource) DOM.incomeSource.value = family.IncomeSource || '';
        if (DOM.familyMembersCount) DOM.familyMembersCount.value = family.FamilyMembersCount || '';
        if (DOM.housingType) DOM.housingType.value = family.HousingType || '';
        if (DOM.housingCondition) DOM.housingCondition.value = family.HousingCondition || '';
        if (DOM.notes) DOM.notes.value = family.Notes || '';
    }

    /**
     * حفظ الأسرة (إضافة أو تحديث)
     */
    async function saveFamily(event) {
        event.preventDefault();

        // جمع البيانات من النموذج
        const formData = new FormData(DOM.form);
        const data = Object.fromEntries(formData.entries());

        // التحقق من الحقول الأساسية
        if (!data.familyName || !data.guardianName || !data.guardianPhone) {
            window.AlShawkani.App.showWarning('يرجى ملء جميع الحقول الأساسية (اسم الأسرة، اسم ولي الأمر، هاتف ولي الأمر).');
            return;
        }

        // تعطيل الزر لمنع النقر المتكرر
        if (DOM.formSubmitBtn) {
            DOM.formSubmitBtn.disabled = true;
            DOM.formSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        }

        try {
            let response;
            const url = isEditMode ? `/api/families/${data.familyId}` : '/api/families';
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
            window.AlShawkani.App.showSuccess(isEditMode ? 'تم تحديث بيانات الأسرة بنجاح' : 'تم إضافة الأسرة بنجاح');

            // إغلاق المودال
            if (DOM.formModal) {
                const modal = bootstrap.Modal.getInstance(DOM.formModal);
                if (modal) modal.hide();
            }

            // إعادة تحميل البيانات
            await loadFamilies();

        } catch (error) {
            console.error('❌ خطأ في حفظ الأسرة:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حفظ البيانات. يرجى المحاولة مرة أخرى.');
        } finally {
            if (DOM.formSubmitBtn) {
                DOM.formSubmitBtn.disabled = false;
                DOM.formSubmitBtn.textContent = isEditMode ? 'تحديث' : 'إضافة';
            }
        }
    }

    /**
     * حذف أسرة
     * @param {number} id - معرف الأسرة
     */
    async function deleteFamily(id) {
        const family = familiesData.find(f => f.FamilyID == id);
        if (!family) return;

        const confirmed = await window.AlShawkani.App.confirmAction(
            `هل أنت متأكد من حذف الأسرة "${family.FamilyName}"؟\nملاحظة: سيتم حذف جميع الأيتام المرتبطين بهذه الأسرة.`,
            'تأكيد الحذف',
            'نعم، حذف',
            'إلغاء'
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`/api/families/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في حذف الأسرة');
            }

            window.AlShawkani.App.showSuccess('تم حذف الأسرة بنجاح');
            await loadFamilies();

        } catch (error) {
            console.error('❌ خطأ في حذف الأسرة:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حذف الأسرة.');
        }
    }

    // ============================================================
    // 5. البحث والتصفية
    // ============================================================

    /**
     * البحث في الأسر وتصفية النتائج
     */
    function filterFamilies() {
        const searchTerm = DOM.searchInput ? DOM.searchInput.value.toLowerCase().trim() : '';
        const villageFilter = DOM.filterVillage ? DOM.filterVillage.value : '';

        let filtered = familiesData;

        if (searchTerm) {
            filtered = filtered.filter(f =>
                (f.FamilyName && f.FamilyName.toLowerCase().includes(searchTerm)) ||
                (f.FamilyNumber && f.FamilyNumber.toLowerCase().includes(searchTerm)) ||
                (f.GuardianName && f.GuardianName.toLowerCase().includes(searchTerm)) ||
                (f.GuardianPhone && f.GuardianPhone.includes(searchTerm))
            );
        }

        if (villageFilter) {
            filtered = filtered.filter(f => f.VillageID == villageFilter);
        }

        // إعادة عرض الجدول مع البيانات المصفاة
        familiesData = filtered;
        renderFamiliesTable();
        // استعادة البيانات الكاملة للاستخدام اللاحق
        // (يتم جلبها من الخادم عند الحاجة)
    }

    // ============================================================
    // 6. تصدير وطباعة
    // ============================================================

    /**
     * تصدير الأسر إلى ملف CSV
     */
    function exportFamilies() {
        if (!familiesData || familiesData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للتصدير.');
            return;
        }

        const headers = ['رقم الأسرة', 'اسم الأسرة', 'اسم ولي الأمر', 'هاتف ولي الأمر', 
            'هاتف بديل', 'رقم هوية ولي الأمر', 'العنوان', 'القرية', 'الدخل الشهري', 
            'مصدر الدخل', 'عدد الأفراد', 'نوع السكن', 'حالة السكن', 'ملاحظات'];

        const data = familiesData.map(f => [
            f.FamilyNumber || '', f.FamilyName || '', f.GuardianName || '', 
            f.GuardianPhone || '', f.GuardianPhoneAlt || '', f.GuardianIDNumber || '', 
            f.Address || '', f.VillageID || '', f.MonthlyIncome || '', 
            f.IncomeSource || '', f.FamilyMembersCount || '', f.HousingType || '', 
            f.HousingCondition || '', f.Notes || ''
        ]);

        window.AlShawkani.App.exportToCSV(data, 'الأسر.csv', headers);
    }

    /**
     * طباعة قائمة الأسر
     */
    function printFamilies() {
        if (!familiesData || familiesData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للطباعة.');
            return;
        }

        const tableHTML = `
            <h3 style="text-align:center; margin-bottom:20px;">قائمة الأسر - نظام الشوكاني</h3>
            <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; text-align:right; font-size:12px;">
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th>رقم الأسرة</th>
                        <th>اسم الأسرة</th>
                        <th>ولي الأمر</th>
                        <th>الهاتف</th>
                        <th>عدد الأفراد</th>
                        <th>الدخل الشهري</th>
                    </tr>
                </thead>
                <tbody>
                    ${familiesData.map(f => `
                        <tr>
                            <td>${f.FamilyNumber || '—'}</td>
                            <td>${f.FamilyName || '—'}</td>
                            <td>${f.GuardianName || '—'}</td>
                            <td>${f.GuardianPhone || '—'}</td>
                            <td>${f.FamilyMembersCount || '—'}</td>
                            <td>${f.MonthlyIncome ? parseFloat(f.MonthlyIncome).toLocaleString('ar-EG') + ' ريال' : '—'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p style="text-align:center; margin-top:20px; font-size:11px; color:#999;">
                تم الطباعة من نظام الشوكاني - تاريخ ${new Date().toLocaleDateString('ar-EG')}
            </p>
        `;

        window.AlShawkani.App.printElement(tableHTML, 'قائمة الأسر');
    }

    // ============================================================
    // 7. ربط الأحداث وتهيئة الوحدة
    // ============================================================

    /**
     * تحميل البيانات وتحديث الجدول
     */
    async function loadFamilies() {
        try {
            const data = await fetchFamilies();
            familiesData = data;
            renderFamiliesTable();
        } catch (error) {
            console.error('❌ خطأ في تحميل الأسر:', error.message);
        }
    }

    /**
     * تهيئة وحدة الأسر
     */
    function initFamiliesModule() {
        console.log('🚀 تهيئة وحدة إدارة الأسر...');

        // التحقق من وجود العناصر الأساسية
        if (!DOM.tableBody) {
            console.warn('⚠️ جدول الأسر غير موجود في الصفحة.');
            return;
        }

        // ============================================================
        // 1. ربط أحداث النموذج
        // ============================================================
        if (DOM.form) {
            DOM.form.addEventListener('submit', saveFamily);
        }

        if (DOM.formResetBtn) {
            DOM.formResetBtn.addEventListener('click', function() {
                if (DOM.form) DOM.form.reset();
                if (DOM.familyId) DOM.familyId.value = '';
                isEditMode = false;
                if (DOM.formTitle) DOM.formTitle.textContent = 'إضافة أسرة جديدة';
                if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'إضافة';
                
                // توليد رقم أسرة جديد
                if (DOM.familyNumber) {
                    const date = new Date();
                    const year = date.getFullYear();
                    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                    DOM.familyNumber.value = `FAM-${year}-${random}`;
                }
            });
        }

        // ============================================================
        // 2. ربط أحداث البحث والتصفية
        // ============================================================
        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', function() {
                filterFamilies();
            });
        }

        if (DOM.filterVillage) {
            DOM.filterVillage.addEventListener('change', function() {
                filterFamilies();
            });
        }

        // ============================================================
        // 3. ربط أزرار الإجراءات السريعة
        // ============================================================
        if (DOM.addBtn) {
            DOM.addBtn.addEventListener('click', addFamily);
        }

        if (DOM.exportBtn) {
            DOM.exportBtn.addEventListener('click', exportFamilies);
        }

        if (DOM.printBtn) {
            DOM.printBtn.addEventListener('click', printFamilies);
        }

        if (DOM.refreshBtn) {
            DOM.refreshBtn.addEventListener('click', loadFamilies);
        }

        // ============================================================
        // 4. تحميل البيانات الأولية
        // ============================================================
        loadFamilies();

        console.log('✅ تم تهيئة وحدة إدارة الأسر بنجاح.');
    }

    // ============================================================
    // 8. تشغيل التهيئة
    // ============================================================

    // تنفيذ التهيئة عند تحميل الصفحة
    document.addEventListener('DOMContentLoaded', function() {
        initFamiliesModule();
    });

})();