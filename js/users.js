/**
 * ============================================================
 * الملف: users.js
 * الوصف: وحدة إدارة المستخدمين والصلاحيات - إضافة، تعديل، حذف، عرض، بحث، إعادة تعيين كلمة المرور
 * يعتمد على: app.js (الدوال المساعدة)، bcryptjs (تشفير كلمات المرور)
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
        table: document.getElementById('usersTable'),
        tableBody: document.getElementById('usersTableBody'),

        // النموذج (إضافة/تعديل)
        form: document.getElementById('userForm'),
        formModal: document.getElementById('userModal'),
        formTitle: document.getElementById('userFormTitle'),
        formSubmitBtn: document.getElementById('userSubmitBtn'),
        formResetBtn: document.getElementById('userResetBtn'),

        // حقول النموذج
        userId: document.getElementById('userId'),
        username: document.getElementById('username'),
        password: document.getElementById('password'),
        fullName: document.getElementById('fullName'),
        email: document.getElementById('email'),
        phone: document.getElementById('phone'),
        roleId: document.getElementById('roleId'),
        isActive: document.getElementById('isActive'),

        // حقول إضافية
        passwordHelp: document.getElementById('passwordHelp'),

        // أزرار البحث والتصفية
        searchInput: document.getElementById('searchUsers'),
        filterRole: document.getElementById('filterRole'),
        filterActive: document.getElementById('filterActive'),

        // أزرار الإجراءات السريعة
        addBtn: document.getElementById('addUserBtn'),
        exportBtn: document.getElementById('exportUsersBtn'),
        printBtn: document.getElementById('printUsersBtn'),
        refreshBtn: document.getElementById('refreshUsersBtn')
    };

    // ============================================================
    // 2. متغيرات الحالة
    // ============================================================
    let usersData = [];
    let rolesList = [];
    let dataTable = null;
    let isEditMode = false;

    // ============================================================
    // 3. الدوال الأساسية
    // ============================================================

    /**
     * جلب قائمة المستخدمين من الخادم
     * @param {Object} filters - معاملات التصفية (اختياري)
     * @returns {Promise<Array>} قائمة المستخدمين
     */
    async function fetchUsers(filters = {}) {
        try {
            const response = await fetch('/api/users?' + new URLSearchParams(filters));
            if (!response.ok) throw new Error('فشل في جلب بيانات المستخدمين');
            const data = await response.json();
            usersData = data;
            return data;
        } catch (error) {
            console.error('❌ خطأ في جلب المستخدمين:', error.message);
            window.AlShawkani.App.showError('تعذر جلب بيانات المستخدمين. يرجى المحاولة مرة أخرى.');
            return [];
        }
    }

    /**
     * جلب قائمة الأدوار (الصلاحيات) للقوائم المنسدلة
     */
    async function fetchRolesList() {
        try {
            const response = await fetch('/api/roles');
            if (!response.ok) throw new Error('فشل في جلب قائمة الأدوار');
            rolesList = await response.json();
            populateRoleSelect();
        } catch (error) {
            console.error('❌ خطأ في جلب الأدوار:', error.message);
        }
    }

    /**
     * ملء قائمة الأدوار المنسدلة
     */
    function populateRoleSelect() {
        if (!DOM.roleId) return;
        
        const emptyOption = DOM.roleId.querySelector('option[value=""]');
        DOM.roleId.innerHTML = '';
        if (emptyOption) DOM.roleId.appendChild(emptyOption);
        
        rolesList.forEach(role => {
            const option = document.createElement('option');
            option.value = role.RoleID;
            option.textContent = role.RoleName || `دور ${role.RoleID}`;
            DOM.roleId.appendChild(option);
        });
    }

    /**
     * عرض المستخدمين في الجدول (باستخدام DataTables)
     */
    function renderUsersTable() {
        if (!DOM.tableBody) return;

        if (dataTable) {
            dataTable.destroy();
            dataTable = null;
        }

        if (!usersData || usersData.length === 0) {
            DOM.tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <i class="fas fa-users fa-2x d-block mb-2 text-muted"></i>
                        <h6 class="text-muted">لا يوجد مستخدمين مسجلين</h6>
                        <p class="text-muted small">يمكنك إضافة مستخدم جديد بالضغط على زر "إضافة مستخدم"</p>
                    </td>
                </tr>
            `;
            return;
        }

        let rows = '';
        usersData.forEach(user => {
            // اسم الدور
            const role = rolesList.find(r => r.RoleID == user.RoleID);
            const roleName = role ? role.RoleName : (user.RoleID || '—');

            // حالة النشاط
            const activeBadge = user.IsActive == 1 ? 
                '<span class="badge bg-success">نشط</span>' : 
                '<span class="badge bg-danger">غير نشط</span>';

            // تاريخ آخر تسجيل دخول
            const lastLogin = user.LastLogin ? 
                window.AlShawkani.App.formatDateTimeArabic(user.LastLogin) : '—';

            rows += `
                <tr data-id="${user.UserID}">
                    <td>
                        <span class="fw-semibold">${user.FullName || '—'}</span>
                        <br>
                        <small class="text-muted">@${user.Username || '—'}</small>
                    </td>
                    <td>${user.Email || '—'}</td>
                    <td>${user.Phone || '—'}</td>
                    <td>${roleName}</td>
                    <td>${activeBadge}</td>
                    <td>${lastLogin}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary view-user" data-id="${user.UserID}" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-warning edit-user" data-id="${user.UserID}" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger reset-password" data-id="${user.UserID}" title="إعادة تعيين كلمة المرور">
                                <i class="fas fa-key"></i>
                            </button>
                            <button class="btn btn-outline-danger delete-user" data-id="${user.UserID}" title="حذف">
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
                dataTable = window.AlShawkani.App.initDataTable('#usersTable', {
                    order: [[0, 'asc']],
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
        document.querySelectorAll('.view-user').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                viewUser(id);
            });
        });

        document.querySelectorAll('.edit-user').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                editUser(id);
            });
        });

        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                deleteUser(id);
            });
        });

        document.querySelectorAll('.reset-password').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                resetPassword(id);
            });
        });
    }

    // ============================================================
    // 4. عمليات CRUD الأساسية
    // ============================================================

    /**
     * عرض تفاصيل مستخدم
     * @param {number} id - معرف المستخدم
     */
    async function viewUser(id) {
        try {
            const user = usersData.find(u => u.UserID == id);
            if (!user) {
                window.AlShawkani.App.showWarning('المستخدم غير موجود');
                return;
            }

            const role = rolesList.find(r => r.RoleID == user.RoleID);

            const details = `
                <div dir="rtl" class="p-3">
                    <h5 class="border-bottom pb-2 mb-3">${user.FullName}</h5>
                    <div class="row g-2">
                        <div class="col-6"><strong>معرف المستخدم:</strong> ${user.UserID || '—'}</div>
                        <div class="col-6"><strong>اسم المستخدم:</strong> @${user.Username || '—'}</div>
                        <div class="col-6"><strong>الاسم الكامل:</strong> ${user.FullName || '—'}</div>
                        <div class="col-6"><strong>البريد الإلكتروني:</strong> ${user.Email || '—'}</div>
                        <div class="col-6"><strong>الهاتف:</strong> ${user.Phone || '—'}</div>
                        <div class="col-6"><strong>الدور:</strong> ${role ? role.RoleName : (user.RoleID || '—')}</div>
                        <div class="col-6"><strong>الحالة:</strong> ${user.IsActive == 1 ? 'نشط' : 'غير نشط'}</div>
                        <div class="col-6"><strong>آخر تسجيل دخول:</strong> ${user.LastLogin ? window.AlShawkani.App.formatDateTimeArabic(user.LastLogin) : '—'}</div>
                        <div class="col-12"><strong>تاريخ الإنشاء:</strong> ${user.CreatedAt ? window.AlShawkani.App.formatDateTimeArabic(user.CreatedAt) : '—'}</div>
                    </div>
                </div>
            `;

            window.AlShawkani.App.showInfo(details, 10000);

        } catch (error) {
            console.error('❌ خطأ في عرض التفاصيل:', error.message);
            window.AlShawkani.App.showError('تعذر عرض تفاصيل المستخدم.');
        }
    }

    /**
     * فتح نموذج إضافة مستخدم جديد
     */
    function addUser() {
        isEditMode = false;
        if (DOM.formTitle) DOM.formTitle.textContent = 'إضافة مستخدم جديد';
        if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'إضافة';
        if (DOM.userId) DOM.userId.value = '';
        
        if (DOM.form) DOM.form.reset();
        
        // تعيين الحالة الافتراضية إلى نشط
        if (DOM.isActive) DOM.isActive.checked = true;
        
        // إظهار حقل كلمة المرور وإخفاء رسالة المساعدة الخاصة بالتعديل
        if (DOM.password) {
            DOM.password.disabled = false;
            DOM.password.required = true;
            DOM.password.parentElement.style.display = 'block';
        }
        if (DOM.passwordHelp) {
            DOM.passwordHelp.textContent = 'كلمة المرور يجب أن تكون على الأقل 6 أحرف.';
            DOM.passwordHelp.style.display = 'block';
        }

        if (DOM.formModal) {
            const modal = new bootstrap.Modal(DOM.formModal);
            modal.show();
        }
    }

    /**
     * فتح نموذج تعديل مستخدم موجود
     * @param {number} id - معرف المستخدم
     */
    async function editUser(id) {
        try {
            const user = usersData.find(u => u.UserID == id);
            if (!user) {
                window.AlShawkani.App.showWarning('المستخدم غير موجود');
                return;
            }

            isEditMode = true;
            if (DOM.formTitle) DOM.formTitle.textContent = 'تعديل بيانات المستخدم';
            if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'تحديث';
            
            fillForm(user);
            
            // في وضع التعديل، حقل كلمة المرور اختياري (لإعادة التعيين فقط)
            if (DOM.password) {
                DOM.password.disabled = false;
                DOM.password.required = false;
                DOM.password.value = '';
                DOM.password.placeholder = 'اتركه فارغاً إذا لم ترغب في التغيير';
                DOM.password.parentElement.style.display = 'block';
            }
            if (DOM.passwordHelp) {
                DOM.passwordHelp.textContent = 'اترك حقل كلمة المرور فارغاً إذا لم ترغب في تغييرها.';
                DOM.passwordHelp.style.display = 'block';
            }

            if (DOM.formModal) {
                const modal = new bootstrap.Modal(DOM.formModal);
                modal.show();
            }
        } catch (error) {
            console.error('❌ خطأ في فتح التعديل:', error.message);
            window.AlShawkani.App.showError('تعذر فتح بيانات المستخدم للتعديل.');
        }
    }

    /**
     * ملء نموذج التعديل بالبيانات
     * @param {Object} user - بيانات المستخدم
     */
    function fillForm(user) {
        if (DOM.userId) DOM.userId.value = user.UserID || '';
        if (DOM.username) DOM.username.value = user.Username || '';
        if (DOM.fullName) DOM.fullName.value = user.FullName || '';
        if (DOM.email) DOM.email.value = user.Email || '';
        if (DOM.phone) DOM.phone.value = user.Phone || '';
        if (DOM.roleId) DOM.roleId.value = user.RoleID || '';
        if (DOM.isActive) DOM.isActive.checked = user.IsActive == 1;
    }

    /**
     * حفظ المستخدم (إضافة أو تحديث)
     */
    async function saveUser(event) {
        event.preventDefault();

        const formData = new FormData(DOM.form);
        const data = Object.fromEntries(formData.entries());
        
        // معالجة حقل isActive (checkbox)
        data.isActive = DOM.isActive ? (DOM.isActive.checked ? 1 : 0) : 0;

        // التحقق من الحقول الأساسية
        if (!data.username || !data.fullName) {
            window.AlShawkani.App.showWarning('يرجى ملء جميع الحقول الأساسية (اسم المستخدم والاسم الكامل).');
            return;
        }

        // التحقق من كلمة المرور في حالة الإضافة
        if (!isEditMode && (!data.password || data.password.length < 6)) {
            window.AlShawkani.App.showWarning('كلمة المرور يجب أن تكون على الأقل 6 أحرف.');
            return;
        }

        // في حالة التعديل، إذا كان حقل كلمة المرور فارغاً، نحذفه من البيانات
        if (isEditMode && (!data.password || data.password.trim() === '')) {
            delete data.password;
        }

        if (DOM.formSubmitBtn) {
            DOM.formSubmitBtn.disabled = true;
            DOM.formSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        }

        try {
            let response;
            const url = isEditMode ? `/api/users/${data.userId}` : '/api/users';
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
            window.AlShawkani.App.showSuccess(isEditMode ? 'تم تحديث بيانات المستخدم بنجاح' : 'تم إضافة المستخدم بنجاح');

            if (DOM.formModal) {
                const modal = bootstrap.Modal.getInstance(DOM.formModal);
                if (modal) modal.hide();
            }

            await loadUsers();

        } catch (error) {
            console.error('❌ خطأ في حفظ المستخدم:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حفظ البيانات. يرجى المحاولة مرة أخرى.');
        } finally {
            if (DOM.formSubmitBtn) {
                DOM.formSubmitBtn.disabled = false;
                DOM.formSubmitBtn.textContent = isEditMode ? 'تحديث' : 'إضافة';
            }
        }
    }

    /**
     * حذف مستخدم
     * @param {number} id - معرف المستخدم
     */
    async function deleteUser(id) {
        const user = usersData.find(u => u.UserID == id);
        if (!user) return;

        // منع حذف المدير الرئيسي (admin)
        if (user.Username === 'admin') {
            window.AlShawkani.App.showWarning('لا يمكن حذف المستخدم المدير الرئيسي (admin).');
            return;
        }

        const confirmed = await window.AlShawkani.App.confirmAction(
            `هل أنت متأكد من حذف المستخدم "${user.FullName}" (${user.Username})؟`,
            'تأكيد الحذف',
            'نعم، حذف',
            'إلغاء'
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في حذف المستخدم');
            }

            window.AlShawkani.App.showSuccess('تم حذف المستخدم بنجاح');
            await loadUsers();

        } catch (error) {
            console.error('❌ خطأ في حذف المستخدم:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر حذف المستخدم.');
        }
    }

    /**
     * إعادة تعيين كلمة مرور المستخدم
     * @param {number} id - معرف المستخدم
     */
    async function resetPassword(id) {
        const user = usersData.find(u => u.UserID == id);
        if (!user) return;

        // منع إعادة تعيين كلمة مرور المدير الرئيسي (اختياري، يمكن تفعيله)
        if (user.Username === 'admin') {
            window.AlShawkani.App.showWarning('لا يمكن إعادة تعيين كلمة مرور المدير الرئيسي (admin) من هنا.');
            return;
        }

        // طلب كلمة مرور جديدة من المستخدم
        const newPassword = prompt(`أدخل كلمة المرور الجديدة للمستخدم "${user.FullName}" (${user.Username}):`);
        if (newPassword === null) return; // إلغاء

        if (newPassword.length < 6) {
            window.AlShawkani.App.showWarning('كلمة المرور يجب أن تكون على الأقل 6 أحرف.');
            return;
        }

        // تأكيد كلمة المرور
        const confirmPassword = prompt('أعد إدخال كلمة المرور الجديدة للتأكيد:');
        if (confirmPassword === null) return;
        if (newPassword !== confirmPassword) {
            window.AlShawkani.App.showWarning('كلمات المرور غير متطابقة.');
            return;
        }

        try {
            const response = await fetch(`/api/users/${id}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ password: newPassword })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'فشل في إعادة تعيين كلمة المرور');
            }

            window.AlShawkani.App.showSuccess(`تم إعادة تعيين كلمة مرور المستخدم "${user.FullName}" بنجاح.`);

        } catch (error) {
            console.error('❌ خطأ في إعادة تعيين كلمة المرور:', error.message);
            window.AlShawkani.App.showError(error.message || 'تعذر إعادة تعيين كلمة المرور.');
        }
    }

    // ============================================================
    // 5. البحث والتصفية
    // ============================================================

    function filterUsers() {
        const searchTerm = DOM.searchInput ? DOM.searchInput.value.toLowerCase().trim() : '';
        const roleFilter = DOM.filterRole ? DOM.filterRole.value : '';
        const activeFilter = DOM.filterActive ? DOM.filterActive.value : '';

        let filtered = usersData;

        if (searchTerm) {
            filtered = filtered.filter(u =>
                (u.FullName && u.FullName.toLowerCase().includes(searchTerm)) ||
                (u.Username && u.Username.toLowerCase().includes(searchTerm)) ||
                (u.Email && u.Email.toLowerCase().includes(searchTerm))
            );
        }

        if (roleFilter) {
            filtered = filtered.filter(u => u.RoleID == roleFilter);
        }

        if (activeFilter !== '') {
            filtered = filtered.filter(u => u.IsActive == parseInt(activeFilter));
        }

        usersData = filtered;
        renderUsersTable();
    }

    // ============================================================
    // 6. تصدير وطباعة
    // ============================================================

    function exportUsers() {
        if (!usersData || usersData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للتصدير.');
            return;
        }

        const headers = ['معرف المستخدم', 'اسم المستخدم', 'الاسم الكامل', 'البريد الإلكتروني', 
            'الهاتف', 'الدور', 'الحالة', 'آخر تسجيل دخول', 'تاريخ الإنشاء'];

        const data = usersData.map(u => {
            const role = rolesList.find(r => r.RoleID == u.RoleID);
            return [
                u.UserID || '', u.Username || '', u.FullName || '', u.Email || '', 
                u.Phone || '', role ? role.RoleName : (u.RoleID || '—'), 
                u.IsActive == 1 ? 'نشط' : 'غير نشط', 
                u.LastLogin || '', u.CreatedAt || ''
            ];
        });

        window.AlShawkani.App.exportToCSV(data, 'المستخدمين.csv', headers);
    }

    function printUsers() {
        if (!usersData || usersData.length === 0) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للطباعة.');
            return;
        }

        const tableHTML = `
            <h3 style="text-align:center; margin-bottom:20px;">قائمة المستخدمين - نظام الشوكاني</h3>
            <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; text-align:right; font-size:12px;">
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th>اسم المستخدم</th>
                        <th>الاسم الكامل</th>
                        <th>البريد الإلكتروني</th>
                        <th>الدور</th>
                        <th>الحالة</th>
                        <th>آخر تسجيل دخول</th>
                    </tr>
                </thead>
                <tbody>
                    ${usersData.map(u => {
                        const role = rolesList.find(r => r.RoleID == u.RoleID);
                        return `
                        <tr>
                            <td>@${u.Username || '—'}</td>
                            <td>${u.FullName || '—'}</td>
                            <td>${u.Email || '—'}</td>
                            <td>${role ? role.RoleName : (u.RoleID || '—')}</td>
                            <td>${u.IsActive == 1 ? 'نشط' : 'غير نشط'}</td>
                            <td>${u.LastLogin ? window.AlShawkani.App.formatDateTimeArabic(u.LastLogin) : '—'}</td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
            <p style="text-align:center; margin-top:20px; font-size:11px; color:#999;">
                تم الطباعة من نظام الشوكاني - تاريخ ${new Date().toLocaleDateString('ar-EG')}
            </p>
        `;

        window.AlShawkani.App.printElement(tableHTML, 'قائمة المستخدمين');
    }

    // ============================================================
    // 7. ربط الأحداث وتهيئة الوحدة
    // ============================================================

    /**
     * تحميل البيانات وتحديث الجدول
     */
    async function loadUsers() {
        try {
            const data = await fetchUsers();
            usersData = data;
            renderUsersTable();
        } catch (error) {
            console.error('❌ خطأ في تحميل المستخدمين:', error.message);
        }
    }

    /**
     * تهيئة وحدة المستخدمين
     */
    function initUsersModule() {
        console.log('🚀 تهيئة وحدة إدارة المستخدمين...');

        if (!DOM.tableBody) {
            console.warn('⚠️ جدول المستخدمين غير موجود في الصفحة.');
            return;
        }

        // ============================================================
        // 1. ربط أحداث النموذج
        // ============================================================
        if (DOM.form) {
            DOM.form.addEventListener('submit', saveUser);
        }

        if (DOM.formResetBtn) {
            DOM.formResetBtn.addEventListener('click', function() {
                if (DOM.form) DOM.form.reset();
                if (DOM.userId) DOM.userId.value = '';
                isEditMode = false;
                if (DOM.formTitle) DOM.formTitle.textContent = 'إضافة مستخدم جديد';
                if (DOM.formSubmitBtn) DOM.formSubmitBtn.textContent = 'إضافة';
                
                if (DOM.isActive) DOM.isActive.checked = true;
                if (DOM.password) {
                    DOM.password.disabled = false;
                    DOM.password.required = true;
                    DOM.password.value = '';
                    DOM.password.placeholder = '';
                }
                if (DOM.passwordHelp) {
                    DOM.passwordHelp.textContent = 'كلمة المرور يجب أن تكون على الأقل 6 أحرف.';
                    DOM.passwordHelp.style.display = 'block';
                }
            });
        }

        // ============================================================
        // 2. ربط أحداث البحث والتصفية
        // ============================================================
        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', function() {
                filterUsers();
            });
        }

        if (DOM.filterRole) {
            DOM.filterRole.addEventListener('change', function() {
                filterUsers();
            });
        }

        if (DOM.filterActive) {
            DOM.filterActive.addEventListener('change', function() {
                filterUsers();
            });
        }

        // ============================================================
        // 3. ربط أزرار الإجراءات السريعة
        // ============================================================
        if (DOM.addBtn) {
            DOM.addBtn.addEventListener('click', addUser);
        }

        if (DOM.exportBtn) {
            DOM.exportBtn.addEventListener('click', exportUsers);
        }

        if (DOM.printBtn) {
            DOM.printBtn.addEventListener('click', printUsers);
        }

        if (DOM.refreshBtn) {
            DOM.refreshBtn.addEventListener('click', loadUsers);
        }

        // ============================================================
        // 4. تحميل البيانات الأولية
        // ============================================================
        Promise.all([
            fetchRolesList(),
            loadUsers()
        ]).then(() => {
            console.log('✅ تم تهيئة وحدة إدارة المستخدمين بنجاح.');
        }).catch(error => {
            console.error('❌ خطأ في التهيئة:', error.message);
        });
    }

    // ============================================================
    // 8. تشغيل التهيئة
    // ============================================================

    document.addEventListener('DOMContentLoaded', function() {
        initUsersModule();
    });

})();