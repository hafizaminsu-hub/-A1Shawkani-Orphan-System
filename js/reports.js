/**
 * ============================================================
 * الملف: reports.js
 * الوصف: وحدة التقارير - عرض تقارير متنوعة، رسوم بيانية، تصدير PDF و Excel
 * يعتمد على: app.js (الدوال المساعدة)، Chart.js، jsPDF، SheetJS
 * الإصدار: 1.0.0
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. عناصر DOM الخاصة بالوحدة
    // ============================================================
    const DOM = {
        // حاوية التقارير
        reportContainer: document.getElementById('reportContainer'),
        reportType: document.getElementById('reportType'),
        reportDateFrom: document.getElementById('reportDateFrom'),
        reportDateTo: document.getElementById('reportDateTo'),
        generateBtn: document.getElementById('generateReportBtn'),
        exportPdfBtn: document.getElementById('exportPdfBtn'),
        exportExcelBtn: document.getElementById('exportExcelBtn'),
        printReportBtn: document.getElementById('printReportBtn'),

        // حاويات الرسوم البيانية
        chartContainer: document.getElementById('chartContainer'),
        chartCanvas: document.getElementById('reportChart'),

        // حاوية جدول التقرير
        tableContainer: document.getElementById('reportTableContainer'),
        tableBody: document.getElementById('reportTableBody'),

        // إحصائيات سريعة
        statsContainer: document.getElementById('reportStats')
    };

    // ============================================================
    // 2. متغيرات الحالة
    // ============================================================
    let reportData = [];
    let chartInstance = null;
    let currentReportType = 'orphans-status';

    // ============================================================
    // 3. الدوال الأساسية لجلب البيانات
    // ============================================================

    /**
     * جلب بيانات التقرير من الخادم
     * @param {string} type - نوع التقرير
     * @param {Object} filters - معاملات التصفية
     * @returns {Promise<Object>} بيانات التقرير
     */
    async function fetchReportData(type, filters = {}) {
        try {
            const params = new URLSearchParams({ type, ...filters });
            const response = await fetch(`/api/reports?${params}`);
            if (!response.ok) throw new Error('فشل في جلب بيانات التقرير');
            const data = await response.json();
            reportData = data;
            return data;
        } catch (error) {
            console.error('❌ خطأ في جلب التقرير:', error.message);
            window.AlShawkani.App.showError('تعذر جلب بيانات التقرير. يرجى المحاولة مرة أخرى.');
            return null;
        }
    }

    // ============================================================
    // 4. عرض التقارير
    // ============================================================

    /**
     * عرض التقرير بناءً على النوع المحدد
     */
    async function generateReport() {
        const type = DOM.reportType ? DOM.reportType.value : 'orphans-status';
        const dateFrom = DOM.reportDateFrom ? DOM.reportDateFrom.value : '';
        const dateTo = DOM.reportDateTo ? DOM.reportDateTo.value : '';

        currentReportType = type;

        // إظهار مؤشر التحميل
        if (DOM.reportContainer) {
            DOM.reportContainer.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                    <p class="mt-3 text-muted">جاري تحضير التقرير...</p>
                </div>
            `;
        }

        const data = await fetchReportData(type, { dateFrom, dateTo });
        if (!data) return;

        // عرض التقرير حسب النوع
        switch (type) {
            case 'orphans-status':
                renderOrphansStatusReport(data);
                break;
            case 'sponsorships-status':
                renderSponsorshipsReport(data);
                break;
            case 'aid-summary':
                renderAidSummaryReport(data);
                break;
            case 'clothing-summary':
                renderClothingSummaryReport(data);
                break;
            case 'monthly-statistics':
                renderMonthlyStatisticsReport(data);
                break;
            case 'families-summary':
                renderFamiliesSummaryReport(data);
                break;
            default:
                renderGenericReport(data);
        }

        // تحديث الإحصائيات السريعة
        updateStats(data);

        // تمكين أزرار التصدير
        enableExportButtons();
    }

    /**
     * عرض تقرير حالة الأيتام
     */
    function renderOrphansStatusReport(data) {
        if (!DOM.reportContainer) return;

        const { labels, values, total, details } = data;

        // بناء HTML
        let html = `
            <div class="row g-4">
                <div class="col-12">
                    <h5 class="fw-bold">تقرير حالة الأيتام</h5>
                    <p class="text-muted small">إجمالي الأيتام: <strong>${total || 0}</strong></p>
                </div>
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <i class="fas fa-chart-pie me-2"></i> توزيع الأيتام حسب الحالة
                        </div>
                        <div class="card-body">
                            <div style="height: 300px;">
                                <canvas id="reportChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <i class="fas fa-list me-2"></i> تفاصيل الحالات
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered">
                                    <thead>
                                        <tr>
                                            <th>الحالة</th>
                                            <th>العدد</th>
                                            <th>النسبة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${labels.map((label, index) => {
                                            const count = values[index] || 0;
                                            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                                            return `
                                                <tr>
                                                    <td>${label}</td>
                                                    <td>${count}</td>
                                                    <td>${percentage}%</td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        DOM.reportContainer.innerHTML = html;

        // رسم المخطط الدائري
        renderChart('pie', labels, values, ['#28a745', '#ffc107', '#dc3545', '#17a2b8']);
    }

    /**
     * عرض تقرير الكفالات
     */
    function renderSponsorshipsReport(data) {
        if (!DOM.reportContainer) return;

        const { labels, values, total, details } = data;

        let html = `
            <div class="row g-4">
                <div class="col-12">
                    <h5 class="fw-bold">تقرير الكفالات</h5>
                    <p class="text-muted small">إجمالي الكفالات: <strong>${total || 0}</strong></p>
                </div>
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <i class="fas fa-chart-bar me-2"></i> توزيع الكفالات حسب الحالة
                        </div>
                        <div class="card-body">
                            <div style="height: 300px;">
                                <canvas id="reportChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <i class="fas fa-list me-2"></i> تفاصيل الكفالات
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered">
                                    <thead>
                                        <tr>
                                            <th>الحالة</th>
                                            <th>العدد</th>
                                            <th>النسبة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${labels.map((label, index) => {
                                            const count = values[index] || 0;
                                            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                                            return `
                                                <tr>
                                                    <td>${label}</td>
                                                    <td>${count}</td>
                                                    <td>${percentage}%</td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        DOM.reportContainer.innerHTML = html;
        renderChart('doughnut', labels, values, ['#28a745', '#ffc107', '#dc3545']);
    }

    /**
     * عرض تقرير المساعدات
     */
    function renderAidSummaryReport(data) {
        if (!DOM.reportContainer) return;

        const { labels, values, total, details } = data;

        let html = `
            <div class="row g-4">
                <div class="col-12">
                    <h5 class="fw-bold">تقرير المساعدات</h5>
                    <p class="text-muted small">إجمالي المساعدات: <strong>${total || 0}</strong></p>
                </div>
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <i class="fas fa-chart-bar me-2"></i> توزيع المساعدات حسب النوع
                        </div>
                        <div class="card-body">
                            <div style="height: 300px;">
                                <canvas id="reportChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <i class="fas fa-list me-2"></i> تفاصيل المساعدات
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered">
                                    <thead>
                                        <tr>
                                            <th>نوع المساعدة</th>
                                            <th>العدد</th>
                                            <th>النسبة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${labels.map((label, index) => {
                                            const count = values[index] || 0;
                                            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                                            return `
                                                <tr>
                                                    <td>${label}</td>
                                                    <td>${count}</td>
                                                    <td>${percentage}%</td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        DOM.reportContainer.innerHTML = html;
        renderChart('bar', labels, values, ['#d4a373', '#1b263b', '#28a745', '#007bff', '#ffc107', '#dc3545']);
    }

    /**
     * عرض تقرير الكسوة
     */
    function renderClothingSummaryReport(data) {
        if (!DOM.reportContainer) return;

        const { labels, values, total, details } = data;

        let html = `
            <div class="row g-4">
                <div class="col-12">
                    <h5 class="fw-bold">تقرير الكسوة</h5>
                    <p class="text-muted small">إجمالي قطع الكسوة: <strong>${total || 0}</strong></p>
                </div>
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <i class="fas fa-chart-bar me-2"></i> توزيع الكسوة حسب الموسم
                        </div>
                        <div class="card-body">
                            <div style="height: 300px;">
                                <canvas id="reportChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <i class="fas fa-list me-2"></i> تفاصيل الكسوة
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered">
                                    <thead>
                                        <tr>
                                            <th>الموسم</th>
                                            <th>العدد</th>
                                            <th>النسبة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${labels.map((label, index) => {
                                            const count = values[index] || 0;
                                            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                                            return `
                                                <tr>
                                                    <td>${label}</td>
                                                    <td>${count}</td>
                                                    <td>${percentage}%</td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        DOM.reportContainer.innerHTML = html;
        renderChart('bar', labels, values, ['#ffc107', '#17a2b8', '#28a745', '#dc3545']);
    }

    /**
     * عرض تقرير إحصائيات شهرية
     */
    function renderMonthlyStatisticsReport(data) {
        if (!DOM.reportContainer) return;

        const { labels, values, total, details } = data;

        let html = `
            <div class="row g-4">
                <div class="col-12">
                    <h5 class="fw-bold">تقرير الإحصائيات الشهرية</h5>
                </div>
                <div class="col-lg-12">
                    <div class="card">
                        <div class="card-header">
                            <i class="fas fa-chart-line me-2"></i> التوزيع الشهري
                        </div>
                        <div class="card-body">
                            <div style="height: 300px;">
                                <canvas id="reportChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-12">
                    <div class="card">
                        <div class="card-header">
                            <i class="fas fa-table me-2"></i> التفاصيل الشهرية
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered">
                                    <thead>
                                        <tr>
                                            <th>الشهر</th>
                                            <th>العدد</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${labels.map((label, index) => `
                                            <tr>
                                                <td>${label}</td>
                                                <td>${values[index] || 0}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        DOM.reportContainer.innerHTML = html;
        renderChart('line', labels, values, ['#1b263b']);
    }

    /**
     * عرض تقرير عام (Generic)
     */
    function renderGenericReport(data) {
        if (!DOM.reportContainer) return;

        const { labels, values, total, details } = data;

        let html = `
            <div class="row g-4">
                <div class="col-12">
                    <h5 class="fw-bold">تقرير عام</h5>
                    <p class="text-muted small">إجمالي السجلات: <strong>${total || 0}</strong></p>
                </div>
                <div class="col-lg-12">
                    <div class="card">
                        <div class="card-header">
                            <i class="fas fa-chart-bar me-2"></i> التوزيع
                        </div>
                        <div class="card-body">
                            <div style="height: 300px;">
                                <canvas id="reportChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-12">
                    <div class="card">
                        <div class="card-header">
                            <i class="fas fa-table me-2"></i> التفاصيل
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered">
                                    <thead>
                                        <tr>
                                            <th>العنصر</th>
                                            <th>العدد</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${labels.map((label, index) => `
                                            <tr>
                                                <td>${label}</td>
                                                <td>${values[index] || 0}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        DOM.reportContainer.innerHTML = html;
        renderChart('bar', labels, values, ['#d4a373', '#1b263b', '#28a745', '#007bff', '#ffc107', '#dc3545']);
    }

    // ============================================================
    // 5. رسم المخططات البيانية (Chart.js)
    // ============================================================

    /**
     * رسم مخطط بياني
     * @param {string} type - نوع المخطط (pie, doughnut, bar, line)
     * @param {Array} labels - عناوين المحاور
     * @param {Array} values - قيم البيانات
     * @param {Array} colors - ألوان المخطط
     */
    function renderChart(type, labels, values, colors) {
        const canvas = document.getElementById('reportChart');
        if (!canvas) return;

        // تدمير المخطط السابق إن وجد
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }

        const ctx = canvas.getContext('2d');

        // إعداد الألوان (شفافة للنقاط والحدود)
        const backgroundColors = colors.map(c => c + '80');
        const borderColors = colors;

        let chartConfig = {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: 'العدد',
                    data: values,
                    backgroundColor: type === 'line' ? 'rgba(27, 38, 59, 0.1)' : backgroundColors,
                    borderColor: type === 'line' ? '#1b263b' : borderColors,
                    borderWidth: 2,
                    fill: type === 'line',
                    tension: 0.3,
                    pointBackgroundColor: type === 'line' ? '#1b263b' : undefined,
                    pointRadius: type === 'line' ? 4 : undefined
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: type !== 'line' && type !== 'bar',
                        rtl: true,
                        position: 'bottom',
                        labels: {
                            font: { family: 'Segoe UI, Tahoma, sans-serif' }
                        }
                    },
                    tooltip: {
                        rtl: true,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return `${label}: ${value}`;
                            }
                        }
                    }
                },
                scales: type === 'line' || type === 'bar' ? {
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
                } : undefined,
                locale: 'ar-EG'
            }
        };

        chartInstance = new Chart(ctx, chartConfig);
    }

    // ============================================================
    // 6. تحديث الإحصائيات السريعة
    // ============================================================

    function updateStats(data) {
        if (!DOM.statsContainer) return;

        const { total, labels, values } = data;

        let html = `
            <div class="row g-3">
                <div class="col-md-3 col-6">
                    <div class="stat-card text-center p-3">
                        <div class="stat-number">${total || 0}</div>
                        <div class="stat-label">إجمالي السجلات</div>
                    </div>
                </div>
        `;

        if (labels && values) {
            labels.forEach((label, index) => {
                const count = values[index] || 0;
                const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                html += `
                    <div class="col-md-3 col-6">
                        <div class="stat-card text-center p-3">
                            <div class="stat-number">${count}</div>
                            <div class="stat-label">${label} (${percentage}%)</div>
                        </div>
                    </div>
                `;
            });
        }

        html += `</div>`;
        DOM.statsContainer.innerHTML = html;
    }

    // ============================================================
    // 7. تصدير التقارير (PDF, Excel, طباعة)
    // ============================================================

    /**
     * تمكين أزرار التصدير
     */
    function enableExportButtons() {
        if (DOM.exportPdfBtn) DOM.exportPdfBtn.disabled = false;
        if (DOM.exportExcelBtn) DOM.exportExcelBtn.disabled = false;
        if (DOM.printReportBtn) DOM.printReportBtn.disabled = false;
    }

    /**
     * تصدير التقرير إلى PDF باستخدام jsPDF
     */
    function exportToPdf() {
        if (!DOM.reportContainer || !reportData) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للتصدير.');
            return;
        }

        // التحقق من وجود jsPDF
        if (typeof window.jspdf === 'undefined' && typeof jspdf === 'undefined') {
            window.AlShawkani.App.showError('مكتبة jsPDF غير محملة. يرجى التأكد من تحميلها.');
            return;
        }

        try {
            const { jsPDF } = window.jspdf || jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');

            // عنوان التقرير
            const reportTypeMap = {
                'orphans-status': 'تقرير حالة الأيتام',
                'sponsorships-status': 'تقرير الكفالات',
                'aid-summary': 'تقرير المساعدات',
                'clothing-summary': 'تقرير الكسوة',
                'monthly-statistics': 'تقرير الإحصائيات الشهرية',
                'families-summary': 'تقرير الأسر'
            };
            const title = reportTypeMap[currentReportType] || 'تقرير نظام الشوكاني';

            doc.setFont('Arial', 'bold');
            doc.setFontSize(18);
            doc.text(title, 105, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont('Arial', 'normal');
            const date = new Date().toLocaleDateString('ar-EG');
            doc.text(`تاريخ التقرير: ${date}`, 105, 30, { align: 'center' });

            // محتوى التقرير (نصي)
            let yPos = 40;
            doc.setFontSize(12);
            doc.setFont('Arial', 'bold');

            // إضافة بيانات التقرير
            const { labels, values, total } = reportData;
            if (labels && values) {
                doc.text(`إجمالي السجلات: ${total || 0}`, 20, yPos);
                yPos += 10;

                labels.forEach((label, index) => {
                    const count = values[index] || 0;
                    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                    doc.text(`${label}: ${count} (${percentage}%)`, 20, yPos);
                    yPos += 8;

                    // إذا تجاوزت الصفحة، أضف صفحة جديدة
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
            }

            // إضافة تذييل
            doc.setFontSize(8);
            doc.setFont('Arial', 'italic');
            doc.text('تم إنشاؤه بواسطة نظام الشوكاني لإدارة الأيتام', 105, 285, { align: 'center' });

            // حفظ الملف
            doc.save(`${title}.pdf`);
            window.AlShawkani.App.showSuccess('تم تصدير التقرير إلى PDF بنجاح');

        } catch (error) {
            console.error('❌ خطأ في تصدير PDF:', error.message);
            window.AlShawkani.App.showError('تعذر تصدير التقرير إلى PDF. يرجى المحاولة مرة أخرى.');
        }
    }

    /**
     * تصدير التقرير إلى Excel باستخدام SheetJS (XLSX)
     */
    function exportToExcel() {
        if (!reportData) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للتصدير.');
            return;
        }

        // التحقق من وجود XLSX
        if (typeof XLSX === 'undefined') {
            window.AlShawkani.App.showError('مكتبة SheetJS غير محملة. يرجى التأكد من تحميلها.');
            return;
        }

        try {
            const { labels, values, total } = reportData;

            // بناء مصفوفة البيانات للتصدير
            let excelData = [
                ['نظام الشوكاني - تقرير إدارة الأيتام'],
                [`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`],
                [''],
                ['العنصر', 'العدد', 'النسبة المئوية']
            ];

            if (labels && values) {
                labels.forEach((label, index) => {
                    const count = values[index] || 0;
                    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0%';
                    excelData.push([label, count, percentage]);
                });
            }

            excelData.push(['']);
            excelData.push([`إجمالي السجلات: ${total || 0}`]);

            // إنشاء مصنف Excel
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(excelData);

            // تعيين عرض الأعمدة
            ws['!cols'] = [
                { wch: 30 },
                { wch: 15 },
                { wch: 20 }
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'التقرير');

            // حفظ الملف
            const reportTypeMap = {
                'orphans-status': 'تقرير_الأيتام',
                'sponsorships-status': 'تقرير_الكفالات',
                'aid-summary': 'تقرير_المساعدات',
                'clothing-summary': 'تقرير_الكسوة',
                'monthly-statistics': 'تقرير_الإحصائيات',
                'families-summary': 'تقرير_الأسر'
            };
            const filename = reportTypeMap[currentReportType] || 'تقرير';

            XLSX.writeFile(wb, `${filename}.xlsx`);
            window.AlShawkani.App.showSuccess('تم تصدير التقرير إلى Excel بنجاح');

        } catch (error) {
            console.error('❌ خطأ في تصدير Excel:', error.message);
            window.AlShawkani.App.showError('تعذر تصدير التقرير إلى Excel. يرجى المحاولة مرة أخرى.');
        }
    }

    /**
     * طباعة التقرير
     */
    function printReport() {
        if (!DOM.reportContainer) {
            window.AlShawkani.App.showWarning('لا توجد بيانات للطباعة.');
            return;
        }

        const content = DOM.reportContainer.innerHTML;
        const title = document.querySelector('h5')?.textContent || 'تقرير نظام الشوكاني';

        window.AlShawkani.App.printElement(content, title);
    }

    // ============================================================
    // 8. ربط الأحداث وتهيئة الوحدة
    // ============================================================

    /**
     * تهيئة وحدة التقارير
     */
    function initReportsModule() {
        console.log('🚀 تهيئة وحدة التقارير...');

        if (!DOM.reportContainer) {
            console.warn('⚠️ حاوية التقارير غير موجودة في الصفحة.');
            return;
        }

        // ============================================================
        // 1. ربط أحداث الأزرار
        // ============================================================
        if (DOM.generateBtn) {
            DOM.generateBtn.addEventListener('click', generateReport);
        }

        if (DOM.exportPdfBtn) {
            DOM.exportPdfBtn.addEventListener('click', exportToPdf);
            DOM.exportPdfBtn.disabled = true;
        }

        if (DOM.exportExcelBtn) {
            DOM.exportExcelBtn.addEventListener('click', exportToExcel);
            DOM.exportExcelBtn.disabled = true;
        }

        if (DOM.printReportBtn) {
            DOM.printReportBtn.addEventListener('click', printReport);
            DOM.printReportBtn.disabled = true;
        }

        // ============================================================
        // 2. تحميل التقرير الافتراضي عند تحميل الصفحة
        // ============================================================
        generateReport();

        console.log('✅ تم تهيئة وحدة التقارير بنجاح.');
    }

    // ============================================================
    // 9. تشغيل التهيئة
    // ============================================================

    document.addEventListener('DOMContentLoaded', function() {
        initReportsModule();
    });

})();