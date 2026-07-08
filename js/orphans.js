/**
 * ============================================================
 * الملف: orphans.js
 * الوصف: وحدة إدارة الأيتام - إضافة، تعديل، حذف، عرض، بحث، تصدير
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
        table: document.getElementById('orphansTable'),
        tableBody: document.getElementById('orphansTableBody'),

        // النموذج (إضافة/تعديل)
        form: document.getElementById('orphanForm'),
        formModal: document.getElementById('orphanModal'),
        formTitle: document.getElementById('orphanFormTitle'),
        formSubmitBtn: document.getElementById('orphanSubmitBtn'),
        formResetBtn: document.getElementById('orphanResetBtn'),

        // حقول النموذج
        orphanId: document.getElementById('orphanId'),
        orphanCode: document.getElementById('orphanCode'),
        fullName: document.getElementById('fullName'),
        gender: document.getElementById('gender'),
        birthDate: document.getElementById('birthDate'),
        birthPlace: document.getElementById('birthPlace'),
        nationality: document.getElementById('nationality'),
        idNumber: document.getElementById('idNumber'),
        healthStatus: document.getElementById('healthStatus'),
        disabilityType: document.getElementById('disabilityType'),
        bloodType: document.getElementById('bloodType'),
        familyId: document.getElementById('familyId'),
        fatherStatus: document.getElementById('fatherStatus'),
        fatherDeathDate: document.getElementById('fatherDeathDate'),
        fatherDeathCause: document.getElementById('fatherDeathCause'),
        motherStatus: document.getElementById('motherStatus'),
        motherName: document.getElementById('motherName'),
        motherPhone: document.getElementById('motherPhone'),
        schoolId: document.getElementById('schoolId'),
        educationLevel: document.getElementById('educationLevel'),
        grade: document.getElementById('grade'),
        academicYear: document.getElementById('academicYear'),
        orphanStatus: document.getElementById('orphanStatus'),
        admissionDate: document.getElementById('admissionDate'),
        releaseDate: document.getElementById('releaseDate'),
        releaseReason: document.getElementById('releaseReason'),
        notes: document.getElementById('notes'),

        // أزرار البحث والتصفية
        searchInput: document.getElementById('searchOrphans'),
        filterStatus: document.getElementById('filterStatus'),
        filterGender: document.getElementById('filterGender'),

        // أزرار الإجراءات السريعة
        addBtn: document.getElementById('addOrphanBtn'),
        exportBtn: document.getElementById('exportOrphansBtn'),
        printBtn: document.getElementById('printOrphansBtn'),
        refreshBtn: document.getElementById('refreshOrphansBtn')
    };

    // ============================================================
    // 2. متغيرات الحالة
    // ============================================================
    let orphansData = [];
    let dataTable = null;
    let isEditMode = false;

    // ============================================================
    // 3. الدوال الأساسية
    // ============================================================

    /**
     * جلب قائمة الأيتام من الخادم
     * @param {Object} filters - معاملات التصفية (اختياري)
     * @returns {Promise<Array>} قائمة الأيتام
     */
    async function fetchOrphans(filters = {}) {
        try {
            const response = await fetch('/api/orphans?' + new URLSearchParams(filters));
            if (!response.ok) throw new Error('فشل في جلب بيانات الأيتام');
            const data = await response.json();
            orphansData = data;
            return data;
        } catch (error) {
            console.error('❌ خطأ في جلب الأيتام:', error.message);
            window.AlShawkani.App.showError('تعذر جلب بيانات الأيتام. يرجى المحاولة مرة أخرى.');
            return [];
        }
    }

    /**
     * عرض الأيتام في الجدول (باستخدام DataTables)
     */
    function renderOrphansTable() {
        if (!DOM.tableBody) return;

        // إذا كان DataTables موجوداً، ندمره ونعيد إنشائه
        if (dataTable) {
            dataTable.destroy();
            dataTable = null;
        }

        // إذا لم توجد بيانات، نعرض رسالة "لا توجد بيانات"
        if (!orphansData || orphansData.length === 0) {
            DOM.tableBody.innerHTML = `
                <tr>
                    <td colspan="13" class="text-center py-4">
                        <i class="fas fa-inbox fa-2x d-block mb-2 text-muted"></i>
                        <h6 class="text-muted">لا توجد أيتام مسجلين</h6>
                        <p class="text-muted small">يمكنك إضافة يتيم جديد بالضغط على زر "إضافة يتيم"</p>
                    </td>
                </tr>
            `;
            return;
        }

        // بناء صفوف الجدول
        let rows = '';
        orphansData.forEach(orphan => {
            // تنسيق التاريخ
            const birthDate = orphan.BirthDate ? 
                window.AlShawkani.App.formatDateArabic(orphan.BirthDate) : '—';
            const admissionDate = orphan.AdmissionDate ? 
                window.AlShawkani.App.formatDateArabic(orphan.AdmissionDate) : '—';

            // حالة اليتيم مع لون مناسب
            let statusBadge = '';
            switch (orphan.OrphanStatus) {
                case 'نشط':
                    statusBadge = '<span class="badge bg-success">نشط</span>';
                    break;
                case 'منقطع':
                    statusBadge = '<span class="badge bg-warning text-dark">منقطع</span>';
                    break;
                case 'منتهي':
                    statusBadge = '<span class="badge bg-danger">منتهي</span>';
                    break;
                default:
                    statusBadge = '<span class="badge bg-secondary">غير محدد</span>';
            }

            // الجنس
            const genderIcon = orphan.Gender === 'ذكر' ? 
                '<i class="fas fa-male text-primary"></i>' : 
                '<i class="fas fa-female text-danger"></i>';

            rows += `
                <tr data-id="${orphan.OrphanID}">
                    <td>${orphan.OrphanCode || '—'}</td>
                    <td>
                        <span class="fw-semibold">${orphan.FullName || '—'}</span>
                        <br>
                        <small class="text-muted">${genderIcon} ${orphan.Gender || '—'}</small>
                    </td>
                    <td>${birthDate}</td>
                    <td>${orphan.FamilyID || '—'}</td>
                    <td>${statusBadge}</td>
                    <td>${orphan.EducationLevel || '—'}</td>
                    <td>${admissionDate}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary view-orphan" data-id="${orphan.OrphanID}" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-warning edit-orphan" data-id="${orphan.OrphanID}" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger delete-orphan" data-id="${orphan.OrphanID}" title="حذف">
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
                dataTable = window.AlShawkani.App.initDataTable('#orphansTable', {
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
                // إذا فشل DataTables، نعرض الجدول العادي
                bindTableEvents();
            }
        } else {
            // إذا لم يكن jQuery متاحاً، نربط الأحداث مباشرة
            bindTableEvents();
        }
    }

    /**
     * ربط أحداث الأزرار داخل الجدول
     */
    function bindTableEvents() {
        // زر عرض التفاصيل
        document.querySelectorAll('.view-orphan').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                viewOrphan(id);
            });
        });

        // زر تعديل
        document.querySelectorAll('.edit-orphan').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                editOrphan(id);
            });
        });

        // زر حذف
        document.querySelectorAll('.delete-orphan').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                deleteOrphan(id);
            });
        });
    }

    // ============================================================
    // 4. عمليات CRUD الأساسية
    // ============================================================

    /**
     * عرض تفاصيل يتيم في نافذة منبثقة أو نموذج
     * @param {number} id - معرف اليتيم
     */
    async function viewOrphan(id) {
        try {
            const orphan = orphansData.find(o => o.OrphanID == id);
            if (!orphan) {
                window.AlShawkani.App.showWarning('اليتيم غير موجود');
                return;
            }

            // بناء رسالة التفاصيل (يمكن عرضها في Toast أو Modal)
            const details = `
                <div dir="rtl" class="p-3">
                    <h5 class="border-bottom pb-2 mb-3">${orphan.FullName}</h5>
                    <div class="row g-2">
                        <div class="col-6"><strong>الرمز:</strong> ${orphan.OrphanCode || '—'}</div>
                        <div class="col-6"><strong>الجنس:</strong> ${orphan.Gender || '—'}</div>
                        <div class="col-6"><strong>تاريخ الميلاد:</strong> ${orphan.BirthDate || '—'}</div>
                        <div class="col-6"><strong>مكان الميلاد:</strong> ${orphan.BirthPlace || '—'}</div>
                        <div class="col-12"><strong>الجنسية:</strong> ${orphan.Nationality || '—'}</div>
                        <div class="col-12"><strong>رقم الهوية:</strong> ${orphan.IDNumber || '—'}</div>
                        <div class="col-6"><strong>الحالة الصحية:</strong> ${orphan.HealthStatus || '—'}</div>
                        <div class="col-6"><strong>فصيلة الدم:</strong> ${orphan.BloodType || '—'}</div>
                        <div class="col-6"><strong>رقم الأسرة:</strong> ${orphan.FamilyID || '—'}</div>
                        <div class="col-6"><strong>حالة الأب:</strong> ${orphan.FatherStatus || '—'}</div>
                        <div class="col-6"><strong>حالة الأم:</strong> ${orphan.MotherStatus || '—'}</div>
                        <div class="col-6"><strong>اسم الأم:</strong> ${orphan.MotherName || '—'}</div>
                        <div class="col-12"><strong>حالة اليتيم:</strong> ${orphan.OrphanStatus || '—'}</div>
                        <div class="col-6"><strong>تاريخ التسجيل:</strong> ${orphan.AdmissionDate || '—'}</div>
                        <div class="col-6"><strong>تاريخ الانتهاء:</strong> ${orphan.ReleaseDate || '—'}</div>
                        <div class="col-12"><strong>ملاحظات:</strong> ${orphan.Notes || '—'}</div>
                    </div>
                </div>
            `;

            // عرض التفاصيل في Toast طويل
            window.AlShawkani.App.showInfo(details, 10000);

        } catch (error) {
            console.error('❌ خطأ في عرض التفاصيل:', error.message);
            window.AlShawkani.App.showError('تعذر عرض تفاصيل اليتيم.');
        }
    }

    /**
     * فتح نموذج إضافة يتيم جديد
     */
    function addOrphan() {
        isEditMode = false;
        if (DOM.formTitle) DOM.formTitle.textContent = 'إضافة يتيم جديد';
        if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'إضافة';
        if (DOM.orphanId) DOM.orphanId.value = '';
        
        // إعادة تعيين النموذج
        if (DOM.form) DOM.form.reset();
        
        // تعيين تاريخ اليوم للحقل AdmissionDate
        if (DOM.admissionDate) {
            const today = new Date().toISOString().split('T')[0];
            DOM.admissionDate.value = today;
        }
        
        // إخفاء حقل سبب الانتهاء إذا لم تكن الحالة "منتهي"
        toggleReleaseFields(false);

        // عرض النموذج (باستخدام Bootstrap Modal)
        if (DOM.formModal) {
            const modal = new bootstrap.Modal(DOM.formModal);
            modal.show();
        }
    }

    /**
     * فتح نموذج تعديل يتيم موجود
     * @param {number} id - معرف اليتيم
     */
    async function editOrphan(id) {
        try {
            const orphan = orphansData.find(o => o.OrphanID == id);
            if (!orphan) {
                window.AlShawkani.App.showWarning('اليتيم غير موجود');
                return;
            }

            isEditMode = true;
            if (DOM.formTitle) DOM.formTitle.textContent = 'تعديل بيانات اليتيم';
            if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'تحديث';
            
            // ملء الحقول بالبيانات
            fillForm(orphan);
            
            // عرض النموذج
            if (DOM.formModal) {
                const modal = new bootstrap.Modal(DOM.formModal);
                modal.show();
            }
        } catch (error) {
            console.error('❌ خطأ في فتح التعديل:', error.message);
            window.AlShawkani.App.showError('تعذر فتح بيانات اليتيم للتعديل.');
        }
    }

    /**
     * ملء نموذج التعديل بالبيانات
     * @param {Object} orphan - بيانات اليتيم
     */
    function fillForm(orphan) {
        if (DOM.orphanId) DOM.orphanId.value = orphan.OrphanID || '';
        if (DOM.orphanCode) DOM.orphanCode.value = orphan.OrphanCode || '';
        if (DOM.fullName) DOM.fullName.value = orphan.FullName || '';
        if (DOM.gender) DOM.gender.value = orphan.Gender || '';
        if (DOM.birthDate) DOM.birthDate.value = orphan.BirthDate || '';
        if (DOM.birthPlace) DOM.birthPlace.value = orphan.BirthPlace || '';
        if (DOM.nationality) DOM.nationality.value = orphan.Nationality || '';
        if (DOM.idNumber) DOM.idNumber.value = orphan.IDNumber || '';
        if (DOM.healthStatus) DOM.healthStatus.value = orphan.HealthStatus || '';
        if (DOM.disabilityType) DOM.disabilityType.value = orphan.DisabilityType || '';
        if (DOM.bloodType) DOM.bloodType.value = orphan.BloodType || '';
        if (DOM.familyId) DOM.familyId.value = orphan.FamilyID || '';
        if (DOM.fatherStatus) DOM.fatherStatus.value = orphan.FatherStatus || '';
        if (DOM.fatherDeathDate) DOM.fatherDeathDate.value = orphan.FatherDeathDate || '';
        if (DOM.fatherDeathCause) DOM.fatherDeathCause.value = orphan.FatherDeathCause || '';
        if (DOM.motherStatus) DOM.motherStatus.value = orphan.MotherStatus || '';
        if (DOM.motherName) DOM.motherName.value = orphan.MotherName || '';
        if (DOM.motherPhone) DOM.motherPhone.value = orphan.MotherPhone || '';
        if (DOM.schoolId) DOM.schoolId.value = orphan.SchoolID || '';
        if (DOM.educationLevel) DOM.educationLevel.value = orphan.EducationLevel || '';
        if (DOM.grade) DOM.grade.value = orphan.Grade || '';
        if (DOM.academicYear) DOM.academicYear.value = orphan.AcademicYear || '';
        if (DOM.orphanStatus) DOM.orphanStatus.value = orphan.OrphanStatus || '';
        if (DOM.admissionDate) DOM.admissionDate.value = orphan.AdmissionDate || '';
        if (DOM.releaseDate) DOM.releaseDate.value = orphan.ReleaseDate || '';
        if (DOM.releaseReason) DOM.releaseReason.value = orphan.ReleaseReason || '';
        if (DOM.notes) DOM.notes.value = orphan.Notes || '';
    }

    /**
     * إظهار/إخفاء حقول الإنهاء
     * @param {boolean} show - إظهار إذا كانت الحالة منتهي
     */
    function toggleReleaseFields(show) {
        const releaseFields = document.querySelectorAll('.release-field');
        releaseFields.forEach(field => {
            field.style.display = show ? 'block' : 'none';
        });
    }

    /**
     * حفظ اليتيم (إضافة أو تحديث)
     */
    async function saveOrphan(event) {
        event.preventDefault();

        // جمع البيانات من النموذج
        const formData = new FormData(DOM.form);
        const data = Object.fromEntries(formData.entries());

        // التحقق من الحقول الأساسية
        if (!data.fullName || !data.gender || !data.birthDate) {
            window.AlShawkani.App.showWarning('يرجى ملء جميع الحقول الأساسية (الاسم، الجنس، تاريخ الميلاد).');
            return;
        }

        // إذا كانت الحالة "منتهي" نطلب سبب الانتهاء
        if (data.orphanStatus === 'منتهي' && !data.releaseReason) {
            window.AlShawkani.App.showWarning('يرجى إدخال سبب انتهاء الكفالة.');
            return;
        }

        // تعطيل الزر لمنع النقر المتكرر
        if (DOM.formSubmitBtn) {
            DOM.formSubmitBtn.disabled = true;
            DOM.formSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        }

        try {
            let response;
            const url = isEditMode ? `/api/orphans/${data.orphanId}` : '/api/orphans';
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
            window.AlShawkani.App.showSuccess(isEditMode ? 'تم تحديث بيانات اليتيم بنجاح' : 'تم إضافة اليتيم بنجاح');

            // إغلاق المودال
            if (DOM.formModal) {
                const modal = bootstrap.Modal.getInstance(DOM.formModal);
                if (modal) modal.hide();
            }

            // إعادة تحميل البيانات
            await loadOrphans();

        } catch (error) {
            console.error('❌ خطأ في حفظ اليتيم:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حفظ البيانات. يرجى المحاولة مرة أخرى.');
        } finally {
            if (DOM.formSubmitBtn) {
                DOM.formSubmitBtn.disabled = false;
                DOM.formSubmitBtn.textContent = isEditMode ? 'تحديث' : 'إضافة';
            }
        }
    }

    /**
     * حذف يتيم
     * @param {number} id - معرف اليتيم
     */
    async function deleteOrphan(id) {
        const orphan = orphansData.find(o => o.OrphanID == id);
        if (!orphan) return;

        const confirmed = await window.AlShawkani.App.confirmAction(
            `هل أنت متأكد من حذف اليتيم "${orphan.FullName}"؟\nملاحظة: سيتم حذف جميع البيانات المرتبطة به.`,
            'تأكيد الحذف',
            'نعم، حذف',
            'إلغاء'
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`/api/orphans/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في حذف اليتيم');
            }

            window.AlShawkani.App.showSuccess('تم حذف اليتيم بنجاح');
            await loadOrphans();

        } catch (error) {
            console.error('❌ خطأ في حذف اليتيم:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حذف اليتيم.');
        }
    }

    // ============================================================
    // 5. البحث والتصفية
    // ============================================================

    /**
     * البحث في الأيتام وتصفية النتائج
     */
    function filterOrphans() {
        const searchTerm = DOM.searchInput ? DOM.searchInput.value.toLowerCase().trim() : '';
        const statusFilter = DOM.filterStatus ? DOM.filterStatus.value : '';
        const genderFilter = DOM.filterGender ? DOM.filterGender.value : '';

        let filtered = orphansData;

        if (searchTerm) {
            filtered = filtered.filter(o =>
                (o.FullName && o.FullName.toLowerCase().includes(searchTerm)) ||
                (o.OrphanCode && o.OrphanCode.toLowerCase().includes(searchTerm)) ||
                (o.IDNumber && o.IDNumber.includes(searchTerm))
            );
        }

        if (statusFilter) {
            filtered = filtered.filter(o => o.OrphanStatus === statusFilter);
        }

        if (genderFilter) {
            filtered = filtered.filter(o => o.Gender === genderFilter);
        }

        // إعادة عرض الجدول مع البيانات المصفاة
        orphansData = filtered;
        renderOrphansTable();
        // استعادة البيانات الكاملة للاستخدام اللاحق
        // (يتم جلبها من الخادم عند الحاجة)
    }

    // ============================================================
    // 6. تصدير وطباعة
    // ============================================================

    /**
     * تصدير الأيتام إلى ملف CSV
     */
    function exportOrphans() {
        if (!orphansData || orphansData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للتصدير.');
            return;
        }

        const headers = ['الرمز', 'الاسم', 'الجنس', 'تاريخ الميلاد', 'مكان الميلاد', 'الجنسية', 
            'رقم الهوية', 'الحالة الصحية', 'نوع الإعاقة', 'فصيلة الدم', 'رقم الأسرة', 
            'حالة الأب', 'تاريخ وفاة الأب', 'سبب وفاة الأب', 'حالة الأم', 'اسم الأم', 
            'هاتف الأم', 'المدرسة', 'المستوى التعليمي', 'الصف', 'السنة الدراسية', 
            'حالة اليتيم', 'تاريخ التسجيل', 'تاريخ الانتهاء', 'سبب الانتهاء', 'ملاحظات'];

        const data = orphansData.map(o => [
            o.OrphanCode || '', o.FullName || '', o.Gender || '', o.BirthDate || '', 
            o.BirthPlace || '', o.Nationality || '', o.IDNumber || '', o.HealthStatus || '', 
            o.DisabilityType || '', o.BloodType || '', o.FamilyID || '', o.FatherStatus || '', 
            o.FatherDeathDate || '', o.FatherDeathCause || '', o.MotherStatus || '', 
            o.MotherName || '', o.MotherPhone || '', o.SchoolID || '', o.EducationLevel || '', 
            o.Grade || '', o.AcademicYear || '', o.OrphanStatus || '', o.AdmissionDate || '', 
            o.ReleaseDate || '', o.ReleaseReason || '', o.Notes || ''
        ]);

        window.AlShawkani.App.exportToCSV(data, 'الأيتام.csv', headers);
    }

    /**
     * طباعة قائمة الأيتام
     */
    function printOrphans() {
        if (!orphansData || orphansData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للطباعة.');
            return;
        }

        // بناء جدول للطباعة
        const tableHTML = `
            <h3 style="text-align:center; margin-bottom:20px;">قائمة الأيتام - نظام الشوكاني</h3>
            <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; text-align:right; font-size:12px;">
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th>الرمز</th>
                        <th>الاسم</th>
                        <th>الجنس</th>
                        <th>تاريخ الميلاد</th>
                        <th>الحالة الصحية</th>
                        <th>حالة اليتيم</th>
                        <th>تاريخ التسجيل</th>
                    </tr>
                </thead>
                <tbody>
                    ${orphansData.map(o => `
                        <tr>
                            <td>${o.OrphanCode || '—'}</td>
                            <td>${o.FullName || '—'}</td>
                            <td>${o.Gender || '—'}</td>
                            <td>${o.BirthDate || '—'}</td>
                            <td>${o.HealthStatus || '—'}</td>
                            <td>${o.OrphanStatus || '—'}</td>
                            <td>${o.AdmissionDate || '—'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p style="text-align:center; margin-top:20px; font-size:11px; color:#999;">
                تم الطباعة من نظام الشوكاني - تاريخ ${new Date().toLocaleDateString('ar-EG')}
            </p>
        `;

        window.AlShawkani.App.printElement(tableHTML, 'قائمة الأيتام');
    }

    // ============================================================
    // 7. ربط الأحداث وتهيئة الوحدة
    // ============================================================

    /**
     * تحميل البيانات وتحديث الجدول
     */
    async function loadOrphans() {
        try {
            const data = await fetchOrphans();
            orphansData = data;
            renderOrphansTable();
        } catch (error) {
            console.error('❌ خطأ في تحميل الأيتام:', error.message);
        }
    }

    /**
     * تهيئة وحدة الأيتام
     */
    function initOrphansModule() {
        console.log('🚀 تهيئة وحدة إدارة الأيتام...');

        // التحقق من وجود العناصر الأساسية
        if (!DOM.tableBody) {
            console.warn('⚠️ جدول الأيتام غير موجود في الصفحة.');
            return;
        }

        // ============================================================
        // 1. ربط أحداث النموذج
        // ============================================================
        if (DOM.form) {
            DOM.form.addEventListener('submit', saveOrphan);
        }

        if (DOM.formResetBtn) {
            DOM.formResetBtn.addEventListener('click', function() {
                if (DOM.form) DOM.form.reset();
                if (DOM.orphanId) DOM.orphanId.value = '';
                isEditMode = false;
                if (DOM.formTitle) DOM.formTitle.textContent = 'إضافة يتيم جديد';
                if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'إضافة';
            });
        }

        // ============================================================
        // 2. ربط أحداث البحث والتصفية
        // ============================================================
        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', function() {
                filterOrphans();
            });
        }

        if (DOM.filterStatus) {
            DOM.filterStatus.addEventListener('change', function() {
                filterOrphans();
            });
        }

        if (DOM.filterGender) {
            DOM.filterGender.addEventListener('change', function() {
                filterOrphans();
            });
        }

        // ============================================================
        // 3. ربط أزرار الإجراءات السريعة
        // ============================================================
        if (DOM.addBtn) {
            DOM.addBtn.addEventListener('click', addOrphan);
        }

        if (DOM.exportBtn) {
            DOM.exportBtn.addEventListener('click', exportOrphans);
        }

        if (DOM.printBtn) {
            DOM.printBtn.addEventListener('click', printOrphans);
        }

        if (DOM.refreshBtn) {
            DOM.refreshBtn.addEventListener('click', loadOrphans);
        }

        // ============================================================
        // 4. ربط حدث تغيير حالة اليتيم لإظهار/إخفاء حقول الإنهاء
        // ============================================================
        if (DOM.orphanStatus) {
            DOM.orphanStatus.addEventListener('change', function() {
                const show = this.value === 'منتهي';
                toggleReleaseFields(show);
            });
        }

        // ============================================================
        // 5. تحميل البيانات الأولية
        // ============================================================
        loadOrphans();

        console.log('✅ تم تهيئة وحدة إدارة الأيتام بنجاح.');
    }

    // ============================================================
    // 8. تشغيل التهيئة
    // ============================================================

    // تنفيذ التهيئة عند تحميل الصفحة
    document.addEventListener('DOMContentLoaded', function() {
        initOrphansModule();
    });

})();