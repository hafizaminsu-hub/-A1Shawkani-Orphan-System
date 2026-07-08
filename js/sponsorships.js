/**
 * ============================================================
 * الملف: sponsorships.js
 * الوصف: وحدة إدارة الكفالات - إضافة، تعديل، حذف، عرض، بحث، تصدير
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
        table: document.getElementById('sponsorshipsTable'),
        tableBody: document.getElementById('sponsorshipsTableBody'),

        // النموذج (إضافة/تعديل)
        form: document.getElementById('sponsorshipForm'),
        formModal: document.getElementById('sponsorshipModal'),
        formTitle: document.getElementById('sponsorshipFormTitle'),
        formSubmitBtn: document.getElementById('sponsorshipSubmitBtn'),
        formResetBtn: document.getElementById('sponsorshipResetBtn'),

        // حقول النموذج
        sponsorshipId: document.getElementById('sponsorshipId'),
        orphanId: document.getElementById('orphanId'),
        sponsorId: document.getElementById('sponsorId'),
        startDate: document.getElementById('startDate'),
        endDate: document.getElementById('endDate'),
        monthlyAmount: document.getElementById('monthlyAmount'),
        paymentCurrency: document.getElementById('paymentCurrency'),
        paymentMethod: document.getElementById('paymentMethod'),
        sponsorshipType: document.getElementById('sponsorshipType'),
        status: document.getElementById('status'),
        notes: document.getElementById('sponsorshipNotes'),

        // حقول اختيارية (للقراءة فقط)
        orphanNameDisplay: document.getElementById('orphanNameDisplay'),
        sponsorNameDisplay: document.getElementById('sponsorNameDisplay'),

        // أزرار البحث والتصفية
        searchInput: document.getElementById('searchSponsorships'),
        filterStatus: document.getElementById('filterStatus'),
        filterSponsor: document.getElementById('filterSponsor'),

        // أزرار الإجراءات السريعة
        addBtn: document.getElementById('addSponsorshipBtn'),
        exportBtn: document.getElementById('exportSponsorshipsBtn'),
        printBtn: document.getElementById('printSponsorshipsBtn'),
        refreshBtn: document.getElementById('refreshSponsorshipsBtn')
    };

    // ============================================================
    // 2. متغيرات الحالة
    // ============================================================
    let sponsorshipsData = [];
    let orphansList = [];
    let sponsorsList = [];
    let dataTable = null;
    let isEditMode = false;

    // ============================================================
    // 3. الدوال الأساسية
    // ============================================================

    /**
     * جلب قائمة الكفالات من الخادم
     * @param {Object} filters - معاملات التصفية (اختياري)
     * @returns {Promise<Array>} قائمة الكفالات
     */
    async function fetchSponsorships(filters = {}) {
        try {
            const response = await fetch('/api/sponsorships?' + new URLSearchParams(filters));
            if (!response.ok) throw new Error('فشل في جلب بيانات الكفالات');
            const data = await response.json();
            sponsorshipsData = data;
            return data;
        } catch (error) {
            console.error('❌ خطأ في جلب الكفالات:', error.message);
            window.AlShawkani.App.showError('تعذر جلب بيانات الكفالات. يرجى المحاولة مرة أخرى.');
            return [];
        }
    }

    /**
     * جلب قائمة الأيتام للقوائم المنسدلة
     */
    async function fetchOrphansList() {
        try {
            const response = await fetch('/api/orphans?status=نشط');
            if (!response.ok) throw new Error('فشل في جلب قائمة الأيتام');
            orphansList = await response.json();
            populateOrphanSelect();
        } catch (error) {
            console.error('❌ خطأ في جلب الأيتام:', error.message);
        }
    }

    /**
     * جلب قائمة الكفلاء للقوائم المنسدلة
     */
    async function fetchSponsorsList() {
        try {
            const response = await fetch('/api/sponsors?active=1');
            if (!response.ok) throw new Error('فشل في جلب قائمة الكفلاء');
            sponsorsList = await response.json();
            populateSponsorSelect();
        } catch (error) {
            console.error('❌ خطأ في جلب الكفلاء:', error.message);
        }
    }

    /**
     * ملء قائمة الأيتام المنسدلة
     */
    function populateOrphanSelect() {
        if (!DOM.orphanId) return;
        
        // الاحتفاظ بالخيار الفارغ
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
     * ملء قائمة الكفلاء المنسدلة
     */
    function populateSponsorSelect() {
        if (!DOM.sponsorId) return;
        
        const emptyOption = DOM.sponsorId.querySelector('option[value=""]');
        DOM.sponsorId.innerHTML = '';
        if (emptyOption) DOM.sponsorId.appendChild(emptyOption);
        
        sponsorsList.forEach(sponsor => {
            const option = document.createElement('option');
            option.value = sponsor.SponsorID;
            option.textContent = `${sponsor.SponsorCode || ''} - ${sponsor.FullName || ''}`;
            DOM.sponsorId.appendChild(option);
        });
    }

    /**
     * عرض الكفالات في الجدول (باستخدام DataTables)
     */
    function renderSponsorshipsTable() {
        if (!DOM.tableBody) return;

        if (dataTable) {
            dataTable.destroy();
            dataTable = null;
        }

        if (!sponsorshipsData || sponsorshipsData.length === 0) {
            DOM.tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <i class="fas fa-hand-holding-heart fa-2x d-block mb-2 text-muted"></i>
                        <h6 class="text-muted">لا توجد كفالات مسجلة</h6>
                        <p class="text-muted small">يمكنك إضافة كفالة جديدة بالضغط على زر "كفالة جديدة"</p>
                    </td>
                </tr>
            `;
            return;
        }

        let rows = '';
        sponsorshipsData.forEach(sp => {
            const startDate = sp.StartDate ? 
                window.AlShawkani.App.formatDateArabic(sp.StartDate) : '—';
            const endDate = sp.EndDate ? 
                window.AlShawkani.App.formatDateArabic(sp.EndDate) : '—';
            const amount = sp.MonthlyAmount ? 
                `${parseFloat(sp.MonthlyAmount).toLocaleString('ar-EG')} ${sp.PaymentCurrency || 'YER'}` : '—';

            let statusBadge = '';
            switch (sp.Status) {
                case 'نشطة':
                    statusBadge = '<span class="badge bg-success">نشطة</span>';
                    break;
                case 'موقفة':
                    statusBadge = '<span class="badge bg-warning text-dark">موقفة</span>';
                    break;
                case 'منتهية':
                    statusBadge = '<span class="badge bg-danger">منتهية</span>';
                    break;
                default:
                    statusBadge = '<span class="badge bg-secondary">غير محدد</span>';
            }

            rows += `
                <tr data-id="${sp.SponsorshipID}">
                    <td>${sp.OrphanID || '—'}</td>
                    <td>${sp.SponsorID || '—'}</td>
                    <td>${startDate}</td>
                    <td>${endDate}</td>
                    <td class="fw-bold">${amount}</td>
                    <td>${sp.PaymentMethod || '—'}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary view-sponsorship" data-id="${sp.SponsorshipID}" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-warning edit-sponsorship" data-id="${sp.SponsorshipID}" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger delete-sponsorship" data-id="${sp.SponsorshipID}" title="حذف">
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
                dataTable = window.AlShawkani.App.initDataTable('#sponsorshipsTable', {
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
        document.querySelectorAll('.view-sponsorship').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                viewSponsorship(id);
            });
        });

        document.querySelectorAll('.edit-sponsorship').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                editSponsorship(id);
            });
        });

        document.querySelectorAll('.delete-sponsorship').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                deleteSponsorship(id);
            });
        });
    }

    // ============================================================
    // 4. عمليات CRUD الأساسية
    // ============================================================

    /**
     * عرض تفاصيل كفالة
     * @param {number} id - معرف الكفالة
     */
    async function viewSponsorship(id) {
        try {
            const sponsorship = sponsorshipsData.find(s => s.SponsorshipID == id);
            if (!sponsorship) {
                window.AlShawkani.App.showWarning('الكفالة غير موجودة');
                return;
            }

            // جلب اسم اليتيم والكفيل (إذا كانت البيانات متاحة)
            const orphan = orphansList.find(o => o.OrphanID == sponsorship.OrphanID);
            const sponsor = sponsorsList.find(s => s.SponsorID == sponsorship.SponsorID);

            const details = `
                <div dir="rtl" class="p-3">
                    <h5 class="border-bottom pb-2 mb-3">تفاصيل الكفالة</h5>
                    <div class="row g-2">
                        <div class="col-6"><strong>معرف الكفالة:</strong> ${sponsorship.SponsorshipID || '—'}</div>
                        <div class="col-6"><strong>اليتيم:</strong> ${orphan ? orphan.FullName : (sponsorship.OrphanID || '—')}</div>
                        <div class="col-6"><strong>الكفيل:</strong> ${sponsor ? sponsor.FullName : (sponsorship.SponsorID || '—')}</div>
                        <div class="col-6"><strong>تاريخ البدء:</strong> ${sponsorship.StartDate ? window.AlShawkani.App.formatDateArabic(sponsorship.StartDate) : '—'}</div>
                        <div class="col-6"><strong>تاريخ الانتهاء:</strong> ${sponsorship.EndDate ? window.AlShawkani.App.formatDateArabic(sponsorship.EndDate) : '—'}</div>
                        <div class="col-6"><strong>المبلغ الشهري:</strong> ${sponsorship.MonthlyAmount ? parseFloat(sponsorship.MonthlyAmount).toLocaleString('ar-EG') + ' ' + (sponsorship.PaymentCurrency || 'YER') : '—'}</div>
                        <div class="col-6"><strong>طريقة الدفع:</strong> ${sponsorship.PaymentMethod || '—'}</div>
                        <div class="col-6"><strong>نوع الكفالة:</strong> ${sponsorship.SponsorshipType || '—'}</div>
                        <div class="col-6"><strong>الحالة:</strong> ${sponsorship.Status || '—'}</div>
                        <div class="col-12"><strong>ملاحظات:</strong> ${sponsorship.Notes || '—'}</div>
                    </div>
                </div>
            `;

            window.AlShawkani.App.showInfo(details, 10000);

        } catch (error) {
            console.error('❌ خطأ في عرض التفاصيل:', error.message);
            window.AlShawkani.App.showError('تعذر عرض تفاصيل الكفالة.');
        }
    }

    /**
     * فتح نموذج إضافة كفالة جديدة
     */
    function addSponsorship() {
        isEditMode = false;
        if (DOM.formTitle) DOM.formTitle.textContent = 'إضافة كفالة جديدة';
        if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'إضافة';
        if (DOM.sponsorshipId) DOM.sponsorshipId.value = '';
        
        if (DOM.form) DOM.form.reset();
        
        // تعيين تاريخ البدء إلى اليوم
        if (DOM.startDate) {
            const today = new Date().toISOString().split('T')[0];
            DOM.startDate.value = today;
        }

        // تعيين الحالة الافتراضية إلى "نشطة"
        if (DOM.status) DOM.status.value = 'نشطة';

        if (DOM.formModal) {
            const modal = new bootstrap.Modal(DOM.formModal);
            modal.show();
        }
    }

    /**
     * فتح نموذج تعديل كفالة موجودة
     * @param {number} id - معرف الكفالة
     */
    async function editSponsorship(id) {
        try {
            const sponsorship = sponsorshipsData.find(s => s.SponsorshipID == id);
            if (!sponsorship) {
                window.AlShawkani.App.showWarning('الكفالة غير موجودة');
                return;
            }

            isEditMode = true;
            if (DOM.formTitle) DOM.formTitle.textContent = 'تعديل بيانات الكفالة';
            if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'تحديث';
            
            fillForm(sponsorship);
            
            if (DOM.formModal) {
                const modal = new bootstrap.Modal(DOM.formModal);
                modal.show();
            }
        } catch (error) {
            console.error('❌ خطأ في فتح التعديل:', error.message);
            window.AlShawkani.App.showError('تعذر فتح بيانات الكفالة للتعديل.');
        }
    }

    /**
     * ملء نموذج التعديل بالبيانات
     * @param {Object} sponsorship - بيانات الكفالة
     */
    function fillForm(sponsorship) {
        if (DOM.sponsorshipId) DOM.sponsorshipId.value = sponsorship.SponsorshipID || '';
        if (DOM.orphanId) DOM.orphanId.value = sponsorship.OrphanID || '';
        if (DOM.sponsorId) DOM.sponsorId.value = sponsorship.SponsorID || '';
        if (DOM.startDate) DOM.startDate.value = sponsorship.StartDate || '';
        if (DOM.endDate) DOM.endDate.value = sponsorship.EndDate || '';
        if (DOM.monthlyAmount) DOM.monthlyAmount.value = sponsorship.MonthlyAmount || '';
        if (DOM.paymentCurrency) DOM.paymentCurrency.value = sponsorship.PaymentCurrency || '';
        if (DOM.paymentMethod) DOM.paymentMethod.value = sponsorship.PaymentMethod || '';
        if (DOM.sponsorshipType) DOM.sponsorshipType.value = sponsorship.SponsorshipType || '';
        if (DOM.status) DOM.status.value = sponsorship.Status || '';
        if (DOM.notes) DOM.notes.value = sponsorship.Notes || '';
    }

    /**
     * حفظ الكفالة (إضافة أو تحديث)
     */
    async function saveSponsorship(event) {
        event.preventDefault();

        const formData = new FormData(DOM.form);
        const data = Object.fromEntries(formData.entries());

        // التحقق من الحقول الأساسية
        if (!data.orphanId || !data.sponsorId || !data.startDate || !data.monthlyAmount) {
            window.AlShawkani.App.showWarning('يرجى ملء جميع الحقول الأساسية (اليتيم، الكفيل، تاريخ البدء، المبلغ الشهري).');
            return;
        }

        if (DOM.formSubmitBtn) {
            DOM.formSubmitBtn.disabled = true;
            DOM.formSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        }

        try {
            let response;
            const url = isEditMode ? `/api/sponsorships/${data.sponsorshipId}` : '/api/sponsorships';
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
            window.AlShawkani.App.showSuccess(isEditMode ? 'تم تحديث الكفالة بنجاح' : 'تم إضافة الكفالة بنجاح');

            if (DOM.formModal) {
                const modal = bootstrap.Modal.getInstance(DOM.formModal);
                if (modal) modal.hide();
            }

            await loadSponsorships();

        } catch (error) {
            console.error('❌ خطأ في حفظ الكفالة:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حفظ البيانات. يرجى المحاولة مرة أخرى.');
        } finally {
            if (DOM.formSubmitBtn) {
                DOM.formSubmitBtn.disabled = false;
                DOM.formSubmitBtn.textContent = isEditMode ? 'تحديث' : 'إضافة';
            }
        }
    }

    /**
     * حذف كفالة
     * @param {number} id - معرف الكفالة
     */
    async function deleteSponsorship(id) {
        const sponsorship = sponsorshipsData.find(s => s.SponsorshipID == id);
        if (!sponsorship) return;

        const confirmed = await window.AlShawkani.App.confirmAction(
            `هل أنت متأكد من حذف الكفالة رقم ${sponsorship.SponsorshipID}؟`,
            'تأكيد الحذف',
            'نعم، حذف',
            'إلغاء'
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`/api/sponsorships/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في حذف الكفالة');
            }

            window.AlShawkani.App.showSuccess('تم حذف الكفالة بنجاح');
            await loadSponsorships();

        } catch (error) {
            console.error('❌ خطأ في حذف الكفالة:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حذف الكفالة.');
        }
    }

    // ============================================================
    // 5. البحث والتصفية
    // ============================================================

    function filterSponsorships() {
        const searchTerm = DOM.searchInput ? DOM.searchInput.value.toLowerCase().trim() : '';
        const statusFilter = DOM.filterStatus ? DOM.filterStatus.value : '';
        const sponsorFilter = DOM.filterSponsor ? DOM.filterSponsor.value : '';

        let filtered = sponsorshipsData;

        if (searchTerm) {
            filtered = filtered.filter(s =>
                (s.OrphanID && s.OrphanID.toString().includes(searchTerm)) ||
                (s.SponsorID && s.SponsorID.toString().includes(searchTerm))
            );
        }

        if (statusFilter) {
            filtered = filtered.filter(s => s.Status === statusFilter);
        }

        if (sponsorFilter) {
            filtered = filtered.filter(s => s.SponsorID == sponsorFilter);
        }

        sponsorshipsData = filtered;
        renderSponsorshipsTable();
    }

    // ============================================================
    // 6. تصدير وطباعة
    // ============================================================

    function exportSponsorships() {
        if (!sponsorshipsData || sponsorshipsData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للتصدير.');
            return;
        }

        const headers = ['معرف الكفالة', 'معرف اليتيم', 'معرف الكفيل', 'تاريخ البدء', 
            'تاريخ الانتهاء', 'المبلغ الشهري', 'العملة', 'طريقة الدفع', 'نوع الكفالة', 'الحالة', 'ملاحظات'];

        const data = sponsorshipsData.map(s => [
            s.SponsorshipID || '', s.OrphanID || '', s.SponsorID || '', s.StartDate || '', 
            s.EndDate || '', s.MonthlyAmount || '', s.PaymentCurrency || '', s.PaymentMethod || '', 
            s.SponsorshipType || '', s.Status || '', s.Notes || ''
        ]);

        window.AlShawkani.App.exportToCSV(data, 'الكفالات.csv', headers);
    }

    function printSponsorships() {
        if (!sponsorshipsData || sponsorshipsData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للطباعة.');
            return;
        }

        const tableHTML = `
            <h3 style="text-align:center; margin-bottom:20px;">قائمة الكفالات - نظام الشوكاني</h3>
            <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; text-align:right; font-size:12px;">
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th>معرف الكفالة</th>
                        <th>معرف اليتيم</th>
                        <th>معرف الكفيل</th>
                        <th>تاريخ البدء</th>
                        <th>المبلغ الشهري</th>
                        <th>الحالة</th>
                    </tr>
                </thead>
                <tbody>
                    ${sponsorshipsData.map(s => `
                        <tr>
                            <td>${s.SponsorshipID || '—'}</td>
                            <td>${s.OrphanID || '—'}</td>
                            <td>${s.SponsorID || '—'}</td>
                            <td>${s.StartDate ? window.AlShawkani.App.formatDateArabic(s.StartDate) : '—'}</td>
                            <td>${s.MonthlyAmount ? parseFloat(s.MonthlyAmount).toLocaleString('ar-EG') + ' ' + (s.PaymentCurrency || 'YER') : '—'}</td>
                            <td>${s.Status || '—'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p style="text-align:center; margin-top:20px; font-size:11px; color:#999;">
                تم الطباعة من نظام الشوكاني - تاريخ ${new Date().toLocaleDateString('ar-EG')}
            </p>
        `;

        window.AlShawkani.App.printElement(tableHTML, 'قائمة الكفالات');
    }

    // ============================================================
    // 7. ربط الأحداث وتهيئة الوحدة
    // ============================================================

    /**
     * تحميل البيانات وتحديث الجدول
     */
    async function loadSponsorships() {
        try {
            const data = await fetchSponsorships();
            sponsorshipsData = data;
            renderSponsorshipsTable();
        } catch (error) {
            console.error('❌ خطأ في تحميل الكفالات:', error.message);
        }
    }

    /**
     * تهيئة وحدة الكفالات
     */
    function initSponsorshipsModule() {
        console.log('🚀 تهيئة وحدة إدارة الكفالات...');

        if (!DOM.tableBody) {
            console.warn('⚠️ جدول الكفالات غير موجود في الصفحة.');
            return;
        }

        // ============================================================
        // 1. ربط أحداث النموذج
        // ============================================================
        if (DOM.form) {
            DOM.form.addEventListener('submit', saveSponsorship);
        }

        if (DOM.formResetBtn) {
            DOM.formResetBtn.addEventListener('click', function() {
                if (DOM.form) DOM.form.reset();
                if (DOM.sponsorshipId) DOM.sponsorshipId.value = '';
                isEditMode = false;
                if (DOM.formTitle) DOM.formTitle.textContent = 'إضافة كفالة جديدة';
                if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'إضافة';
                
                if (DOM.startDate) {
                    const today = new Date().toISOString().split('T')[0];
                    DOM.startDate.value = today;
                }
                if (DOM.status) DOM.status.value = 'نشطة';
            });
        }

        // ============================================================
        // 2. ربط أحداث البحث والتصفية
        // ============================================================
        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', function() {
                filterSponsorships();
            });
        }

        if (DOM.filterStatus) {
            DOM.filterStatus.addEventListener('change', function() {
                filterSponsorships();
            });
        }

        if (DOM.filterSponsor) {
            DOM.filterSponsor.addEventListener('change', function() {
                filterSponsorships();
            });
        }

        // ============================================================
        // 3. ربط أزرار الإجراءات السريعة
        // ============================================================
        if (DOM.addBtn) {
            DOM.addBtn.addEventListener('click', addSponsorship);
        }

        if (DOM.exportBtn) {
            DOM.exportBtn.addEventListener('click', exportSponsorships);
        }

        if (DOM.printBtn) {
            DOM.printBtn.addEventListener('click', printSponsorships);
        }

        if (DOM.refreshBtn) {
            DOM.refreshBtn.addEventListener('click', loadSponsorships);
        }

        // ============================================================
        // 4. تحميل البيانات الأولية
        // ============================================================
        Promise.all([
            fetchOrphansList(),
            fetchSponsorsList(),
            loadSponsorships()
        ]).then(() => {
            console.log('✅ تم تهيئة وحدة إدارة الكفالات بنجاح.');
        }).catch(error => {
            console.error('❌ خطأ في التهيئة:', error.message);
        });
    }

    // ============================================================
    // 8. تشغيل التهيئة
    // ============================================================

    document.addEventListener('DOMContentLoaded', function() {
        initSponsorshipsModule();
    });

})();