/**
 * ============================================================
 * الملف: dashboard.js
 * الوصف: منطق لوحة التحكم - جلب البيانات، رسم المخططات، إدارة الواجهة
 * يتطلب: Chart.js، Fetch API
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. عناصر DOM الأساسية
    // ============================================================
    const userNameElement = document.getElementById('userName');
    const userAvatarElement = document.getElementById('userAvatar');
    const currentDateElement = document.getElementById('currentDate');

    // عناصر الإحصائيات
    const totalOrphansEl = document.getElementById('totalOrphans');
    const activeSponsorshipsEl = document.getElementById('activeSponsorships');
    const totalFamiliesEl = document.getElementById('totalFamilies');
    const totalAidEl = document.getElementById('totalAid');

    // زر طي القائمة الجانبية
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    const wrapper = document.querySelector('.wrapper');

    // ============================================================
    // 2. الدوال المساعدة
    // ============================================================

    /**
     * عرض التاريخ الحالي بتنسيق عربي
     */
    function updateCurrentDate() {
        if (!currentDateElement) return;
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        };
        // تنسيق التاريخ باللغة العربية
        const dateString = now.toLocaleDateString('ar-EG', options);
        currentDateElement.textContent = dateString;
    }

    /**
     * جلب معلومات المستخدم من الجلسة
     */
    async function loadUserInfo() {
        try {
            const response = await fetch('/api/session');
            if (!response.ok) throw new Error('فشل في جلب بيانات الجلسة');
            
            const data = await response.json();
            
            if (data.loggedIn && data.fullName) {
                // عرض الاسم الكامل
                if (userNameElement) {
                    userNameElement.textContent = data.fullName;
                }
                // عرض الحرف الأول من الاسم في الصورة الرمزية
                if (userAvatarElement) {
                    const firstChar = data.fullName.trim().charAt(0) || 'م';
                    userAvatarElement.textContent = firstChar;
                }
            } else {
                // إذا لم يكن مسجل الدخول، أعد التوجيه إلى صفحة تسجيل الدخول
                window.location.href = '/';
            }
        } catch (error) {
            console.warn('⚠️ تعذر جلب معلومات المستخدم، استخدام بيانات افتراضية:', error.message);
            // بيانات افتراضية في حالة فشل الجلب (تجنب ظهور أخطاء)
            if (userNameElement) userNameElement.textContent = 'مدير النظام';
            if (userAvatarElement) userAvatarElement.textContent = 'م';
        }
    }

    // ============================================================
    // 3. جلب الإحصائيات (مع بيانات وهمية احتياطية)
    // ============================================================

    /**
     * جلب إحصائيات النظام من الخادم
     * المسار المتوقع: /api/stats
     * الإرجاع: { totalOrphans, activeSponsorships, totalFamilies, totalAid }
     */
    async function loadStatistics() {
        // بيانات وهمية (Mock Data) لعرضها فوراً حتى لا تظهر الصفحة فارغة
        // سيتم استبدال هذه البيانات بقيم حقيقية من قاعدة البيانات لاحقاً
        const defaultStats = {
            totalOrphans: 0,
            activeSponsorships: 0,
            totalFamilies: 0,
            totalAid: 0
        };

        try {
            const response = await fetch('/api/stats');
            if (!response.ok) {
                // إذا كان الخادم لا يقدم هذه النقطة بعد، استخدم البيانات الوهمية
                console.warn('⚠️ نقطة /api/stats غير متوفرة، استخدام بيانات وهمية.');
                updateStatsUI(defaultStats);
                return;
            }
            
            const stats = await response.json();
            // التأكد من وجود جميع الحقول
            const safeStats = {
                totalOrphans: stats.totalOrphans || 0,
                activeSponsorships: stats.activeSponsorships || 0,
                totalFamilies: stats.totalFamilies || 0,
                totalAid: stats.totalAid || 0
            };
            updateStatsUI(safeStats);
            
        } catch (error) {
            console.warn('⚠️ خطأ في جلب الإحصائيات، استخدام بيانات وهمية:', error.message);
            updateStatsUI(defaultStats);
        }
    }

    /**
     * تحديث واجهة المستخدم بقيم الإحصائيات
     */
    function updateStatsUI(stats) {
        if (totalOrphansEl) totalOrphansEl.textContent = stats.totalOrphans.toLocaleString('ar-EG');
        if (activeSponsorshipsEl) activeSponsorshipsEl.textContent = stats.activeSponsorships.toLocaleString('ar-EG');
        if (totalFamiliesEl) totalFamiliesEl.textContent = stats.totalFamilies.toLocaleString('ar-EG');
        if (totalAidEl) totalAidEl.textContent = stats.totalAid.toLocaleString('ar-EG');
    }

    // ============================================================
    // 4. رسم المخطط البياني (Chart.js)
    // ============================================================

    /**
     * تهيئة مخطط توزيع الأيتام
     * المسار المتوقع: /api/chart-data
     * الإرجاع: { labels: ['نشط', 'منقطع', 'منتهي'], values: [10, 2, 1] }
     */
    async function initOrphansChart() {
        const canvas = document.getElementById('orphansChart');
        if (!canvas) return;

        // بيانات وهمية للمخطط (سيتم جلبها من الخادم لاحقاً)
        let chartData = {
            labels: ['نشط', 'منقطع', 'منتهي'],
            values: [0, 0, 0]
        };

        try {
            const response = await fetch('/api/chart-data');
            if (response.ok) {
                const data = await response.json();
                chartData = {
                    labels: data.labels || ['نشط', 'منقطع', 'منتهي'],
                    values: data.values || [0, 0, 0]
                };
            } else {
                console.warn('⚠️ نقطة /api/chart-data غير متوفرة، استخدام بيانات وهمية.');
                // بيانات وهمية نموذجية
                chartData = {
                    labels: ['نشط', 'منقطع', 'منتهي'],
                    values: [12, 3, 1]
                };
            }
        } catch (error) {
            console.warn('⚠️ خطأ في جلب بيانات المخطط، استخدام بيانات وهمية:', error.message);
            chartData = {
                labels: ['نشط', 'منقطع', 'منتهي'],
                values: [12, 3, 1]
            };
        }

        // إعداد المخطط
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'bar', // يمكن تغييره إلى 'pie' أو 'doughnut' حسب الرغبة
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'عدد الأيتام',
                    data: chartData.values,
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.8)',  // أخضر للنشط
                        'rgba(255, 193, 7, 0.8)',  // أصفر للمنقطع
                        'rgba(220, 53, 69, 0.8)'   // أحمر للمنتهي
                    ],
                    borderColor: [
                        'rgba(40, 167, 69, 1)',
                        'rgba(255, 193, 7, 1)',
                        'rgba(220, 53, 69, 1)'
                    ],
                    borderWidth: 2,
                    borderRadius: 8,
                    barPercentage: 0.6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // إخفاء الأسطورة لأن الألوان معبرة
                    },
                    tooltip: {
                        rtl: true,
                        titleFont: { family: 'Segoe UI, Tahoma, sans-serif' },
                        bodyFont: { family: 'Segoe UI, Tahoma, sans-serif' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { family: 'Segoe UI, Tahoma, sans-serif' }
                        }
                    },
                    x: {
                        ticks: {
                            font: { family: 'Segoe UI, Tahoma, sans-serif' }
                        }
                    }
                },
                // دعم RTL في المخطط
                locale: 'ar-EG'
            }
        });
    }

    // ============================================================
    // 5. جلب النشاطات الأخيرة
    // ============================================================

    /**
     * جلب آخر 5 نشاطات من سجل العمليات
     * المسار المتوقع: /api/activities
     * الإرجاع: [{ icon, iconClass, title, time }]
     */
    async function loadRecentActivities() {
        const container = document.getElementById('recentActivities');
        if (!container) return;

        // بيانات وهمية (سيتم جلبها من الخادم لاحقاً)
        const defaultActivities = [
            { icon: 'fa-user-plus', iconClass: 'bg-success-subtle text-success', title: 'تم إضافة يتيم جديد', time: 'منذ 5 دقائق' },
            { icon: 'fa-hand-holding-heart', iconClass: 'bg-primary-subtle text-primary', title: 'تم تحديث كفالة', time: 'منذ 20 دقيقة' },
            { icon: 'fa-gift', iconClass: 'bg-warning-subtle text-warning', title: 'تم تسجيل مساعدة جديدة', time: 'منذ ساعة' },
            { icon: 'fa-user-check', iconClass: 'bg-info-subtle text-info', title: 'تسجيل دخول مستخدم جديد', time: 'منذ 3 ساعات' }
        ];

        try {
            const response = await fetch('/api/activities');
            if (!response.ok) {
                console.warn('⚠️ نقطة /api/activities غير متوفرة، استخدام بيانات وهمية.');
                renderActivities(container, defaultActivities);
                return;
            }
            
            const activities = await response.json();
            if (Array.isArray(activities) && activities.length > 0) {
                renderActivities(container, activities);
            } else {
                renderActivities(container, defaultActivities);
            }
        } catch (error) {
            console.warn('⚠️ خطأ في جلب النشاطات، استخدام بيانات وهمية:', error.message);
            renderActivities(container, defaultActivities);
        }
    }

    /**
     * عرض النشاطات في واجهة المستخدم
     */
    function renderActivities(container, activities) {
        container.innerHTML = ''; // تنظيف المحتوى القديم

        activities.forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item d-flex align-items-center gap-3';

            // أيقونة النشاط
            const iconDiv = document.createElement('div');
            iconDiv.className = `activity-icon ${activity.iconClass || 'bg-secondary-subtle text-secondary'}`;
            iconDiv.innerHTML = `<i class="fas ${activity.icon || 'fa-circle'}"></i>`;

            // المحتوى النصي
            const contentDiv = document.createElement('div');
            contentDiv.className = 'flex-grow-1';
            contentDiv.innerHTML = `
                <div class="fw-semibold small">${activity.title || 'نشاط جديد'}</div>
                <div class="text-muted small">${activity.time || 'الآن'}</div>
            `;

            item.appendChild(iconDiv);
            item.appendChild(contentDiv);
            container.appendChild(item);
        });
    }

    // ============================================================
    // 6. إدارة القائمة الجانبية (Toggle Sidebar)
    // ============================================================

    function initSidebarToggle() {
        if (!toggleSidebarBtn || !wrapper) return;

        // التحقق من حالة القائمة المخزنة في localStorage
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (isCollapsed) {
            wrapper.classList.add('sidebar-collapsed');
        }

        // عند النقر على زر التبديل
        toggleSidebarBtn.addEventListener('click', function() {
            wrapper.classList.toggle('sidebar-collapsed');
            const collapsed = wrapper.classList.contains('sidebar-collapsed');
            localStorage.setItem('sidebarCollapsed', collapsed);
        });

        // في وضعية الموبايل، نعرض القائمة عند النقر
        // (Bootstrap أو CSS سيتولى ذلك، لكننا نضمن عمل الزر)
    }

    // ============================================================
    // 7. التحقق من صحة الجلسة (حماية إضافية)
    // ============================================================

    async function checkSession() {
        try {
            const response = await fetch('/api/session');
            if (!response.ok) {
                window.location.href = '/';
                return;
            }
            const data = await response.json();
            if (!data.loggedIn) {
                window.location.href = '/';
            }
        } catch (error) {
            console.warn('⚠️ تعذر التحقق من الجلسة، إعادة التوجيه لتسجيل الدخول.');
            window.location.href = '/';
        }
    }

    // ============================================================
    // 8. تهيئة الصفحة (تشغيل جميع الدوال)
    // ============================================================

    document.addEventListener('DOMContentLoaded', function() {
        // أولاً: تأكد من أن المستخدم مسجل الدخول
        // (في حالة تعطل fetch، سيتم تجاهل إعادة التوجيه، لكننا نفضل أن نمررها)
        checkSession().then(() => {
            // تحميل المعلومات والبيانات
            updateCurrentDate();
            loadUserInfo();
            loadStatistics();
            initOrphansChart();
            loadRecentActivities();
            initSidebarToggle();
        }).catch(() => {
            // في حالة فشل checkSession، نحمّل البيانات العادية مع إعادة توجيه خفيف
            updateCurrentDate();
            loadUserInfo();
            loadStatistics();
            initOrphansChart();
            loadRecentActivities();
            initSidebarToggle();
        });

        // عرض رسالة في الكونسول للتأكيد
        console.log('✅ تم تهيئة لوحة التحكم (Dashboard) بنجاح.');
    });

})();