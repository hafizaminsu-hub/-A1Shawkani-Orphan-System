/**
 * ============================================================
 * الملف: clothing.js
 * الوصف: وحدة إدارة الكسوة (الملابس) - إضافة، تعديل، حذف، عرض، بحث، تصدير
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
        table: document.getElementById('clothingTable'),
        tableBody: document.getElementById('clothingTableBody'),

        // النموذج (إضافة/تعديل)
        form: document.getElementById('clothingForm'),
        formModal: document.getElementById('clothingModal'),
        formTitle: document.getElementById('clothingFormTitle'),
        formSubmitBtn: document.getElementById('clothingSubmitBtn'),
        formResetBtn: document.getElementById('clothingResetBtn'),

        // حقول النموذج
        clothingId: document.getElementById('clothingId'),
        orphanId: document.getElementById('clothingOrphanId'),
        distributionDate: document.getElementById('distributionDate'),
        season: document.getElementById('season'),
        clothingType: document.getElementById('clothingType'),
        size: document.getElementById('size'),
        color: document.getElementById('color'),
        quantity: document.getElementById('clothingQuantity'),
        unitPrice: document.getElementById('unitPrice'),
        totalPrice: document.getElementById('totalPrice'),
        notes: document.getElementById('clothingNotes'),

        // حقول إضافية للقراءة فقط
        orphanNameDisplay: document.getElementById('clothingOrphanNameDisplay'),

        // أزرار البحث والتصفية
        searchInput: document.getElementById('searchClothing'),
        filterSeason: document.getElementById('filterSeason'),
        filterDateFrom: document.getElementById('filterDateFrom'),
        filterDateTo: document.getElementById('filterDateTo'),

        // أزرار الإجراءات السريعة
        addBtn: document.getElementById('addClothingBtn'),
        exportBtn: document.getElementById('exportClothingBtn'),
        printBtn: document.getElementById('printClothingBtn'),
        refreshBtn: document.getElementById('refreshClothingBtn')
    };

    // ============================================================
    // 2. متغيرات الحالة
    // ============================================================
    let clothingData = [];
    let orphansList = [];
    let dataTable = null;
    let isEditMode = false;

    // ============================================================
    // 3. الدوال الأساسية
    // ============================================================

    /**
     * جلب قائمة الكسوة من الخادم
     * @param {Object} filters - معاملات التصفية (اختياري)
     * @returns {Promise<Array>} قائمة الكسوة
     */
    async function fetchClothing(filters = {}) {
        try {
            const response = await fetch('/api/clothing?' + new URLSearchParams(filters));
            if (!response.ok) throw new Error('فشل في جلب بيانات الكسوة');
            const data = await response.json();
            clothingData = data;
            return data;
        } catch (error) {
            console.error('❌ خطأ في جلب الكسوة:', error.message);
            window.AlShawkani.App.showError('تعذر جلب بيانات الكسوة. يرجى المحاولة مرة أخرى.');
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
     * حساب السعر الإجمالي (الكمية × سعر الوحدة)
     */
    function calculateTotalPrice() {
        const quantity = parseFloat(DOM.quantity ? DOM.quantity.value : 0) || 0;
        const unitPrice = parseFloat(DOM.unitPrice ? DOM.unitPrice.value : 0) || 0;
        const total = quantity * unitPrice;
        if (DOM.totalPrice) {
            DOM.totalPrice.value = total.toFixed(2);
        }
    }

    /**
     * عرض الكسوة في الجدول (باستخدام DataTables)
     */
    function renderClothingTable() {
        if (!DOM.tableBody) return;

        if (dataTable) {
            dataTable.destroy();
            dataTable = null;
        }

        if (!clothingData || clothingData.length === 0) {
            DOM.tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <i class="fas fa-tshirt fa-2x d-block mb-2 text-muted"></i>
                        <h6 class="text-muted">لا توجد كسوة مسجلة</h6>
                        <p class="text-muted small">يمكنك إضافة كسوة جديدة بالضغط على زر "إضافة كسوة"</p>
                    </td>
                </tr>
            `;
            return;
        }

        let rows = '';
        clothingData.forEach(item => {
            const distributionDate = item.DistributionDate ? 
                window.AlShawkani.App.formatDateArabic(item.DistributionDate) : '—';
            const totalPrice = item.TotalPrice ? 
                `${parseFloat(item.TotalPrice).toLocaleString('ar-EG')} ريال` : '—';

            // اسم اليتيم
            const orphan = orphansList.find(o => o.OrphanID == item.OrphanID);
            const orphanName = orphan ? orphan.FullName : (item.OrphanID || '—');

            // تنسيق الموسم مع لون مناسب
            let seasonBadge = '';
            switch (item.Season) {
                case 'صيفي':
                    seasonBadge = '<span class="badge bg-warning text-dark">صيفي</span>';
                    break;
                case 'شتوي':
                    seasonBadge = '<span class="badge bg-info text-white">شتوي</span>';
                    break;
                case 'ربيعي':
                    seasonBadge = '<span class="badge bg-success text-white">ربيعي</span>';
                    break;
                case 'خريفي':
                    seasonBadge = '<span class="badge bg-danger text-white">خريفي</span>';
                    break;
                default:
                    seasonBadge = '<span class="badge bg-secondary">غير محدد</span>';
            }

            rows += `
                <tr data-id="${item.ClothingID}">
                    <td>${orphanName}</td>
                    <td>${distributionDate}</td>
                    <td>${seasonBadge}</td>
                    <td>${item.ClothingType || '—'}</td>
                    <td>${item.Size || '—'}</td>
                    <td>${item.Color || '—'}</td>
                    <td>${item.Quantity || '—'}</td>
                    <td>${totalPrice}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary view-clothing" data-id="${item.ClothingID}" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-warning edit-clothing" data-id="${item.ClothingID}" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger delete-clothing" data-id="${item.ClothingID}" title="حذف">
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
                dataTable = window.AlShawkani.App.initDataTable('#clothingTable', {
                    order: [[1, 'desc']],
                    columnDefs: [
                        { targets: [8], orderable: false }
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
        document.querySelectorAll('.view-clothing').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                viewClothing(id);
            });
        });

        document.querySelectorAll('.edit-clothing').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                editClothing(id);
            });
        });

        document.querySelectorAll('.delete-clothing').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                deleteClothing(id);
            });
        });
    }

    // ============================================================
    // 4. عمليات CRUD الأساسية
    // ============================================================

    /**
     * عرض تفاصيل كسوة
     * @param {number} id - معرف الكسوة
     */
    async function viewClothing(id) {
        try {
            const item = clothingData.find(c => c.ClothingID == id);
            if (!item) {
                window.AlShawkani.App.showWarning('الكسوة غير موجودة');
                return;
            }

            const orphan = orphansList.find(o => o.OrphanID == item.OrphanID);

            const details = `
                <div dir="rtl" class="p-3">
                    <h5 class="border-bottom pb-2 mb-3">تفاصيل الكسوة</h5>
                    <div class="row g-2">
                        <div class="col-6"><strong>معرف الكسوة:</strong> ${item.ClothingID || '—'}</div>
                        <div class="col-6"><strong>اليتيم:</strong> ${orphan ? orphan.FullName : (item.OrphanID || '—')}</div>
                        <div class="col-6"><strong>تاريخ التوزيع:</strong> ${item.DistributionDate ? window.AlShawkani.App.formatDateArabic(item.DistributionDate) : '—'}</div>
                        <div class="col-6"><strong>الموسم:</strong> ${item.Season || '—'}</div>
                        <div class="col-6"><strong>نوع الملابس:</strong> ${item.ClothingType || '—'}</div>
                        <div class="col-6"><strong>المقاس:</strong> ${item.Size || '—'}</div>
                        <div class="col-6"><strong>اللون:</strong> ${item.Color || '—'}</div>
                        <div class="col-6"><strong>الكمية:</strong> ${item.Quantity || '—'}</div>
                        <div class="col-6"><strong>سعر الوحدة:</strong> ${item.UnitPrice ? parseFloat(item.UnitPrice).toLocaleString('ar-EG') + ' ريال' : '—'}</div>
                        <div class="col-6"><strong>السعر الإجمالي:</strong> ${item.TotalPrice ? parseFloat(item.TotalPrice).toLocaleString('ar-EG') + ' ريال' : '—'}</div>
                        <div class="col-12"><strong>ملاحظات:</strong> ${item.Notes || '—'}</div>
                    </div>
                </div>
            `;

            window.AlShawkani.App.showInfo(details, 10000);

        } catch (error) {
            console.error('❌ خطأ في عرض التفاصيل:', error.message);
            window.AlShawkani.App.showError('تعذر عرض تفاصيل الكسوة.');
        }
    }

    /**
     * فتح نموذج إضافة كسوة جديدة
     */
    function addClothing() {
        isEditMode = false;
        if (DOM.formTitle) DOM.formTitle.textContent = 'إضافة كسوة جديدة';
        if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'إضافة';
        if (DOM.clothingId) DOM.clothingId.value = '';
        
        if (DOM.form) DOM.form.reset();
        
        // تعيين تاريخ التوزيع إلى اليوم
        if (DOM.distributionDate) {
            const today = new Date().toISOString().split('T')[0];
            DOM.distributionDate.value = today;
        }

        // تعيين الكمية الافتراضية إلى 1
        if (DOM.quantity) DOM.quantity.value = 1;
        
        // إعادة حساب السعر الإجمالي
        calculateTotalPrice();

        if (DOM.formModal) {
            const modal = new bootstrap.Modal(DOM.formModal);
            modal.show();
        }
    }

    /**
     * فتح نموذج تعديل كسوة موجودة
     * @param {number} id - معرف الكسوة
     */
    async function editClothing(id) {
        try {
            const item = clothingData.find(c => c.ClothingID == id);
            if (!item) {
                window.AlShawkani.App.showWarning('الكسوة غير موجودة');
                return;
            }

            isEditMode = true;
            if (DOM.formTitle) DOM.formTitle.textContent = 'تعديل بيانات الكسوة';
            if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'تحديث';
            
            fillForm(item);
            
            if (DOM.formModal) {
                const modal = new bootstrap.Modal(DOM.formModal);
                modal.show();
            }
        } catch (error) {
            console.error('❌ خطأ في فتح التعديل:', error.message);
            window.AlShawkani.App.showError('تعذر فتح بيانات الكسوة للتعديل.');
        }
    }

    /**
     * ملء نموذج التعديل بالبيانات
     * @param {Object} item - بيانات الكسوة
     */
    function fillForm(item) {
        if (DOM.clothingId) DOM.clothingId.value = item.ClothingID || '';
        if (DOM.orphanId) DOM.orphanId.value = item.OrphanID || '';
        if (DOM.distributionDate) DOM.distributionDate.value = item.DistributionDate || '';
        if (DOM.season) DOM.season.value = item.Season || '';
        if (DOM.clothingType) DOM.clothingType.value = item.ClothingType || '';
        if (DOM.size) DOM.size.value = item.Size || '';
        if (DOM.color) DOM.color.value = item.Color || '';
        if (DOM.quantity) DOM.quantity.value = item.Quantity || '';
        if (DOM.unitPrice) DOM.unitPrice.value = item.UnitPrice || '';
        if (DOM.totalPrice) DOM.totalPrice.value = item.TotalPrice || '';
        if (DOM.notes) DOM.notes.value = item.Notes || '';
        
        // إعادة حساب السعر الإجمالي للتأكد
        calculateTotalPrice();
    }

    /**
     * حفظ الكسوة (إضافة أو تحديث)
     */
    async function saveClothing(event) {
        event.preventDefault();

        const formData = new FormData(DOM.form);
        const data = Object.fromEntries(formData.entries());

        // التحقق من الحقول الأساسية
        if (!data.orphanId || !data.distributionDate || !data.clothingType) {
            window.AlShawkani.App.showWarning('يرجى ملء جميع الحقول الأساسية (اليتيم، تاريخ التوزيع، نوع الملابس).');
            return;
        }

        // التحقق من الكمية
        if (!data.quantity || parseInt(data.quantity) <= 0) {
            window.AlShawkani.App.showWarning('يرجى إدخال كمية صحيحة (أكبر من صفر).');
            return;
        }

        // حساب السعر الإجمالي
        const quantity = parseFloat(data.quantity) || 0;
        const unitPrice = parseFloat(data.unitPrice) || 0;
        data.totalPrice = (quantity * unitPrice).toFixed(2);

        if (DOM.formSubmitBtn) {
            DOM.formSubmitBtn.disabled = true;
            DOM.formSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        }

        try {
            let response;
            const url = isEditMode ? `/api/clothing/${data.clothingId}` : '/api/clothing';
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
            window.AlShawkani.App.showSuccess(isEditMode ? 'تم تحديث الكسوة بنجاح' : 'تم إضافة الكسوة بنجاح');

            if (DOM.formModal) {
                const modal = bootstrap.Modal.getInstance(DOM.formModal);
                if (modal) modal.hide();
            }

            await loadClothing();

        } catch (error) {
            console.error('❌ خطأ في حفظ الكسوة:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حفظ البيانات. يرجى المحاولة مرة أخرى.');
        } finally {
            if (DOM.formSubmitBtn) {
                DOM.formSubmitBtn.disabled = false;
                DOM.formSubmitBtn.textContent = isEditMode ? 'تحديث' : 'إضافة';
            }
        }
    }

    /**
     * حذف كسوة
     * @param {number} id - معرف الكسوة
     */
    async function deleteClothing(id) {
        const item = clothingData.find(c => c.ClothingID == id);
        if (!item) return;

        const confirmed = await window.AlShawkani.App.confirmAction(
            `هل أنت متأكد من حذف الكسوة رقم ${item.ClothingID}؟`,
            'تأكيد الحذف',
            'نعم، حذف',
            'إلغاء'
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`/api/clothing/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في حذف الكسوة');
            }

            window.AlShawkani.App.showSuccess('تم حذف الكسوة بنجاح');
            await loadClothing();

        } catch (error) {
            console.error('❌ خطأ في حذف الكسوة:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حذف الكسوة.');
        }
    }

    // ============================================================
    // 5. البحث والتصفية
    // ============================================================

    function filterClothing() {
        const searchTerm = DOM.searchInput ? DOM.searchInput.value.toLowerCase().trim() : '';
        const seasonFilter = DOM.filterSeason ? DOM.filterSeason.value : '';
        const dateFrom = DOM.filterDateFrom ? DOM.filterDateFrom.value : '';
        const dateTo = DOM.filterDateTo ? DOM.filterDateTo.value : '';

        let filtered = clothingData;

        if (searchTerm) {
            filtered = filtered.filter(c =>
                (c.OrphanID && c.OrphanID.toString().includes(searchTerm)) ||
                (c.ClothingType && c.ClothingType.toLowerCase().includes(searchTerm)) ||
                (c.Size && c.Size.toLowerCase().includes(searchTerm))
            );
        }

        if (seasonFilter) {
            filtered = filtered.filter(c => c.Season === seasonFilter);
        }

        if (dateFrom) {
            filtered = filtered.filter(c => c.DistributionDate && c.DistributionDate >= dateFrom);
        }

        if (dateTo) {
            filtered = filtered.filter(c => c.DistributionDate && c.DistributionDate <= dateTo);
        }

        clothingData = filtered;
        renderClothingTable();
    }

    // ============================================================
    // 6. تصدير وطباعة
    // ============================================================

    function exportClothing() {
        if (!clothingData || clothingData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للتصدير.');
            return;
        }

        const headers = ['معرف الكسوة', 'معرف اليتيم', 'تاريخ التوزيع', 'الموسم', 
            'نوع الملابس', 'المقاس', 'اللون', 'الكمية', 'سعر الوحدة', 'السعر الإجمالي', 'ملاحظات'];

        const data = clothingData.map(c => [
            c.ClothingID || '', c.OrphanID || '', c.DistributionDate || '', c.Season || '', 
            c.ClothingType || '', c.Size || '', c.Color || '', c.Quantity || '', 
            c.UnitPrice || '', c.TotalPrice || '', c.Notes || ''
        ]);

        window.AlShawkani.App.exportToCSV(data, 'الكسوة.csv', headers);
    }

    function printClothing() {
        if (!clothingData || clothingData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للطباعة.');
            return;
        }

        const tableHTML = `
            <h3 style="text-align:center; margin-bottom:20px;">قائمة الكسوة - نظام الشوكاني</h3>
            <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; text-align:right; font-size:12px;">
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th>معرف الكسوة</th>
                        <th>معرف اليتيم</th>
                        <th>تاريخ التوزيع</th>
                        <th>الموسم</th>
                        <th>نوع الملابس</th>
                        <th>الكمية</th>
                        <th>السعر الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${clothingData.map(c => `
                        <tr>
                            <td>${c.ClothingID || '—'}</td>
                            <td>${c.OrphanID || '—'}</td>
                            <td>${c.DistributionDate ? window.AlShawkani.App.formatDateArabic(c.DistributionDate) : '—'}</td>
                            <td>${c.Season || '—'}</td>
                            <td>${c.ClothingType || '—'}</td>
                            <td>${c.Quantity || '—'}</td>
                            <td>${c.TotalPrice ? parseFloat(c.TotalPrice).toLocaleString('ar-EG') + ' ريال' : '—'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p style="text-align:center; margin-top:20px; font-size:11px; color:#999;">
                تم الطباعة من نظام الشوكاني - تاريخ ${new Date().toLocaleDateString('ar-EG')}
            </p>
        `;

        window.AlShawkani.App.printElement(tableHTML, 'قائمة الكسوة');
    }

    // ============================================================
    // 7. ربط الأحداث وتهيئة الوحدة
    // ============================================================

    /**
     * تحميل البيانات وتحديث الجدول
     */
    async function loadClothing() {
        try {
            const data = await fetchClothing();
            clothingData = data;
            renderClothingTable();
        } catch (error) {
            console.error('❌ خطأ في تحميل الكسوة:', error.message);
        }
    }

    /**
     * تهيئة وحدة الكسوة
     */
    function initClothingModule() {
        console.log('🚀 تهيئة وحدة إدارة الكسوة...');

        if (!DOM.tableBody) {
            console.warn('⚠️ جدول الكسوة غير موجود في الصفحة.');
            return;
        }

        // ============================================================
        // 1. ربط أحداث النموذج
        // ============================================================
        if (DOM.form) {
            DOM.form.addEventListener('submit', saveClothing);
        }

        // ربط أحداث حساب السعر الإجمالي
        if (DOM.quantity) {
            DOM.quantity.addEventListener('input', calculateTotalPrice);
        }
        if (DOM.unitPrice) {
            DOM.unitPrice.addEventListener('input', calculateTotalPrice);
        }

        if (DOM.formResetBtn) {
            DOM.formResetBtn.addEventListener('click', function() {
                if (DOM.form) DOM.form.reset();
                if (DOM.clothingId) DOM.clothingId.value = '';
                isEditMode = false;
                if (DOM.formTitle) DOM.formTitle.textContent = 'إضافة كسوة جديدة';
                if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'إضافة';
                
                if (DOM.distributionDate) {
                    const today = new Date().toISOString().split('T')[0];
                    DOM.distributionDate.value = today;
                }
                if (DOM.quantity) DOM.quantity.value = 1;
                calculateTotalPrice();
            });
        }

        // ============================================================
        // 2. ربط أحداث البحث والتصفية
        // ============================================================
        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', function() {
                filterClothing();
            });
        }

        if (DOM.filterSeason) {
            DOM.filterSeason.addEventListener('change', function() {
                filterClothing();
            });
        }

        if (DOM.filterDateFrom) {
            DOM.filterDateFrom.addEventListener('change', function() {
                filterClothing();
            });
        }

        if (DOM.filterDateTo) {
            DOM.filterDateTo.addEventListener('change', function() {
                filterClothing();
            });
        }

        // ============================================================
        // 3. ربط أزرار الإجراءات السريعة
        // ============================================================
        if (DOM.addBtn) {
            DOM.addBtn.addEventListener('click', addClothing);
        }

        if (DOM.exportBtn) {
            DOM.exportBtn.addEventListener('click', exportClothing);
        }

        if (DOM.printBtn) {
            DOM.printBtn.addEventListener('click', printClothing);
        }

        if (DOM.refreshBtn) {
            DOM.refreshBtn.addEventListener('click', loadClothing);
        }

        // ============================================================
        // 4. تحميل البيانات الأولية
        // ============================================================
        Promise.all([
            fetchOrphansList(),
            loadClothing()
        ]).then(() => {
            console.log('✅ تم تهيئة وحدة إدارة الكسوة بنجاح.');
        }).catch(error => {
            console.error('❌ خطأ في التهيئة:', error.message);
        });
    }

    // ============================================================
    // 8. تشغيل التهيئة
    // ============================================================

    document.addEventListener('DOMContentLoaded', function() {
        initClothingModule();
    });

})();