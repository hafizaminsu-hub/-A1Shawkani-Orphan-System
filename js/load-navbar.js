/**
 * ============================================================
 * الملف: load-navbar.js
 * الوصف: تحميل الـ Navbar الموحد في جميع الصفحات دون التأثير على المحتوى
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. تحميل الـ Navbar
    // ============================================================
    const navbarContainer = document.getElementById('navbarContainer');

    if (!navbarContainer) {
        console.warn('⚠️ عنصر #navbarContainer غير موجود في الصفحة.');
        return;
    }

    fetch('/pages/navbar.html')
        .then(response => {
            if (!response.ok) throw new Error('فشل في تحميل الـ Navbar');
            return response.text();
        })
        .then(html => {
            // استبدال محتوى الـ Navbar فقط دون التأثير على باقي الصفحة
            navbarContainer.innerHTML = html;

            // ============================================================
            // 2. تهيئة الـ Navbar
            // ============================================================

            // زر طي القائمة الجانبية
            const toggleBtn = document.getElementById('toggleSidebar');
            const sidebar = document.getElementById('sidebar');

            if (toggleBtn && sidebar) {
                toggleBtn.addEventListener('click', function() {
                    sidebar.classList.toggle('sidebar-collapsed');
                });
            }

            // اسم المستخدم
            const userNameEl = document.getElementById('userName');
            const userAvatarEl = document.getElementById('userAvatar');

            if (userNameEl && userAvatarEl) {
                fetch('/api/session')
                    .then(res => res.json())
                    .then(data => {
                        if (data.loggedIn && data.fullName) {
                            userNameEl.textContent = data.fullName;
                            userAvatarEl.textContent = data.fullName.charAt(0);
                        }
                    })
                    .catch(() => {
                        userNameEl.textContent = 'مدير النظام';
                        userAvatarEl.textContent = 'م';
                    });
            }

            console.log('✅ تم تحميل الـ Navbar بنجاح.');
        })
        .catch(error => {
            console.error('❌ خطأ في تحميل الـ Navbar:', error.message);
            navbarContainer.innerHTML = `
                <nav class="navbar-top">
                    <span class="text-danger">⚠️ تعذر تحميل الـ Navbar</span>
                </nav>
            `;
        });

})();
