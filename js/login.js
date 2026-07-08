/**
 * ============================================================
 * الملف: login.js
 * الوصف: منطق صفحة تسجيل الدخول - التحقق، الإرسال، عرض الأخطاء، إدارة الجلسة
 * يتطلب: Fetch API، DOM Manipulation
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. عناصر DOM
    // ============================================================
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');
    const errorMessageSpan = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');

    // ============================================================
    // 2. التحقق من الجلسة (إعادة التوجيه إذا كان مسجلاً بالفعل)
    // ============================================================
    async function checkSessionAndRedirect() {
        try {
            const response = await fetch('/api/session');
            if (response.ok) {
                const data = await response.json();
                if (data.loggedIn) {
                    // إذا كان المستخدم مسجلاً بالفعل، أعد توجيهه إلى لوحة التحكم
                    console.log('✅ جلسة نشطة، إعادة توجيه إلى لوحة التحكم.');
                    window.location.href = '/dashboard';
                }
            }
        } catch (error) {
            // في حالة فشل الاتصال بالخادم، لا تفعل شيئاً (يبقى في صفحة تسجيل الدخول)
            console.warn('⚠️ تعذر التحقق من الجلسة:', error.message);
        }
    }

    // ============================================================
    // 3. عرض رسائل الخطأ
    // ============================================================
    function showError(message) {
        if (loginError && errorMessageSpan) {
            errorMessageSpan.textContent = message;
            loginError.style.display = 'block';
            // تمرير سلس للرسالة لجذب انتباه المستخدم
            loginError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function hideError() {
        if (loginError) {
            loginError.style.display = 'none';
        }
    }

    // ============================================================
    // 4. معالجة إرسال النموذج (باستخدام fetch)
    // ============================================================
    async function handleLogin(event) {
        // منع السلوك الافتراضي لإرسال النموذج (إعادة تحميل الصفحة)
        event.preventDefault();

        // الحصول على قيم الحقول وإزالة الفراغات الزائدة
        const username = usernameInput ? usernameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value.trim() : '';

        // التحقق من صحة الحقول
        if (!username || !password) {
            showError('يرجى ملء جميع الحقول قبل المتابعة.');
            if (!username) {
                usernameInput.focus();
            } else {
                passwordInput.focus();
            }
            return;
        }

        // إخفاء أي خطأ سابق
        hideError();

        // تعطيل الزر ومنع النقر المتكرر (تحسين تجربة المستخدم)
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> جاري التحقق...';
        }

        try {
            // إعداد البيانات للإرسال (بنفس تنسيق FormData)
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            // إرسال طلب POST إلى الخادم
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
                // السماح بإرسال ملفات تعريف الارتباط (للجلسة)
                credentials: 'same-origin'
            });

            // معالجة الاستجابة بناءً على حالة HTTP
            if (response.redirected) {
                // إذا قام الخادم بإعادة التوجيه (status 302)
                const redirectUrl = response.url;
                console.log(`🔄 إعادة توجيه إلى: ${redirectUrl}`);
                
                // إذا كانت إعادة التوجيه إلى لوحة التحكم
                if (redirectUrl.includes('/dashboard')) {
                    // نجاح تسجيل الدخول: ننقل المستخدم إلى لوحة التحكم
                    window.location.href = redirectUrl;
                } else {
                    // إعادة توجيه غير متوقعة (نادراً ما تحدث)
                    window.location.href = redirectUrl;
                }
                return;
            }

            // إذا كانت الاستجابة غير ناجحة (400، 401، 500، إلخ)
            if (!response.ok) {
                // محاولة قراءة رسالة الخطأ من الخادم
                let errorText = await response.text();
                // إذا كانت الرسالة طويلة أو تحتوي على HTML، نأخذ أول 100 حرف فقط
                if (errorText.length > 100 || errorText.includes('<')) {
                    // رسائل الخطأ المخصصة من الخادم عادة ما تكون قصيرة ونصية
                    // ولكن في حال عاد HTML، نعرض رسالة عامة
                    errorText = 'اسم المستخدم أو كلمة المرور غير صحيحة.';
                }
                showError(errorText);
                return;
            }

            // في حالة نجاح الاستجابة ولكن بدون إعادة توجيه (نادر)
            // قد يعيد الخادم نصاً أو JSON، نحاول التوجيه يدوياً إلى لوحة التحكم
            console.log('✅ تم تسجيل الدخول بنجاح (بدون إعادة توجيه)، إعادة توجيه يدوي.');
            window.location.href = '/dashboard';

        } catch (error) {
            // في حالة حدوث خطأ في الشبكة أو الخادم
            console.error('❌ خطأ في الاتصال بالخادم:', error.message);
            showError('حدث خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
        } finally {
            // إعادة تفعيل الزر بعد الانتهاء (في حالة فشل أو نجاح)
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> دخول';
            }
        }
    }

    // ============================================================
    // 5. إخفاء رسالة الخطأ عند كتابة المستخدم
    // ============================================================
    function setupAutoHideError() {
        const inputs = [usernameInput, passwordInput];
        inputs.forEach(input => {
            if (input) {
                input.addEventListener('input', function() {
                    if (loginError && loginError.style.display === 'block') {
                        hideError();
                    }
                });
                // عند النقر على الحقل أيضاً نخفي الخطأ
                input.addEventListener('focus', function() {
                    if (loginError && loginError.style.display === 'block') {
                        hideError();
                    }
                });
            }
        });
    }

    // ============================================================
    // 6. إظهار/إخفاء كلمة المرور (اختياري، يضيف تحسيناً للواجهة)
    // ============================================================
    function addPasswordToggle() {
        // نبحث عن حقل كلمة المرور لمعرفة إذا كان موجوداً
        const passwordField = document.getElementById('password');
        if (!passwordField) return;

        // نبحث عن أيقونة موجودة في واجهة المستخدم أو نضيفها ديناميكياً
        // لكننا سنكتفي بالطريقة البسيطة: إضافة زر صغير بجانب الحقل
        // أو استخدام خاصية HTML5 (نحن نفضل استخدام Font Awesome)
        // هنا نضيف زر تبديل باستخدام JavaScript بحيث لا يؤثر على التصميم الحالي
        const parentDiv = passwordField.closest('.input-group-icon');
        if (!parentDiv) return;

        // نتحقق إذا كان الزر مضافاً بالفعل (لتجنب التكرار)
        if (parentDiv.querySelector('.toggle-password')) return;

        const toggleBtn = document.createElement('i');
        toggleBtn.className = 'fas fa-eye toggle-password';
        toggleBtn.style.cssText = `
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: #adb5bd;
            cursor: pointer;
            z-index: 10;
            font-size: 1.1rem;
            transition: color 0.2s;
        `;
        toggleBtn.setAttribute('role', 'button');
        toggleBtn.setAttribute('aria-label', 'إظهار أو إخفاء كلمة المرور');

        // إضافة الزر إلى الحاوية
        parentDiv.appendChild(toggleBtn);

        // معالجة حدث النقر لإظهار/إخفاء كلمة المرور
        toggleBtn.addEventListener('click', function() {
            const isPassword = passwordField.type === 'password';
            passwordField.type = isPassword ? 'text' : 'password';
            this.className = isPassword ? 'fas fa-eye-slash toggle-password' : 'fas fa-eye toggle-password';
        });
    }

    // ============================================================
    // 7. تهيئة الصفحة (تشغيل جميع الدوال)
    // ============================================================

    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 تهيئة صفحة تسجيل الدخول...');

        // أولاً: التحقق من الجلسة وإعادة التوجيه إذا لزم الأمر
        checkSessionAndRedirect();

        // ثانياً: ربط حدث إرسال النموذج
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        } else {
            console.warn('⚠️ لم يتم العثور على نموذج تسجيل الدخول (#loginForm)');
        }

        // ثالثاً: إخفاء الخطأ تلقائياً عند الكتابة
        setupAutoHideError();

        // رابعاً: إضافة زر إظهار/إخفاء كلمة المرور (تحسين تجربة المستخدم)
        addPasswordToggle();

        // خامساً: في حالة وجود رسالة خطأ من الخادم في عنوان URL (مثلاً ?error=1)
        // يمكننا عرضها، لكننا نعتمد على معالجة fetch.

        console.log('✅ تم تهيئة صفحة تسجيل الدخول بنجاح.');
    });

})();