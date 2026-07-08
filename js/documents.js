/**
 * ============================================================
 * الملف: documents.js
 * الوصف: وحدة إدارة الوثائق - إضافة، تعديل، حذف، عرض، بحث، تصدير، رفع ملفات
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
        table: document.getElementById('documentsTable'),
        tableBody: document.getElementById('documentsTableBody'),

        // النموذج (إضافة/تعديل)
        form: document.getElementById('documentForm'),
        formModal: document.getElementById('documentModal'),
        formTitle: document.getElementById('documentFormTitle'),
        formSubmitBtn: document.getElementById('documentSubmitBtn'),
        formResetBtn: document.getElementById('documentResetBtn'),

        // حقول النموذج
        documentId: document.getElementById('documentId'),
        documentTitle: document.getElementById('documentTitle'),
        documentType: document.getElementById('documentType'),
        orphanId: document.getElementById('docOrphanId'),
        familyId: document.getElementById('docFamilyId'),
        referenceNumber: document.getElementById('referenceNumber'),
        issueDate: document.getElementById('issueDate'),
        expiryDate: document.getElementById('expiryDate'),
        content: document.getElementById('documentContent'),
        attachmentFile: document.getElementById('attachmentFile'),
        notes: document.getElementById('documentNotes'),

        // حقول إضافية للقراءة فقط
        orphanNameDisplay: document.getElementById('docOrphanNameDisplay'),
        familyNameDisplay: document.getElementById('docFamilyNameDisplay'),

        // أزرار البحث والتصفية
        searchInput: document.getElementById('searchDocuments'),
        filterType: document.getElementById('filterDocType'),
        filterDateFrom: document.getElementById('filterDocDateFrom'),
        filterDateTo: document.getElementById('filterDocDateTo'),

        // أزرار الإجراءات السريعة
        addBtn: document.getElementById('addDocumentBtn'),
        exportBtn: document.getElementById('exportDocumentsBtn'),
        printBtn: document.getElementById('printDocumentsBtn'),
        refreshBtn: document.getElementById('refreshDocumentsBtn')
    };

    // ============================================================
    // 2. متغيرات الحالة
    // ============================================================
    let documentsData = [];
    let orphansList = [];
    let familiesList = [];
    let dataTable = null;
    let isEditMode = false;

    // ============================================================
    // 3. الدوال الأساسية
    // ============================================================

    /**
     * جلب قائمة الوثائق من الخادم
     * @param {Object} filters - معاملات التصفية (اختياري)
     * @returns {Promise<Array>} قائمة الوثائق
     */
    async function fetchDocuments(filters = {}) {
        try {
            const response = await fetch('/api/documents?' + new URLSearchParams(filters));
            if (!response.ok) throw new Error('فشل في جلب بيانات الوثائق');
            const data = await response.json();
            documentsData = data;
            return data;
        } catch (error) {
            console.error('❌ خطأ في جلب الوثائق:', error.message);
            window.AlShawkani.App.showError('تعذر جلب بيانات الوثائق. يرجى المحاولة مرة أخرى.');
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
     * جلب قائمة الأسر للقوائم المنسدلة
     */
    async function fetchFamiliesList() {
        try {
            const response = await fetch('/api/families');
            if (!response.ok) throw new Error('فشل في جلب قائمة الأسر');
            familiesList = await response.json();
            populateFamilySelect();
        } catch (error) {
            console.error('❌ خطأ في جلب الأسر:', error.message);
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
     * ملء قائمة الأسر المنسدلة
     */
    function populateFamilySelect() {
        if (!DOM.familyId) return;
        
        const emptyOption = DOM.familyId.querySelector('option[value=""]');
        DOM.familyId.innerHTML = '';
        if (emptyOption) DOM.familyId.appendChild(emptyOption);
        
        familiesList.forEach(family => {
            const option = document.createElement('option');
            option.value = family.FamilyID;
            option.textContent = `${family.FamilyNumber || ''} - ${family.FamilyName || ''}`;
            DOM.familyId.appendChild(option);
        });
    }

    /**
     * عرض الوثائق في الجدول (باستخدام DataTables)
     */
    function renderDocumentsTable() {
        if (!DOM.tableBody) return;

        if (dataTable) {
            dataTable.destroy();
            dataTable = null;
        }

        if (!documentsData || documentsData.length === 0) {
            DOM.tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <i class="fas fa-file-alt fa-2x d-block mb-2 text-muted"></i>
                        <h6 class="text-muted">لا توجد وثائق مسجلة</h6>
                        <p class="text-muted small">يمكنك إضافة وثيقة جديدة بالضغط على زر "إضافة وثيقة"</p>
                    </td>
                </tr>
            `;
            return;
        }

        let rows = '';
        documentsData.forEach(doc => {
            const issueDate = doc.IssueDate ? 
                window.AlShawkani.App.formatDateArabic(doc.IssueDate) : '—';
            const expiryDate = doc.ExpiryDate ? 
                window.AlShawkani.App.formatDateArabic(doc.ExpiryDate) : '—';

            // اسم اليتيم أو الأسرة المرتبطة
            let linkedTo = '—';
            if (doc.OrphanID) {
                const orphan = orphansList.find(o => o.OrphanID == doc.OrphanID);
                linkedTo = orphan ? `يتيم: ${orphan.FullName}` : `يتيم: ${doc.OrphanID}`;
            } else if (doc.FamilyID) {
                const family = familiesList.find(f => f.FamilyID == doc.FamilyID);
                linkedTo = family ? `أسرة: ${family.FamilyName}` : `أسرة: ${doc.FamilyID}`;
            }

            // نوع الوثيقة مع لون مناسب
            let typeBadge = '';
            switch (doc.DocumentType) {
                case 'عقد كفالة':
                    typeBadge = '<span class="badge bg-success">عقد كفالة</span>';
                    break;
                case 'تقرير طبي':
                    typeBadge = '<span class="badge bg-danger">تقرير طبي</span>';
                    break;
                case 'شهادة دراسية':
                    typeBadge = '<span class="badge bg-primary">شهادة دراسية</span>';
                    break;
                case 'إقرار':
                    typeBadge = '<span class="badge bg-warning text-dark">إقرار</span>';
                    break;
                case 'تقرير حالة':
                    typeBadge = '<span class="badge bg-info text-white">تقرير حالة</span>';
                    break;
                default:
                    typeBadge = '<span class="badge bg-secondary">أخرى</span>';
            }

            // وجود مرفق
            const hasAttachment = doc.hasAttachment ? 
                '<i class="fas fa-paperclip text-success" title="يوجد مرفق"></i>' : 
                '<i class="fas fa-times text-muted" title="لا يوجد مرفق"></i>';

            rows += `
                <tr data-id="${doc.DocumentID}">
                    <td>${doc.DocumentTitle || '—'}</td>
                    <td>${typeBadge}</td>
                    <td>${linkedTo}</td>
                    <td>${doc.ReferenceNumber || '—'}</td>
                    <td>${issueDate}</td>
                    <td>${expiryDate}</td>
                    <td>${hasAttachment}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary view-document" data-id="${doc.DocumentID}" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-warning edit-document" data-id="${doc.DocumentID}" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${doc.hasAttachment ? `
                            <button class="btn btn-outline-info download-attachment" data-id="${doc.DocumentID}" title="تحميل المرفق">
                                <i class="fas fa-download"></i>
                            </button>
                            ` : ''}
                            <button class="btn btn-outline-danger delete-document" data-id="${doc.DocumentID}" title="حذف">
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
                dataTable = window.AlShawkani.App.initDataTable('#documentsTable', {
                    order: [[0, 'asc']],
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
        document.querySelectorAll('.view-document').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                viewDocument(id);
            });
        });

        document.querySelectorAll('.edit-document').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                editDocument(id);
            });
        });

        document.querySelectorAll('.delete-document').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                deleteDocument(id);
            });
        });

        document.querySelectorAll('.download-attachment').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                downloadAttachment(id);
            });
        });
    }

    // ============================================================
    // 4. عمليات CRUD الأساسية
    // ============================================================

    /**
     * عرض تفاصيل وثيقة
     * @param {number} id - معرف الوثيقة
     */
    async function viewDocument(id) {
        try {
            const doc = documentsData.find(d => d.DocumentID == id);
            if (!doc) {
                window.AlShawkani.App.showWarning('الوثيقة غير موجودة');
                return;
            }

            const orphan = orphansList.find(o => o.OrphanID == doc.OrphanID);
            const family = familiesList.find(f => f.FamilyID == doc.FamilyID);

            const linkedTo = doc.OrphanID ? 
                (orphan ? `يتيم: ${orphan.FullName}` : `يتيم: ${doc.OrphanID}`) :
                (family ? `أسرة: ${family.FamilyName}` : `أسرة: ${doc.FamilyID}`);

            const details = `
                <div dir="rtl" class="p-3">
                    <h5 class="border-bottom pb-2 mb-3">${doc.DocumentTitle}</h5>
                    <div class="row g-2">
                        <div class="col-6"><strong>معرف الوثيقة:</strong> ${doc.DocumentID || '—'}</div>
                        <div class="col-6"><strong>النوع:</strong> ${doc.DocumentType || '—'}</div>
                        <div class="col-12"><strong>مرتبطة بـ:</strong> ${linkedTo}</div>
                        <div class="col-6"><strong>رقم المرجع:</strong> ${doc.ReferenceNumber || '—'}</div>
                        <div class="col-6"><strong>تاريخ الإصدار:</strong> ${doc.IssueDate ? window.AlShawkani.App.formatDateArabic(doc.IssueDate) : '—'}</div>
                        <div class="col-6"><strong>تاريخ الانتهاء:</strong> ${doc.ExpiryDate ? window.AlShawkani.App.formatDateArabic(doc.ExpiryDate) : '—'}</div>
                        <div class="col-12"><strong>المحتوى:</strong></div>
                        <div class="col-12 p-2 border rounded bg-light">${doc.Content || 'لا يوجد محتوى'}</div>
                        <div class="col-12"><strong>مرفقات:</strong> ${doc.hasAttachment ? 'يوجد مرفق' : 'لا يوجد مرفق'}</div>
                        <div class="col-12"><strong>ملاحظات:</strong> ${doc.Notes || '—'}</div>
                    </div>
                </div>
            `;

            window.AlShawkani.App.showInfo(details, 10000);

        } catch (error) {
            console.error('❌ خطأ في عرض التفاصيل:', error.message);
            window.AlShawkani.App.showError('تعذر عرض تفاصيل الوثيقة.');
        }
    }

    /**
     * تحميل المرفق
     * @param {number} id - معرف الوثيقة
     */
    async function downloadAttachment(id) {
        try {
            window.AlShawkani.App.showInfo('جاري تحميل المرفق...');
            const response = await fetch(`/api/documents/${id}/attachment`);
            if (!response.ok) throw new Error('فشل في تحميل المرفق');
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // استخراج اسم الملف من رأس Content-Disposition إن وجد
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `مرفق_${id}.pdf`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            window.AlShawkani.App.showSuccess('تم تحميل المرفق بنجاح');
        } catch (error) {
            console.error('❌ خطأ في تحميل المرفق:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر تحميل المرفق.');
        }
    }

    /**
     * فتح نموذج إضافة وثيقة جديدة
     */
    function addDocument() {
        isEditMode = false;
        if (DOM.formTitle) DOM.formTitle.textContent = 'إضافة وثيقة جديدة';
        if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'إضافة';
        if (DOM.documentId) DOM.documentId.value = '';
        
        if (DOM.form) DOM.form.reset();
        
        // تعيين تاريخ الإصدار إلى اليوم
        if (DOM.issueDate) {
            const today = new Date().toISOString().split('T')[0];
            DOM.issueDate.value = today;
        }

        if (DOM.formModal) {
            const modal = new bootstrap.Modal(DOM.formModal);
            modal.show();
        }
    }

    /**
     * فتح نموذج تعديل وثيقة موجودة
     * @param {number} id - معرف الوثيقة
     */
    async function editDocument(id) {
        try {
            const doc = documentsData.find(d => d.DocumentID == id);
            if (!doc) {
                window.AlShawkani.App.showWarning('الوثيقة غير موجودة');
                return;
            }

            isEditMode = true;
            if (DOM.formTitle) DOM.formTitle.textContent = 'تعديل بيانات الوثيقة';
            if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'تحديث';
            
            fillForm(doc);
            
            if (DOM.formModal) {
                const modal = new bootstrap.Modal(DOM.formModal);
                modal.show();
            }
        } catch (error) {
            console.error('❌ خطأ في فتح التعديل:', error.message);
            window.AlShawkani.App.showError('تعذر فتح بيانات الوثيقة للتعديل.');
        }
    }

    /**
     * ملء نموذج التعديل بالبيانات
     * @param {Object} doc - بيانات الوثيقة
     */
    function fillForm(doc) {
        if (DOM.documentId) DOM.documentId.value = doc.DocumentID || '';
        if (DOM.documentTitle) DOM.documentTitle.value = doc.DocumentTitle || '';
        if (DOM.documentType) DOM.documentType.value = doc.DocumentType || '';
        if (DOM.orphanId) DOM.orphanId.value = doc.OrphanID || '';
        if (DOM.familyId) DOM.familyId.value = doc.FamilyID || '';
        if (DOM.referenceNumber) DOM.referenceNumber.value = doc.ReferenceNumber || '';
        if (DOM.issueDate) DOM.issueDate.value = doc.IssueDate || '';
        if (DOM.expiryDate) DOM.expiryDate.value = doc.ExpiryDate || '';
        if (DOM.content) DOM.content.value = doc.Content || '';
        if (DOM.notes) DOM.notes.value = doc.Notes || '';
        
        // إظهار تحذير للمرفق
        if (doc.hasAttachment) {
            window.AlShawkani.App.showInfo('هذا المستند يحتوي على مرفق. إذا قمت برفع مرفق جديد، سيتم استبدال المرفق القديم.', 4000);
        }
    }

    /**
     * حفظ الوثيقة (إضافة أو تحديث)
     */
    async function saveDocument(event) {
        event.preventDefault();

        const formData = new FormData(DOM.form);
        
        // تحويل FormData إلى كائن مع دعم الملفات
        const data = {};
        for (let [key, value] of formData.entries()) {
            if (key === 'attachmentFile' && value instanceof File) {
                // نتعامل مع الملف بشكل منفصل باستخدام FormData
                continue;
            }
            data[key] = value;
        }

        // التحقق من الحقول الأساسية
        if (!data.documentTitle || !data.documentType) {
            window.AlShawkani.App.showWarning('يرجى ملء جميع الحقول الأساسية (عنوان الوثيقة والنوع).');
            return;
        }

        // التأكد من وجود ارتباط بيتيم أو أسرة
        if (!data.orphanId && !data.familyId) {
            window.AlShawkani.App.showWarning('يرجى ربط الوثيقة بيتيم أو أسرة.');
            return;
        }

        // إعداد بيانات النموذج للرفع (بما في ذلك الملف)
        const submitData = new FormData();
        for (let [key, value] of formData.entries()) {
            submitData.append(key, value);
        }

        if (DOM.formSubmitBtn) {
            DOM.formSubmitBtn.disabled = true;
            DOM.formSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        }

        try {
            let response;
            const url = isEditMode ? `/api/documents/${data.documentId}` : '/api/documents';
            const method = isEditMode ? 'PUT' : 'POST';

            response = await fetch(url, {
                method: method,
                // لا نضبط Content-Type لأن FormData سيضبطها تلقائياً مع الحدود (boundary)
                credentials: 'same-origin',
                body: submitData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في حفظ البيانات');
            }

            const result = await response.json();
            window.AlShawkani.App.showSuccess(isEditMode ? 'تم تحديث الوثيقة بنجاح' : 'تم إضافة الوثيقة بنجاح');

            if (DOM.formModal) {
                const modal = bootstrap.Modal.getInstance(DOM.formModal);
                if (modal) modal.hide();
            }

            await loadDocuments();

        } catch (error) {
            console.error('❌ خطأ في حفظ الوثيقة:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حفظ البيانات. يرجى المحاولة مرة أخرى.');
        } finally {
            if (DOM.formSubmitBtn) {
                DOM.formSubmitBtn.disabled = false;
                DOM.formSubmitBtn.textContent = isEditMode ? 'تحديث' : 'إضافة';
            }
        }
    }

    /**
     * حذف وثيقة
     * @param {number} id - معرف الوثيقة
     */
    async function deleteDocument(id) {
        const doc = documentsData.find(d => d.DocumentID == id);
        if (!doc) return;

        const confirmed = await window.AlShawkani.App.confirmAction(
            `هل أنت متأكد من حذف الوثيقة "${doc.DocumentTitle}"؟${doc.hasAttachment ? '\nملاحظة: سيتم حذف المرفق المرتبط بهذه الوثيقة أيضاً.' : ''}`,
            'تأكيد الحذف',
            'نعم، حذف',
            'إلغاء'
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`/api/documents/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في حذف الوثيقة');
            }

            window.AlShawkani.App.showSuccess('تم حذف الوثيقة بنجاح');
            await loadDocuments();

        } catch (error) {
            console.error('❌ خطأ في حذف الوثيقة:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حذف الوثيقة.');
        }
    }

    // ============================================================
    // 5. البحث والتصفية
    // ============================================================

    function filterDocuments() {
        const searchTerm = DOM.searchInput ? DOM.searchInput.value.toLowerCase().trim() : '';
        const typeFilter = DOM.filterType ? DOM.filterType.value : '';
        const dateFrom = DOM.filterDateFrom ? DOM.filterDateFrom.value : '';
        const dateTo = DOM.filterDateTo ? DOM.filterDateTo.value : '';

        let filtered = documentsData;

        if (searchTerm) {
            filtered = filtered.filter(d =>
                (d.DocumentTitle && d.DocumentTitle.toLowerCase().includes(searchTerm)) ||
                (d.ReferenceNumber && d.ReferenceNumber.toLowerCase().includes(searchTerm)) ||
                (d.Content && d.Content.toLowerCase().includes(searchTerm))
            );
        }

        if (typeFilter) {
            filtered = filtered.filter(d => d.DocumentType === typeFilter);
        }

        if (dateFrom) {
            filtered = filtered.filter(d => d.IssueDate && d.IssueDate >= dateFrom);
        }

        if (dateTo) {
            filtered = filtered.filter(d => d.IssueDate && d.IssueDate <= dateTo);
        }

        documentsData = filtered;
        renderDocumentsTable();
    }

    // ============================================================
    // 6. تصدير وطباعة
    // ============================================================

    function exportDocuments() {
        if (!documentsData || documentsData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للتصدير.');
            return;
        }

        const headers = ['معرف الوثيقة', 'العنوان', 'النوع', 'معرف اليتيم', 'معرف الأسرة', 
            'رقم المرجع', 'تاريخ الإصدار', 'تاريخ الانتهاء', 'المحتوى', 'يوجد مرفق', 'ملاحظات'];

        const data = documentsData.map(d => [
            d.DocumentID || '', d.DocumentTitle || '', d.DocumentType || '', d.OrphanID || '', 
            d.FamilyID || '', d.ReferenceNumber || '', d.IssueDate || '', d.ExpiryDate || '', 
            d.Content || '', d.hasAttachment ? 'نعم' : 'لا', d.Notes || ''
        ]);

        window.AlShawkani.App.exportToCSV(data, 'الوثائق.csv', headers);
    }

    function printDocuments() {
        if (!documentsData || documentsData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للطباعة.');
            return;
        }

        const tableHTML = `
            <h3 style="text-align:center; margin-bottom:20px;">قائمة الوثائق - نظام الشوكاني</h3>
            <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; text-align:right; font-size:12px;">
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th>العنوان</th>
                        <th>النوع</th>
                        <th>مرتبط بـ</th>
                        <th>رقم المرجع</th>
                        <th>تاريخ الإصدار</th>
                        <th>مرفق</th>
                    </tr>
                </thead>
                <tbody>
                    ${documentsData.map(d => {
                        const linkedTo = d.OrphanID ? `يتيم: ${d.OrphanID}` : (d.FamilyID ? `أسرة: ${d.FamilyID}` : '—');
                        return `
                        <tr>
                            <td>${d.DocumentTitle || '—'}</td>
                            <td>${d.DocumentType || '—'}</td>
                            <td>${linkedTo}</td>
                            <td>${d.ReferenceNumber || '—'}</td>
                            <td>${d.IssueDate ? window.AlShawkani.App.formatDateArabic(d.IssueDate) : '—'}</td>
                            <td>${d.hasAttachment ? 'نعم' : 'لا'}</td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
            <p style="text-align:center; margin-top:20px; font-size:11px; color:#999;">
                تم الطباعة من نظام الشوكاني - تاريخ ${new Date().toLocaleDateString('ar-EG')}
            </p>
        `;

        window.AlShawkani.App.printElement(tableHTML, 'قائمة الوثائق');
    }

    // ============================================================
    // 7. ربط الأحداث وتهيئة الوحدة
    // ============================================================

    /**
     * تحميل البيانات وتحديث الجدول
     */
    async function loadDocuments() {
        try {
            const data = await fetchDocuments();
            documentsData = data;
            renderDocumentsTable();
        } catch (error) {
            console.error('❌ خطأ في تحميل الوثائق:', error.message);
        }
    }

    /**
     * تهيئة وحدة الوثائق
     */
    function initDocumentsModule() {
        console.log('🚀 تهيئة وحدة إدارة الوثائق...');

        if (!DOM.tableBody) {
            console.warn('⚠️ جدول الوثائق غير موجود في الصفحة.');
            return;
        }

        // ============================================================
        // 1. ربط أحداث النموذج
        // ============================================================
        if (DOM.form) {
            DOM.form.addEventListener('submit', saveDocument);
        }

        if (DOM.formResetBtn) {
            DOM.formResetBtn.addEventListener('click', function() {
                if (DOM.form) DOM.form.reset();
                if (DOM.documentId) DOM.documentId.value = '';
                isEditMode = false;
                if (DOM.formTitle) DOM.formTitle.textContent = 'إضافة وثيقة جديدة';
                if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'إضافة';
                
                if (DOM.issueDate) {
                    const today = new Date().toISOString().split('T')[0];
                    DOM.issueDate.value = today;
                }
            });
        }

        // ============================================================
        // 2. ربط أحداث البحث والتصفية
        // ============================================================
        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', function() {
                filterDocuments();
            });
        }

        if (DOM.filterType) {
            DOM.filterType.addEventListener('change', function() {
                filterDocuments();
            });
        }

        if (DOM.filterDateFrom) {
            DOM.filterDateFrom.addEventListener('change', function() {
                filterDocuments();
            });
        }

        if (DOM.filterDateTo) {
            DOM.filterDateTo.addEventListener('change', function() {
                filterDocuments();
            });
        }

        // ============================================================
        // 3. ربط أزرار الإجراءات السريعة
        // ============================================================
        if (DOM.addBtn) {
            DOM.addBtn.addEventListener('click', addDocument);
        }

        if (DOM.exportBtn) {
            DOM.exportBtn.addEventListener('click', exportDocuments);
        }

        if (DOM.printBtn) {
            DOM.printBtn.addEventListener('click', printDocuments);
        }

        if (DOM.refreshBtn) {
            DOM.refreshBtn.addEventListener('click', loadDocuments);
        }

        // ============================================================
        // 4. تحميل البيانات الأولية
        // ============================================================
        Promise.all([
            fetchOrphansList(),
            fetchFamiliesList(),
            loadDocuments()
        ]).then(() => {
            console.log('✅ تم تهيئة وحدة إدارة الوثائق بنجاح.');
        }).catch(error => {
            console.error('❌ خطأ في التهيئة:', error.message);
        });
    }

    // ============================================================
    // 8. تشغيل التهيئة
    // ============================================================

    document.addEventListener('DOMContentLoaded', function() {
        initDocumentsModule();
    });

})();