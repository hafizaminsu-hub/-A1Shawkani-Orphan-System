const { app, BrowserWindow } = require('electron');
const path = require('path');

// تشغيل خادم Node.js الداخلي عند بدء تشغيل البرنامج
require('./server');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 768,
        title: "نظام إدارة الأيتام - مؤسسة الشوكاني",
        icon: path.join(__dirname, 'assets/icons/logo.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        show: false // إخفاء النافذة حتى تكتمل التحميل لظهور سلس
    });

    // تحميل الواجهة من الخادم المحلي الداخلي
    mainWindow.loadURL('http://localhost:3000');

    // إظهار النافذة وتكبيرها فور جهوزيتها
    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize();
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
